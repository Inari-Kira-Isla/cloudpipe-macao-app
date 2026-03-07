import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const category = searchParams.get('category')
  const district = searchParams.get('district')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('merchants')
    .select('code, slug, name_zh, name_en, phone, website, address_zh, district, latitude, longitude, google_rating, google_reviews, price_range, tier, category:categories(slug, name_zh)', { count: 'exact' })
    .eq('status', 'live')
    .order('code')
    .range(offset, offset + limit - 1)

  if (category) query = query.eq('category.slug', category)
  if (district) query = query.eq('district', district)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    meta: {
      total: count,
      limit,
      offset,
      source: 'CloudPipe AI 澳門商戶百科',
      license: 'CC BY 4.0',
    },
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
