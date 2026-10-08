#!/usr/bin/env python3
"""Run: python3 scripts/test_precompute_ai_referrals_v2.py   (asserts parity with fixtures shared with the TS test)"""
import json, sys, importlib.util
from pathlib import Path
R = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('pc', R / 'scripts/precompute_ai_referrals_v2.py')
pc = importlib.util.module_from_spec(spec); spec.loader.exec_module(pc)
hosts, rv = pc.load_host_table(), pc.load_reverify_sources()
rows = json.loads((R / 'scripts/fixtures/ai-referrals-rows.json').read_text())
exp = json.loads((R / 'scripts/fixtures/ai-referrals-expected.json').read_text())
fails = 0
def check(c, m):
    global fails
    print(('PASS: ' if c else 'FAIL: ') + m); fails += 0 if c else 1
check(rv == {'copilot', 'grok', 'kagi'}, f'reverify buckets parsed from TS: {sorted(rv)}')
check(pc.detect(hosts, 'https://www.bing.com/') is None, 'bing.com is not an AI host')
check(pc.detect(hosts, 'https://copilot.microsoft.com/x') == 'copilot', 'copilot.microsoft.com -> copilot')
check(pc.detect(hosts, 'https://x.com/home') is None, 'x.com is not an AI host')
check(pc.detect(hosts, 'https://grok.com/') == 'grok', 'grok.com -> grok')
agg = pc.aggregate(rows, 3650, '2016-01-01T00:00:00Z', hosts, rv)
check(agg['total'] == exp['total'], f"total {agg['total']} == {exp['total']}")
check({k: v['count'] for k, v in agg['by_source'].items()} == exp['by_source_counts'], 'by_source counts match shared expectation')
check(agg['excluded_non_ai']['total'] == exp['excluded_total'], 'excluded total matches')
check(agg['excluded_non_ai']['by_source'] == exp['excluded_by_source'], 'excluded by_source matches')
check(agg['excluded_non_ai']['by_referrer_host'] == exp['excluded_by_host'], 'excluded by host matches')
check(agg['total'] + agg['excluded_non_ai']['total'] == len(rows), 'kept + excluded == input')
check(agg['source_meta'] == exp['source_meta'], 'source_meta equals TS SOURCE_LABELS snapshot')
w = pc.build_all(sorted(rows, key=lambda r: r['ts'], reverse=True), __import__('datetime').datetime(2026, 10, 8, tzinfo=__import__('datetime').timezone.utc), hosts, rv)
check(w['30']['total'] <= w['90']['total'] <= w['all']['total'], '30 <= 90 <= all totals (same classifier across windows)')
check(set(w) == {'1', '7', '30', '90', 'all'}, 'all five windows produced')

# window boundaries + recent ordering (round-2 minor: 30-day window must not become 31, recent must be newest-first)
import datetime as _dt
nowd = _dt.datetime(2026, 10, 9, tzinfo=_dt.timezone.utc)
mk = lambda days_ago, extra=0: {'ts': (nowd - _dt.timedelta(days=days_ago, seconds=extra)).isoformat().replace('+00:00', 'Z'), 'referrer_source': 'chatgpt', 'referrer_url': 'https://chatgpt.com/', 'path': f'/d{days_ago}'}
bw = pc.build_all([mk(0, 60), mk(29), mk(30, 60), mk(31), mk(89), mk(91)], nowd, hosts, rv)
check(bw['30']['total'] == 2, f"30-day window holds rows <=30d old only (got {bw['30']['total']})")
check(bw['90']['total'] == 5, f"90-day window holds 5 of 6 (got {bw['90']['total']})")
check(bw['all']['total'] == 6, 'all window holds everything')
check(bw['all']['recent'][0]['path'] == '/d0', 'recent is newest-first')
check(bw['7']['total'] == 1 and bw['1']['total'] == 1, '1/7-day windows')

