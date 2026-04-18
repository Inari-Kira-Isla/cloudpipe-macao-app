import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MODEL = 'claude-sonnet-4-6'

// ─── Content fetching ────────────────────────────────────────────────────────

async function fetchUrlMeta(url: string): Promise<{ title: string; description: string; body: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloudPipe-Inspire/1.0)' },
    signal: AbortSignal.timeout(15000),
  })
  const html = await res.text()

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch?.[1]?.trim() ?? ''

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  const description = descMatch?.[1]?.trim() ?? ''

  // Strip HTML for body
  let body = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
    .slice(0, 25000)

  return { title, description, body }
}

async function fetchYouTubeMeta(url: string): Promise<{ title: string; description: string; channel: string; body: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  })
  const html = await res.text()

  const titleMatch = html.match(/"title":\s*\{"runs":\s*\[\{"text":\s*"([^"]+)"/)
    ?? html.match(/<title>([^<]+)<\/title>/i)
  const title = (titleMatch?.[1] ?? '').replace(' - YouTube', '').trim()

  const descMatch = html.match(/"description":\s*\{"runs":\s*\[\{"text":\s*"([\s\S]{0,2000}?)"/)
    ?? html.match(/<meta name="description" content="([^"]+)"/)
  const description = descMatch?.[1]?.replace(/\\n/g, '\n')?.trim() ?? ''

  const channelMatch = html.match(/"ownerChannelName":\s*"([^"]+)"/)
    ?? html.match(/"author":\s*"([^"]+)"/)
  const channel = channelMatch?.[1] ?? ''

  // Get video transcript if available via ytInitialPlayerResponse
  const transcriptHint = html.includes('captionTracks') ? '（字幕/轉錄可能可用）' : ''

  const body = `標題：${title}\n頻道：${channel}\n描述：${description}\n${transcriptHint}`

  return { title, description, channel, body }
}

// ─── Brand knowledge loader ───────────────────────────────────────────────────

async function loadBrandContext(slug: string): Promise<string> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: knowledge } = await supabase
    .from('brand_ops_knowledge')
    .select('schema_type, title, content, structured_data, confidence')
    .eq('brand_slug', slug)
    .eq('status', 'active')
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order('priority', { ascending: false })
    .limit(40)

  const { data: plan } = await supabase
    .from('brand_ops_content_plan')
    .select('commercial_goal, content_pillars, avoid_topics, next_focus')
    .eq('brand_slug', slug)
    .single()

  if (!knowledge?.length) return `品牌：${slug}（知識庫暫時為空）`

  let ctx = `品牌 slug：${slug}\n`
  if (plan?.commercial_goal) ctx += `商業目標：${plan.commercial_goal}\n`
  if (plan?.next_focus) ctx += `當前焦點：${plan.next_focus}\n`
  const pillars = plan?.content_pillars as string[] | null
  const avoidTopics = plan?.avoid_topics as string[] | null
  if (pillars?.length) ctx += `內容支柱：${pillars.join(' / ')}\n`
  if (avoidTopics?.length) ctx += `禁止主題：${avoidTopics.join(', ')}\n`

  ctx += '\n【品牌知識庫摘要】\n'
  for (const k of (knowledge ?? []).slice(0, 20)) {
    const type = k.schema_type ?? '—'
    ctx += `  [${type}] ${k.title}：${k.content.slice(0, 200)}\n`
  }

  return ctx
}

// ─── Suggestion generator ─────────────────────────────────────────────────────

const OUTPUT_TYPES: Record<string, string> = {
  insight:     '品牌 Insight 深度文章（800-1200字，適合 SEO + AI 引用）',
  fb_post:     'Facebook 品牌文案（150-300字，含 Hook + CTA）',
  ig_caption:  'Instagram Caption（100-150字，含 Hashtag）',
  threads:     'Threads 短文（80-150字，對話式語氣）',
  blog:        '品牌部落格文章（500-800字，教育性內容）',
  faq:         'FAQ 問答組（5-8條 Q&A，適合品牌官網）',
}

interface InspireSuggestion {
  type: keyof typeof OUTPUT_TYPES
  title: string
  why: string
  outline: string[]
  draft: string
  cta?: string
}

