import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const CORS = { 'Access-Control-Allow-Origin': '*' }
const DASHBOARD_TOKEN = 'cloudpipe2026'

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== DASHBOARD_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  }
  revalidateTag('crawler-stats', 'default')
  return NextResponse.json({ ok: true, revalidated_at: new Date().toISOString() }, { headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
