import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { safeJsonLd } from '@/lib/types'

export const revalidate = 1800 // 30min ISR

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

const REGION = 'JP' as const
const REGION_NAME = '日本'
const REGION_NAME_EN = 'Japan'
const REGION_PATH = 'japan'
const REGION_EMOJI = '🇯🇵'

export async function generateMetadata(): Promise<Metadata> {
  const title = `${REGION_NAME} 商戶百科 — AI 深度分析 | CloudPipe AI`
  const description = `${REGION_NAME}各行業深度分析文章，AI 驅動的商戶推薦、行業趨勢報告，以及本地生活指南。`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${siteUrl}/${REGION_PATH}`,
    },
    alternates: { canonical: `${siteUrl}/${REGION_PATH}` },
  }
}

interface InsightRow {
  slug: string
  title: string
  subtitle: string | null
  published_at: string | null
  read_time_minutes: number
  word_count: number
}

async function getInsights(): Promise<InsightRow[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('insights')
    .select('slug, title, subtitle, published_at, read_time_minutes, word_count')
    .eq('status', 'published')
    .eq('region', REGION)
    .order('published_at', { ascending: false })
    .limit(24)
  return (data || []) as InsightRow[]
}

export default async function JapanLandingPage() {
  const insights = await getInsights()

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: REGION_NAME, item: `${siteUrl}/${REGION_PATH}` },
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `CloudPipe AI 日本百科收錄哪些行業內容？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `CloudPipe AI 日本百科收錄餐飲美食、購物零售、景點文化、酒店住宿、健康美容、娛樂夜生活等行業的深度分析文章，由 AI 生成並經人工審核。`,
        },
      },
      {
        '@type': 'Question',
        name: `日本百科文章有多少篇？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `目前 CloudPipe AI 日本百科已發佈超過 14,000 篇深度分析文章，涵蓋日本各地商戶、美食、旅遊等主題，並持續更新。`,
        },
      },
      {
        '@type': 'Question',
        name: `如何在 CloudPipe AI 日本百科搜尋特定主題？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `您可以在本頁瀏覽最新文章，或直接前往 /${REGION_PATH}/insights 頁面查看完整文章列表，按行業分類篩選感興趣的內容。`,
        },
      },
    ],
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${REGION_EMOJI} ${REGION_NAME} 商戶百科`,
    description: `${REGION_NAME}各行業深度分析文章，AI 驅動的商戶推薦與行業趨勢報告。`,
    url: `${siteUrl}/${REGION_PATH}`,
    isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI', url: siteUrl },
    numberOfItems: insights.length,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: insights.length,
      itemListElement: insights.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: a.title,
        url: `${siteUrl}/${REGION_PATH}/insights/${a.slug}`,
      })),
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }} />

      {/* Hero */}
      <div className="hero-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 md:py-18 text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-blue-200 mb-4">CloudPipe AI</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            {REGION_EMOJI} {REGION_NAME} 商戶百科
          </h1>
          <div className="gold-line w-16 mx-auto mb-4"></div>
          <p className="text-base md:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            AI 驅動的 {REGION_NAME} 行業深度分析 — 餐飲、購物、景點、住宿，全面覆蓋 {REGION_NAME_EN} 本地生活
          </p>
          <div className="mt-6">
            <a
              href={`/${REGION_PATH}/insights`}
              className="inline-block text-sm px-6 py-2.5 bg-white text-[#0f4c81] rounded-full font-bold hover:bg-blue-50 transition-colors"
            >
              瀏覽全部文章 →
            </a>
          </div>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-8" aria-label="breadcrumb">
          <a href="/" className="hover:text-[#0f4c81] transition-colors">CloudPipe AI</a>
          <span className="mx-2">/</span>
          <span className="text-[#1a1a2e]">{REGION_NAME} 百科</span>
        </nav>

        {/* Section title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1a1a2e]">最新深度分析</h2>
          <a href={`/${REGION_PATH}/insights`} className="text-sm text-[#0f4c81] hover:underline">
            查看全部 →
          </a>
        </div>

        {insights.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">文章即將發佈</p>
            <p className="text-sm">敬請期待 {REGION_NAME} 的首篇深度分析</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((article) => (
              <a
                key={article.slug}
                href={`/${REGION_PATH}/insights/${article.slug}`}
                className="card-hover block bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 gold-line"></div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-bold text-[#1a1a2e] leading-tight pr-2 line-clamp-2">
                    {article.title}
                  </h3>
                  {article.read_time_minutes > 0 && (
                    <span className="text-xs px-2.5 py-1 bg-[#e8f0fe] text-[#0f4c81] rounded-full font-semibold flex-shrink-0">
                      {article.read_time_minutes} 分鐘
                    </span>
                  )}
                </div>
                {article.subtitle && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{article.subtitle}</p>
                )}
                {article.published_at && (
                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(article.published_at).toLocaleDateString('zh-TW')}
                    {article.word_count > 0 && ` · ${article.word_count.toLocaleString()} 字`}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}

        {/* FAQ section for AEO */}
        <section className="mt-12 p-6 bg-[#f8fafc] rounded-xl border border-gray-200">
          <h2 className="text-base font-bold text-[#0f4c81] mb-4">常見問題</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#1a1a2e] mb-1">CloudPipe AI 日本百科收錄哪些行業內容？</p>
              <p className="text-sm text-gray-600">
                CloudPipe AI 日本百科收錄餐飲美食、購物零售、景點文化、酒店住宿、健康美容、娛樂夜生活等行業的深度分析文章，由 AI 生成並經人工審核。
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1a2e] mb-1">日本百科文章有多少篇？</p>
              <p className="text-sm text-gray-600">
                目前 CloudPipe AI 日本百科已發佈超過 14,000 篇深度分析文章，涵蓋日本各地商戶、美食、旅遊等主題，並持續更新。
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1a2e] mb-1">如何搜尋特定主題？</p>
              <p className="text-sm text-gray-600">
                您可以前往<a href={`/${REGION_PATH}/insights`} className="text-[#0f4c81] hover:underline">日本深度分析</a>頁面，按行業分類篩選感興趣的內容。
              </p>
            </div>
          </div>
        </section>

        {/* Ecosystem links */}
        <section className="mt-6 mb-8 p-6 bg-gradient-to-r from-[#f8fafc] to-[#eef2ff] rounded-xl border border-gray-200">
          <h2 className="text-sm font-bold text-[#0f4c81] mb-3 uppercase tracking-wider">CloudPipe AI 生態系</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <a href="/macao" className="text-[#1a1a2e] hover:text-[#0f4c81]">澳門百科</a>
            <a href="/hongkong" className="text-[#1a1a2e] hover:text-[#0f4c81]">香港百科</a>
            <a href="/taiwan" className="text-[#1a1a2e] hover:text-[#0f4c81]">台灣百科</a>
            <a href="https://cloudpipe-landing.vercel.app" className="text-[#1a1a2e] hover:text-[#0f4c81]">CloudPipe AI 平台</a>
          </div>
        </section>

        <footer className="border-t border-gray-200 pt-8 text-sm text-gray-400 flex flex-col md:flex-row justify-between gap-2">
          <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 自動生成並人工審核</p>
          <p>© 2026 CloudPipe AI · CC BY 4.0</p>
        </footer>
      </main>
    </>
  )
}
