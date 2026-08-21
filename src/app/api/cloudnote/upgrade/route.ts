import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

// Initialize Stripe (only if secret key is configured)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-07-29.dahlia' })
  : null

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
const WHATSAPP_NUMBER = '85362823037'

// Tier configuration
const TIER_CONFIG = {
  free: {
    name: '個人免費版',
    price_mop: 0,
    notes_limit: 100,
    team_members: 1,
    api_access: false,
    cloud_sync: false,
    support_priority: false,
  },
  pro: {
    name: '專業版',
    price_mop: 99,
    notes_limit: -1, // unlimited
    team_members: 5,
    api_access: true,
    cloud_sync: true,
    support_priority: true,
  },
  enterprise: {
    name: '企業版',
    price_mop: 299,
    notes_limit: -1,
    team_members: -1, // unlimited
    api_access: true,
    cloud_sync: true,
    support_priority: true,
  },
}

// POST /api/cloudnote/upgrade - Create upgrade intent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, tier, payment_method } = body

    if (!email || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: email, tier' },
        { status: 400 }
      )
    }

    if (!TIER_CONFIG[tier as keyof typeof TIER_CONFIG]) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be: free, pro, or enterprise' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if user exists
    let { data: existingUser } = await supabase
      .from('cloudnote_users')
      .select('*')
      .eq('email', email)
      .single()

    const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]
    
    // Generate payment link for paid tiers
    let paymentUrl: string | null = null
    let stripeSessionId: string | null = null
    
    if (tier !== 'free' && tierConfig.price_mop > 0) {
      if (stripe) {
        try {
          // Create Stripe Checkout Session for CloudNote subscription
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'alipay'],
            line_items: [
              {
                price_data: {
                  currency: 'mop',
                  product_data: {
                    name: `CloudNote ${tierConfig.name}`,
                    description: `CloudNote 訂閱 - ${tierConfig.name} (MOP ${tierConfig.price_mop}/月)`,
                  },
                  unit_amount: Math.round(tierConfig.price_mop * 100),
                  recurring: {
                    interval: 'month',
                  },
                },
                quantity: 1,
              },
            ],
            mode: 'subscription',
            success_url: `${SITE_URL}/notes/pricing?payment=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${SITE_URL}/notes/pricing?payment=cancelled&tier=${tier}`,
            customer_email: email,
            metadata: {
              tier,
              email,
              name: name || '',
            },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          })
          paymentUrl = session.url
          stripeSessionId = session.id
        } catch (stripeErr) {
          console.error('Stripe checkout error:', stripeErr)
          // Fallback to WhatsApp payment link
          paymentUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=我想升級 CloudNote ${tierConfig.name}，金額 MOP ${tierConfig.price_mop}/月`
        }
      } else {
        // No Stripe configured - use WhatsApp fallback
        paymentUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=我想升級 CloudNote ${tierConfig.name}，金額 MOP ${tierConfig.price_mop}/月`
      }
    }

    if (existingUser) {
      // Upgrade existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('cloudnote_users')
        .update({
          tier,
          subscription_start_date: new Date().toISOString(),
          // If upgrading to paid tier, set end date to 30 days from now
          subscription_end_date: tier !== 'free' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
          entitlements: JSON.stringify({
            notes: tierConfig.notes_limit === -1 ? 'unlimited' : tierConfig.notes_limit,
            team_members: tierConfig.team_members,
            api_access: tierConfig.api_access,
            cloud_sync: tierConfig.cloud_sync,
            support_priority: tierConfig.support_priority,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('email', email)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        )
      }

      // Log the upgrade event
      await supabase.from('cloudnote_subscription_events').insert({
        user_id: updatedUser.id,
        event_type: existingUser.tier === tier ? 'renewed' : (TIER_CONFIG[existingUser.tier as keyof typeof TIER_CONFIG]?.price_mop || 0) < tierConfig.price_mop ? 'upgraded' : 'downgraded',
        old_tier: existingUser.tier,
        new_tier: tier,
        amount_paid: tierConfig.price_mop * 100,
        currency: 'MOP',
        payment_provider: paymentUrl?.includes('wa.me') ? 'whatsapp' : 'stripe',
        metadata: JSON.stringify({ payment_method, stripe_session_id: stripeSessionId }),
      })

      return NextResponse.json({
        success: true,
        user: updatedUser,
        tier_config: tierConfig,
        payment_url: paymentUrl,
        message: tier === 'free' 
          ? 'Tier updated successfully' 
          : paymentUrl 
            ? '請點擊以下連結完成付款'
            : 'Upgrade initiated. We will contact you via WhatsApp for payment.',
      })
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('cloudnote_users')
      .insert({
        email,
        name: name || email.split('@')[0],
        tier,
        status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: tier !== 'free'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        entitlements: JSON.stringify({
          notes: tierConfig.notes_limit === -1 ? 'unlimited' : tierConfig.notes_limit,
          team_members: tierConfig.team_members,
          api_access: tierConfig.api_access,
          cloud_sync: tierConfig.cloud_sync,
          support_priority: tierConfig.support_priority,
        }),
        source: 'direct',
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    // Log the subscription event
    await supabase.from('cloudnote_subscription_events').insert({
      user_id: newUser.id,
      event_type: 'created',
      old_tier: null,
      new_tier: tier,
      amount_paid: tierConfig.price_mop * 100,
      currency: 'MOP',
      payment_provider: paymentUrl?.includes('wa.me') ? 'whatsapp' : 'stripe',
      metadata: JSON.stringify({ stripe_session_id: stripeSessionId }),
    })

    return NextResponse.json({
      success: true,
      user: newUser,
      tier_config: tierConfig,
      payment_url: paymentUrl,
      message: tier === 'free' 
        ? 'Account created successfully' 
        : paymentUrl 
          ? '請點擊以下連結完成付款'
          : 'Account created! We will contact you via WhatsApp for payment.',
    })
  } catch (error) {
    console.error('CloudNote upgrade error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/cloudnote/upgrade - Get tier info
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ tiers: TIER_CONFIG })
  }

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('cloudnote_users')
    .select('*')
    .eq('email', email)
    .single()

  return NextResponse.json({
    tiers: TIER_CONFIG,
    current_user: user,
  })
}
