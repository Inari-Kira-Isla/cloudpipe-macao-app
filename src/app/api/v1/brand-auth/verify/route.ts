import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim()

  if (!token) {
    return NextResponse.json({ valid: false, error: '缺少 token 參數' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch token record
  const { data: tokenRow, error: tokenError } = await supabase
    .from('brand_auth_tokens')
    .select('id, token, email, brand_slug, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenError) {
    console.error('[brand-auth/verify] token lookup error:', tokenError)
    return NextResponse.json({ valid: false, error: '系統錯誤，請稍後再試' }, { status: 500 })
  }

  if (!tokenRow) {
    return NextResponse.json({ valid: false, error: 'token 無效或不存在' }, { status: 401 })
  }

  if (tokenRow.used_at) {
    return NextResponse.json({ valid: false, error: 'token 已使用' }, { status: 401 })
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'token 已過期' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Mark token as used
  const { error: updateTokenError } = await supabase
    .from('brand_auth_tokens')
    .update({ used_at: now })
    .eq('id', tokenRow.id)

  if (updateTokenError) {
    console.error('[brand-auth/verify] token update error:', updateTokenError)
    // Non-fatal: still return success but log the issue
  }

  // Update brand_owners.last_login
  const { error: updateOwnerError } = await supabase
    .from('brand_owners')
    .update({ last_login: now })
    .eq('email', tokenRow.email)

  if (updateOwnerError) {
    console.error('[brand-auth/verify] owner last_login update error:', updateOwnerError)
    // Non-fatal
  }

  return NextResponse.json({
    valid: true,
    brand_slug: tokenRow.brand_slug,
    email: tokenRow.email,
  })
}
