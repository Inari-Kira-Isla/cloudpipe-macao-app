import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { supabaseViolations } from './dashboard-no-supabase'
import { aiReferralsCacheFile } from './ai-referrals-windows'
import { assertEqual, finish } from './test-helpers'

// DASH_SRC_ROOT lets the mutation harness point this test at a mutated copy of src/.
const SRC = resolve(process.env.DASH_SRC_ROOT || 'src')
const ENTRY = ['app/api/v1/ai-referrals/route.ts', 'app/macao/crawler-dashboard/page.tsx']

function resolveLocal(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? resolve(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null
  if (!base) return null // npm package (react, gsap, next/server, node:*) — not our code
  for (const c of [base, base + '.ts', base + '.tsx', resolve(base, 'index.ts'), resolve(base, 'index.tsx')]) {
    if (existsSync(c) && /\.(ts|tsx)$/.test(c)) return c
  }
  return null
}
// Transitive closure of local modules imported by the dashboard AI-referral read path.
function closure(entries: string[]): string[] {
  const seen = new Set<string>(); const queue = entries.map(e => resolve(SRC, e))
  while (queue.length) {
    const f = queue.pop()!; if (seen.has(f)) continue; seen.add(f)
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const r = resolveLocal(f, m[1] || m[2] || m[3]); if (r) queue.push(r)
    }
  }
  return [...seen]
}

const files = closure(ENTRY)
assertEqual(files.length >= 5, true, `closure covers the entry files plus their local imports (${files.length} files)`)
for (const f of files) assertEqual(supabaseViolations(readFileSync(f, 'utf8')), [], `${f.replace(SRC, 'src')}: zero Supabase access`)

// Negative controls: the guard must actually fire.
assertEqual(supabaseViolations("import { createServiceClient } from '@/lib/supabase'").length >= 2, true, 'detects service-client import')
assertEqual(supabaseViolations("const r = await supabase.from('ai_referrals').select('*')").length >= 1, true, 'detects .from().select()')
assertEqual(supabaseViolations("fetch('https://abc.supabase.co/rest/v1/x')").length >= 1, true, 'detects supabase.co host')
assertEqual(supabaseViolations("// never query Supabase here\n/* createServiceClient */ const x = 1"), [], 'comments do not trip the guard')

// Which cache file does each window read? Pin page + route + mapping (round-2: page reverting to ai-referrals-30.json must go red).
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const page = strip(readFileSync(resolve(SRC, ENTRY[1]), 'utf8'))
const route = strip(readFileSync(resolve(SRC, ENTRY[0]), 'utf8'))
const mentions = [...page.matchAll(/ai-referrals[-\w${}]*\.json/g)].map(m => m[0])
assertEqual(mentions.length >= 2, true, 'page references the v2 cache files')
assertEqual(mentions.every(n => n.startsWith('ai-referrals-v2-')), true, `page only fetches ai-referrals-v2-* (found: ${[...new Set(mentions)].join(', ')})`)
assertEqual(page.includes('ai-referrals-v2-${days}.json') && page.includes('ai-referrals-v2-all.json'), true, 'page reads v2 per-window and v2-all')
assertEqual(/ai-referrals-30\.json/.test(page), false, 'page never reads the un-reverified ai-referrals-30.json')
assertEqual(/ai-referrals-30\.json/.test(route), false, 'route never reads ai-referrals-30.json')
assertEqual(route.includes('aiReferralsCacheFile'), true, 'route picks its file via aiReferralsCacheFile')
assertEqual(aiReferralsCacheFile(3650), 'ai-referrals-v2-all.json', 'days=3650 -> v2-all')
assertEqual(aiReferralsCacheFile(30), 'ai-referrals-v2-30.json', 'days=30 -> v2-30')
assertEqual(aiReferralsCacheFile(90), 'ai-referrals-v2-90.json', 'days=90 -> v2-90')
assertEqual(aiReferralsCacheFile(1), 'ai-referrals-v2-1.json', 'days=1 -> v2-1')
assertEqual(aiReferralsCacheFile(31), null, 'unsupported window -> null (400, no DB)')
finish()
