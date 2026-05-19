import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createOrder, getB2bCustomer } from '@/lib/inari-supabase'

export async function POST(req: Request) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Route Handler — cookie setting handled by middleware
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
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