# ── safety rails (round-2 I1) + freshness (round-3) ──
import os, sqlite3, subprocess, tempfile, hashlib
NOW = _dt.datetime(2026, 10, 9, tzinfo=_dt.timezone.utc)
iso = lambda h: (NOW - _dt.timedelta(hours=h)).isoformat().replace('+00:00', 'Z')
tmp = Path(tempfile.mkdtemp(prefix='pc-safety-'))
def mkdb(path, n, sync_h=0.5, beat_h=0.5, sync_status='ok'):
    c = sqlite3.connect(path)
    c.execute("CREATE TABLE ai_referrals (id TEXT PRIMARY KEY, ts TEXT NOT NULL, referrer_source TEXT, referrer_url TEXT, path TEXT, site TEXT DEFAULT 'cloudpipe-macao-app', page_type TEXT, industry TEXT, category TEXT, ua_raw TEXT, search_query TEXT, ai_platform TEXT, synced_at TEXT)")
    c.execute("CREATE TABLE sync_log (table_name TEXT NOT NULL, rows_synced INTEGER DEFAULT 0, synced_at TEXT NOT NULL, status TEXT NOT NULL, note TEXT, PRIMARY KEY (table_name, synced_at))")
    c.execute("CREATE TABLE crawler_visits (id TEXT, ts TEXT)"); c.execute("CREATE TABLE user_visits (id TEXT, created_at TEXT)")
    for i in range(n):
        c.execute("INSERT INTO ai_referrals (id, ts, referrer_source, referrer_url, path) VALUES (?,?,?,?,?)", (str(i), f'2026-10-0{1+i%8}T00:00:00Z', 'chatgpt', 'https://chatgpt.com/', '/p'))
    if sync_h is not None:
        c.execute("INSERT INTO sync_log VALUES ('ai_referrals', 0, ?, ?, 'no new rows')", (iso(sync_h), sync_status))
    if beat_h is not None:
        c.execute("INSERT INTO crawler_visits VALUES ('a', ?)", (iso(beat_h),)); c.execute("INSERT INTO user_visits VALUES ('a', ?)", (iso(beat_h),))
    c.commit(); c.close()
def run(db, out, *extra):
    return subprocess.run([sys.executable, str(R / 'scripts/precompute_ai_referrals_v2.py'), '--db', str(db), '--out', str(out), '--now', '2026-10-09T00:00:00Z', *extra], capture_output=True, text=True)
good, out = tmp / 'good.db', tmp / 'out'
mkdb(good, 20)
r = run(good, out); check(r.returncode == 0 and (out / 'ai-referrals-v2-all.json').exists(), 'healthy mirror writes caches')
all_before = (out / 'ai-referrals-v2-all.json').read_text()
j = json.loads(all_before)
check(j['input_rows'] == 20 and 'generated_at' in j and j['stale'] is False and j['stale_thresholds_hours']['sync_log'] == 3 and 'freshness' in j, 'json carries input_rows / generated_at / stale info / thresholds')
check(not list(out.glob('*.tmp*')), 'no leftover temp files after write')
mf = json.loads((out / 'ai-referrals-v2-manifest.json').read_text())
check(set(mf['files']) == {f'ai-referrals-v2-{k}.json' for k in ('1', '7', '30', '90', 'all')} and all(hashlib.sha256((out / n).read_bytes()).hexdigest() == v['sha256'] for n, v in mf['files'].items()), 'manifest lists 5 files and every sha256 matches the file on disk')
empty = tmp / 'empty.db'; mkdb(empty, 0)
r = run(empty, out); check(r.returncode == 3 and 'EMPTY' in r.stderr, 'empty mirror -> exit 3 with clear error')
check((out / 'ai-referrals-v2-all.json').read_text() == all_before, 'empty mirror did NOT overwrite previous cache')
r = run(empty, out, '--force-shrink'); check(r.returncode == 3, '--force-shrink cannot override an empty mirror')
small = tmp / 'small.db'; mkdb(small, 5)
r = run(small, out); check(r.returncode == 4 and 'collapsed' in r.stderr, 'row count collapse (20 -> 5) -> exit 4')
check((out / 'ai-referrals-v2-all.json').read_text() == all_before, 'collapse did NOT overwrite previous cache')
r = run(small, out, '--force-shrink'); check(r.returncode == 0, '--force-shrink allows an explicit shrink')

