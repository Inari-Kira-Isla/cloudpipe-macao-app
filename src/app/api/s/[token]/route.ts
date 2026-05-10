/**
 * GET /api/s/[token]
 *
 * CloudPipe short link redirect + server-side click tracking.
 * Looks up the token in Supabase `short_links`, records the click in
 * `social_clicks`, then issues a 302 redirect to the long URL.
 *
 * Bypasses UTM stripping in FB/Threads in-app browsers and iOS Privacy Relay —
 * the click is recorded before any redirect, so no query string is needed.
 *
 * Fallback: redirects to homepage if token is unknown (never 404 to user).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const FALLBACK_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://macao.wiki'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function hashIp(ip: string): string {
  // Lightweight non-crypto hash for rate-limit detection only (no PII stored)
  let h = 0
  for (let i = 0; i < ip.length; i++) {
    h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length > 16 || !/^[a-f0-9]+$/i.test(token)) {
    return NextResponse.redirect(FALLBACK_URL, { status: 302 })
  }

  const supabase = getSupabase()

  // Look up token
  const { data: link, error } = await supabase
    .from('short_links')
    .select('long_url, brand, slug')
    .eq('token', token)
    .single()

  if (error || !link) {
    return NextResponse.redirect(FALLBACK_URL, { status: 302 })
  }

  const longUrl = link.long_url

  // Record click (fire-and-forget; don't block redirect on DB write)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const ipHash = hashIp(ip)
  const referrer = request.headers.get('referer') || null
  const userAgent = request.headers.get('user-agent')?.slice(0, 300) || null

  supabase
    .from('social_clicks')
    .insert({
      token,
      brand: link.brand || null,
      slug: link.slug || null,
      referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
    })
    .then(({ error: insertError }) => {
      if (insertError) {
        console.error('[short-link] click insert error:', insertError.message)
      }
    })

  // click_count is derived from social_clicks on read; no update needed here.

  return NextResponse.redirect(longUrl, { status: 302 })
}
