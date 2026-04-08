import { NextRequest, NextResponse } from 'next/server'
import { fetchBrandVisibility, BRAND_CONFIGS } from '@/lib/brand-visibility'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30')

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing slug parameter', available: Object.keys(BRAND_CONFIGS) },
      { status: 400 }
    )
  }

  if (!BRAND_CONFIGS[slug]) {
    return NextResponse.json(
      { error: `Brand '${slug}' not found`, available: Object.keys(BRAND_CONFIGS) },
      { status: 404 }
    )
  }

  try {
    const data = await fetchBrandVisibility(slug, days)
    if (!data) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Brand visibility error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
