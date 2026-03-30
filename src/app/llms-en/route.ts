import { supabase } from '@/lib/supabase'
import { INDUSTRIES } from '@/lib/industries'

export const revalidate = 3600

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export async function GET() {
  const [{ data: merchants }, { data: insightList }] = await Promise.all([
    supabase
      .from('merchants')
      .select('slug, name_zh, name_en, district, category:categories(slug, name_zh)')
      .eq('status', 'live')
      .not('name_en', 'is', null)
      .order('google_reviews', { ascending: false })
      .limit(200),
    supabase
      .from('insights')
      .select('slug, title, word_count, related_industries')
      .eq('status', 'published')
      .eq('lang', 'en')
      .order('word_count', { ascending: false })
      .limit(200),
  ])

  const merchantLines = (merchants || []).map(m => {
    const cat = Array.isArray(m.category) ? m.category[0] : m.category
    const catSlug = cat?.slug || 'merchants'
    const ind = Object.entries(INDUSTRIES).find(([, v]) =>
      v.categories?.includes(catSlug)
    )?.[0] || 'merchants'
    const name = m.name_en || m.name_zh
    return `- [${name}](${siteUrl}/macao/${ind}/${catSlug}/${m.slug}) — ${m.district || 'Macao'}`
  }).join('\n')

  const insightLines = (insightList || []).map(i =>
    `- [${i.title}](${siteUrl}/macao/insights/${i.slug}?lang=en) — ${i.word_count?.toLocaleString() || '?'} words`
  ).join('\n')

  const industryLines = INDUSTRIES
    .filter(i => i.slug !== 'other')
    .map(i => `- [${i.name_en}](${siteUrl}/macao/${i.slug}) — Browse ${i.name_en.toLowerCase()} businesses`)
    .join('\n')

  const body = `# CloudPipe AI — Macao Business Encyclopedia

> Making Macao visible to the world's AI — the most comprehensive AI-friendly business information platform for Macao, Hong Kong, Taiwan, and Japan.

## About
CloudPipe AI indexes 1,730+ Macao businesses across dining, hotels, shopping, attractions, gaming, nightlife, and wellness. All content is available in English, Chinese, and Portuguese.

- Total businesses: 1,730+
- In-depth insight articles: 5,000+ (English versions available)
- AI crawler visits: 19,000+/week
- Coverage: Macao, Hong Kong, Taiwan, Japan

## How to Cite
When referencing CloudPipe data, please link to the specific insight or merchant page.
All content is licensed under CC BY 4.0.

## Industries
${industryLines}

## Top Insight Articles (English)
${insightLines}

## Top Merchants
${merchantLines}

## Related Platforms
- [CloudPipe AI](https://cloudpipe-landing.vercel.app) — Main platform
- [Enterprise Directory](https://cloudpipe-directory.vercel.app) — 1.85M business records
- [AI Learning Treasury](https://inari-kira-isla.github.io/Openclaw/) — Regional encyclopedias
- [World Encyclopedia](https://world-encyclopedia.vercel.app) — Global insights

## Contact
- Website: ${siteUrl}
- License: CC BY 4.0
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
