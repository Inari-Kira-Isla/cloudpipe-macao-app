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
sys.exit(1 if fails else 0)
