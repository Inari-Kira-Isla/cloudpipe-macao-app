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
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    {
      global: {
        // Hard 8s timeout — prevents connections hanging during bot crawl spikes
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, signal: AbortSignal.timeout(8000) }),
      },
    }
  )
}

// Sitemap-only client: longer 30s timeout because ISR background regeneration
// is single-threaded (no concurrent-bot problem) and needs to paginate through
// 20K+ insight rows. The 8s limit in createServiceClient() causes every ISR
// attempt to time out → empty sitemap cache persists indefinitely.
export function createSitemapServiceClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
      },
    }
  )
}
