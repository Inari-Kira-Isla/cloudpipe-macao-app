import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MODEL = 'claude-sonnet-4-6'

// ─── Brand context loader ─────────────────────────────────────────────────────

async function loadBrandContext(slug: string): Promise<string> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const [knowledgeRes, planRes, postsRes] = await Promise.all([
    supabase
      .from('brand_ops_knowledge')
      .select('schema_type, category, title, content, structured_data, confidence')
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
      const t = k.schema_type ?? k.category
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

  // Fetch homepage
  const { text: homeText } = await fetchPage(rootUrl)
  pages[rootUrl] = homeText

  // Extract internal links
  const res = await fetch(rootUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloudPipe/1.0)' }, signal: AbortSignal.timeout(10000) })
  const homeHtml = await res.text()

  const skipExts = new Set(['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf', '.zip'])
  const hrefs = [...homeHtml.matchAll(/href=["']([^"'#?]+)["']/gi)].map(m => m[1])
  const links: string[] = []
  for (const href of hrefs) {
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue
    const ext = href.split('.').pop()?.toLowerCase() ?? ''
    if (skipExts.has(`.${ext}`)) continue
    try {
      const full = new URL(href, rootUrl).href
      const fullParsed = new URL(full)
      if (fullParsed.hostname === parsed.hostname && !pages[full] && !links.includes(full)) {
        links.push(full)
        if (links.length >= maxPages - 1) break
      }
    } catch { /* skip invalid */ }
  }

  // Fetch sub-pages
  for (const link of links) {
    try {
      const { text } = await fetchPage(link, 10000)
      const path = new URL(link).pathname.replace(/\.html$/, '').split('/').pop() || 'index'
      pages[link] = `=== 頁面：${path} ===\n${text}`
    } catch { /* skip */ }
  }

  return Object.values(pages).join('\n\n').slice(0, 50000)
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(brandCtx: string): string {
  return `${brandCtx}

你的職責（按需靈活切換）：

1. **知識庫問答**：用品牌知識庫回答問題，引用具體資料，有把握才回答
2. **素材分析**：當用戶提交附件（PDF/圖片/網址/網站），先理解內容，然後問用戶：
   「我已分析完 [內容名稱]，你想我幫你：
   A) 解析儲存到品牌知識庫
   B) 生成社群文案（FB/IG/Threads）
   C) 寫品牌 Insight 文章
   D) 其他（請說明）」
   等用戶選擇後再執行對應任務
3. **內容生成**：根據品牌語氣生成文案/文章，繁體中文，廣東話語氣貼地
4. **策略建議**：結合商業目標和數據給具體可行建議

回答規則：
- 繁體中文，廣東話語氣，專業但親切
- 簡潔有力，善用條列式
- 遇到不確定的資料誠實說明
- 生成內容時直接給完整版本，不要說「以下是草稿」等廢話`
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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

    const brandCtx = await loadBrandContext(slug)
    const systemPrompt = buildSystemPrompt(brandCtx)
    const client = new Anthropic({ apiKey })

    // Build messages for Claude — inject attachment into the LAST user message
    const claudeMessages: Anthropic.MessageParam[] = []

    for (let i = 0; i < messages.length - 1; i++) {
      claudeMessages.push({ role: messages[i].role, content: messages[i].content })
    }

    // Last message may have attachment
    const lastMsg = messages[messages.length - 1]
    const lastContent: Anthropic.MessageParam['content'] = []

    if (attachment) {
      if (attachment.type === 'file' && attachment.base64 && attachment.mime) {
        if (attachment.mime === 'application/pdf') {
          lastContent.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: attachment.base64 },
          } as Anthropic.DocumentBlockParam)
        } else if (attachment.mime.startsWith('image/')) {
          const validMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(attachment.mime)
            ? attachment.mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
            : 'image/jpeg'
          lastContent.push({
            type: 'image',
            source: { type: 'base64', media_type: validMime, data: attachment.base64 },
          } as Anthropic.ImageBlockParam)
        }
      } else if (attachment.type === 'image' && attachment.base64) {
        const validMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(attachment.mime ?? '')
          ? attachment.mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
          : 'image/jpeg'
        lastContent.push({
          type: 'image',
          source: { type: 'base64', media_type: validMime, data: attachment.base64 },
        } as Anthropic.ImageBlockParam)
      } else if (attachment.type === 'url' && attachment.url) {
        try {
          const { title, text } = await fetchPage(attachment.url)
          lastContent.push({
            type: 'text',
            text: `【附件：網頁】${title}\n網址：${attachment.url}\n\n${text}`,
          })
        } catch (e) {
          lastContent.push({ type: 'text', text: `【附件：網址 ${attachment.url}（無法讀取：${e}）】` })
        }
      } else if (attachment.type === 'website' && attachment.url) {
        try {
          const siteContent = await crawlWebsite(attachment.url)
          lastContent.push({
            type: 'text',
            text: `【附件：整個網站】${attachment.url}\n\n${siteContent}`,
          })
        } catch (e) {
          lastContent.push({ type: 'text', text: `【附件：網站 ${attachment.url}（爬取失敗：${e}）】` })
        }
      }
    }

    // Add the text message
    if (lastMsg.content.trim()) {
      lastContent.push({ type: 'text', text: lastMsg.content })
    } else if (attachment) {
      // No text — prompt AI to analyze and ask for intent
      lastContent.push({ type: 'text', text: '請分析上方附件，然後詢問我的用途。' })
    }

    if (lastContent.length === 0) {
      return NextResponse.json({ error: '訊息不能為空' }, { status: 400 })
    }

    claudeMessages.push({ role: 'user', content: lastContent })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages,
    })

    const textBlock = response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined
    return NextResponse.json({ reply: textBlock?.text ?? '' })

  } catch (err) {
    console.error('[brand-ops/unified-chat]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
