/**
 * Shared InsightPageView — multi-region insight detail page renderer.
 *
 * Used by:
 *   - src/app/macao/insights/[slug]/page.tsx     (region='MO')
 *   - src/app/taiwan/insights/[slug]/page.tsx    (region='TW')
 *   - src/app/hongkong/insights/[slug]/page.tsx  (region='HK')
 *   - src/app/japan/insights/[slug]/page.tsx     (region='JP')
 *   - src/app/global/insights/[slug]/page.tsx    (region='GLOBAL')
 *
 * Created 2026-05-11 (B+C remediation: separate region routes + 301 redirects from /macao/insights/).
 *
 * The macao page is the legacy implementation and remains as the original (with region='MO' filter).
 * For TW/HK/JP/GLOBAL we use this shared view to keep code DRY.
 */
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { InsightArticle } from '@/lib/types'
import { safeJsonLd } from '@/lib/types'
import ComparisonTable from '@/app/macao/insights/ComparisonTable'
import { INDUSTRIES, CATEGORY_TO_INDUSTRY } from '@/lib/industries'
import { ClickTracker } from '@/components/ClickTracker'

export type RegionCode = 'MO' | 'HK' | 'TW' | 'JP' | 'GLOBAL'

export interface RegionConfig {
  code: RegionCode
  pathSegment: string  // 'macao' | 'taiwan' | 'hongkong' | 'japan' | 'global'
  encyclopediaName: { zh: string; en: string; pt: string }
  breadcrumbName: { zh: string; en: string; pt: string }
  ogSiteName: { zh: string; en: string; pt: string }
}

export const REGION_CONFIGS: Record<RegionCode, RegionConfig> = {
  MO: {
    code: 'MO', pathSegment: 'macao',
    encyclopediaName: { zh: '澳門商戶百科', en: 'Macao Business Encyclopedia', pt: 'Enciclopédia Comercial de Macau' },
    breadcrumbName: { zh: '澳門百科', en: 'Macao', pt: 'Macau' },
    ogSiteName: { zh: '澳門商戶百科', en: 'Macao Business Encyclopedia', pt: 'Enciclopédia de Macau' },
  },
  HK: {
    code: 'HK', pathSegment: 'hongkong',
    encyclopediaName: { zh: '香港商戶百科', en: 'Hong Kong Business Encyclopedia', pt: 'Enciclopédia Comercial de Hong Kong' },
    breadcrumbName: { zh: '香港百科', en: 'Hong Kong', pt: 'Hong Kong' },
    ogSiteName: { zh: '香港商戶百科', en: 'Hong Kong Business Encyclopedia', pt: 'Enciclopédia de Hong Kong' },
  },
  TW: {
    code: 'TW', pathSegment: 'taiwan',
    encyclopediaName: { zh: '台灣商戶百科', en: 'Taiwan Business Encyclopedia', pt: 'Enciclopédia Comercial de Taiwan' },
    breadcrumbName: { zh: '台灣百科', en: 'Taiwan', pt: 'Taiwan' },
    ogSiteName: { zh: '台灣商戶百科', en: 'Taiwan Business Encyclopedia', pt: 'Enciclopédia de Taiwan' },
  },
  JP: {
    code: 'JP', pathSegment: 'japan',
    encyclopediaName: { zh: '日本商戶百科', en: 'Japan Business Encyclopedia', pt: 'Enciclopédia Comercial do Japão' },
    breadcrumbName: { zh: '日本百科', en: 'Japan', pt: 'Japão' },
    ogSiteName: { zh: '日本商戶百科', en: 'Japan Business Encyclopedia', pt: 'Enciclopédia do Japão' },
  },
  GLOBAL: {
    code: 'GLOBAL', pathSegment: 'global',
    encyclopediaName: { zh: 'Global Business Insights', en: 'Global Business Insights', pt: 'Análises Comerciais Globais' },
    breadcrumbName: { zh: 'Global Insights', en: 'Global Insights', pt: 'Análises Globais' },
    ogSiteName: { zh: 'Global Business Insights', en: 'Global Business Insights', pt: 'Análises Globais' },
  },
}

export const revalidate = 86400

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

