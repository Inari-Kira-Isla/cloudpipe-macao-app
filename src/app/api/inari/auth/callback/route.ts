import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/inari/portal?error=no_code', req.url))

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data, error } = await client.auth.exchangeCodeForSession(code)
  if (error || !data.session) {
    return NextResponse.redirect(new URL('/inari/portal?error=auth_failed', req.url))
  }

  const res = NextResponse.redirect(new URL('/inari/portal/dashboard', req.url))
  res.cookies.set('sb-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  })
  return res
}
