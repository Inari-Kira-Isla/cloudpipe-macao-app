import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = 'sue-admin-2026'

export async function POST(req: NextRequest) {
  let body: {
    customer_id?: string
    phone?: string
    email?: string
    product_name?: string
    quantity_grams?: number
    amount_mop?: number
    delivery_date?: string
    delivery_area?: string
    notes?: string
    source?: string
    status?: string
    // Cart checkout fields
    customer_name?: string
    address?: string
    delivery_day?: string
    delivery_slot?: string
    items?: unknown
    subtotal?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // If no customer_id but have phone/email, look up or create customer
  let customerId = body.customer_id
  if (!customerId && (body.phone || body.email)) {
    let contact: { data: { id: string } | null; error: any }
    if (body.email) {
      contact = await supabase
        .from('sea_urchin_customers')
        .select('id')
        .eq('email', body.email.toLowerCase())
        .maybeSingle()
    } else {
      contact = await supabase
        .from('sea_urchin_customers')
        .select('id')
        .eq('phone', body.phone!)
        .maybeSingle()
    }
    customerId = contact.data?.id
  }

  const insertData: Record<string, unknown> = {
    customer_id: customerId ?? null,
    product_name: body.product_name ?? '海膽套裝',
    quantity_grams: body.quantity_grams ?? null,
    amount_mop: body.amount_mop ?? body.subtotal ?? null,
    delivery_date: body.delivery_date ?? null,
    delivery_area: body.delivery_area ?? body.address ?? null,
    notes: body.notes ?? null,
    source: body.source ?? 'api',
    status: body.status ?? 'inquiry',
  }
  // Cart checkout extra fields (only set if column exists — gracefully ignored otherwise)
  if (body.customer_name) insertData.customer_name = body.customer_name
  if (body.phone)         insertData.phone = body.phone
  if (body.address)       insertData.address = body.address
  if (body.delivery_day)  insertData.delivery_day = body.delivery_day
  if (body.delivery_slot) insertData.delivery_slot = body.delivery_slot
  if (body.items)         insertData.items = body.items
  if (body.subtotal)      insertData.subtotal = body.subtotal

  const { data, error } = await supabase
    .from('sea_urchin_orders')
    .insert(insertData)
    .select('id, status')
    .single()

  if (error) {
    console.error('[sea-urchin-orders POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update customer order count if linked
  if (customerId) {
    await supabase.rpc('increment_customer_orders', { cid: customerId }).then(() => {}, () => {})
  }

  return NextResponse.json({
    success: true,
    order_id: data.id,
    status: data.status,
  })
}

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const limit = parseInt(url.searchParams.get('limit') ?? '50')

  let query = supabase
    .from('sea_urchin_orders')
    .select(
      `
      id, product_name, quantity_grams, amount_mop,
      delivery_date, delivery_area, status, notes, created_at, updated_at,
      sea_urchin_customers ( id, name, phone, email, customer_type )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders: data ?? [], total: data?.length ?? 0 })
}
