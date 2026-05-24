import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/brandAuth'
import { ACTION_LABELS, executeAction } from '@/lib/brandActions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { action_type: string; brand_slug: string; context?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { action_type, brand_slug, context } = body
  if (!action_type || !brand_slug) return NextResponse.json({ error: 'action_type and brand_slug required' }, { status: 400 })
  if (session.brand_slug !== brand_slug) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const result = await executeAction(action_type, brand_slug, context)
    return NextResponse.json({
      success: true, action_type,
      label: ACTION_LABELS[action_type] ?? action_type,
      ...result,
    })
  } catch (err) {
    console.error('[brand-execute]', action_type, err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
