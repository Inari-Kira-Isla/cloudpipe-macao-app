import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MODEL = 'claude-sonnet-4-6'

// ─── Schema types for extraction ─────────────────────────────────────────────

const SCHEMA_TYPES = [
  'brand_identity','brand_visual','brand_voice','product_catalog','product_detail',
  'service_package','pricing_tier','customer_persona','use_case','customer_story',
  'competitor_intel','market_position','industry_data','location_info','contact_channel',
  'delivery_logistics','policy','certification','event_calendar','news_update',
  'faq_seed','media_asset',
]

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'extract_knowledge',
  description: '從品牌素材中提取結構化知識條目。每個 chunk 對應一個 schema_type。',
  input_schema: {
    type: 'object' as const,
    properties: {
      chunks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            schema_type:     { type: 'string', enum: SCHEMA_TYPES },
            title:           { type: 'string' },
            content:         { type: 'string' },
            structured_data: { type: 'object' },
            source_quote:    { type: 'string' },
            confidence:      { type: 'number', minimum: 0, maximum: 1 },
            lang:            { type: 'string' },
            tags:            { type: 'array', items: { type: 'string' } },
          },
          required: ['schema_type', 'title', 'content', 'confidence'],
        },
      },
    },
    required: ['chunks'],
  },
}

// ─── Brand context loader ─────────────────────────────────────────────────────

async function loadBrandContext(slug: string): Promise<string> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const [knowledgeRes, planRes, postsRes] = await Promise.all([
    supabase
      .from('brand_ops_knowledge')
      .select('schema_type, category, title, content, confidence')
      .eq('brand_slug', slug)
      .eq('status', 'active')
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order('priority', { ascending: false })
      .limit(40),
    supabase
      .from('brand_ops_content_plan')
      .select('commercial_goal, content_pillars, avoid_topics, next_focus')
      .eq('brand_slug', slug)
      .single(),
    supabase
      .from('brand_ops_posts_cache')
      .select('content, hook_type, published_at, likes, reach')
      .eq('brand_slug', slug)
      .order('published_at', { ascending: false })
      .limit(5),
  ])

  const knowledge = knowledgeRes.data ?? []
  const plan = planRes.data
  const posts = postsRes.data ?? []

  let ctx = `你係 CloudPipe 品牌 AI 助理，服務品牌 slug：${slug}。\n\n`
  if (plan?.commercial_goal) ctx += `【商業目標】${plan.commercial_goal}\n`
  if (plan?.next_focus) ctx += `【當前焦點】${plan.next_focus}\n`
  const pillars = plan?.content_pillars as string[] | null
  const avoid = plan?.avoid_topics as string[] | null
  if (pillars?.length) ctx += `【內容支柱】${pillars.join(' / ')}\n`
  if (avoid?.length) ctx += `【禁止主題】${avoid.join(', ')}\n`

  if (knowledge.length > 0) {
    ctx += `\n【品牌知識庫（${knowledge.length}條）】\n`
    for (const k of knowledge.slice(0, 25)) {
      const t = (k.schema_type ?? (k as { category?: string }).category) ?? '—'
      ctx += `  [${t}] ${k.title}：${k.content.slice(0, 180)}\n`
    }
  } else {
    ctx += '\n【品牌知識庫】暫時為空，可以上傳資料建立知識庫。\n'
  }

  if (posts.length > 0) {
    ctx += `\n【近期發文】\n`
    for (const p of posts as Array<{ hook_type: string | null; published_at: string | null; likes: number; reach: number; content: string }>) {
      const date = p.published_at?.slice(0, 10) ?? '—'
      ctx += `  ${date} [${p.hook_type ?? '—'}] 讚:${p.likes} 觸及:${p.reach} — "${p.content.slice(0, 100)}"\n`
    }
  }

  return ctx
}

// ─── URL / Website fetcher ────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

async function fetchPage(url: string, timeout = 15000): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloudPipe/1.0)' },
    signal: AbortSignal.timeout(timeout),
  })
  const html = await res.text()
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? url
  return { title, text: stripHtml(html).slice(0, 20000) }
}

