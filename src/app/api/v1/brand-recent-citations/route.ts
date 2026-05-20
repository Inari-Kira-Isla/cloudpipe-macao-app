import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const brandSlug = req.nextUrl.searchParams.get('brand_slug')?.trim()
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '12'), 50)
  if (!brandSlug) return NextResponse.json({ error: 'brand_slug required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('ai_search_results')
    .select('timestamp, platform, query, mentioned')
    .eq('brand_slug', brandSlug)
    .eq('mentioned', true)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ citations: data ?? [] })
}
