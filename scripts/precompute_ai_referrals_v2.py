#!/usr/bin/env python3
"""Precompute re-verified AI-referral caches for /macao/crawler-dashboard (NEW standalone script).

Data flow (dashboard never queries Supabase):
  Supabase ai_referrals --(crawler_local_sync.py, scheduled)--> local mirror crawler_local.db
  --(this script, read-only)--> ai-referrals-v2-{1,7,30,90,all}.json --(publish, Kira-approved)--> Blob
  --> dashboard page / /api/v1/ai-referrals (read cache only)

Classification code is SHARED with the app: the host table is parsed from src/lib/ai-referrers.ts and the
re-verified buckets from src/lib/ai-referrals-aggregate.ts, so TS and Python cannot drift silently.
Parity with the TS aggregator is asserted by scripts/test_precompute_ai_referrals_v2.py and
src/lib/ai-referrals-aggregate.test.ts against the same fixtures.

Usage: precompute_ai_referrals_v2.py --db ~/.openclaw/api-cache/crawler_local.db --out DIR [--site S] [--now ISO]
Safety: exit 3 on empty mirror, exit 4 on collapse vs previous cache (cache left untouched); files are written
via temp+os.replace; stale=true when the mirror was not written for >6h.
Does NOT upload anything and never touches the production LaunchAgent scripts. Opens the mirror read-only.
"""
import argparse, json, os, re, sqlite3, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
# Safety rails (round-2 review I1): a broken/empty mirror must never overwrite a good cache.
SHRINK_RATIO = 0.5      # refuse if the all-time input row count drops below 50% of the previous cache
STALE_HOURS = 6         # mirror DB (db / -wal) not written for > 6h => stale=true + warning (sync is scheduled far more often)
EXIT_EMPTY, EXIT_SHRINK = 3, 4
WINDOWS = {'1': 1, '7': 7, '30': 30, '90': 90, 'all': 3650}

SOURCE_META = {
    'perplexity': {'label': 'Perplexity', 'color': '#20b2aa', 'icon': '🔍'},
    'chatgpt': {'label': 'ChatGPT', 'color': '#10a37f', 'icon': '🤖'},
    'claude': {'label': 'Claude', 'color': '#c5a572', 'icon': '🧠'},
    'gemini': {'label': 'Gemini', 'color': '#4285f4', 'icon': '✨'},
    'copilot': {'label': 'Copilot', 'color': '#0078d4', 'icon': '🪟'},
    'grok': {'label': 'Grok', 'color': '#1da1f2', 'icon': '𝕏'},
    'you': {'label': 'You.com', 'color': '#6366f1', 'icon': '🔎'},
    'kagi': {'label': 'Kagi', 'color': '#f59e0b', 'icon': '🔱'},
    'phind': {'label': 'Phind', 'color': '#7c3aed', 'icon': '💡'},
    'other_ai': {'label': 'Other AI', 'color': '#6b7280', 'icon': '🤖'},
}
BOT_UA_RE = re.compile(r'bot|crawler|spider|scraper|perplexitybot|googlebot|gptbot|claudebot|bingbot|yandexbot|applebot|amazonbot|meta-externalagent|facebookbot|bytespider', re.I)
REASON = '按 referrer_url 主機重新驗證：copilot／grok／kagi 桶內主機唔係專屬 AI 主機（例如 bing.com 自然搜尋、x.com 一般瀏覽）嘅記錄已排除，唔計入 AI 推介'


def load_host_table(ts_path=ROOT / 'src/lib/ai-referrers.ts'):
    """Parse `[/regex/i, 'name'],` entries out of AI_REFERRER_HOSTS (single source of truth)."""
    out = []
    for m in re.finditer(r"^\s*\[/(.+?)/i,\s*'([a-z_]+)'\],", ts_path.read_text(encoding='utf-8'), re.M):
        out.append((re.compile(m.group(1), re.I), m.group(2)))
    if len(out) < 10:
        raise SystemExit(f'host table parse failed ({len(out)} entries) — ai-referrers.ts format changed?')
    return out


