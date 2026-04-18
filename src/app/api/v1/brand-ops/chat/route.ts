import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const MINIMAX_URL = 'https://api.minimax.io/anthropic/v1/messages'
const MINIMAX_MODEL = 'MiniMax-M2.1'

// Schema type groupings for context building
const IDENTITY_SCHEMAS = ['brand_identity', 'brand_voice', 'market_position', 'brand_visual']
const PRODUCT_SCHEMAS  = ['product_catalog', 'product_detail', 'service_package', 'pricing_tier']
const AUDIENCE_SCHEMAS = ['customer_persona', 'use_case', 'customer_story']
const OPS_SCHEMAS      = ['delivery_logistics', 'location_info', 'contact_channel', 'certification', 'policy']
const CONTENT_SCHEMAS  = ['faq_seed', 'news_update', 'event_calendar', 'industry_data', 'competitor_intel']

async function buildBrandContext(
  supabase: ReturnType<typeof createServiceClient>,
  slug: string,
  userQuery?: string
) {
  const today = new Date().toISOString().slice(0, 10)

  const [knowledgeRes, postsRes, planRes, assetsRes] = await Promise.all([
    // Load knowledge grouped by schema_type priority, filter expired
    supabase
      .from('brand_ops_knowledge')
      .select('schema_type, category, title, content, structured_data, source_quote, confidence, lang, valid_until, tags')
      .eq('brand_slug', slug)
      .eq('status', 'active')
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order('priority', { ascending: false })
      .limit(50),
    supabase
      .from('brand_ops_posts_cache')
      .select('content, hook_type, published_at, likes, comments, reach')
      .eq('brand_slug', slug)
      .order('published_at', { ascending: false })
      .limit(5),
    supabase
      .from('brand_ops_content_plan')
      .select('commercial_goal, content_pillars, avoid_topics, next_focus')
      .eq('brand_slug', slug)
      .single(),
    supabase
      .from('brand_ops_assets')
      .select('asset_type, original_filename, parse_status')
      .eq('brand_slug', slug)
      .eq('parse_status', 'parsed')
      .limit(10),
  ])

  type KnowledgeItem = {
    schema_type: string | null; category: string; title: string; content: string
    structured_data: Record<string, unknown> | null; source_quote: string | null
    confidence: number | null; lang: string | null; valid_until: string | null; tags: string[] | null
  }

  const allKnowledge = (knowledgeRes.data || []) as KnowledgeItem[]
  const posts = postsRes.data || []
  const plan = planRes.data

  // Group knowledge by domain
  const byDomain = {
    identity: allKnowledge.filter(k => IDENTITY_SCHEMAS.includes(k.schema_type || k.category)),
    products:  allKnowledge.filter(k => PRODUCT_SCHEMAS.includes(k.schema_type || k.category)),
    audience:  allKnowledge.filter(k => AUDIENCE_SCHEMAS.includes(k.schema_type || k.category)),
    ops:       allKnowledge.filter(k => OPS_SCHEMAS.includes(k.schema_type || k.category)),
    content:   allKnowledge.filter(k => CONTENT_SCHEMAS.includes(k.schema_type || k.category)),
    other:     allKnowledge.filter(k => {
      const t = k.schema_type || k.category
      return ![...IDENTITY_SCHEMAS, ...PRODUCT_SCHEMAS, ...AUDIENCE_SCHEMAS, ...OPS_SCHEMAS, ...CONTENT_SCHEMAS].includes(t)
    }),
  }

  const formatItems = (items: KnowledgeItem[], maxItems = 8, maxChars = 400) =>
    items.slice(0, maxItems).map(k => {
      const type = k.schema_type || k.category
      const confStr = k.confidence ? ` [信心:${Math.round(k.confidence * 100)}%]` : ''
      let text = `  ▸ [${type}] ${k.title}${confStr}：${k.content.slice(0, maxChars)}`
      if (k.content.length > maxChars) text += '…'
      // Append key structured fields if available
      if (k.structured_data) {
        const sd = k.structured_data as Record<string, unknown>
        const extras: string[] = []
        if (sd.origin) extras.push(`產地:${JSON.stringify(sd.origin)}`)
        if (sd.specs) extras.push(`規格:${JSON.stringify(sd.specs)}`)
        if (sd.pricing) extras.push(`定價:${JSON.stringify(sd.pricing)}`)
        if (sd.certifications) extras.push(`認證:${(sd.certifications as string[]).join(',')}`)
        if (extras.length) text += `\n    ${extras.join(' | ')}`
      }
      if (k.source_quote) text += `\n    原文：「${k.source_quote.slice(0, 100)}」`
      return text
    }).join('\n')

  let ctx = `你是 ${slug} 品牌的 AI 顧問。知識庫共 ${allKnowledge.length} 條資料。\n\n`

  if (plan) {
    ctx += `【商業目標】${plan.commercial_goal || '未設定'}\n`
    if (plan.next_focus) ctx += `【下週焦點】${plan.next_focus}\n`
    if ((plan.content_pillars as string[])?.length) ctx += `【內容支柱】${(plan.content_pillars as string[]).join(' / ')}\n`
    if ((plan.avoid_topics as string[])?.length) ctx += `【禁止主題】${(plan.avoid_topics as string[]).join(', ')}\n`
    ctx += '\n'
  }

  if (byDomain.identity.length) {
    ctx += `【品牌身份（${byDomain.identity.length}條）】\n${formatItems(byDomain.identity, 5, 500)}\n\n`
  }
  if (byDomain.products.length) {
    ctx += `【產品/服務（${byDomain.products.length}條）】\n${formatItems(byDomain.products, 10, 400)}\n\n`
  }
  if (byDomain.audience.length) {
    ctx += `【目標客群（${byDomain.audience.length}條）】\n${formatItems(byDomain.audience, 5, 350)}\n\n`
  }
  if (byDomain.ops.length) {
    ctx += `【營運資訊（${byDomain.ops.length}條）】\n${formatItems(byDomain.ops, 5, 350)}\n\n`
  }
  if (byDomain.content.length) {
    ctx += `【內容策略（${byDomain.content.length}條）】\n${formatItems(byDomain.content, 5, 300)}\n\n`
  }
  if (byDomain.other.length) {
    ctx += `【其他知識（${byDomain.other.length}條）】\n${formatItems(byDomain.other, 3, 300)}\n\n`
  }

  if (posts.length > 0) {
    ctx += `【近期發文（最新${posts.length}篇）】\n`
    for (const p of posts as Array<{hook_type: string|null; published_at: string|null; likes: number; comments: number; reach: number; content: string}>) {
      const date = p.published_at ? p.published_at.slice(0, 10) : '未知'
      ctx += `  ▸ ${date} [${p.hook_type || '—'}] 讚:${p.likes} 觸及:${p.reach} — "${p.content.slice(0, 120)}…"\n`
    }
    ctx += '\n'
  }

  if ((assetsRes.data || []).length > 0) {
    ctx += `【已解析檔案】${(assetsRes.data || []).map((a: {asset_type: string; original_filename: string | null}) => `${a.asset_type}:${a.original_filename || '未命名'}`).join(', ')}\n\n`
  }

  return ctx
}

export async function POST(req: NextRequest) {
  try {
    const { slug, messages } = await req.json()
    if (!slug || !messages?.length) {
      return NextResponse.json({ error: 'slug and messages required' }, { status: 400 })
    }

    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'MINIMAX_API_KEY not configured' }, { status: 500 })
    }

    const supabase = createServiceClient()
    const brandContext = await buildBrandContext(supabase, slug)

    const systemPrompt = `${brandContext}
你的職責：
1. 根據品牌知識庫回答問題，提供準確的品牌資訊
2. 分析發文表現，找出高效 hook type 和內容模式
3. 結合商業目標提供內容策略建議
4. 用繁體中文回答，語氣專業但貼地（廣東話日常用語）
5. 回答簡潔，重點突出，適當用條列式

如果問題超出品牌範疇，誠實說明。`

    const body = JSON.stringify({
      model: MINIMAX_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const response = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body,
    })

    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>
      error?: { message: string }
      type?: string
    }

    if (!response.ok || data.error) {
      const msg = data.error?.message || `HTTP ${response.status}`
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    // MiniMax may return thinking blocks before text blocks — find the text block
    const textBlock = (data.content || []).find(b => b.type === 'text')
    const text = textBlock?.text || ''
    return NextResponse.json({ reply: text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
