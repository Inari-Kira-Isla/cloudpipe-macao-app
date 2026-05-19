import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '無效的請求格式' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'email 為必填項' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check if email is a registered brand owner
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

  // Generate a unique token (Phase 1: no actual email sending, return token directly for demo)
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes

  const { error: insertError } = await supabase
    .from('brand_auth_tokens')
    .insert({
      token,
      email: owner.email,
      brand_slug: owner.brand_slug,
      expires_at: expiresAt,
    })

  if (insertError) {
    console.error('[brand-auth/magic-link] token insert error:', insertError)
    return NextResponse.json({ error: '無法生成登入連結，請稍後再試' }, { status: 500 })
  }

  const redirectUrl = `/portal/${owner.brand_slug}?token=${token}`

  // Phase 1: return token directly (dev/demo mode — production should email the link instead)
  return NextResponse.json({
    success: true,
    message: '登入連結已發送',
    // dev fields — remove or gate behind NODE_ENV check in production
    token,
    brand_slug: owner.brand_slug,
    redirect: redirectUrl,
    expires_at: expiresAt,
  })
}
