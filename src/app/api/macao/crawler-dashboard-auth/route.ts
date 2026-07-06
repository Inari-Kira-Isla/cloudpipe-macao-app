import { NextRequest, NextResponse } from 'next/server'

// Server-side gate for /macao/crawler-dashboard. The password used to be a plaintext
// constant inside the client component (shipped in the JS bundle, readable via view-source).
// It now never leaves the server: comparison happens here, and success sets an httpOnly
// cookie the client can neither read nor forge.
const COOKIE_NAME = 'dash_auth'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// Falls back to the pre-existing password so behavior is unchanged until Kira sets
// CRAWLER_DASHBOARD_PASSWORD in Vercel env vars — set it there to fully rotate off this default.
function getPassword(): string {
  return process.env.CRAWLER_DASHBOARD_PASSWORD || 'cloudpipe2026'
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { password?: unknown } | null
  const password = body?.password

  if (typeof password !== 'string' || password !== getPassword()) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, 'ok', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
  return res
}

export async function GET(req: NextRequest) {
  const authed = req.cookies.get(COOKIE_NAME)?.value === 'ok'
  return NextResponse.json({ authed })
}
