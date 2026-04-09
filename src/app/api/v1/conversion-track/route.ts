import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Conversion Track API — receives user visit + action beacons from brand sites
 * Writes to analytics_events table (matching existing schema).
 *
 * Brand sites send:
 *   POST /api/v1/conversion-track
 *   { site, ref_type, ref_url, page, ts, action? }
 *
 * ref_type: ai-chatgpt | ai-perplexity | ai-claude | ai-copilot |
 *   search-google | search-bing | social | referral | direct
 * action: visit (default) | wa-click | call | email
 */

const ALLOWED_SITES = new Set([
  'inari-global-foods', 'after-school-coffee', 'mind-coffee',
  'sea-urchin-delivery', 'yamanakada', 'cloudpipe-macao-app',
  'cloudpipe-landing', 'openclaw',
])

const SITE_TO_MERCHANT: Record<string, string> = {
  'inari-global-foods': 'inari-global-foods',
  'after-school-coffee': 'after-school-coffee',
  'mind-coffee': 'mind-coffee',
  'sea-urchin-delivery': 'sea-urchin-delivery',
  'yamanakada': 'yamanakada',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders })
  }

  const { site, ref_type, ref_url, page, ts, action } = body
  if (!site || !page) {
    return NextResponse.json({ error: 'Missing site or page' }, { status: 400, headers: corsHeaders })
  }
  if (!ALLOWED_SITES.has(site)) {
    return NextResponse.json({ error: 'Unknown site' }, { status: 400, headers: corsHeaders })
  }

  // Hash IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown'
  const encoder = new TextEncoder()
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(ip + 'cloudpipe-conv-2026'))
  const ipHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)

  const dateStr = new Date().toISOString().slice(0, 10)
  const sessionId = `${ipHash}-${site}-${dateStr}`
  const isAi = (ref_type || '').startsWith('ai-')
  const merchantSlug = SITE_TO_MERCHANT[site] || null

  // Map action to event_type + conversion_type
  let eventType = 'arrival'
  let conversionType: string | null = null
  if (action === 'wa-click') { eventType = 'conversion'; conversionType = 'whatsapp' }
  else if (action === 'call') { eventType = 'conversion'; conversionType = 'call' }
  else if (action === 'email') { eventType = 'conversion'; conversionType = 'email' }
  else if (isAi) { eventType = 'arrival' }
  else { eventType = 'arrival' }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await supabase.from('analytics_events').insert({
    event_type: eventType,
    session_id: sessionId,
    user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
    referrer: ref_url || null,
    region: 'macao',
    is_ai_generated: isAi,
    merchant_slug: merchantSlug,
    conversion_type: conversionType,
    metadata: {
      ref_type: ref_type || 'direct',
      page,
      site,
      ip_hash: ipHash,
      client_ts: ts || null,
    },
  })

  if (error) {
    console.error('[conversion-track]', error.message)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500, headers: corsHeaders })
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders })
}
