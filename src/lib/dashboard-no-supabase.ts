// Guard: the crawler-dashboard read path must be cache-only (design rule: local mirror -> precompute -> Blob;
// the dashboard must never query the cloud DB — t4g protection). Returns the violations found in a source text.
const FORBIDDEN: [RegExp, string][] = [
  [/@\/lib\/supabase/, "imports '@/lib/supabase'"],
  [/createServiceClient/, 'uses createServiceClient'],
  [/@supabase\//, "imports an '@supabase/*' package (supabase-js, ssr, ...)"],
  [/create\w*Client\s*\(/, 'calls a create*Client() factory'],
  [/SUPABASE_[A-Z_]*(URL|KEY)/, 'reads a SUPABASE_* env var (direct REST access)'],
  [/\/rest\/v1/, 'targets a PostgREST /rest/v1 endpoint'],
  [/\.from\(\s*['"`][a-z_]+['"`]\s*\)\s*\.\s*(select|insert|update|delete|upsert|rpc)/, 'queries a table via .from().select()'],
  [/\.supabase\.co/, 'references a supabase.co host'],
]
export function supabaseViolations(source: string): string[] {
  // strip comments so explanatory text ("never query Supabase") does not trip the guard
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  return FORBIDDEN.filter(([re]) => re.test(code)).map(([, why]) => why)
}
