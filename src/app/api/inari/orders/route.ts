import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createOrder, getB2bCustomer } from '@/lib/inari-supabase'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return NextResponse.json({ error: '未授權' }, { status: 401 })

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await client.auth.getUser(token)
  if (!user?.email) return NextResponse.json({ error: '未授權' }, { status: 401 })

  const customer = await getB2bCustomer(user.email)
  if (!customer?.is_active) return NextResponse.json({ error: '帳戶未啟用' }, { status: 403 })

  const body = await req.json()
  const result = await createOrder({
    customer_id: customer.id,
    customer_email: user.email,
    order_type: 'b2b',
    items: body.items ?? [],
    subtotal: body.subtotal,
    shipping_fee: body.shipping_fee ?? 0,
    total: body.total,
    currency: 'MOP',
    shipping_addr: body.shipping_addr,
    delivery_date: body.delivery_date,
    notes: body.notes,
  })

  if (!result) return NextResponse.json({ error: '下單失敗，請重試' }, { status: 500 })
  return NextResponse.json(result, { status: 201 })
}
