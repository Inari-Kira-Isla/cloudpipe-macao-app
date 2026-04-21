// POST /api/property/upload
// 上傳睇樓圖片到 Supabase Storage
// Claude Haiku 自動分類房間及標記瑕疵

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CAPTION_SYSTEM = `你是澳門地產睇樓助理，分析現場照片。
輸出純 JSON（無 markdown）：
{
  "room_type": "living_room|bedroom|master_bedroom|kitchen|bathroom|balcony|view|facade|parking|defect|other",
  "ai_caption": "一句廣東話描述（不超過20字）",
  "ai_tags": ["最多4個標籤"],
  "is_defect": true/false
}
房間類型中文對照：living_room=客廳 bedroom=睡房 master_bedroom=主人房 kitchen=廚房 bathroom=浴室 balcony=露台 view=景觀 facade=外牆 parking=車位 defect=瑕疵 other=其他
is_defect=true 條件：漏水痕跡、裂縫、發霉、損壞設施`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const visitId  = formData.get('visit_id') as string | null

    if (!file) return NextResponse.json({ error: '沒有檔案' }, { status: 400 })

    // 轉 Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const ext         = file.type.split('/')[1] || 'jpg'
    const fileName    = `visits/${visitId || 'general'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    // 上傳到 Supabase Storage
    const supabase = createServiceClient()
    const { error: uploadError } = await supabase.storage
      .from('property-photos')
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('property-photos')
      .getPublicUrl(fileName)

    // Claude Haiku 分析圖片
    let aiResult = { room_type: 'other', ai_caption: '', ai_tags: [] as string[], is_defect: false }
    try {
      const base64 = buffer.toString('base64')
      const resp   = await client.messages.create({
        model:      'claude-haiku-4-5',
        max_tokens: 256,
        system:     CAPTION_SYSTEM,
        messages: [{
          role: 'user',
          content: [{
            type: 'image',
            source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: base64 },
          }, { type: 'text', text: '分析此照片' }],
        }],
      })
      const raw     = resp.content[0].type === 'text' ? resp.content[0].text : ''
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
      aiResult      = { ...aiResult, ...JSON.parse(cleaned) }
    } catch { /* AI 分析失敗不影響上傳 */ }

    // 若有 visit_id，寫入 property_visit_photos
    let photoId: string | null = null
    if (visitId) {
      const { data } = await supabase
        .from('property_visit_photos')
        .insert({
          visit_id:      visitId,
          demo_agent_id: 'demo',
          image_url:     publicUrl,
          ...aiResult,
        })
        .select('id')
        .single()
      photoId = data?.id || null
    }

    return NextResponse.json({ ok: true, url: publicUrl, photoId, ...aiResult })
  } catch (err) {
    console.error('[property/upload]', err)
    return NextResponse.json({ error: '上傳失敗' }, { status: 500 })
  }
}
