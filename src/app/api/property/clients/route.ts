// GET /api/property/clients  — 列表
// POST /api/property/clients — 新增
// PATCH /api/property/clients — 更新
// DELETE /api/property/clients — 刪除

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const AGENT = 'demo'

export async function GET() {
  const db = createServiceClient()
  const { data, error } = await db
    .from('property_clients')
    .select('*')
    .eq('demo_agent_id', AGENT)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db   = createServiceClient()
  const { data, error } = await db
    .from('property_clients')
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
    .from('property_clients')
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
    .from('property_clients')
    .delete()
    .eq('id', id)
    .eq('demo_agent_id', AGENT)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
