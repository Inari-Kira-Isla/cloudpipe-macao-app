// POST /api/property/chat
// MiniMax 前端聊天介面：代理用對話方式輸入盤源資料
// 最後一條訊息若觸發「存入」意圖，額外回傳 extracted 結構化資料

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

const MINIMAX_URL   = 'https://api.minimax.io/anthropic/v1/messages'
const MINIMAX_MODEL = 'MiniMax-M2.1'

const SYSTEM_PROMPT = `你是澳門地產助理，幫代理以對話方式記錄盤源資料。

工作方式：
1. 代理用廣東話或普通話描述樓盤，你幫整理成結構化資料
2. 缺少重要資料時主動追問（面積、價格、地區）
3. 當代理說「確認」「儲存」「入庫」「OK」「好了」時，回覆包含 [SAVE] 標記及完整 JSON

回覆規則：
- 簡短友好，廣東話語氣
- 確認已記錄的資料，用清單列出
- 追問缺少的關鍵欄位（地區、面積、價格）
- 觸發儲存時格式：
  [SAVE]
  {"building_name":"...","district":"...","price":...,"gross_area_sqft":...,"bedrooms":...,"listing_type":"sale/rent",...}

欄位包括：building_name, district, sub_district, address, unit, listing_type, price(萬MOP), price_per_sqft, gross_area_sqft, usable_area_sqft, bedrooms, bathrooms, floor, has_parking, condition, features[], source_agency, notes`

interface MsgItem { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: MsgItem[] } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'MINIMAX_API_KEY not configured' }, { status: 500 })
    }

    const res = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      MINIMAX_MODEL,
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[property/chat] MiniMax error:', errText)
      return NextResponse.json({ error: 'MiniMax API 錯誤' }, { status: 502 })
    }

    const data = await res.json()
    const reply: string = data?.content?.[0]?.text ?? ''

    // 偵測 [SAVE] 觸發 → 提取 JSON
    let extracted: Record<string, unknown> | null = null
    if (reply.includes('[SAVE]')) {
      const match = reply.match(/\[SAVE\]\s*(\{[\s\S]*?\})\s*$/m)
      if (match) {
        try { extracted = JSON.parse(match[1]) } catch { /* ignore */ }
      }
    }

    return NextResponse.json({
      ok: true,
      reply: reply.replace(/\[SAVE\][\s\S]*$/, '').trim(),
      extracted,
    })
  } catch (err) {
    console.error('[property/chat]', err)
    return NextResponse.json({ error: '聊天服務錯誤' }, { status: 500 })
  }
}