interface InspireResponse {
  suggestions: InspireSuggestion[]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      slug: string
      content_type: 'url' | 'youtube' | 'image' | 'text'
      url?: string
      image_base64?: string
      image_mime?: string
      description: string
      output_goals: string[]
    }

    const { slug, content_type, url, image_base64, image_mime, description, output_goals } = body

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
    if (!description?.trim() && !url && !image_base64)
      return NextResponse.json({ error: '請提供網址、圖片或描述' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })

    // 1. Fetch content
    let contentText = description || ''
    let contentTitle = ''
    const contentBlocks: Anthropic.MessageParam['content'] = []

    if (content_type === 'youtube' && url) {
      const meta = await fetchYouTubeMeta(url)
      contentTitle = meta.title
      contentText = `${meta.body}\n\n用戶補充說明：${description}`
      contentBlocks.push({ type: 'text', text: `【YouTube 影片資訊】\n${contentText}` })

    } else if (content_type === 'url' && url) {
      const meta = await fetchUrlMeta(url)
      contentTitle = meta.title
      contentText = `標題：${meta.title}\n描述：${meta.description}\n\n內文（前25000字）：\n${meta.body}\n\n用戶補充說明：${description}`
      contentBlocks.push({ type: 'text', text: `【網頁內容】\n${contentText}` })

    } else if (content_type === 'image' && image_base64) {
      const mime = (image_mime || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mime, data: image_base64 },
      })
      if (description) contentBlocks.push({ type: 'text', text: `用戶說明：${description}` })

    } else if (content_type === 'text') {
      contentBlocks.push({ type: 'text', text: description })
    }

    // 2. Load brand context
    const brandCtx = await loadBrandContext(slug)

    // 3. Build goals description
    const goalsDesc = (output_goals?.length ? output_goals : Object.keys(OUTPUT_TYPES))
      .map(g => `- ${g}：${OUTPUT_TYPES[g] ?? g}`)
      .join('\n')

    // 4. Compose prompt
    const systemPrompt = `你係 CloudPipe 品牌內容策略師。幫品牌分析素材並提供具體可用的內容建議。

${brandCtx}

輸出格式（JSON）：
{
  "suggestions": [
    {
      "type": "<output_type>",
      "title": "<具體標題>",
      "why": "<為何適合此品牌，一句話>",
      "outline": ["要點1", "要點2", "要點3"],
      "draft": "<完整草稿，直接可用>",
      "cta": "<行動呼籲（選填）>"
    }
  ]
}

規則：
1. 必須結合品牌知識庫內容，不要說廢話
2. draft 要完整可用，繁體中文，語氣貼近品牌
3. 每個建議只輸出一個 JSON object，不要重複類型
4. 最多輸出 ${Math.min(output_goals?.length || 3, 4)} 個建議
5. 輸出純 JSON，不要 markdown code block`

    const userMessage: Anthropic.MessageParam['content'] = [
      ...contentBlocks,
      {
        type: 'text',
        text: `請分析上方素材，為品牌 ${slug} 生成以下類型的內容建議：\n${goalsDesc}\n\n${contentTitle ? `素材標題：${contentTitle}` : ''}`,
      },
    ]

    // 5. Call Claude
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const rawText = (textBlock as { type: 'text'; text: string } | undefined)?.text ?? ''

    // Parse JSON from response
    let result: InspireResponse
    try {
      // Handle possible markdown code blocks
      const jsonStr = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      result = JSON.parse(jsonStr)
    } catch {
      // Try to extract JSON object
      const match = rawText.match(/\{[\s\S]+\}/)
      if (match) {
        try {
          result = JSON.parse(match[0])
        } catch {
          return NextResponse.json({ error: 'AI 回應格式錯誤', raw: rawText.slice(0, 500) }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'AI 回應格式錯誤', raw: rawText.slice(0, 500) }, { status: 500 })
      }
    }

    return NextResponse.json({ suggestions: result.suggestions ?? [], content_title: contentTitle })

  } catch (err) {
    console.error('[brand-ops/inspire]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
