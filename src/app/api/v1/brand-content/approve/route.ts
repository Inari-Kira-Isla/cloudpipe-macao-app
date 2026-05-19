import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

interface ApproveBody {
  draft_id?: unknown
  action?: unknown
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: ApproveBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.draft_id !== 'string' || !body.draft_id.trim()) {
    return NextResponse.json({ error: 'draft_id is required' }, { status: 400 })
  }

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify the draft belongs to this brand (prevents cross-brand operations)
  const { data: existing, error: fetchError } = await supabase
    .from('brand_content_drafts')
    .select('id, brand_slug, status')
    .eq('id', body.draft_id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  if (existing.brand_slug !== session.brand_slug) {
    return NextResponse.json({ error: 'Forbidden: draft belongs to a different brand' }, { status: 403 })
  }

  const newStatus = body.action === 'approve' ? 'approved' : 'rejected'
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('brand_content_drafts')
    .update({
      status: newStatus,
      reviewed_by: session.email,
      reviewed_at: now,
    })
    .eq('id', body.draft_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    action: body.action,
    draft: data,
  })
}
