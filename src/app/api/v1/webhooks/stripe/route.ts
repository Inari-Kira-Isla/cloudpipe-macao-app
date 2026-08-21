import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' })
  : null

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// POST /api/v1/webhooks/stripe - Handle Stripe webhook events
export async function POST(req: NextRequest) {
  if (!stripe || !WEBHOOK_SECRET) {
    console.error('[stripe-webhook] Stripe not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Get order ID from metadata
        const orderId = session.metadata?.order_id
        
        if (orderId) {
          // Update order to paid
          await supabase
            .from('sea_urchin_orders')
            .update({
              status: 'paid',
              payment_status: 'paid',
              stripe_payment_intent: session.payment_intent as string,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .eq('stripe_session_id', session.id)

          console.log(`[stripe-webhook] Order ${orderId} marked as paid`)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.order_id

        if (orderId) {
          await supabase
            .from('sea_urchin_orders')
            .update({
              status: 'cancelled',
              payment_status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .eq('stripe_session_id', session.id)

          console.log(`[stripe-webhook] Order ${orderId} expired`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log(`[stripe-webhook] Payment failed: ${paymentIntent.id}`)
        // Could update order status to reflect failure
        break
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[stripe-webhook] Error processing event:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing error' },
      { status: 500 }
    )
  }
}
