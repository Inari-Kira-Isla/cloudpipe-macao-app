import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple auth: use a shared secret in query param
const REVIEW_SECRET = process.env.AUDIT_REVIEW_SECRET || 'cloudpipe-audit-2026'

/**
 * GET /api/v1/audit-review — Fetch pending reviews from Supabase
 * POST /api/v1/audit-review — Submit review decision
 *
 * Review decisions are stored in Supabase `crawler_visits` table
 * with page_type='audit_review' as a lightweight storage hack
 * (since we can't create new tables via REST API)
 */

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== REVIEW_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Fetch pending reviews from the audit_reviews "virtual table"
  // stored as JSON in crawler_visits with page_type='audit_review'
  const { data } = await supabase
    .from('crawler_visits')
    .select('*')
    .eq('page_type', 'audit_review')
    .order('ts', { ascending: false })
    .limit(100)

  return NextResponse.json({
    reviews: data || [],
    count: data?.length || 0,
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { secret, item_id, action, target_slug, reviewer } = body

    if (secret !== REVIEW_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!item_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'invalid params' }, { status: 400 })
    }

    // Store review decision
    const { error } = await supabase
      .from('crawler_visits')
      .insert({
        bot_name: 'audit_review',
        bot_owner: reviewer || 'kira',
        path: `/audit/review/${item_id}/${action}`,
        page_type: 'audit_review',
        industry: action,  // approve/reject
        category: String(item_id),
        session_id: `review-${Date.now()}`,
        ua_raw: JSON.stringify({ item_id, action, target_slug, ts: new Date().toISOString() }),
        site: 'audit-system',
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: `${action}d item #${item_id}`,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
