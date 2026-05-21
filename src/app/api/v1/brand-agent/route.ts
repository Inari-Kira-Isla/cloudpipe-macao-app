import { NextRequest, NextResponse } from 'next/server'
import { getBrandConfig } from '@/lib/brandPortalConfig'
import { getSessionFromRequest } from '@/lib/brandAuth'
import { callMiniMax, executeAction, ACTION_LABELS } from '@/lib/brandActions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Intent types ──────────────────────────────────────────────────────────────

type Intent = 'advice' | 'execute' | 'clarify'

interface IntentResult {
  intent: Intent
  action_type?: string
  context?: string
  reply: string
}

// ── Intent Classifier ─────────────────────────────────────────────────────────

async function detectIntent(
  brandSlug: string,
  message: string,
  history: { role: string; content: string }[]
): Promise<IntentResult> {
  const config = getBrandConfig(brandSlug)

  const system = `你是 AEO 策略顧問兼操作員，服務品牌：${config?.name ?? brandSlug}（${config?.industry ?? ''}）。

分析用戶訊息，返回嚴格 JSON，格式如下：
{
  "intent": "advice" | "execute" | "clarify",
  "action_type": "expand_faq" | "expand_profile" | "generate_key_stats" | "generate_schema" | "create_insight" | "indexnow_ping" | null,
  "context": "文章主題或補充說明（create_insight 時必填）" | null,
  "reply": "對用戶的自然語言回覆，繁體中文，150字以內"
}

可執行的行動（6種）：
- expand_faq：生成 5 條 AI 搜索引擎容易引用的 FAQ
- expand_profile：重寫品牌簡介（300-400字）
- generate_key_stats：生成品牌關鍵數字統計
- generate_schema：生成 Schema.org JSON-LD 結構化標記
- create_insight：生成深度文章（需指定主題）
- indexnow_ping：通知搜尋引擎立即索引品牌頁

判斷規則：
- 用戶明確要求執行某行動 → intent=execute，選最匹配的 action_type
- 用戶詢問策略/建議/分析 → intent=advice，給出具體建議
- 不清楚要執行什麼，需要更多資訊 → intent=clarify
- create_insight 必須填 context（文章主題），若用戶未說明 → 從品牌主查詢「${config?.primaryQuery ?? ''}」推斷
- reply 必須自然，符合「AI 顧問跟客戶開會」的語調`

  const historyText = history.slice(-6)
    .map(h => `${h.role === 'user' ? '用戶' : '顧問'}: ${h.content}`)
    .join('\n')

  const userPrompt = [
    historyText && `對話歷史：\n${historyText}`,
    `用戶最新訊息：${message}`,
  ].filter(Boolean).join('\n\n')

  const raw = await callMiniMax(system, userPrompt, 600)
  const match = raw.match(/\{[\s\S]*"intent"[\s\S]*\}/)
  if (!match) {
    return { intent: 'advice', reply: raw.slice(0, 300) }
  }

  try {
    return JSON.parse(match[0]) as IntentResult
  } catch {
    return { intent: 'advice', reply: raw.slice(0, 300) }
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/brand-agent
 *
 * Normal turn:   { brand_slug, message, history? }
 * Confirm turn:  { brand_slug, confirm: true, pending_action, pending_context? }
 */
export async function POST(req: NextRequest) {
  let body: {
    brand_slug?: string
    message?: string
    history?: { role: string; content: string }[]
    confirm?: boolean
    pending_action?: string
    pending_context?: string
  }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { brand_slug, message, history = [], confirm, pending_action, pending_context } = body
  if (!brand_slug) return NextResponse.json({ error: 'brand_slug required' }, { status: 400 })

  const session = await getSessionFromRequest(req)

  // ── Confirm turn: user approved execution ─────────────────────────────────
  if (confirm && pending_action) {
    if (!session || session.brand_slug !== brand_slug) {
      return NextResponse.json({ error: '請先登入以執行此操作' }, { status: 401 })
    }
    try {
      const result = await executeAction(pending_action, brand_slug, pending_context)
      const label = ACTION_LABELS[pending_action] ?? pending_action
      const preview = (result.preview as string | undefined) ?? ''
      return NextResponse.json({
        executed: true,
        action_type: pending_action,
        label,
        reply: `✅ **${label}** 已完成！\n\n${preview}`,
        ...result,
      })
    } catch (err) {
      console.error('[brand-agent] execute error', pending_action, err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  // ── Normal turn: classify intent ──────────────────────────────────────────
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  try {
    const intent = await detectIntent(brand_slug, message, history)

    // Execute intent → return confirmation request (never auto-execute)
    if (intent.intent === 'execute' && intent.action_type) {
      const label = ACTION_LABELS[intent.action_type] ?? intent.action_type
      return NextResponse.json({
        intent: 'execute',
        needs_confirm: true,
        action_type: intent.action_type,
        context: intent.context,
        label,
        reply: intent.reply,
        // If no auth token, hint that login is required
        auth_required: !session,
      })
    }

    // Advice / clarify
    return NextResponse.json({
      intent: intent.intent,
      reply: intent.reply,
    })
  } catch (err) {
    console.error('[brand-agent] intent error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