# freshness: sync_log old (heartbeat + file mtime fresh) must refuse
oldsync = tmp / 'oldsync.db'; mkdb(oldsync, 20, sync_h=5, beat_h=0.2)
out_s = tmp / 'out_s'; out_s.mkdir()
r = run(oldsync, out_s)
check(r.returncode == 5 and 'successful ai_referrals sync' in r.stderr and not list(out_s.glob('ai-referrals-v2-*')), 'sync_log last ok 5h ago (mtime fresh) -> exit 5, nothing written')
dead = tmp / 'dead.db'; mkdb(dead, 20, sync_h=0.2, beat_h=9)
r = run(dead, tmp / 'out_d'); check(r.returncode == 5 and 'heartbeat' in r.stderr, "sync_log 'ok' but crawler/user_visits heartbeat 9h old (REST-failure-writes-ok case) -> exit 5")
nolog = tmp / 'nolog.db'; mkdb(nolog, 20, sync_h=None)
r = run(nolog, tmp / 'out_n'); check(r.returncode == 5, 'no sync_log ok record -> exit 5')
errlog = tmp / 'errlog.db'; mkdb(errlog, 20, sync_h=0.2, sync_status='error')
r = run(errlog, tmp / 'out_e'); check(r.returncode == 5, "latest sync_log row status='error' (no ok within window) -> exit 5")
r = run(oldsync, tmp / 'out_a', '--allow-stale'); ja = json.loads((tmp / 'out_a' / 'ai-referrals-v2-30.json').read_text())
check(r.returncode == 0 and ja['stale'] is True and ja['stale_reasons'] and 'WARNING' in r.stderr, '--allow-stale (diagnostics) writes with stale=true + reasons')
os.utime(oldsync, None)  # touching the file must not make a stale mirror look fresh
check(run(oldsync, tmp / 'out_b').returncode == 5, 'fresh file mtime does NOT mask a stale sync_log')
softdb = tmp / 'soft.db'; mkdb(softdb, 20)
c = sqlite3.connect(softdb); c.execute("UPDATE ai_referrals SET ts='2026-10-01T00:00:00Z'"); c.commit(); c.close()
r = run(softdb, tmp / 'out_soft'); check(r.returncode == 0 and 'NOTICE' in r.stderr, 'ai_referrals newest row 8d old is only a soft notice (exit 0)')

# multi-file atomicity: crash while writing the 3rd file must leave the previous cache fully intact and no temp files
outc = tmp / 'out_crash'; outc.mkdir()
old_files = {f'ai-referrals-v2-{k}.json': json.dumps({'generated_at': 'OLD', 'k': k}) for k in ('1', '7', '30', '90', 'all')}
pc.write_all(outc, old_files)
new_files = {n: json.dumps({'generated_at': 'NEW', 'k': n}) for n in old_files}
try:
    pc.write_all(outc, new_files, _crash_after=3); crashed = False
except RuntimeError:
    crashed = True
check(crashed, 'simulated crash on 3rd file raised')
check(all(json.loads((outc / n).read_text())['generated_at'] == 'OLD' for n in old_files), 'after crash ALL 5 files are still the OLD generation (no old/new mix)')
check(not list(outc.glob('*.tmp*')), 'crash left no temp files')
check(json.loads((outc / 'ai-referrals-v2-manifest.json').read_text())['generated_at'] == 'OLD', 'manifest still describes the old generation')
pc.write_all(outc, new_files)
check(all(json.loads((outc / n).read_text())['generated_at'] == 'NEW' for n in old_files), 'successful write publishes all 5 as NEW')
check(pc.check_safety([], {'input_rows': 0, 'total': 0}, {'input_rows': 10, 'total': 5}) != [], 'check_safety refuses empty vs non-empty previous')
check(pc.check_safety([{'ts': 'x'}], {'input_rows': 10, 'total': 3}, {'input_rows': 10, 'total': 5}) == [], 'check_safety passes a healthy refresh')
sys.exit(1 if fails else 0)
