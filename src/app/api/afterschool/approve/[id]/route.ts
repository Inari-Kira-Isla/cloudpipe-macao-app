import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const ADMIN_SECRET = process.env.ASC_ADMIN_SECRET || 'asc2026admin'

// Save approved job output as a routine template
async function saveAsTemplate(supabase: ReturnType<typeof createServiceClient>, job: Record<string, unknown>) {
  const template = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    // Store the approved output fields that can be reused
    caption_zh: job.caption_zh,
    caption_en: job.caption_en,
    hashtags: job.hashtags,
    style_pref: job.style_pref,
    mode: job.mode,
    // Store a reference to the original job
    source_job_id: job.id,
  }

  // Get current templates or initialize empty array
  const currentTemplates = (job.routine_templates as unknown[]) || []
  const updatedTemplates = [...currentTemplates, template]

  await supabase
    .from('asc_content_jobs')
    .update({ routine_templates: updatedTemplates })
    .eq('id', job.id)

  return template
}

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
    .select('id,status,mode,customer_name,customer_message,style_pref,generated_image_path,caption_zh,caption_en,hashtags,routine_templates')
    .eq('id', id)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: '找不到工作' }, { status: 404 })
  if (!['ready', 'approved'].includes(job.status)) {
    return NextResponse.json({ error: `狀態 ${job.status} 未可發佈` }, { status: 400 })
  }
  if (!job.generated_image_path) {
    return NextResponse.json({ error: '圖片尚未生成' }, { status: 400 })
  }

  // Check if save_as_template is requested (via query param or body)
  const url = new URL(req.url)
  const saveAsTemplate = url.searchParams.get('save_as_template') === 'true' || (await req.clone().json()).save_as_template

  let templateInfo = null
  if (saveAsTemplate) {
    templateInfo = await saveAsTemplate(supabase, job as unknown as Record<string, unknown>)
  }

  // Set status to approved — Mac worker picks up and posts via existing FB/Threads/IG queues
  await supabase.from('asc_content_jobs').update({ status: 'approved' }).eq('id', id)

  const message = saveAsTemplate 
    ? '已批准並存為範本，Mac worker 將即時推送至 FB / Threads / IG'
    : '已批准，Mac worker 將即時推送至 FB / Threads / IG'

  return NextResponse.json({ 
    success: true, 
    message,
    template: templateInfo
  })
}
