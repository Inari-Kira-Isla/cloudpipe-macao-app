import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'asc-uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Simple in-memory rate limiter: ip → [timestamps]
const _rl = new Map<string, number[]>()
function checkRate(ip: string): boolean {
  const now = Date.now()
  const window = 3600_000 // 1 hour
  const hits = (_rl.get(ip) || []).filter(t => now - t < window)
  if (hits.length >= 3) return false
  hits.push(now)
  _rl.set(ip, hits)
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    if (!checkRate(ip)) {
      return NextResponse.json({ error: '每小時最多提交3次，請稍後再試' }, { status: 429 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) || 'overlay'
    const customerName = (formData.get('customer_name') as string) || ''
    const customerMessage = (formData.get('customer_message') as string) || ''
    const stylePref = (formData.get('style_pref') as string) || 'warm'

    if (!['overlay', 'ai_gen'].includes(mode)) {
      return NextResponse.json({ error: '無效的模式' }, { status: 400 })
    }
    if (!customerMessage.trim()) {
      return NextResponse.json({ error: '請填寫訊息內容' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const jobId = crypto.randomUUID()
    let originalImagePath: string | null = null

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: '圖片不可超過10MB' }, { status: 400 })
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: '只接受 JPEG / PNG / WebP 圖片' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      originalImagePath = `${jobId}/original.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(originalImagePath, buffer, { contentType: file.type, upsert: false })

      if (uploadErr) throw uploadErr
    } else if (mode === 'overlay') {
      return NextResponse.json({ error: '疊加模式需上傳圖片' }, { status: 400 })
    }

    const { error: dbErr } = await supabase.from('asc_content_jobs').insert({
      id: jobId,
      status: 'pending',
      mode,
      customer_name: customerName,
      customer_message: customerMessage,
      style_pref: stylePref,
      original_image_path: originalImagePath,
      platforms: ['facebook', 'threads'],
    })

    if (dbErr) throw dbErr

    return NextResponse.json({ success: true, job_id: jobId })
  } catch (err) {
    console.error('[afterschool/upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '提交失敗，請再試' },
      { status: 500 }
    )
  }
}
