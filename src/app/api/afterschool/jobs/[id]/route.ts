import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_SECRET = process.env.ASC_ADMIN_SECRET || 'asc2026admin'

function isAdmin(req: NextRequest): boolean {
  return req.headers.get('x-admin-secret') === ADMIN_SECRET
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('asc_content_jobs')
    .select('id,status,mode,customer_name,customer_message,style_pref,original_image_path,generated_image_path,caption_zh,caption_en,hashtags,platforms,social_post_ids,admin_notes,created_at,updated_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '找不到此工作' }, { status: 404 })
  }

  // Attach public URLs for images
  const result: Record<string, unknown> = { ...data }
  if (data.original_image_path) {
    const { data: { publicUrl } } = supabase.storage.from('asc-uploads').getPublicUrl(data.original_image_path)
    result.original_image_url = publicUrl
  }
  if (data.generated_image_path) {
    const { data: { publicUrl } } = supabase.storage.from('asc-uploads').getPublicUrl(data.generated_image_path)
    result.generated_image_url = publicUrl
  }

  return NextResponse.json(result)
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await req.json()
  const allowed = ['caption_zh', 'caption_en', 'hashtags', 'platforms', 'admin_notes', 'status']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) updates[k] = body[k]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '沒有有效欄位' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('asc_content_jobs')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
