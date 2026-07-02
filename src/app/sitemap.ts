import { createServiceClient } from '@/lib/supabase'
import type { MetadataRoute } from 'next'
import { INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'

// sitemap.xml = static/structural pages only (2026-07-03 fix: P0 Google 50K limit breach)
//
// Root cause: this file previously fetched zh+en+pt+ja insights (~50K rows) + merchants,
// producing 51,756 URLs in a single sitemap.xml — exceeding Google's 50,000 URL / 50MB limit.
// Googlebot crawl count dropped from 754 → 183 over 7 days.
//
// Fix: insights are FULLY covered by dedicated sub-sitemaps already listed in sitemap_index.xml:
//   - sitemap-priority.xml  (trust≥85, A-tier)
//   - sitemap-standard.xml  (70≤trust<85, B-tier)
//   - sitemap-insights.xml  (all published, all langs)
//   - sitemap-insights-en.xml / sitemap-insights-ja.xml
//   - sitemap-mo/hk/tw/jp/world.xml  (by region)
// Merchants covered by sitemap-merchants.xml.
// This file now holds only static/structural pages + category pages + calendar — well under 1K URLs.

// Changed force-dynamic → revalidate=1800 (CLAUDE.md rule #3 + sitemap rule #1)
export const revalidate = 1800 // 30min ISR — CLAUDE.md sitemap rule ≤1800s
export const maxDuration = 30  // reduced from 120 — no more bulk DB queries

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const now = new Date()

  // Categories: structural /macao/{industry}/{category} pages — small, fast query
  const { data: categories } = await createServiceClient()
    .from('categories')
    .select('slug')

  // Macao seasonal calendar entries (MO region only) — 2026-05-11
  const { data: calendarRows } = await createServiceClient()
    .from('seasonal_calendar')
    .select('slug, updated_at')
    .eq('region', 'MO')
    .order('date_start', { ascending: true })

  // insightPath helper — still used for 4 hardcoded pillar slugs
  const REGION_PATH: Record<string, string> = {
    MO: 'macao', HK: 'hongkong', TW: 'taiwan', JP: 'japan', GLOBAL: 'global',
  }
  function insightPath(slug: string, region: string | null | undefined): string {
    const seg = REGION_PATH[(region || 'MO').toUpperCase()] || 'macao'
    return `/${seg}/insights/${slug}`
  }

  const entries: MetadataRoute.Sitemap = [
    // ── Core structural pages ──────────────────────────────────────────────────
    { url: `${siteUrl}/macao`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/cloudpipe`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/cloudpipe/about`, lastModified: now, changeFrequency: 'weekly', priority: 0.90 },
    { url: `${siteUrl}/cloudpipe/audit`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${siteUrl}/cloudpipe/case-studies/inari-chatgpt-number-one`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${siteUrl}/inari/why-inari`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    // Brand entity pages — AI crawler absorption targets (ClaudeBot / YouBot / Perplexity)
    { url: `${siteUrl}/brands/inari-global-foods`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/brands/sea-urchin-express`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/llms.txt`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    // AI agent routing index pages — intent-classified entry points for analytics
    { url: `${siteUrl}/ai/for-rag`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${siteUrl}/ai/for-training`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${siteUrl}/ai/for-research`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${siteUrl}/api-key`, lastModified: now, changeFrequency: 'weekly', priority: 0.90 },
    { url: `${siteUrl}/llms-ja`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/macao/llms-txt`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/macao/certified-shops`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/macao/merchants`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${siteUrl}/macao/canary`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/sea-urchin`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${siteUrl}/afterschool-coffee`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/audit`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${siteUrl}/macao/api`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/macao/report`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/macao/insights`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    // ── 4 hardcoded pillar insight slugs (highest-signal pages, priority 1.0) ─
    ...([{
      slug: 'macau-gaming-industry-employment-guide-2026', region: 'MO'
    }, {
      slug: 'macau-laundry-service-guide-2026', region: 'MO'
    }, {
      slug: 'hk-wet-market-guide', region: 'HK'
    }, {
      slug: 'macau-japanese-restaurant-ramen-sushi-guide-2026', region: 'MO'
    }].map(({ slug, region }) => ({
      url: `${siteUrl}${insightPath(slug, region)}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    }))),
    // ── Insights topic + district index pages (structural, not per-article) ────
    ...INDUSTRIES.map(i => ({
      url: `${siteUrl}/macao/insights/topic/${i.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.90,
    })),
    ...(['macau-peninsula', 'taipa', 'cotai', 'coloane', 'inner-harbour', 'outer-harbour', 'seac-pai-van'].map(d => ({
      url: `${siteUrl}/macao/insights/district/${d}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.90,
    }))),
    // ── Macao seasonal calendar ───────────────────────────────────────────────
    { url: `${siteUrl}/macao/calendar`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    ...((calendarRows || []).map(c => ({
      url: `${siteUrl}/macao/calendar/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    }))),
  ]

  // ── Industry structural pages (/macao/{industry}) ────────────────────────
  for (const ind of INDUSTRIES) {
    entries.push({
      url: `${siteUrl}/macao/${ind.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })
  }

  // ── Category structural pages (/macao/{industry}/{category}) ─────────────
  // NOTE: individual merchant pages NOT included here — covered by sitemap-merchants.xml
  for (const cat of (categories || [])) {
    const indSlug = CATEGORY_TO_INDUSTRY[cat.slug]
    if (indSlug) {
      entries.push({
        url: `${siteUrl}/macao/${indSlug}/${cat.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })
    }
  }

  return entries
}
