import { createServiceClient } from '@/lib/supabase'
import { getBrandConfig } from '@/lib/brandPortalConfig'

export const MINIMAX_URL = 'https://api.minimax.io/anthropic/v1/messages'

export const ACTION_LABELS: Record<string, string> = {
  expand_faq:         'FAQ 擴充（5 題）',
  expand_profile:     '品牌簡介重寫',
  generate_key_stats: '關鍵數據生成',
  generate_schema:    'Schema.org 標記',
  create_insight:     '深度文章生成',
  indexnow_ping:      'IndexNow 索引通知',
}

export async function callMiniMax(system: string, user: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) throw new Error('MINIMAX_API_KEY not configured')
  const res = await fetch(MINIMAX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`MiniMax error ${res.status}`)
  const data = await res.json()
  return data?.content?.[0]?.text ?? ''
}

// ── Action handlers ───────────────────────────────────────────────────────────

export async function expandFaq(brandSlug: string): Promise<{ preview: string; saved: number }> {
  const config = getBrandConfig(brandSlug)
  const brandName = config?.name ?? brandSlug
  const system = `你是 AEO 內容專家。生成高品質 FAQ，讓 AI 搜索引擎容易引用。
輸出嚴格 JSON 格式：{"faqs":[{"question":"...","answer":"..."},...]}
每個 answer 80-150字，第一人稱，含具體數字。繁體中文。`
  const user = `品牌：${brandName}（${config?.industry ?? ''}）
主要查詢：${config?.primaryQuery ?? ''}
生成5個 B2B 買家最常問的問題。focus on：採購流程、品質保證、交貨時間、最低訂單量、產地驗證。`

  const raw = await callMiniMax(system, user, 1200)
  const match = raw.match(/\{[\s\S]*"faqs"[\s\S]*\}/)
  if (!match) throw new Error('Invalid JSON from AI')
  const { faqs } = JSON.parse(match[0]) as { faqs: { question: string; answer: string }[] }

  const supabase = createServiceClient()
  const { error } = await supabase.from('brand_faqs').insert(
    faqs.map(f => ({
      brand_slug: brandSlug, question: f.question, answer: f.answer,
      lang: 'zh', is_published: true, created_at: new Date().toISOString(),
    }))
  )
  if (error) throw new Error(error.message)
  return { preview: faqs.slice(0, 2).map(f => `Q: ${f.question}`).join('\n'), saved: faqs.length }
}

export async function expandProfile(brandSlug: string): Promise<{ preview: string }> {
  const config = getBrandConfig(brandSlug)
  const brandName = config?.name ?? brandSlug
  const system = `你是品牌文案專家，專寫讓 AI 搜索引擎容易收錄的品牌簡介。
繁體中文，300-400字，包含：品牌使命、核心競爭力、目標客戶、服務範圍、品質認證。
自然流暢，避免廣告語氣。`
  const user = `品牌：${brandName}
行業：${config?.industry ?? ''}
主要查詢：${config?.primaryQuery ?? ''}
缺口：${config?.gaps?.map(g => g.title).join('、') ?? ''}
請撰寫完整品牌簡介。`

  const text = await callMiniMax(system, user, 800)
  const supabase = createServiceClient()
  await supabase.from('brand_profiles')
    .upsert({ brand_slug: brandSlug, about_zh: text.trim(), updated_at: new Date().toISOString() }, { onConflict: 'brand_slug' })
  return { preview: text.slice(0, 120) + '…' }
}

