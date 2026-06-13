import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = process.env.BRAND_ADMIN_KEY ?? process.env.ADMIN_KEY ?? ''

// GET /api/brand-config?slug=after-school-coffee  → single brand
// GET /api/brand-config                           → all 5 brands
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    const sb = createServiceClient()

    let query = sb.from('brand_configs').select('*')
    if (slug) query = query.eq('slug', slug)

    const { data, error } = await query
    if (error) throw error

    const result = slug ? (data?.[0] ?? null) : data

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error('brand-config GET error:', err)
    return NextResponse.json({ error: 'Failed to load brand config' }, { status: 500 })
  }
}

// PUT /api/brand-config
// Body: { slug, field, value } — update single field
//    or { slug, key_facts: {...} } — replace entire key_facts
// Requires header: x-admin-key
export async function PUT(req: NextRequest) {
  if (!ADMIN_KEY || req.headers.get('x-admin-key') !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, field, value, ...rest } = body as {
    slug: string
    field?: string
    value?: unknown
    [key: string]: unknown
  }

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  try {
    const sb = createServiceClient()

    // Build update payload
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: 'admin-ui',
    }

    if (field && value !== undefined) {
      // Single field update — merge into key_facts if field is a known sub-field
      const topLevel = ['name_zh', 'name_en', 'industry_slug', 'uvp', 'brand_url', 'mode', 'weight_pct', 'quality_target']
      if (topLevel.includes(field)) {
        payload[field] = value
      } else {
        // Merge into key_facts
        const { data: current } = await sb
          .from('brand_configs')
          .select('key_facts')
          .eq('slug', slug)
          .single()
        const kf = (current?.key_facts as Record<string, unknown>) ?? {}
        kf[field] = value
        payload['key_facts'] = kf
      }
    } else {
      // Bulk update — pass through any extra keys
      Object.assign(payload, rest)
    }

    const { error } = await sb
      .from('brand_configs')
      .update(payload)
      .eq('slug', slug)

    if (error) throw error

    return NextResponse.json({ ok: true, slug, updated: Object.keys(payload) })
  } catch (err) {
    console.error('brand-config PUT error:', err)
    return NextResponse.json({ error: 'Failed to update brand config' }, { status: 500 })
  }
}
