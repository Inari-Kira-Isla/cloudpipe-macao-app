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
Safety: exit 3 empty mirror, exit 4 collapse vs previous cache, exit 5 stale mirror (sync_log ok >3h, or crawler_visits/
user_visits heartbeat >3h) — caches left untouched. All files are written to temp first, then replaced, plus a manifest
(sha256 + generated_at per file).
Does NOT upload anything and never touches the production LaunchAgent scripts. Opens the mirror read-only.
"""
import argparse, hashlib, json, os, re, sqlite3, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
# Safety rails (round-2 review I1): a broken/empty mirror must never overwrite a good cache.
SHRINK_RATIO = 0.5      # refuse if the all-time input row count drops below 50% of the previous cache
# Freshness (round-3): file mtime is NOT a valid signal (the sync job commits on every run even when its REST
# fetch failed). Use the sync job's own records instead:
SYNC_MAX_AGE_H = 3      # latest sync_log row for ai_referrals with status='ok' must be <= 3h old
HEARTBEAT_MAX_AGE_H = 3  # high-volume tables on the SAME REST pipe (crawler_visits.ts / user_visits.created_at): newest row <= 3h old
SOFT_AI_ROW_AGE_H = 72  # ai_referrals' own newest row older than this is only a soft notice (referrals are sparse)
EXIT_EMPTY, EXIT_SHRINK, EXIT_STALE = 3, 4, 5
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


def _parse(ts):
    try:
        d = datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def freshness(db, now):
    """Return (errors, info). Errors => the mirror cannot be trusted as current; the caller must not write caches.
    Known blind spot (reported, not fixable here): crawler_local_sync.py logs status='ok','no new rows' even when its REST
    call failed. That case is caught by the heartbeat: if REST is down the high-volume tables stop advancing too."""
    errs, info = [], {}
    con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    def age(ts):
        d = _parse(ts)
        return None if d is None else round((now - d).total_seconds() / 3600, 2)
    try:
        r = con.execute("SELECT MAX(synced_at) FROM sync_log WHERE table_name='ai_referrals' AND status='ok'").fetchone()
        info['sync_log_last_ok'] = r[0]; info['sync_log_age_hours'] = age(r[0]) if r[0] else None
    except sqlite3.Error as e:
        errs.append(f'sync_log unreadable ({e}) — cannot prove the mirror is current')
        info['sync_log_age_hours'] = None
    if 'sync_log_age_hours' in info and info['sync_log_age_hours'] is None and not errs:
        errs.append('sync_log has no status=ok record for ai_referrals — cannot prove the mirror is current')
    elif info.get('sync_log_age_hours') is not None and info['sync_log_age_hours'] > SYNC_MAX_AGE_H:
        errs.append(f"latest successful ai_referrals sync was {info['sync_log_age_hours']}h ago (> {SYNC_MAX_AGE_H}h)")
    beats = {}
    for label, sql in (('crawler_visits', 'SELECT MAX(ts) FROM crawler_visits'), ('user_visits', 'SELECT MAX(created_at) FROM user_visits')):
        try:
            v = con.execute(sql).fetchone()[0]
            beats[label] = age(v) if v else None
        except sqlite3.Error:
            beats[label] = None
    info['heartbeat_age_hours'] = beats
    live = [h for h in beats.values() if h is not None and h <= HEARTBEAT_MAX_AGE_H]
    if not live:
        errs.append(f'heartbeat stale: newest crawler_visits/user_visits row older than {HEARTBEAT_MAX_AGE_H}h ({beats}) — the sync pipe looks dead')
    con.close()
    return errs, info


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


def write_all(out_dir, files, _crash_after=None):
    """Multi-file all-or-nothing publish. Phase 1: write EVERY file (+ manifest) to temp names. Phase 2: os.replace each
    (manifest last). A crash in phase 1 (the slow part) leaves the previous cache completely untouched; temp files are
    removed on failure. `files` = {name: text}. _crash_after is a test hook (raise after N temp files written)."""
    out_dir = Path(out_dir)
    manifest = {'generated_at': None, 'files': {}}
    for name, text in files.items():
        manifest['files'][name] = {'sha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
                                   'generated_at': json.loads(text).get('generated_at'), 'bytes': len(text.encode('utf-8'))}
    manifest['generated_at'] = max((v['generated_at'] or '') for v in manifest['files'].values())
    payload = dict(files); payload['ai-referrals-v2-manifest.json'] = json.dumps(manifest, ensure_ascii=False, indent=1)
    tmps = []
    try:
        for i, (name, text) in enumerate(payload.items()):
            if _crash_after is not None and i >= _crash_after:
                raise RuntimeError('simulated crash')
            t = out_dir / f'{name}.tmp{os.getpid()}'
            t.write_text(text); tmps.append((t, out_dir / name))
        for t, final in tmps:
            os.replace(t, final)
    except BaseException:
        for t, _ in tmps:
            t.unlink(missing_ok=True)
        raise


def build_all(rows, now, hosts, reverify, fresh_info=None, fresh_errors=None):
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
                  'freshness': fresh_info or {}, 'stale': bool(fresh_errors), 'stale_reasons': fresh_errors or [],
                  'stale_thresholds_hours': {'sync_log': SYNC_MAX_AGE_H, 'heartbeat': HEARTBEAT_MAX_AGE_H, 'ai_row_soft': SOFT_AI_ROW_AGE_H},
                  'ai_row_age_hours': None if not rows else round((now - _parse(rows[0]['ts'])).total_seconds() / 3600, 2)})
        out[key] = j
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--db', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--site', default='cloudpipe-macao-app'); ap.add_argument('--now')
    ap.add_argument('--allow-stale', action='store_true', help='diagnostics only: write caches even though the mirror is stale (marked stale=true)')
    ap.add_argument('--force-shrink', action='store_true', help='allow a big row-count drop (never overrides an EMPTY mirror)')
    a = ap.parse_args()
    now = datetime.fromisoformat(a.now.replace('Z', '+00:00')) if a.now else datetime.now(timezone.utc)
    db = Path(a.db).expanduser()
    rows = fetch_rows(db, a.site)
    ferrs, finfo = freshness(db, now)
    res = build_all(rows, now, load_host_table(), load_reverify_sources(), finfo, ferrs)
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
    if ferrs and not a.allow_stale:
        for e in ferrs:
            print('ERROR (stale mirror): ' + e, file=sys.stderr)
        print('Refusing to write caches (exit 5). Fix the mirror sync first; --allow-stale is for diagnostics only.', file=sys.stderr)
        sys.exit(EXIT_STALE)
    if ferrs:
        print('WARNING: --allow-stale given; caches written with stale=true: ' + '; '.join(ferrs), file=sys.stderr)
    age_ai = res['all']['ai_row_age_hours']
    if age_ai is not None and age_ai > SOFT_AI_ROW_AGE_H:
        print(f'NOTICE: newest ai_referrals row is {age_ai}h old (> {SOFT_AI_ROW_AGE_H}h) — soft notice only, referrals are sparse', file=sys.stderr)
    write_all(out, {f'ai-referrals-v2-{k}.json': json.dumps(j, ensure_ascii=False, indent=1) for k, j in res.items()})
    for k, j in res.items():
        print(f'ai-referrals-v2-{k}.json total={j["total"]} excluded={j["excluded_non_ai"]["total"]}')


if __name__ == '__main__':
    main()