def load_reverify_sources(ts_path=ROOT / 'src/lib/ai-referrals-aggregate.ts'):
    m = re.search(r"REVERIFY_SOURCES\s*=\s*new Set\(\[([^\]]+)\]\)", ts_path.read_text(encoding='utf-8'))
    if not m:
        raise SystemExit('REVERIFY_SOURCES parse failed')
    return set(re.findall(r"'([a-z_]+)'", m.group(1)))


def detect(hosts, url):
    try:
        host = urlparse(url).hostname or ''
    except ValueError:
        return None
    for pat, name in hosts:
        if pat.search(host):
            return name
    return None


def host_of(url):
    try:
        return (urlparse(url).hostname or '(invalid)') if url else '(none)'
    except ValueError:
        return '(invalid)'


def aggregate(rows, days, since, hosts, reverify):
    excluded_by_source, excluded_by_host, kept = {}, {}, []
    kept_hosts = {}
    for r in rows:
        src = r.get('referrer_source') or 'other_ai'
        if src in reverify and r.get('referrer_url'):
            if detect(hosts, r['referrer_url']) != src:
                excluded_by_source[src] = excluded_by_source.get(src, 0) + 1
                h = host_of(r['referrer_url'])
                excluded_by_host[h] = excluded_by_host.get(h, 0) + 1
                continue
        kept.append((r, src))
        h = host_of(r.get('referrer_url'))
        k = f'{src}|{h}'
        kept_hosts[k] = kept_hosts.get(k, 0) + 1
    by_source, top, daily = {}, {}, {}
    for r, src in kept:
        path, ts = r.get('path') or '', r['ts']
        b = by_source.setdefault(src, {'count': 0, 'pages': {}, 'industries': {}, 'latest': ts})
        b['count'] += 1
        b['pages'][path] = b['pages'].get(path, 0) + 1
        if r.get('industry'):
            b['industries'][r['industry']] = b['industries'].get(r['industry'], 0) + 1
        if ts > b['latest']:
            b['latest'] = ts
        t = top.setdefault(path, {'visits': 0, 'sources': []})
        t['visits'] += 1
        if src not in t['sources']:
            t['sources'].append(src)
        d = daily.setdefault(ts[:10], {})
        d[src] = d.get(src, 0) + 1
    top_pages = [{'path': p, **v} for p, v in sorted(top.items(), key=lambda kv: -kv[1]['visits'])[:20]]
    return {
        'total': len(kept), 'days': days, 'since': since,
        'by_source': by_source, 'source_meta': SOURCE_META, 'top_pages': top_pages, 'daily': daily,
        'recent': [{'ts': r['ts'], 'source': s, 'path': r.get('path') or '', 'page_type': r.get('page_type'), 'industry': r.get('industry')} for r, s in kept[:50]],
        'excluded_non_ai': {'total': sum(excluded_by_source.values()), 'by_source': excluded_by_source,
                            'by_referrer_host': excluded_by_host, 'reason': REASON},
        # classified_source ↔ referrer host breakdown of what was KEPT (audit trail, hosts only — no full URLs)
        'classified': {'kept_by_source_host': kept_hosts},
    }


def fetch_rows(db, site):
    con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    con.row_factory = sqlite3.Row
    cur = con.execute('SELECT ts, referrer_source, referrer_url, path, page_type, industry, ua_raw FROM ai_referrals WHERE site=? ORDER BY ts DESC', (site,))
    rows = [dict(r) for r in cur]
    con.close()
    return [r for r in rows if not BOT_UA_RE.search(r.get('ua_raw') or '')]


def mirror_age_hours(db, now_ts=None):
    """Hours since the mirror was last written (newest mtime of the db file or its -wal)."""
    db = str(db)
    m = max((os.path.getmtime(f) for f in (db, db + '-wal') if os.path.exists(f)), default=0)
    return ((now_ts if now_ts is not None else time.time()) - m) / 3600


