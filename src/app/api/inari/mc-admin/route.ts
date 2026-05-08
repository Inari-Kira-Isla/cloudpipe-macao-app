// Merchant Center product approval admin API
// GET  /api/inari/mc-admin          → readiness report
// POST /api/inari/mc-admin          → approve / exclude / pause
import { NextResponse } from 'next/server'
import { getMcReadiness, approveMcProduct, excludeMcProduct, pauseMcProduct } from '@/lib/commerce-supabase'

const BRAND = 'inari-global-foods'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cloudpipe2026'

function checkAuth(req: Request) {
  const token = req.headers.get('x-admin-secret') || new URL(req.url).searchParams.get('secret')
  return token === ADMIN_SECRET
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await getMcReadiness(BRAND)
  const summary = {
    total: rows.length,
    approved: rows.filter(r => r.mc_status === 'approved').length,
    needs_image: rows.filter(r => r.mc_status === 'needs_image').length,
    needs_desc: rows.filter(r => r.mc_status === 'needs_desc').length,
    draft: rows.filter(r => r.mc_status === 'draft').length,
    excluded: rows.filter(r => r.mc_status === 'excluded').length,
    paused: rows.filter(r => r.mc_status === 'paused').length,
  }

  return NextResponse.json({ summary, products: rows })
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, slug, reason } = body as {
    action: 'approve' | 'exclude' | 'pause'
    slug: string
    reason?: string
  }

  if (!action || !slug) {
    return NextResponse.json({ error: 'action and slug required' }, { status: 400 })
  }

  let result: string
  if (action === 'approve') {
    result = await approveMcProduct(BRAND, slug)
  } else if (action === 'exclude') {
    result = await excludeMcProduct(BRAND, slug, reason ?? '手動排除')
  } else if (action === 'pause') {
    result = await pauseMcProduct(BRAND, slug, reason)
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ result })
}