async function crawlWebsite(rootUrl: string, maxPages = 8): Promise<string> {
  const parsed = new URL(rootUrl)
  const pages: Record<string, string> = {}

  const res = await fetch(rootUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloudPipe/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  const homeHtml = await res.text()
  pages[rootUrl] = stripHtml(homeHtml).slice(0, 20000)

  const skipExts = new Set(['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf', '.zip'])
  const hrefs = [...homeHtml.matchAll(/href=["']([^"'#?]+)["']/gi)].map(m => m[1])
  const links: string[] = []
  for (const href of hrefs) {
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue
    const ext = href.split('.').pop()?.toLowerCase() ?? ''
    if (skipExts.has(`.${ext}`)) continue
    try {
      const full = new URL(href, rootUrl).href
      const fp = new URL(full)
      if (fp.hostname === parsed.hostname && !pages[full] && !links.includes(full)) {
        links.push(full)
        if (links.length >= maxPages - 1) break
      }
    } catch { /* skip */ }
  }

  for (const link of links) {
    try {
      const { text } = await fetchPage(link, 10000)
      const path = new URL(link).pathname.replace(/\.html$/, '').split('/').pop() || 'index'
      pages[link] = `=== 頁面：${path} ===\n${text}`
    } catch { /* skip */ }
  }

  return Object.values(pages).join('\n\n').slice(0, 50000)
}

// ─── Asset recording ──────────────────────────────────────────────────────────

async function recordAsset(slug: string, attachment: Attachment): Promise<string | null> {
  const supabase = createServiceClient()
  try {
    const { data, error } = await supabase
      .from('brand_ops_assets')
      .insert({
        brand_slug: slug,
        asset_type: attachment.type === 'website' ? 'website'
                  : attachment.type === 'url' ? 'url'
                  : attachment.type === 'image' ? 'image'
                  : 'document',
        source_url: attachment.url ?? null,
        original_filename: attachment.filename ?? null,
        mime_type: attachment.mime ?? null,
        parse_status: 'parsing',  // We parse inline, will update to parsed
        uploaded_by: 'chat',
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  } catch (e) {
    console.error('[record-asset]', e)
    return null
  }
}

async function saveKnowledgeChunks(
  slug: string,
  assetId: string | null,
  assetType: string,
  chunks: Array<{
    schema_type: string
    title: string
    content: string
    structured_data?: Record<string, unknown>
    source_quote?: string
    confidence: number
    lang?: string
    tags?: string[]
  }>
): Promise<number> {
  if (!chunks.length) return 0
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const rows = chunks.filter(c => c.confidence >= 0.5).map((c, idx) => ({
    brand_slug: slug,
    schema_type: c.schema_type,
    title: c.title.slice(0, 500),
    content: c.content.slice(0, 10000),
    source_type: assetType,
    status: 'pending',
    priority: c.confidence >= 0.8 ? 1 : 2,
    asset_id: assetId ?? undefined,
    chunk_index: idx,
    lang: c.lang ?? 'zh-HK',
    confidence: c.confidence,
    tags: c.tags ?? [],
    content_hash: crypto.createHash('sha256').update(c.content).digest('hex').slice(0, 16),
    structured_data: c.structured_data ?? null,
    source_quote: c.source_quote?.slice(0, 1000) ?? null,
    created_at: now,
    updated_at: now,
  }))

  try {
    const { error } = await supabase
      .from('brand_ops_knowledge')
      .insert(rows)
    if (error) throw error
    return rows.length
  } catch (e) {
    console.error('[save-knowledge]', e)
    return 0
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(brandCtx: string): string {
  return `${brandCtx}

你的職責（按需靈活切換）：

1. **知識庫問答**：用品牌知識庫回答問題，引用具體資料，有把握才回答
2. **素材分析**：當用戶提交附件（PDF/圖片/網址/網站），先理解內容，然後問用戶：
   「我已分析完 [內容名稱]，已自動提取 X 條知識條目，等待你審核。你仲想我：
   A) 生成社群文案（FB/IG/Threads）
   B) 寫品牌 Insight 文章
   C) 直接問問題」
3. **內容生成**：根據品牌語氣生成文案/文章，繁體中文，廣東話語氣貼地
4. **策略建議**：結合商業目標和數據給具體可行建議

回答規則：
- 繁體中文，廣東話語氣，專業但親切
- 簡潔有力，善用條列式
- 遇到不確定的資料誠實說明
- 生成內容時直接給完整版本`
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachmentType = 'file' | 'url' | 'website' | 'image'

interface Attachment {
  type: AttachmentType
  url?: string
  base64?: string
  mime?: string
  filename?: string
}

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      slug: string
      messages: ChatMsg[]
      attachment?: Attachment
    }

    const { slug, messages, attachment } = body
    if (!slug || !messages?.length) {
      return NextResponse.json({ error: 'slug and messages required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

    // 1. Load brand context
    const brandCtx = await loadBrandContext(slug)
    const systemPrompt = buildSystemPrompt(brandCtx)
    const client = new Anthropic({ apiKey })

    // 2. Fetch attachment content + record asset in parallel
    let attachedContent = ''
    let contentBlocks: Anthropic.ContentBlockParam[] = []
    let assetId: string | null = null
    let attachmentLabel = ''

    if (attachment) {
      // Record asset (fire, don't block)
      const recordPromise = recordAsset(slug, attachment)

      if (attachment.type === 'file' && attachment.base64 && attachment.mime) {
        attachmentLabel = attachment.filename ?? 'document'
        if (attachment.mime === 'application/pdf') {
          contentBlocks.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: attachment.base64 },
          } as Anthropic.DocumentBlockParam)
        } else if (attachment.mime.startsWith('image/')) {
          const validMime = (['image/jpeg','image/png','image/gif','image/webp'] as const).includes(attachment.mime as never)
            ? attachment.mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
            : 'image/jpeg'
          contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: validMime, data: attachment.base64 } })
        }
      } else if (attachment.type === 'image' && attachment.base64) {
        attachmentLabel = attachment.filename ?? 'image'
        const validMime = (['image/jpeg','image/png','image/gif','image/webp'] as const).includes(attachment.mime as never ?? '')
          ? attachment.mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
          : 'image/jpeg'
        contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: validMime, data: attachment.base64 } })
      } else if (attachment.type === 'url' && attachment.url) {
        attachmentLabel = attachment.url
        try {
          const { title, text } = await fetchPage(attachment.url)
          attachmentLabel = title || attachment.url
          attachedContent = text
          contentBlocks.push({ type: 'text', text: `【附件：網頁「${title}」】\n網址：${attachment.url}\n\n${text}` })
        } catch (e) {
          contentBlocks.push({ type: 'text', text: `【附件：${attachment.url}（讀取失敗）】` })
        }
      } else if (attachment.type === 'website' && attachment.url) {
        attachmentLabel = new URL(attachment.url).hostname
        try {
          const siteText = await crawlWebsite(attachment.url)
          attachedContent = siteText
          contentBlocks.push({ type: 'text', text: `【附件：整個網站 ${attachment.url}】\n\n${siteText}` })
        } catch (e) {
          contentBlocks.push({ type: 'text', text: `【附件：${attachment.url}（爬取失敗）】` })
        }
      }

      assetId = await recordPromise
    }

    // 3. Build Claude messages
    const claudeMessages: Anthropic.MessageParam[] = []
    for (let i = 0; i < messages.length - 1; i++) {
      claudeMessages.push({ role: messages[i].role, content: messages[i].content })
    }

    const lastMsg = messages[messages.length - 1]
    const lastContent: Anthropic.ContentBlockParam[] = [
      ...contentBlocks,
      ...(lastMsg.content.trim()
        ? [{ type: 'text' as const, text: lastMsg.content }]
        : attachment ? [{ type: 'text' as const, text: '請分析上方附件，告訴我你提取了什麼資料，並詢問我的用途。' }]
        : []),
    ]

    if (lastContent.length === 0) {
      return NextResponse.json({ error: '訊息不能為空' }, { status: 400 })
    }

    claudeMessages.push({ role: 'user', content: lastContent })

    // 4. Run chat response + knowledge extraction in parallel (only when attachment present)
    const chatPromise = client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages,
    })

    // Extraction: only run when there's meaningful content from attachment
    const extractionContent = contentBlocks.length > 0
      ? contentBlocks.filter(b => b.type !== 'text' || (b as {text:string}).text.length > 100)
      : null

    const extractionPromise = extractionContent && (attachment?.type !== 'image')
      ? client.messages.create({
          model: MODEL,
          max_tokens: 4096,
          tools: [EXTRACT_TOOL],
          tool_choice: { type: 'tool', name: 'extract_knowledge' },
          system: `你係品牌知識提取專家。從素材中提取所有有價值的品牌知識條目。
規則：confidence < 0.5 唔好輸出；source_quote 用原文；唔確定嘅填 null。
允許的 schema_type：${SCHEMA_TYPES.join(', ')}`,
          messages: [{
            role: 'user',
            content: [
              ...extractionContent,
              { type: 'text', text: '請從以上素材提取所有品牌知識條目。' },
            ],
          }],
        })
      : Promise.resolve(null)

    const [chatResponse, extractionResponse] = await Promise.all([chatPromise, extractionPromise])

    // 5. Process chat response
    const textBlock = chatResponse.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined
    const reply = textBlock?.text ?? ''

    // 6. Process extracted knowledge
    let extractedCount = 0
    if (extractionResponse) {
      const toolBlock = extractionResponse.content.find(
        b => b.type === 'tool_use' && b.name === 'extract_knowledge'
      ) as { type: 'tool_use'; input: { chunks: Array<Record<string, unknown>> } } | undefined

      if (toolBlock?.input?.chunks?.length) {
        extractedCount = await saveKnowledgeChunks(
          slug,
          assetId,
          attachment?.type ?? 'url',
          toolBlock.input.chunks as Parameters<typeof saveKnowledgeChunks>[3]
        )
        // Update asset parse_status to parsed
        if (assetId) {
          const supabase = createServiceClient()
          await supabase
            .from('brand_ops_assets')
            .update({ parse_status: 'parsed', parse_model: MODEL, parse_completed_at: new Date().toISOString() })
            .eq('id', assetId)
        }
      } else if (assetId) {
        // No chunks extracted — still mark as parsed
        const supabase = createServiceClient()
        await supabase
          .from('brand_ops_assets')
          .update({ parse_status: 'parsed', parse_model: MODEL, parse_completed_at: new Date().toISOString() })
          .eq('id', assetId)
      }
    }

    return NextResponse.json({
      reply,
      asset_id: assetId,
      extracted_count: extractedCount,
      attachment_label: attachmentLabel,
    })

  } catch (err) {
    console.error('[brand-ops/unified-chat]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
