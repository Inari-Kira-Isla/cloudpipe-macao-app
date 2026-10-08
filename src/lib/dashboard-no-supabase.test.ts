import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { supabaseViolations } from './dashboard-no-supabase'
import { assertEqual, finish } from './test-helpers'

// Real files on the dashboard request path (run from repo root, as `npm run test:lib` does).
for (const f of ['src/app/api/v1/ai-referrals/route.ts', 'src/app/macao/crawler-dashboard/page.tsx']) {
  assertEqual(supabaseViolations(readFileSync(resolve(f), 'utf8')), [], `${f}: zero Supabase access`)
}
// Negative controls: the guard must actually fire.
assertEqual(supabaseViolations("import { createServiceClient } from '@/lib/supabase'").length >= 2, true, 'detects service-client import')
assertEqual(supabaseViolations("const r = await supabase.from('ai_referrals').select('*')").length >= 1, true, 'detects .from().select()')
assertEqual(supabaseViolations("fetch('https://abc.supabase.co/rest/v1/x')").length >= 1, true, 'detects supabase.co host')
assertEqual(supabaseViolations("// never query Supabase here\n/* createServiceClient */ const x = 1"), [], 'comments do not trip the guard')
finish()
