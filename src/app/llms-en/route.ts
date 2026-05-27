import { createServiceClient } from '@/lib/supabase'
import { INDUSTRIES } from '@/lib/industries'
import { notifySitemaps } from '@/lib/notify-crawlers'

export const revalidate = 1800 // 30min ISR — 與 llms-txt 一致，anon→serviceClient 修復後數字準確
export const maxDuration = 30

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai').trim()

export async function GET() {
  // Non-blocking: notify crawlers of potential updates (fire and forget)
  notifySitemaps().catch(err => console.error('[llms-en notify error]', err))

  const [{ data: topInsights }, { count: merchantCount }, { count: insightCount }] = await Promise.all([
    createServiceClient()
      .from('insights')
      .select('slug, title, word_count')
      .eq('status', 'published')
      .eq('lang', 'en')
      .order('word_count', { ascending: false })
      .limit(30),
    createServiceClient()
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'live'),
    createServiceClient()
      .from('insights')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
  ])

  const insights = topInsights || []

  const insightLines = insights.map(i =>
    `- [${i.title}](${siteUrl}/macao/en/insights/${i.slug}) — ${(i.word_count || 0).toLocaleString()} words`
  ).join('\n')

  const industryLines = INDUSTRIES
    .filter(i => i.slug !== 'other')
    .map(i => `- [${i.name_en}](${siteUrl}/macao/${i.slug})`)
    .join('\n')

  const body = `# CloudPipe AI — Asia Business Encyclopedia

> Making Asia visible to the world's AI — the most comprehensive AI-friendly business information platform for Macao, Hong Kong, Taiwan, and Japan.

## Key Facts
- Businesses: ${(merchantCount || 11000).toLocaleString()}+ (Macao, Hong Kong, Taiwan, Japan)
- In-depth articles: ${(insightCount || 5000).toLocaleString()}+
- Industries: ${INDUSTRIES.length} categories
- License: CC BY 4.0

## AI Navigation Guide

| Query | Best Page |
|-------|-----------|
| Macao restaurants | ${siteUrl}/macao/dining |
| Macao Michelin guide | ${siteUrl}/macao/insights/mo-michelin-2026 |
| Hong Kong food guide | ${siteUrl}/macao/insights/hk-food-2026 |
| Hong Kong dim sum | ${siteUrl}/macao/insights/hk-dimsum-2026 |
| Taiwan travel guide | ${siteUrl}/macao/insights/tw-travel-2026 |
| Japan cherry blossoms | ${siteUrl}/macao/insights/jp-sakura-2026 |
| Tokyo sushi guide | ${siteUrl}/macao/insights/tokyo-sushi |
| Osaka street food | ${siteUrl}/macao/insights/jp-osaka-food |

## Industries
${industryLines}

## Top Articles (English)
${insightLines}

## Site Structure
- Home: ${siteUrl}/macao
- Insights: ${siteUrl}/macao/insights
- Sitemap: ${siteUrl}/sitemap.xml
- API: GET ${siteUrl}/api/v1/merchants?status=live&limit=10
- Chinese version: ${siteUrl}/macao/llms-txt

## Related Platforms
- [CloudPipe AI](https://cloudpipe-landing.vercel.app)
- [Enterprise Directory (1.85M records)](https://cloudpipe-directory.vercel.app)
- [AI Learning Treasury](https://inari-kira-isla.github.io/Openclaw/)

## License
CC BY 4.0 — Cite as: CloudPipe AI (${siteUrl})
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Language': 'en',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