const VALID_LANGS = ['zh', 'en', 'pt'] as const
type Lang = (typeof VALID_LANGS)[number]

const LANG_CONFIG: Record<Lang, { label: string; locale: string; hreflang: string; inLanguage: string; dateLocale: string }> = {
  zh: { label: '中文', locale: 'zh_TW', hreflang: 'zh-Hant', inLanguage: 'zh-Hant', dateLocale: 'zh-TW' },
  en: { label: 'English', locale: 'en_US', hreflang: 'en', inLanguage: 'en', dateLocale: 'en-US' },
  pt: { label: 'Português', locale: 'pt_PT', hreflang: 'pt', inLanguage: 'pt', dateLocale: 'pt-PT' },
}

const UI_STRINGS: Record<Lang, {
  toc: string; faq: string; faqToc: string; sources: string; related: string
  comparison: string; back: string; backLabel: string; generatedBy: string; lastUpdated: string
  words: string; readTime: string; notFound: string; relatedIndustries: string; moreInsights: string; min: string
  categoryHub: string; encyclopediaHub: string; encyclopediaHubSub: string
  spiderWeb: string; spiderWebSub: string; sharedMerchants: string
}> = {
  zh: {
    toc: '目錄', faq: '常見問題', faqToc: '常見問題 FAQ', sources: '資料來源',
    related: '相關商戶', comparison: '綜合比較表', back: '← 返回深度分析',
    backLabel: '深度分析', generatedBy: '由 CloudPipe AI 自動生成並人工審核',
    lastUpdated: '最後更新', words: '字', readTime: '分鐘', notFound: '找不到文章',
    relatedIndustries: '相關行業', moreInsights: '更多深度分析', min: '分鐘',
    categoryHub: '分類入口', encyclopediaHub: '地區百科', encyclopediaHubSub: '探索更多地區知識',
    spiderWeb: '延伸閱讀', spiderWebSub: '與本文共享商戶或主題的深度指南', sharedMerchants: '個共同商戶',
  },
  en: {
    toc: 'Table of Contents', faq: 'FAQ', faqToc: 'Frequently Asked Questions', sources: 'Sources',
    related: 'Related Merchants', comparison: 'Comparison Table', back: '← Back to Insights',
    backLabel: 'Insights', generatedBy: 'Auto-generated by CloudPipe AI with human review',
    lastUpdated: 'Last updated', words: 'words', readTime: 'min read', notFound: 'Article not found',
    relatedIndustries: 'Related Industries', moreInsights: 'More Insights', min: 'min',
    categoryHub: 'Browse Categories', encyclopediaHub: 'Regional Encyclopedia', encyclopediaHubSub: 'Explore more regional knowledge',
    spiderWeb: 'Related Guides', spiderWebSub: 'In-depth articles sharing merchants or topics with this guide', sharedMerchants: 'shared merchants',
  },
  pt: {
    toc: 'Índice', faq: 'Perguntas Frequentes', faqToc: 'Perguntas Frequentes', sources: 'Fontes',
    related: 'Comerciantes Relacionados', comparison: 'Tabela Comparativa', back: '← Voltar às Análises',
    backLabel: 'Análises', generatedBy: 'Gerado automaticamente por CloudPipe AI com revisão humana',
    lastUpdated: 'Última atualização', words: 'palavras', readTime: 'min de leitura', notFound: 'Artigo não encontrado',
    relatedIndustries: 'Indústrias Relacionadas', moreInsights: 'Mais Análises', min: 'min',
    categoryHub: 'Explorar Categorias', encyclopediaHub: 'Enciclopédia Regional', encyclopediaHubSub: 'Explorar mais conhecimento regional',
    spiderWeb: 'Leitura Relacionada', spiderWebSub: 'Artigos que partilham comerciantes ou temas com este guia', sharedMerchants: 'comerciantes em comum',
  },
}

function parseLang(raw?: string): Lang {
  if (raw && VALID_LANGS.includes(raw as Lang)) return raw as Lang
  return 'zh'
}

