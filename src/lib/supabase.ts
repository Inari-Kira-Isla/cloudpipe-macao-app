import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side: use service role to bypass RLS (SUPABASE_SERVICE_ROLE_KEY is not NEXT_PUBLIC_ so it never leaks to the browser)
// Client-side: SUPABASE_SERVICE_ROLE_KEY is undefined in the bundle → falls back to anon key automatically
const activeKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

export const supabase = createClient(supabaseUrl, activeKey)

// Server-side client with service role key (for API routes)
export function createServiceClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  )
}
