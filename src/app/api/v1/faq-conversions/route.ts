import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 10
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)

  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data, error } = await supabase
    .from('analytics_events')
    .select('merchant_slug, metadata, created_at')
    .eq('event_type', 'faq_arrival')
    .eq('conversion_type', 'faq')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], days })
}
