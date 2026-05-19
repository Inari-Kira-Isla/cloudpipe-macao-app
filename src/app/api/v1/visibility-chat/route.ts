import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getBrandConfig } from '@/lib/brandPortalConfig'

export const maxDuration = 30

const MINIMAX_URL = 'https://api.minimax.io/anthropic/v1/messages'

const BASE_SYSTEM_PROMPT = `你是 CloudPipe Visibility Engine 的 AI 顧問，專精 AEO（AI 搜索引擎優化）、SEO 和 GEO（本地搜索優化）。

你的角色：
- 根據客戶網站的掃描結果，用繁體中文回答問題
- 給出具體、可執行的修復建議（不要泛泛而談）
- 強調 AEO 的重要性：2026 年超過 40% 的搜尋流量來自 AI 搜索引擎（ChatGPT、Perplexity、Claude）
- 用澳門市場的語境（MOP 貨幣、本地商戶、大灣區市場）

你知道的：
- llms.txt 是讓 AI 搜索引擎理解網站的標準格式
- Schema.org JSON-LD 是結構化數據的國際標準
- FAQPage Schema 能提升 AI 引用率 40%+
- robots.txt 中需要明確歡迎 GPTBot、ClaudeBot、PerplexityBot
- 澳門市場平均 Visibility Score 只有 25 分（F 級），大部分企業完全沒有 AEO
- CloudPipe 的品牌客戶平均 85 分（A 級）

語調：專業但親切，像一位資深數碼營銷顧問在跟客戶開會。回答要簡潔（200 字以內），除非客戶問技術細節。`

function buildSystemPrompt(brandSlug?: string, ragContext?: string): string {
  let base = BASE_SYSTEM_PROMPT

  if (brandSlug) {
    const config = getBrandConfig(brandSlug)
    if (config) {
      const engineLines = config.engines
        .map(e => `  ${e.name}: ${e.mentioned ? '✓ 已引用' : '✗ 未引用'} — ${e.detail}`)
        .join('\n')
      const gapLines = config.gaps
        .map(g => `  [${g.priority.toUpperCase()}] ${g.title}：${g.desc}`)
        .join('\n')

      base = `${BASE_SYSTEM_PROMPT}

== 當前服務品牌：${config.name}（${config.nameEn}） ==
行業：${config.industry}
主要查詢：${config.primaryQuery}

AI 引擎引用狀態：
${engineLines}

AEO 優先缺口：
${gapLines}

當品牌主問具體建議時，針對以上缺口和引擎狀況給出可執行步驟。`
    }
  }

  return base + (ragContext || '')
}

type Msg = { role: 'user' | 'assistant'; content: string }

async function loadSession(sessionId: string): Promise<Msg[]> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('brand_chat_sessions')
      .select('messages')
      .eq('session_id', sessionId)
      .single()
    if (!data?.messages) return []
    const msgs = data.messages as Msg[]
    return msgs.length > 20 ? msgs.slice(-20) : msgs
  } catch {
    return []
  }
}

async function saveSession(sessionId: string, brandSlug: string | undefined, msgs: Msg[]) {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('brand_chat_sessions')
      .upsert({
        session_id: sessionId,
        brand_slug: brandSlug ?? null,
        messages: msgs,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id' })
  } catch {
    // non-fatal — session memory is best-effort
  }
}

/**
 * POST /api/v1/visibility-chat
 * Body: { question, scan_result?, context?, brand_slug?, session_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, scan_result, context, brand_slug, session_id } = body

    if (!question) {
      return NextResponse.json({ error: 'question required' }, { status: 400 })
    }

    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
    }

    const history = session_id ? await loadSession(session_id) : []

    // ─── RAG: Fetch relevant brand knowledge chunks ─────────────────────────
    let ragContext = ''
    if (brand_slug) {
      try {
        const ragSupabase = createServiceClient()
        // Build a simple plain-text FTS query from the first 5 question words
        const searchQuery = question
          .split(/\s+/)
          .filter((w: string) => w.length > 1)
          .slice(0, 5)
          .join(' ')
        const { data: ragRows } = await ragSupabase
          .from('brand_knowledge')
          .select('content, content_type')
          .eq('brand_slug', brand_slug)
          .textSearch('fts_vector', searchQuery, { type: 'plain' })
          .limit(4)
        if (ragRows && ragRows.length > 0) {
          ragContext = '\n\n== 品牌知識庫相關資料 ==\n' +
            ragRows.map((r: { content_type: string; content: string }) =>
              `[${r.content_type}] ${r.content}`
            ).join('\n---\n')
        }
      } catch {
        // RAG is best-effort and non-fatal — proceed without it
      }
    }

    let scanContext = ''
    if (scan_result) {
      scanContext = `\n\n客戶網站掃描結果：
URL: ${scan_result.url}
總分: ${scan_result.score}/100 (${scan_result.grade})
AEO: ${scan_result.aeo?.pct || 0}% | SEO: ${scan_result.seo?.pct || 0}% | GEO: ${scan_result.geo?.pct || 0}%
問題數: ${scan_result.issues?.length || 0}
${(scan_result.fixes || []).map((f: { check_name: string; current_score: number; max_score: number; fix: string }) =>
  `- ${f.check_name} (${f.current_score}/${f.max_score}): ${f.fix}`
).join('\n') || '無具體修復建議'}`
    }
    if (context) scanContext += `\n\n額外資訊: ${context}`

    const userContent = `${scanContext}${scanContext ? '\n\n' : ''}客戶問題：${question}`

    const messages: Msg[] = [
      ...history,
      { role: 'user', content: userContent },
    ]

    const res = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5',
        max_tokens: 1024,
        system: buildSystemPrompt(brand_slug, ragContext),
        messages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: 'AI service error', detail: errText.slice(0, 200) }, { status: 502 })
    }

    const data = await res.json()
    const answer = data?.content?.[0]?.text || data?.choices?.[0]?.message?.content || ''

    if (!answer) {
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 502 })
    }

    if (session_id) {
      const updated: Msg[] = [
        ...history,
        { role: 'user', content: question },
        { role: 'assistant', content: answer },
      ]
      await saveSession(session_id, brand_slug, updated)
    }

    return NextResponse.json({
      answer,
      model: 'MiniMax-M2.5',
      tokens: { input: data?.usage?.input_tokens || 0, output: data?.usage?.output_tokens || 0 },
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Chat failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
