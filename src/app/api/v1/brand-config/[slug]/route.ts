import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 60

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('brand_configs')
      .select('slug, name_zh, name_en, industry_slug, category_slug, uvp, target_queries, differentiators, key_facts, faq_requirements, brand_url, mode, weight_pct, quality_target, updated_at')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[brand-config]', error)
    return NextResponse.json(
      { error: 'Failed to fetch brand config', detail: String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Token validation
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.BRAND_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slug } = await params
    const body = await request.json()

    // Only allow specific fields to be updated
    const allowedFields = ['uvp', 'target_queries', 'differentiators', 'key_facts', 'faq_requirements', 'brand_url', 'quality_target']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updates['updated_at'] = new Date().toISOString()
    updates['updated_by'] = 'admin'

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('brand_configs')
      .update(updates)
      .eq('slug', slug)
      .select('slug, uvp, target_queries, differentiators, updated_at')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[brand-config PATCH]', error)
    return NextResponse.json(
      { error: 'Failed to update brand config', detail: String(error) },
      { status: 500 }
    )
  }
}
