import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = 'sue-admin-2026'

export async function POST(req: NextRequest) {
  let body: {
    name?: string
    phone?: string
    email?: string
    customer_type?: string
    notes?: string
    source?: string
    delivery_area?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // At least one contact method required
  if (!body.phone?.trim() && !body.email?.trim()) {
    return NextResponse.json({ error: '請提供電話或電郵' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert on email (if provided), else insert
  const row = {
    name: body.name?.trim() || null,
    phone: body.phone?.trim() || null,
    email: body.email?.trim().toLowerCase() || null,
    customer_type: body.customer_type ?? 'retail',
    source: body.source ?? 'landing_page',
    notes: body.notes?.trim() || null,
    delivery_area: body.delivery_area?.trim() || null,
    tier: body.customer_type === 'restaurant' ? 'restaurant' : 'bronze',
  }

  let result: { id: string; tier: string; customer_type: string } | null = null

  if (row.email) {
    const { data, error } = await supabase
      .from('sea_urchin_customers')
      .upsert(row, { onConflict: 'email', ignoreDuplicates: false })
      .select('id, tier, customer_type')
      .single()

    if (error) {
      console.error('[sea-urchin-customers POST]', error)
      return NextResponse.json(
        { error: '登記失敗，請稍後再試' },
        { status: 500 }
      )
    }
    result = data

    // Log signup loyalty event
    await supabase
      .from('sea_urchin_loyalty')
      .insert({
        customer_id: result.id,
        event_type: 'signup',
        points: 10,
        metadata: { source: row.source },
      })
      .catch(() => {})
  } else {
    // Phone-only: just insert (no upsert key)
    const { data, error } = await supabase
      .from('sea_urchin_customers')
      .insert(row)
      .select('id, tier, customer_type')
      .single()

    if (error) {
      console.error('[sea-urchin-customers POST phone-only]', error)
      return NextResponse.json(
        { error: '登記失敗，請稍後再試' },
        { status: 500 }
      )
    }
    result = data
  }

  return NextResponse.json({
    success: true,
    message: '登記成功！我們會盡快與您聯絡。',
    tier: result?.tier,
    customer_type: result?.customer_type,
  })
}

export async function GET(req: NextRequest) {
  // Simple admin check: require a secret header
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const limit = parseInt(url.searchParams.get('limit') ?? '100')

  let query = supabase
    .from('sea_urchin_customers')
    .select(
      'id, name, phone, email, customer_type, source, tier, total_orders, total_spent, created_at, last_order_at, is_active'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq('customer_type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customers: data ?? [], total: data?.length ?? 0 })
}
