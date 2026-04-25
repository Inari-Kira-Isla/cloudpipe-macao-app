// POST /api/property/extract
// 使用 Claude Haiku 從截圖或文字提取盤源資料
// 後端分析引擎（Claude Max）

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const EXTRACT_SYSTEM = `你是澳門地產盤源資料提取專家。
從用戶提供的截圖或文字中，提取以下欄位並輸出 JSON。

澳門地區對照：
- 澳門半島（含：新口岸、南灣、風順堂、花地瑪、黑沙環、青洲、筷子基）
- 氹仔（含：氹仔市區、濠景、嘉模）
- 路氹（含：路氹城、蓮花海濱）
- 路環

輸出格式（嚴格 JSON，無 markdown）：
{
  "building_name": "大廈名稱",
  "district": "地區（澳門半島/氹仔/路氹/路環）",
  "sub_district": "子區域",
  "address": "地址",
  "unit": "單位（如22/F A座）",
  "listing_type": "sale 或 rent",
  "price": 數字（萬MOP，只填數字），
  "price_per_sqft": 數字（MOP/呎，只填數字），
  "gross_area_sqft": 數字（建築面積，只填數字），
  "usable_area_sqft": 數字（實用面積，只填數字），
  "bedrooms": 數字,
  "bathrooms": 數字,
  "floor": "樓層描述",
  "has_parking": true/false/null,
  "condition": "裝修狀況（全新/精裝/普通/待裝修）",
  "features": ["特點1", "特點2"],
  "source_agency": "來源代理行",
  "source_contact": "對方聯絡方式",
  "notes": "其他備註",
  "confidence": 0到1（整體信心分數）,
  "low_confidence_fields": ["不確定的欄位名"]
}

規則：
- 無法確定的欄位填 null
- 不要猜測或虛構資料
- 面積單位統一為平方呎（sqft）
- 價格統一為萬 MOP`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, imageBase64, mimeType } = body

    if (!text && !imageBase64) {
      return NextResponse.json({ error: '需要提供文字或圖片' }, { status: 400 })
    }

    const userContent: Anthropic.MessageParam['content'] = []

    if (imageBase64) {
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: (mimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: imageBase64,
        },
      })
      userContent.push({
        type: 'text',
        text: '請從以上截圖提取盤源資料，輸出 JSON。',
      })
    } else {
      userContent.push({
        type: 'text',
        text: `請從以下文字提取盤源資料，輸出 JSON：\n\n${text}`,
      })
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // 清理 markdown 包裝（防禦）
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI 輸出格式錯誤，請重試', raw }, { status: 422 })
    }

    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error('[property/extract]', err)
    return NextResponse.json({ error: '提取失敗，請重試' }, { status: 500 })
  }
}
