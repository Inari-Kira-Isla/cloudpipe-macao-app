import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

// Per project CLAUDE.md rule #3: `force-dynamic` + `revalidate` MUST NOT coexist.
// Removed both; using `unstable_cache` for cross-instance caching instead.
export const revalidate = 120 // 2 min ISR
export const maxDuration = 30 // was 10 — caused 504 on cold start

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const fetchFaqConversions = unstable_cache(
  async (days: number) => {
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const { data, error } = await supabase
      .from('analytics_events')
      .select('merchant_slug, metadata, created_at')
      .eq('event_type', 'faq_arrival')
      .eq('conversion_type', 'faq')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) return { error: error.message, data: [], days }
    return { data: data || [], days }
  },
  ['faq-conversions-v1'],
  { revalidate: 120, tags: ['faq-conversions'] }
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)

  const result = await fetchFaqConversions(days)
  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
  })
}
