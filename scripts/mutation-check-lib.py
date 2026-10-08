#!/usr/bin/env python3
"""Mutation check for src/lib tests: apply each mutation to a scratch copy of src/lib and
require `scripts/run-lib-tests.mjs` to FAIL (i.e. the tests actually catch the bug).
Usage: python3 scripts/mutation-check-lib.py   (run from repo root)"""
import shutil, subprocess, sys, tempfile, pathlib

MUTATIONS = [
    ("ai-referrers.ts", "bing.com back in copilot regex",
     "[/^copilot\\.microsoft\\.com$/i,                      'copilot'],",
     "[/^(copilot\\.microsoft\\.com|(www\\.)?bing\\.com)$/i,       'copilot'],"),
    ("ai-referrals-aggregate.ts", "skip read-time re-verification",
     "  if (!row.referrer_url) return src // nothing to verify",
     "  return src\n  if (!row.referrer_url) return src // nothing to verify"),
    ("crawler-dashboard.ts", "bar cap back to 30 for long windows",
     "  if (n <= 31) return 30\n  return n", "  return 30"),
    ("crawler-dashboard.ts", "granularity threshold 90 -> 120",
     "if (numPoints > 90) return 'week'", "if (numPoints > 120) return 'week'"),
    ("crawler-dashboard.ts", "weekly aggregation drops last bucket",
     "const keys = [...buckets.keys()].sort()", "const keys = [...buckets.keys()].sort().slice(0, -1)"),
    ("crawler-dashboard.ts", "week starts Sunday instead of Monday",
     "const back = (dow + 6) % 7", "const back = dow"),
    ("crawler-dashboard.ts", "request guard never invalidates old tickets",
     "isCurrent: () => id === current", "isCurrent: () => true"),
    ("crawler-dashboard.ts", "request guard does not abort previous controller",
     "      ctrl?.abort()\n      ctrl = new AbortController()", "      ctrl = new AbortController()"),
    ("crawler-dashboard.ts", "DataForSeoBot misclassified as AI engine",
     "'youbot', 'duckassistbot', 'ccbot', 'google-extended', 'cohere-ai',", "'youbot', 'duckassistbot', 'ccbot', 'google-extended', 'cohere-ai', 'dataforseobot', 'headlessfetcher',"),
    ("crawler-dashboard.ts", "alltime summary ignores HKT daily",
     "const hkt = a.daily_totals_hkt && a.daily_totals_hkt.length > 0", "const hkt = false"),
    ("crawler-dashboard.ts", "PetalBot misclassified as AI engine",
     "'youbot', 'duckassistbot', 'ccbot', 'google-extended', 'cohere-ai',", "'youbot', 'duckassistbot', 'ccbot', 'google-extended', 'cohere-ai', 'petalbot',"),
    ("crawler-dashboard.ts", "strict LLM list drops Bytespider",
     "  'bytespider', 'perplexitybot', 'youbot', 'duckassistbot', 'ccbot',\n])", "  'perplexitybot', 'youbot', 'duckassistbot', 'ccbot',\n])"),
    ("crawler-dashboard.ts", "strict LLM list gains Amazonbot",
     "  'bytespider', 'perplexitybot', 'youbot', 'duckassistbot', 'ccbot',\n])", "  'bytespider', 'perplexitybot', 'youbot', 'duckassistbot', 'ccbot', 'amazonbot',\n])"),
    ("crawler-dashboard.ts", "Applebot back under AI engine (and out of search)",
     "  'applebot',\n])", "])\nAI_ENGINE_BOT_NAMES.add('applebot')"),
    ("crawler-dashboard.ts", "facebookexternalhit dropped from link-preview bucket",
     "'facebookexternalhit', 'twitterbot',", "'twitterbot',"),
    ("crawler-dashboard.ts", "Amazonbot dropped from AI engines",
     "'bytespider', 'amazonbot', 'applebot-extended'", "'bytespider', 'applebot-extended'"),
    ("crawler-dashboard.ts", "ScriptBot treated as search engine",
     "'duckduckbot', 'slurp',", "'duckduckbot', 'scriptbot', 'slurp',"),
    ("crawler-dashboard.ts", "daily-vs-total gap threshold 2% -> 50%",
     "thresholdPct = 2", "thresholdPct = 50"),
    ("ai-referrals-aggregate.ts", "copilot dropped from re-verified buckets (30/90/全部 would show bing as AI)",
     "new Set(['copilot', 'grok', 'kagi'])", "new Set(['grok', 'kagi'])"),
]

root = pathlib.Path('src/lib').resolve()
survived = 0
for fname, label, old, new in MUTATIONS:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='mut-'))
    shutil.copytree(root, tmp / 'lib')
    f = tmp / 'lib' / fname
    txt = f.read_text()
    if old not in txt:
        print(f"[BAD MUTATION] {label}: pattern not found in {fname}"); survived += 1; continue
    f.write_text(txt.replace(old, new, 1))
    r = subprocess.run(['node', 'scripts/run-lib-tests.mjs', str(tmp / 'lib')], capture_output=True, text=True)
    killed = r.returncode != 0
    print(f"[{'KILLED ' if killed else 'SURVIVED'}] {label}")
    if not killed:
        survived += 1
    shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{len(MUTATIONS) - survived}/{len(MUTATIONS)} mutations killed")
sys.exit(1 if survived else 0)
