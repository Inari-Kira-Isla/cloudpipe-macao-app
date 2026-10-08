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
    ("dashboard-no-supabase.ts", "supabase guard disabled (regex never matches)",
     "[/@\\/lib\\/supabase/, \"imports '@/lib/supabase'\"],", "[/(?!)/, \"imports '@/lib/supabase'\"],"),
    ("dashboard-no-supabase.ts", "supabase guard no longer strips comments' effect on negative control (createServiceClient pattern removed)",
     "/createServiceClient|createClient\\s*\\(/", "/(?!)/"),
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

PY_MUTATIONS = [
    ("precompute: empty mirror allowed to overwrite cache", "    if not rows:\n        errs.append('mirror ai_referrals is EMPTY", "    if False:\n        errs.append('mirror ai_referrals is EMPTY"),
    ("precompute: collapse guard disabled", "if prev_n and new_all['input_rows'] < prev_n * SHRINK_RATIO:", "if False:"),
    ("precompute: non-atomic write (os.replace removed)", "os.replace(tmp, path)", "pass"),
    ("precompute: stale threshold ignored", "age_hours > STALE_HOURS", "age_hours > 99999"),
    ("precompute: 30-day window becomes 31", "'30': 30,", "'30': 31,"),
    ("precompute: recent takes oldest rows", "for r, s in kept[:50]]", "for r, s in kept[::-1][:50]]"),
    ("precompute: skip re-verification (bing counted as AI)", "if src in reverify and r.get('referrer_url'):", "if False and r.get('referrer_url'):"),
    ("precompute: host table accepts bing.com", "if pat.search(host):", "if pat.search(host) or host.endswith('bing.com'):"),
    ("precompute: excluded rows not counted", "excluded_by_source[src] = excluded_by_source.get(src, 0) + 1", "pass"),
    ("precompute: all-window since filter wrongly applied", "sub = rows\n", "sub = rows[:3]\n"),
]
for label, old, new in PY_MUTATIONS:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='pymut-'))
    shutil.copytree('scripts', tmp / 'scripts'); shutil.copytree('src/lib', tmp / 'src' / 'lib')
    f = tmp / 'scripts' / 'precompute_ai_referrals_v2.py'
    txt = f.read_text()
    if old not in txt:
        print(f"[BAD MUTATION] {label}"); survived += 1; continue
    f.write_text(txt.replace(old, new, 1))
    r = subprocess.run(['python3', str(tmp / 'scripts' / 'test_precompute_ai_referrals_v2.py')], capture_output=True, text=True)
    killed = r.returncode != 0
    print(f"[{'KILLED ' if killed else 'SURVIVED'}] {label}")
    survived += 0 if killed else 1
    shutil.rmtree(tmp, ignore_errors=True)
APP_MUTATIONS = [  # (label, file under src/, old, new) — run against a full src/ copy via DASH_SRC_ROOT
    ("page reads the old un-reverified ai-referrals-30.json again", "app/macao/crawler-dashboard/page.tsx", "`${CACHE_BASE}/ai-referrals-v2-${days}.json`", "`${CACHE_BASE}/ai-referrals-30.json`"),
    ("page reads a non-v2 all-time file", "app/macao/crawler-dashboard/page.tsx", "ai-referrals-v2-all.json", "ai-referrals-all.json"),
    ("route imports the Supabase client", "app/api/v1/ai-referrals/route.ts", "import { join } from 'node:path'", "import { join } from 'node:path'\nimport { createServiceClient } from '@/lib/supabase'"),
    ("page imports Supabase directly", "app/macao/crawler-dashboard/page.tsx", "import gsap from 'gsap'", "import gsap from 'gsap'\nimport { createServiceClient } from '@/lib/supabase'"),
    ("transitive: page's lib module (crawler-dashboard.ts) imports Supabase", "lib/crawler-dashboard.ts", "export type BotCategory", "import { createServiceClient } from './supabase'\nexport type BotCategory"),
    ("route drops the window->file helper", "app/api/v1/ai-referrals/route.ts", "aiReferralsCacheFile(days)", "'ai-referrals-30.json'"),
    ("days=3650 maps to the 90-day file", "lib/ai-referrals-windows.ts", "3650: 'all'", "3650: '90'"),
]
for label, rel, old, new in APP_MUTATIONS:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='appmut-'))
    shutil.copytree('src', tmp / 'src')
    f = tmp / 'src' / rel
    txt = f.read_text()
    if old not in txt:
        print(f"[BAD MUTATION] {label}"); survived += 1; continue
    f.write_text(txt.replace(old, new, 1))
    env = dict(__import__('os').environ, DASH_SRC_ROOT=str(tmp / 'src'))
    r = subprocess.run(['node', 'scripts/run-lib-tests.mjs', str(tmp / 'src' / 'lib')], capture_output=True, text=True, env=env)
    killed = r.returncode != 0
    print(f"[{'KILLED ' if killed else 'SURVIVED'}] {label}")
    survived += 0 if killed else 1
    shutil.rmtree(tmp, ignore_errors=True)
TOTAL = len(MUTATIONS) + len(PY_MUTATIONS) + len(APP_MUTATIONS)
print(f"\n{TOTAL - survived}/{TOTAL} mutations killed")
sys.exit(1 if survived else 0)
