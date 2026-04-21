// GET /api/property/visits   — 列表（含圖片）
// POST /api/property/visits  — 新增睇樓記錄
// PATCH /api/property/visits — 更新
// DELETE /api/property/visits — 刪除

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const AGENT = 'demo'

export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db
    .from('property_site_visits')
    .select(`
      *,
      property_visit_photos (
        id, image_url, room_type, ai_caption, ai_tags, is_defect, created_at
      )
    `)
    .eq('demo_agent_id', AGENT)
    .order('visit_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db   = createServiceClient()
  const { data, error } = await db
    .from('property_site_visits')
    .insert({ ...body, demo_agent_id: AGENT })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createServiceClient()
  const { data, error } = await db
    .from('property_site_visits')
    .update(updates)
    .eq('id', id)
    .eq('demo_agent_id', AGENT)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const db     = createServiceClient()
  const { error } = await db
    .from('property_site_visits')
    .delete()
    .eq('id', id)
    .eq('demo_agent_id', AGENT)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