def check_safety(rows, new_all, prev_all):
    """Return a list of reasons NOT to overwrite the cache (empty list = safe)."""
    errs = []
    if not rows:
        errs.append('mirror ai_referrals is EMPTY (0 rows for this site) — refusing to write; previous cache kept')
    prev_n = (prev_all or {}).get('input_rows')
    if prev_n and new_all['input_rows'] < prev_n * SHRINK_RATIO:
        errs.append(f"all-time input rows collapsed {prev_n} -> {new_all['input_rows']} (< {int(SHRINK_RATIO*100)}%) — refusing to write; previous cache kept")
    if prev_all and prev_all.get('total', 0) > 0 and new_all['total'] == 0:
        errs.append(f"all-time total fell {prev_all['total']} -> 0 — refusing to write; previous cache kept")
    return errs


def write_atomic(path, text):
    """Write to a temp file in the same directory, then os.replace (atomic rename)."""
    path = Path(path)
    tmp = path.with_name(path.name + f'.tmp{os.getpid()}')
    tmp.write_text(text)
    os.replace(tmp, path)


def build_all(rows, now, hosts, reverify, age_hours=None):
    out = {}
    for key, days in WINDOWS.items():
        if key == 'all':
            since = rows[-1]['ts'] if rows else now.isoformat()
            sub = rows
        else:
            since = (now - timedelta(days=days)).isoformat().replace('+00:00', 'Z')
            sub = [r for r in rows if r['ts'] >= since]
        j = aggregate(sub, days, since, hosts, reverify)
        j.update({'window': key, 'generated_at': now.isoformat().replace('+00:00', 'Z'), 'data_source': 'local-mirror crawler_local.db (ai_referrals)', 'truncated': False,
                  'input_rows': len(sub), 'newest_row_ts': rows[0]['ts'] if rows else None,
                  'mirror_age_hours': None if age_hours is None else round(age_hours, 2),
                  'stale': bool(age_hours is not None and age_hours > STALE_HOURS), 'stale_threshold_hours': STALE_HOURS})
        out[key] = j
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--db', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--site', default='cloudpipe-macao-app'); ap.add_argument('--now')
    ap.add_argument('--force-shrink', action='store_true', help='allow a big row-count drop (never overrides an EMPTY mirror)')
    a = ap.parse_args()
    now = datetime.fromisoformat(a.now.replace('Z', '+00:00')) if a.now else datetime.now(timezone.utc)
    db = Path(a.db).expanduser()
    rows = fetch_rows(db, a.site)
    age = mirror_age_hours(db)
    res = build_all(rows, now, load_host_table(), load_reverify_sources(), age)
    out = Path(a.out).expanduser(); out.mkdir(parents=True, exist_ok=True)
    prev_p = out / 'ai-referrals-v2-all.json'
    prev = json.loads(prev_p.read_text()) if prev_p.exists() else None
    errs = [] if a.force_shrink else check_safety(rows, res['all'], prev)
    if not rows:
        errs = check_safety(rows, res['all'], prev)  # empty mirror is never overridable
    if errs:
        for e in errs:
            print('ERROR: ' + e, file=sys.stderr)
        sys.exit(EXIT_EMPTY if not rows else EXIT_SHRINK)
    if res['all']['stale']:
        print(f'WARNING: mirror not written for {age:.1f}h (> {STALE_HOURS}h) — caches marked stale=true', file=sys.stderr)
    for k, j in res.items():
        write_atomic(out / f'ai-referrals-v2-{k}.json', json.dumps(j, ensure_ascii=False, indent=1))
        print(f'ai-referrals-v2-{k}.json total={j["total"]} excluded={j["excluded_non_ai"]["total"]}')


if __name__ == '__main__':
    main()
