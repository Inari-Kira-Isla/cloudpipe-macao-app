import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_SECRET = process.env.ASC_ADMIN_SECRET || 'asc2026admin'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return NextResponse.json({ error: '未授權' }, { status: 401 })
  }

  const { id } = await context.params
  const supabase = createServiceClient()

  const { data: job, error: jobErr } = await supabase
    .from('asc_content_jobs')
    .select('id,status,generated_image_path,caption_zh')
    .eq('id', id)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: '找不到工作' }, { status: 404 })
  if (!['ready', 'approved'].includes(job.status)) {
    return NextResponse.json({ error: `狀態 ${job.status} 未可發佈` }, { status: 400 })
  }
  if (!job.generated_image_path) {
    return NextResponse.json({ error: '圖片尚未生成' }, { status: 400 })
  }

  // Set status to approved — Mac worker picks up and posts via existing FB/Threads/IG queues
  await supabase.from('asc_content_jobs').update({ status: 'approved' }).eq('id', id)

  return NextResponse.json({ success: true, message: '已批准，Mac worker 將即時推送至 FB / Threads / IG' })
}
