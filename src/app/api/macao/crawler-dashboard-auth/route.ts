import { NextRequest, NextResponse } from 'next/server'

// Server-side gate for /macao/crawler-dashboard. The password used to be a plaintext
// constant inside the client component (shipped in the JS bundle, readable via view-source),
// then a hardcoded server-side fallback ('cloudpipe2026'). Both are gone: the only valid
// credential is CRAWLER_DASHBOARD_PASSWORD in Vercel env. If it isn't set, auth fails closed
// (every attempt is rejected) rather than falling back to any known/default password.
const COOKIE_NAME = 'dash_auth'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// Returns null (fail closed) when the env var isn't configured — no fallback password.
function getPassword(): string | null {
  return process.env.CRAWLER_DASHBOARD_PASSWORD || null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { password?: unknown } | null
  const password = body?.password
  const expected = getPassword()

  if (!expected || typeof password !== 'string' || password !== expected) {
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