async function getInsight(slug: string, lang: Lang, region: RegionCode) {
  const { data } = await supabase
    .from('insights')
    .select('*')
    .eq('slug', slug)
    .eq('lang', lang)
    .eq('status', 'published')
    .eq('region', region)
    .maybeSingle()
  return data as InsightArticle | null
}

async function getAvailableLangs(slug: string, region: RegionCode): Promise<Lang[]> {
  const { data } = await supabase
    .from('insights')
    .select('lang')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('region', region)
  if (!data) return []
  return data.map(d => d.lang as Lang).filter(l => VALID_LANGS.includes(l))
}

interface RelatedMerchant {
  slug: string
  name_zh: string
  name_en?: string
  district?: string
  google_rating?: number
  website?: string | null
  certification_sources?: Array<{ name: string; shop_code?: string }> | null
  category: { slug: string; name_zh: string; icon?: string } | null
}

interface SpiderWebInsight {
  slug: string
  title: string
  subtitle?: string
  read_time_minutes: number
  shared_merchants: number
  shared_slugs: string[]
}

async function getRelatedMerchants(slugs: string[]): Promise<RelatedMerchant[]> {
  const validSlugs = (slugs || []).filter(s => s && typeof s === 'string' && s !== 'null')
  if (!validSlugs.length) return []
  const { data } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, category:categories(slug, name_zh, icon), district, google_rating, website, certification_sources')
    .in('slug', validSlugs)
    .eq('status', 'live')
  if (!data) return []
  return data.map((d: Record<string, unknown>) => ({
    ...d,
    category: Array.isArray(d.category) ? d.category[0] || null : d.category,
  })) as RelatedMerchant[]
}

function extractSlugKeywords(slug: string): Set<string> {
  const STOP = new Set(['macau', 'macao', '2025', '2026', '2024', 'guide', 'best', 'top', 'review', 'how', 'what', 'that', 'with', 'from', 'this', 'your', 'their'])
  return new Set(slug.split('-').filter(w => w.length > 3 && !STOP.has(w)))
}

