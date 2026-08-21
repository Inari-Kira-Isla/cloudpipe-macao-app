import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Initialize Stripe (only if secret key is configured)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' })
  : null

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

// POST /api/v1/checkout - Create Stripe Checkout Session
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Payment system not configured' },
      { status: 503 }
    )
  }

  let body: {
    orderId?: string
    amount?: number
    currency?: string
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    productName?: string
    successUrl?: string
    cancelUrl?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    orderId,
    amount = 0,
    currency = 'mop',
    customerName,
    customerEmail,
    customerPhone,
    productName = '海膽訂單',
    successUrl,
    cancelUrl,
  } = body

  if (!orderId || amount <= 0) {
    return NextResponse.json(
      { error: 'Missing orderId or invalid amount' },
      { status: 400 }
    )
  }

  // Map MOP to Stripe-supported currency or use MOP as-is
  // Stripe supports MOP (Macanese Pataca) - no conversion needed
  const stripeCurrency = currency.toLowerCase()

  try {
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'alipay'], // Alipay for Hong Kong/Macau
      line_items: [
        {
          price_data: {
            currency: stripeCurrency === 'mop' ? 'mop' : stripeCurrency,
            product_data: {
              name: productName,
              description: `訂單 #${orderId}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${SITE_URL}/sea-urchin/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: cancelUrl || `${SITE_URL}/sea-urchin/cart?order_id=${orderId}`,
      customer_email: customerEmail || undefined,
      metadata: {
        order_id: orderId,
        customer_name: customerName || '',
        customer_phone: customerPhone || '',
      },
      phone_number_collection: {
        enabled: true,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    })

    // Update order with Stripe session ID
    const supabase = createServiceClient()
    await supabase
      .from('sea_urchin_orders')
      .update({
        stripe_session_id: session.id,
        payment_method: 'stripe_checkout',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (err) {
    console.error('[checkout POST] Stripe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment creation failed' },
      { status: 500 }
    )
  }
}

// GET /api/v1/checkout - Health check or verify payment status
export async function GET(req: NextRequest) {
  // Health check without session_id
  const url = new URL(req.url)
  if (!url.searchParams.get('session_id')) {
    // Return 200 if Stripe is configured, 503 otherwise
    if (stripe) {
      return NextResponse.json({ status: 'ok', stripe: true })
    }
    return NextResponse.json({ status: 'disabled', stripe: false }, { status: 503 })
  }

  if (!stripe) {
    return NextResponse.json(
      { error: 'Payment system not configured' },
      { status: 503 }
    )
  }

  const sessionId = url.searchParams.get('session_id')
  const orderId = url.searchParams.get('order_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      // Update order status to paid
      const supabase = createServiceClient()
      await supabase
        .from('sea_urchin_orders')
        .update({
          status: 'paid',
          payment_status: 'paid',
          stripe_payment_intent: session.payment_intent as string,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('stripe_session_id', sessionId)

      return NextResponse.json({
        success: true,
        paid: true,
        orderId,
        amount: session.amount_total,
      })
    }

    return NextResponse.json({
      success: true,
      paid: false,
      status: session.payment_status,
    })
  } catch (err) {
    console.error('[checkout GET] Stripe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    )
  }
}
