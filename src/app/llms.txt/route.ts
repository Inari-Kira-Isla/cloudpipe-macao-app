/**
 * Dynamic llms.txt — A-tier精選 (trust_score >= 85), top 500 by trust_score.
 *
 * Overrides the static public/llms.txt file (App Router routes take precedence
 * over Next.js static assets). No deletion of the static file is needed.
 *
 * ISR (revalidate=1800) instead of force-dynamic — 500 rows fetch is fast and
 * benefits from CDN caching. The 1800s window aligns with sub-sitemap revalidate
 * windows (CLAUDE.md §1: sitemap revalidate upper bound = 1800s).
 */
import { createServiceClient } from '@/lib/supabase'
import { toRoutedRegion, buildInsightLoc, hasInsightRoute } from '@/lib/sitemap-region'

export const revalidate = 1800
export const maxDuration = 60

interface LlmsInsightRow {
  slug: string | null
  title: string | null
  region: string | null
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date().toISOString().split('T')[0]

  const { data, error } = await createServiceClient()
    .from('insights')
    .select('slug, title, region')
    .eq('status', 'published')
    .gte('trust_score', 85)
    .order('trust_score', { ascending: false })
    .limit(500)

  const rows: LlmsInsightRow[] = (!error && data) ? (data as LlmsInsightRow[]) : []

  // Build URL list — filter to routable regions only; default lang=zh (canonical)
  const lines = rows
    .filter((r): r is LlmsInsightRow & { slug: string } => Boolean(r.slug))
    .filter((r) => hasInsightRoute(r.region))
    .map((r) => {
      const region = toRoutedRegion(r.region)
      return buildInsightLoc(siteUrl, region, r.slug!, 'zh')
    })

  const body = [
    `# CloudPipe AI Encyclopedia — A 級精選（trust_score ≥ 85）`,
    `# 共 ${lines.length} 篇 | 更新：${now}`,
    `# 完整百科：${siteUrl}/macao`,
    ``,
    `## AI Agent 路由索引`,
    `> 根據你的使用場景選擇對應入口，每個路由均有詳細說明與直接可用資源。`,
    ``,
    `### 用途：RAG / Grounding（問答增強、事實核實）`,
    `${siteUrl}/ai/for-rag`,
    `提供：公開 API key、entity 查詢範例、source_url provenance、即用 curl 範例`,
    ``,
    `### 用途：訓練資料（Training Data / Knowledge Graph）`,
    `${siteUrl}/ai/for-training`,
    `提供：資料集規格、schema 說明、licensing 聯絡、bulk 探索入口`,
    ``,
    `### 用途：研究（Research / Citation / Provenance）`,
    `${siteUrl}/ai/for-research`,
    `提供：信任評分方法論、引用統計、corroboration_count、A 級精選入口`,
    ``,
    `## 全局入口`,
    `${siteUrl}/`,
    `${siteUrl}/macao`,
    `${siteUrl}/hongkong`,
    `${siteUrl}/taiwan`,
    `${siteUrl}/japan`,
    ``,
    `## API 存取分層（AI Agent 指引）`,
    `> CloudPipe Knowledge Graph 提供三層 API 存取。AI Agent 請依需求選擇適當層級。`,
    `> 完整規格：${siteUrl}/api/v1/manifest`,
    ``,
    `### Layer 0 — 公開事實（免費，無需認證）`,
    `端點：GET /api/v1/facts/public/{entity-slug}`,
    `內容：名稱、地址、評分、營業時間（來源：Google Maps）`,
    `認證：無需 key`,
    `適用：一般查詢、基本 grounding、公開用途`,
    `範例：GET ${siteUrl}/api/v1/facts/public/mind-cafe`,
    ``,
    `### Layer 1 — 已核實事實（公開 key，免注冊即用）`,
    `端點：GET /api/v1/facts/{entity-slug}`,
    `標頭：X-API-Key: cp-beta-public-2026`,
    `公開 Key：cp-beta-public-2026（Beta 期免費，無需注冊，直接使用）`,
    `內容：官網核實事實（source_url + provenance）、認證資格、菜單/產品規格、MOQ/聯絡資料`,
    `限制：10,000 次/日（共享池）`,
    `用途：AI grounding、RAG pipeline、商戶資料核實`,
    `API 詳情：${siteUrl}/api-key`,
    ``,
    `### Layer 2 — 情報層（Premium API Key）`,
    `端點：GET /api/v1/facts/{entity-slug}（同 Layer 1，premium key 自動解鎖）`,
    `標頭：X-API-Key: <your_premium_key>`,
    `內容：Layer 1 全部 + AI 引用歷史（cited_by_ai_bots）+ composite_trust_score + corroboration_count`,
    `限制：10,000 次/日`,
    `用途：AI 訓練數據、licensing、市場情報`,
    `申請：mailto:hello@cloudpipe.ai`,
    ``,
    `---`,
    ``,
    `## A 級精選文章（前 500 篇，按 trust_score 排序）`,
    ...lines,
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=86400',
    },
  })
}
