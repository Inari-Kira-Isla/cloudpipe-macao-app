import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export const maxDuration = 10

/**
 * POST /api/v1/track-click
 *
 * Lightweight beacon endpoint for client-side click tracking.
 * Accepts sendBeacon payloads from ClickTracker component.
 * Writes to analytics_events table (same table brand-funnel reads).
 *
 * Payload: { action, source_page, target_slug?, source_slug?, referrer?, is_ai_referral?, ts }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, source_page, target_slug, source_slug, referrer, is_ai_referral, ts } = body

    if (!action || !source_page) {
      return new NextResponse(null, { status: 204 }) // silently drop malformed beacons
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Hash IP for session grouping
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || 'unknown'
    const encoder = new TextEncoder()
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(ip + 'cloudpipe-click-2026'))
    const ipHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
    const dateStr = new Date().toISOString().slice(0, 10)
    const sessionId = `${ipHash}-click-${dateStr}`

    // Detect AI referral from referrer URL
    const isAi = is_ai_referral || (referrer && /chatgpt|perplexity|claude|copilot|bing\.com\/chat|you\.com/i.test(referrer))

    // Map action to event_type + conversion_type
    let eventType = 'click'
    let conversionType: string | null = null
    let merchantSlug: string | null = null

    if (action === 'page-view') {
      eventType = 'arrival'
    } else if (action === 'merchant-click') {
      eventType = 'click'
      merchantSlug = target_slug || null
    } else if (action === 'phone-click') {
      eventType = 'conversion'
      conversionType = 'call'
      merchantSlug = source_page?.split(':')[1] || null
    } else if (action === 'website-click') {
      eventType = 'click'
      merchantSlug = source_page?.split(':')[1] || null
    } else if (action === 'email-click') {
      eventType = 'conversion'
      conversionType = 'email'
      merchantSlug = source_page?.split(':')[1] || null
    } else if (action === 'claim-click') {
      eventType = 'conversion'
      conversionType = 'claim'
      merchantSlug = source_page?.split(':')[1] || null
    } else if (action === 'insight-click') {
      eventType = 'click'
    }

    const { error } = await supabase.from('analytics_events').insert({
      event_type: eventType,
      session_id: sessionId,
      user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
      referrer: referrer || request.headers.get('referer') || null,
      region: 'macao',
      is_ai_generated: !!isAi,
      merchant_slug: merchantSlug,
      conversion_type: conversionType,
      metadata: {
        action,
        source_page,
        target_slug: target_slug || null,
        source_slug: source_slug || null,
        ip_hash: ipHash,
        client_ts: ts || null,
      },
    })

    if (error) {
      console.error('[track-click]', error.message)
    }

    return new NextResponse(null, { status: 204 }) // beacon expects no response body
  } catch {
    return new NextResponse(null, { status: 204 }) // never fail beacons
  }
}

// Handle CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