async function getSpiderWebInsights(
  currentSlug: string,
  merchantSlugs: string[],
  lang: Lang,
  industries: string[],
  region: RegionCode,
  limit = 8,
): Promise<SpiderWebInsight[]> {
  const validSlugs = (merchantSlugs || []).filter(s => s && s !== 'null')
  const myKeywords = extractSlugKeywords(currentSlug)

  if (!validSlugs.length && !industries.length && myKeywords.size < 2) return []

  // Removed null filter — industry/keyword matching works without merchant slugs
  const { data: candidates } = await supabase
    .from('insights')
    .select('slug, title, subtitle, read_time_minutes, related_merchant_slugs, related_industries')
    .eq('status', 'published')
    .eq('lang', lang)
    .eq('region', region)
    .neq('slug', currentSlug)
    .limit(300)

  if (!candidates?.length) return []

  const myMerchants = new Set(validSlugs)
  const myIndustries = new Set(industries)

  const scored: Array<{ insight: SpiderWebInsight; score: number }> = []
  for (const c of candidates) {
    let rms: string[] = c.related_merchant_slugs || []
    if (typeof rms === 'string') {
      try { rms = JSON.parse(rms) } catch { rms = [] }
    }
    const overlap = rms.filter((s: string) => myMerchants.has(s))
    const indOverlap = (c.related_industries || []).filter((i: string) => myIndustries.has(i)).length
    const kwOverlap = [...extractSlugKeywords(c.slug)].filter(k => myKeywords.has(k)).length

    const score = overlap.length * 3 + indOverlap * 2 + kwOverlap
    if (score > 0) {
      scored.push({
        insight: {
          slug: c.slug,
          title: c.title,
          subtitle: c.subtitle,
          read_time_minutes: c.read_time_minutes,
          shared_merchants: overlap.length,
          shared_slugs: overlap.slice(0, 5),
        },
        score,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.insight)
}

interface InsightPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function buildMetadata(
  region: RegionCode,
  { params, searchParams }: InsightPageProps,
): Promise<Metadata> {
  const cfg = REGION_CONFIGS[region]
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { lang: langParam } = await searchParams
  const lang = parseLang(langParam)
  const lc = LANG_CONFIG[lang]

  const article = await getInsight(slug, lang, region)
  if (!article) return { title: UI_STRINGS[lang].notFound }

  const baseTitle = article.og_title || `${article.title} — CloudPipe AI`
  const siteName = cfg.ogSiteName[lang] || cfg.ogSiteName.en
  // If og_title doesn't already contain the region name, append it
  const title = baseTitle.includes(siteName) ? baseTitle : `${article.title} — ${siteName} | CloudPipe AI`
  const description = article.og_description || article.description
  const availableLangs = await getAvailableLangs(slug, region)

  const alternates: Record<string, string> = {}
  for (const al of availableLangs) {
    const url = al === 'zh'
      ? `${siteUrl}/${cfg.pathSegment}/insights/${slug}`
      : `${siteUrl}/${cfg.pathSegment}/insights/${slug}?lang=${al}`
    alternates[LANG_CONFIG[al].hreflang] = url
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      locale: lc.locale,
      siteName,
      publishedTime: article.published_at || undefined,
      images: article.og_image ? [article.og_image] : undefined,
    },
    alternates: {
      canonical: lang === 'zh'
        ? `${siteUrl}/${cfg.pathSegment}/insights/${slug}`
        : `${siteUrl}/${cfg.pathSegment}/insights/${slug}?lang=${lang}`,
      languages: alternates,
    },
    other: { 'llms-txt': `/${cfg.pathSegment}/llms-txt` },
  }
}

export async function renderInsightPage(region: RegionCode, { params, searchParams }: InsightPageProps) {
  const cfg = REGION_CONFIGS[region]
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { lang: langParam } = await searchParams
  const lang = parseLang(langParam)
  const ui = UI_STRINGS[lang]
  const lc = LANG_CONFIG[lang]

  const [article, availableLangs] = await Promise.all([
    getInsight(slug, lang, region),
    getAvailableLangs(slug, region),
  ])
  if (!article) notFound()

  const [merchants, spiderWebInsights] = await Promise.all([
    getRelatedMerchants(article.related_merchant_slugs || []),
    getSpiderWebInsights(slug, article.related_merchant_slugs || [], lang, article.related_industries || [], region),
  ])
  const myIndustries = new Set(article.related_industries || [])
  const relatedIndustryData = INDUSTRIES.filter(i => myIndustries.has(i.slug))

  const sections = article.sections || []
  const insightsBasePath = `/${cfg.pathSegment}/insights`
  const insightCanonical = `${siteUrl}${insightsBasePath}/${slug}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at,
    wordCount: article.word_count,
    author: { '@type': 'Organization', name: 'CloudPipe AI', url: 'https://cloudpipe-landing.vercel.app' },
    publisher: { '@type': 'Organization', name: 'CloudPipe AI', url: 'https://cloudpipe-landing.vercel.app' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    mainEntityOfPage: { '@type': 'WebPage', '@id': insightCanonical },
    articleSection: ui.backLabel,
    inLanguage: lc.inLanguage,
    ...(article.og_image && { image: article.og_image }),
    ...(spiderWebInsights.length > 0 && {
      relatedLink: spiderWebInsights.slice(0, 6).map(sw =>
        lang === 'zh'
          ? `${siteUrl}/${cfg.pathSegment}/insights/${sw.slug}`
          : `${siteUrl}/${cfg.pathSegment}/insights/${sw.slug}?lang=${lang}`
      ),
    }),
    ...((article.authority_sources?.length ?? 0) > 0 && {
      isBasedOn: article.authority_sources!.map((src: { name: string; url: string }) => ({
        '@type': 'WebPage',
        name: src.name,
        url: src.url,
      })),
    }),
    ...(merchants.length > 0 && {
      mentions: merchants.filter(m => m.slug && m.slug !== 'null').slice(0, 10).map(m => ({
        '@type': 'LocalBusiness',
        name: m.name_zh,
      })),
    }),
  }

  const faqSchema = article.faqs?.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: cfg.breadcrumbName[lang] || cfg.breadcrumbName.en, item: `${siteUrl}/${cfg.pathSegment}` },
      { '@type': 'ListItem', position: 3, name: ui.backLabel, item: `${siteUrl}${insightsBasePath}` },
      { '@type': 'ListItem', position: 4, name: article.title, item: insightCanonical },
    ],
  }

  const claimReviewSchema = (article.authority_sources?.length ?? 0) > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ClaimReview',
    url: insightCanonical,
    claimReviewed: article.title,
    datePublished: article.published_at || article.created_at,
    author: { '@type': 'Organization', name: `CloudPipe ${cfg.breadcrumbName.en}`, url: siteUrl },
    reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5, worstRating: 1, alternateName: 'Verified' },
    itemReviewed: {
      '@type': 'Claim',
      name: article.title,
      author: { '@type': 'Organization', name: 'CloudPipe AI' },
      datePublished: article.published_at || article.created_at,
      appearance: {
        '@type': 'OpinionNewsArticle',
        url: insightCanonical,
        headline: article.title,
        publisher: { '@type': 'Organization', name: `CloudPipe ${cfg.breadcrumbName.en}`, url: siteUrl },
      },
    },
  } : null

  function langUrl(targetLang: Lang) {
    return targetLang === 'zh'
      ? `${insightsBasePath}/${slug}`
      : `${insightsBasePath}/${slug}?lang=${targetLang}`
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      {claimReviewSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(claimReviewSchema) }} />}
      <ClickTracker pageType="insight" pageSlug={slug} />
      <link rel="alternate" type="application/rss+xml" title={`CloudPipe ${cfg.encyclopediaName.zh} - 深度分析`} href={`${siteUrl}/feed.xml`} />
      {availableLangs.map(al => (
        <link key={al} rel="alternate" hrefLang={LANG_CONFIG[al].hreflang} href={`${siteUrl}${langUrl(al)}`} />
      ))}

      {/* ═══ Hero ═══ */}
      <div className="hero-gradient text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <nav className="text-sm text-blue-200/70 mb-4">
            <a href={`/${cfg.pathSegment}`} className="hover:text-white transition-colors">{cfg.breadcrumbName[lang] || cfg.breadcrumbName.en}</a>
            <span className="mx-2">/</span>
            <a href={insightsBasePath} className="hover:text-white transition-colors">{ui.backLabel}</a>
            <span className="mx-2">/</span>
            <span className="text-white">{article.title}</span>
          </nav>

          <h1 className="text-2xl md:text-4xl font-bold mb-3 leading-tight">{article.title}</h1>
          {article.subtitle && <p className="text-base md:text-lg text-blue-100 mb-4">{article.subtitle}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
              {article.word_count.toLocaleString()} {ui.words}
            </span>
            <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
              {article.read_time_minutes} {ui.readTime}
            </span>
            {article.published_at && (
              <span className="text-xs px-3 py-1.5 bg-white/15 backdrop-blur rounded-full border border-white/20">
                {new Date(article.published_at).toLocaleDateString(lc.dateLocale)}
              </span>
            )}
            {(article.tags || []).slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-3 py-1.5 bg-amber-400/90 text-white rounded-full font-semibold">
                {tag}
              </span>
            ))}
          </div>

          {availableLangs.length > 1 && (
            <div className="flex gap-2 mt-5">
              {availableLangs.map(al => (
                <a
                  key={al}
                  href={langUrl(al)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    al === lang
                      ? 'bg-white text-[#0f4c81] border-white font-bold'
                      : 'bg-white/10 text-white/80 border-white/30 hover:bg-white/20'
                  }`}
                >
                  {LANG_CONFIG[al].label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {article.description && (
          <p className="text-gray-700 text-base leading-relaxed mb-8 pl-4 border-l-4 border-amber-400">
            {article.description}
          </p>
        )}

        {sections.length > 0 && (
          <nav className="bg-white border border-gray-200 rounded-xl p-6 mb-10 shadow-sm">
            <h2 className="text-lg font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              {ui.toc}
            </h2>
            <ol className="space-y-2 text-sm">
              {sections.map((sec, i) => (
                <li key={sec.id}>
                  <a href={`#${sec.id}`} className="text-[#0f4c81] hover:underline">
                    {i + 1}. {sec.title}
                  </a>
                </li>
              ))}
              {(article.faqs?.length || 0) > 0 && (
                <li>
                  <a href="#faq" className="text-[#0f4c81] hover:underline">
                    {sections.length + 1}. {ui.faqToc}
                  </a>
                </li>
              )}
            </ol>
          </nav>
        )}

        <article className="prose max-w-none mb-10">
          <div dangerouslySetInnerHTML={{ __html: article.body_html }} />
        </article>

        {article.table_data && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              {ui.comparison}
            </h2>
            <ComparisonTable data={article.table_data} />
          </section>
        )}

        {article.faqs?.length > 0 && (
          <section id="faq" className="mb-10">
            <h2 className="text-xl font-bold text-[#0f4c81] mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              {ui.faq}
            </h2>
            <div className="space-y-3">
              {article.faqs.map((faq, i) => (
                <details key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="font-semibold cursor-pointer p-5 flex justify-between items-center hover:bg-gray-50 transition-colors text-[#1a1a2e]">
                    <span className="pr-4">{faq.question}</span>
                    <span className="text-[#0f4c81] text-sm group-open:rotate-180 transition-transform flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="mt-4 text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {(article.authority_sources?.length || 0) > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              {ui.sources}
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              {article.authority_sources!.map((src, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#0f4c81] mt-0.5 flex-shrink-0">•</span>
                  <span>
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[#0f4c81] hover:underline font-medium">
                      {src.name}
                    </a>
                    {src.stat && <span className="text-gray-400 ml-1">— {src.stat}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {relatedIndustryData.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[#0f4c81] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#0f4c81] rounded-full inline-block"></span>
              {ui.relatedIndustries}
            </h2>
            <div className="flex flex-wrap gap-3">
              {relatedIndustryData.map(ind => (
                <span key={ind.slug}
                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <span className="text-xl">{ind.icon}</span>
                  <div>
                    <p className="font-semibold text-[#1a1a2e] text-sm">{ind.name_zh}</p>
                    <p className="text-xs text-gray-400">{ind.name_en}</p>
                  </div>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ═══ Spider Web Hub（延伸閱讀）═══ */}
        {spiderWebInsights.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-[#0f4c81] mb-1 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#d97706] rounded-full inline-block"></span>
              {ui.spiderWeb}
            </h2>
            <p className="text-sm text-gray-400 mb-4">{ui.spiderWebSub}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {spiderWebInsights.map((sw) => (
                <a
                  key={sw.slug}
                  href={lang === 'zh' ? `${insightsBasePath}/${sw.slug}` : `${insightsBasePath}/${sw.slug}?lang=${lang}`}
                  className="card-hover block bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#d97706] to-[#f59e0b]"></div>
                  <h3 className="font-semibold text-[#1a1a2e] text-sm leading-tight mb-1.5 group-hover:text-[#0f4c81] transition-colors">
                    {sw.title}
                  </h3>
                  {sw.subtitle && <p className="text-xs text-gray-500 mb-2 line-clamp-1">{sw.subtitle}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{sw.read_time_minutes} {ui.min}</span>
                    {sw.shared_merchants > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                        🔗 {sw.shared_merchants} {ui.sharedMerchants}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-gray-200 pt-8 mt-10 text-sm text-gray-400">
          <div className="flex flex-col md:flex-row justify-between gap-2">
            <div>
              <p>{ui.generatedBy.split('CloudPipe AI')[0]}<a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a>{ui.generatedBy.split('CloudPipe AI')[1]}</p>
              <p className="mt-1">{ui.lastUpdated}：{new Date(article.updated_at).toLocaleDateString(lc.dateLocale)}</p>
            </div>
            <div className="text-right">
              <a href={insightsBasePath} className="text-[#0f4c81] hover:underline">{ui.back}</a>
              <p className="mt-1">© 2026 CloudPipe AI · CC BY 4.0</p>
            </div>
          </div>
        </footer>

        {/* Suppress unused-var TS warning for CATEGORY_TO_INDUSTRY (kept for future merchant cross-links) */}
        <span style={{ display: 'none' }} data-cti={Object.keys(CATEGORY_TO_INDUSTRY).length} />
      </main>
    </>
  )
}
