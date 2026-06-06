import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { email?: string; brand_slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '無效的請求格式' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const requestedSlug = (body.brand_slug ?? '').trim()
  if (!email) {
    return NextResponse.json({ error: 'email 為必填項' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check if email is a registered brand owner (any brand)
  const { data: owner, error: ownerError } = await supabase
    .from('brand_owners')
    .select('email, brand_slug, display_name')
    .eq('email', email)
    .maybeSingle()

  if (ownerError) {
    console.error('[brand-auth/magic-link] owner lookup error:', ownerError)
    return NextResponse.json({ error: '系統錯誤，請稍後再試' }, { status: 500 })
  }

  if (!owner) {
    return NextResponse.json({ error: '此 email 未在系統中' }, { status: 403 })
  }

  // Use requested brand_slug if provided; fall back to the registered one
  const effectiveSlug = requestedSlug || owner.brand_slug

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h to match portal session

  const { error: insertError } = await supabase
    .from('brand_auth_tokens')
    .insert({
      token,
      email: owner.email,
      brand_slug: effectiveSlug,
      expires_at: expiresAt,
    })

  if (insertError) {
    console.error('[brand-auth/magic-link] token insert error:', insertError)
    return NextResponse.json({ error: '無法生成登入連結，請稍後再試' }, { status: 500 })
  }

  // SECURITY: Never return the token in the response body.
  // The token must only reach the account owner via email (or the portal UI that initiates this).
  // Returning it here would allow any caller who knows an email to obtain a valid 24h session token.
  return NextResponse.json({
    success: true,
    message: '登入連結已生成，請由品牌門戶頁面點擊登入',
    brand_slug: effectiveSlug,
  })
}
