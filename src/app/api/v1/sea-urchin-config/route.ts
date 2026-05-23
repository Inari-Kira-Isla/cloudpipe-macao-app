import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = 'sue-admin-2026'

// GET /api/v1/sea-urchin-config — returns all config keys as a flat object
export async function GET() {
  try {
    const sb = createServiceClient()
    const { data, error } = await sb
      .from('sea_urchin_page_config')
      .select('key, value')

    if (error) throw error

    const config: Record<string, unknown> = {}
    for (const row of data ?? []) {
      config[row.key] = row.value
    }

    return NextResponse.json(config, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error('sea-urchin-config GET error:', err)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}

// PUT /api/v1/sea-urchin-config — update one or more keys
// Body: { key: string, value: unknown } or { updates: {key,value}[] }
// Requires header: x-admin-key: sue-admin-2026
export async function PUT(req: NextRequest) {
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { key?: string; value?: unknown; updates?: { key: string; value: unknown }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const pairs: { key: string; value: unknown }[] = body.updates
    ? body.updates
    : body.key !== undefined
    ? [{ key: body.key, value: body.value }]
    : []

  if (pairs.length === 0) {
    return NextResponse.json({ error: 'No keys to update' }, { status: 400 })
  }

  try {
    const sb = createServiceClient()
    for (const { key, value } of pairs) {
      const { error } = await sb
        .from('sea_urchin_page_config')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
    }
    return NextResponse.json({ ok: true, updated: pairs.map(p => p.key) })
  } catch (err) {
    console.error('sea-urchin-config PUT error:', err)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
