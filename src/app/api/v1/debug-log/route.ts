import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Test INSERT
  const testRow = {
    ip_hash: 'debug-test',
    bot_name: 'DebugBot',
    bot_owner: 'Debug',
    path: '/debug-test',
    page_type: 'test',
    site: 'cloudpipe-macao-app',
    ua_raw: 'DebugBot/1.0',
    ts: new Date().toISOString(),
    session_id: `debug-${Date.now()}`,
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey!,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(testRow),
    })

    const body = await res.text()
    return NextResponse.json({
      supabaseUrl: supabaseUrl?.slice(0, 40),
      serviceKeyPrefix: serviceKey?.slice(0, 25) + '...',
      anonKeyPrefix: anonKey?.slice(0, 25) + '...',
      insertStatus: res.status,
      insertBody: body.slice(0, 200),
      testRow,
    })
  } catch (err) {
    return NextResponse.json({
      error: String(err),
      supabaseUrl: supabaseUrl?.slice(0, 40),
      serviceKeyPrefix: serviceKey?.slice(0, 25) + '...',
    }, { status: 500 })
  }
}
