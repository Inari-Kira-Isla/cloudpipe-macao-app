import { NextRequest, NextResponse } from 'next/server'
import { getBrandConfig } from '@/lib/brandPortalConfig'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MINIMAX_URL = 'https://api.minimax.io/anthropic/v1/messages'

function buildSystemPrompt(brandSlug: string): string {
  const config = getBrandConfig(brandSlug)
  const base = `你是 CloudPipe 品牌 AI 策略顧問，專精 AEO（AI 搜索引擎優化）。
用繁體中文回答，回答簡潔（200字以內），給出具體可執行步驟。
語調：專業親切，像資深數碼營銷顧問跟客戶開會。`

  if (!config) return base

  const engineLines = config.engines
    .map(e => `  ${e.name}: ${e.mentioned ? '✓ 已引用' : '✗ 未引用'} — ${e.detail}`)
    .join('\n')
  const gapLines = config.gaps
    .map(g => `  [${g.priority.toUpperCase()}] ${g.title}：${g.desc}`)
    .join('\n')

  return `${base}

== 服務品牌：${config.name}（${config.nameEn}） ==
行業：${config.industry}
主要查詢：${config.primaryQuery}

AI 引擎引用狀態：
${engineLines}

AEO 優先缺口：
${gapLines}`
}

/**
 * POST /api/v1/brand-chat
 * Body: { brand_slug, message }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brand_slug, message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) {
      return NextResponse.json({ reply: '目前 AI 顧問服務暫時離線，請稍後再試。' })
    }

    const systemPrompt = buildSystemPrompt(brand_slug ?? '')

    const mmRes = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: message.trim() }],
      }),
    })

    if (!mmRes.ok) {
      const errText = await mmRes.text()
      console.error('[brand-chat] MiniMax error:', mmRes.status, errText)
      return NextResponse.json({ reply: '抱歉，AI 顧問暫時無法回應，請稍後再試。' })
    }

    const data = await mmRes.json()
    const reply = data?.content?.[0]?.text ?? data?.reply ?? '抱歉，無法取得回應。'
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[brand-chat] error:', err)
    return NextResponse.json({ reply: '連線錯誤，請稍後再試。' })
  }
}
