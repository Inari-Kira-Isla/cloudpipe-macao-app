import { NextRequest, NextResponse } from 'next/server'

export function requireBrandAdminToken(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token || token !== process.env.BRAND_ADMIN_TOKEN) {
    return NextResponse.json(
      { error: 'Unauthorized. Valid BRAND_ADMIN_TOKEN required.' },
      { status: 401 }
    )
  }
  return null
}
