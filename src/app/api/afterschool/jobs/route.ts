import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_SECRET = process.env.ASC_ADMIN_SECRET || 'asc2026admin'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const supabase = createServiceClient()
  let query = supabase
    .from('asc_content_jobs')
    .select('id,status,mode,customer_name,customer_message,style_pref,original_image_path,generated_image_path,caption_zh,caption_en,platforms,social_post_ids,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach public URLs
  const jobs = (data || []).map(job => {
    const result: Record<string, unknown> = { ...job }
    if (job.original_image_path) {
      const { data: { publicUrl } } = supabase.storage.from('asc-uploads').getPublicUrl(job.original_image_path)
      result.original_image_url = publicUrl
    }
    if (job.generated_image_path) {
      const { data: { publicUrl } } = supabase.storage.from('asc-uploads').getPublicUrl(job.generated_image_path)
      result.generated_image_url = publicUrl
    }
    return result
  })

  return NextResponse.json({ jobs })
}