export async function generateKeyStats(brandSlug: string): Promise<{ preview: string }> {
  const config = getBrandConfig(brandSlug)
  const brandName = config?.name ?? brandSlug
  const system = `生成品牌關鍵數字統計，輸出 JSON：{"key_stats":{"founded":"YYYY","clients":"數量+","regions":"地區列表","products":"數量+","certifications":["..."]}}
基於提供的品牌資訊推算合理數字，繁體中文。`
  const user = `品牌：${brandName}，行業：${config?.industry ?? ''}，主要查詢：${config?.primaryQuery ?? ''}`

  const raw = await callMiniMax(system, user, 400)
  const match = raw.match(/\{[\s\S]*"key_stats"[\s\S]*\}/)
  if (!match) throw new Error('Invalid JSON')
  const { key_stats } = JSON.parse(match[0]) as { key_stats: Record<string, unknown> }

  const supabase = createServiceClient()
  await supabase.from('brand_profiles')
    .upsert({ brand_slug: brandSlug, key_stats, updated_at: new Date().toISOString() }, { onConflict: 'brand_slug' })
  return { preview: JSON.stringify(key_stats).slice(0, 100) }
}

export async function generateSchema(brandSlug: string): Promise<{ preview: string }> {
  const config = getBrandConfig(brandSlug)
  const brandName = config?.name ?? brandSlug
  const system = `生成完整 Schema.org JSON-LD，包含 LocalBusiness + Product + FAQPage。
只輸出 JSON-LD 代碼，用 <script type="application/ld+json">...</script> 包裹。`
  const user = `品牌：${brandName}，行業：${config?.industry ?? ''}，網站：${config?.nameEn?.toLowerCase().replace(/\s/g, '') ?? ''}.mo`

  const schema = await callMiniMax(system, user, 1200)
  const supabase = createServiceClient()
  await supabase.from('brand_profiles')
    .upsert({ brand_slug: brandSlug, schema_markup: schema.trim(), updated_at: new Date().toISOString() }, { onConflict: 'brand_slug' })
  return { preview: 'Schema.org JSON-LD 已生成（LocalBusiness + Product + FAQPage）' }
}

export async function createInsightDraft(brandSlug: string, topic: string): Promise<{ preview: string; slug: string }> {
  const config = getBrandConfig(brandSlug)
  const brandName = config?.name ?? brandSlug
  const system = `你是 AEO 內容專家，撰寫讓 AI 搜索引擎引用的深度文章。
繁體中文，1000-1200字，包含：H2/H3 小標、具體數字、FAQ 段落（3條）、行動呼籲。`
  const user = `品牌：${brandName}
文章主題：${topic}
寫一篇讓 AI 搜索引擎引用的權威文章，第一人稱敘述，含具體產業數據。`

  const content = await callMiniMax(system, user, 2000)
  const slugBase = `${brandSlug}-${Date.now()}`

  const supabase = createServiceClient()
  await supabase.from('brand_knowledge').insert({
    brand_slug: brandSlug, content_type: 'insight_draft',
    content: `# ${topic}\n\n${content}`, created_at: new Date().toISOString(),
  })
  return { preview: content.slice(0, 100) + '…', slug: slugBase }
}

export async function pingIndexNow(brandSlug: string): Promise<{ urls: number }> {
  const key = process.env.INDEXNOW_KEY ?? 'ba56701768004b66b7e64c28a1e90f9e'
  const urls = [
    `https://cloudpipe.ai/brands/${brandSlug}`,
    `https://cloudpipe.ai/merchants/${brandSlug}`,
  ]
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host: 'cloudpipe.ai', key, urlList: urls }),
  }).catch(() => {})
  return { urls: urls.length }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function executeAction(
  actionType: string, brandSlug: string, context?: string
): Promise<Record<string, unknown>> {
  switch (actionType) {
    case 'expand_faq':         return expandFaq(brandSlug)
    case 'expand_profile':     return expandProfile(brandSlug)
    case 'generate_key_stats': return generateKeyStats(brandSlug)
    case 'generate_schema':    return generateSchema(brandSlug)
    case 'create_insight':     return createInsightDraft(brandSlug, context ?? '品牌深度報告')
    case 'indexnow_ping':      return pingIndexNow(brandSlug)
    default: throw new Error(`Unknown action: ${actionType}`)
  }
}
