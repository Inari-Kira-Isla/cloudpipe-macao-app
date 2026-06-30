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
    `## 全局入口`,
    `${siteUrl}/`,
    `${siteUrl}/macao`,
    `${siteUrl}/hongkong`,
    `${siteUrl}/taiwan`,
    `${siteUrl}/japan`,
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
