import { supabase } from '@/lib/supabase'
import type { Metadata } from 'next'
import type { InsightArticle } from '@/lib/types'

export const revalidate = 3600

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export const metadata: Metadata = {
  title: '深度分析 — 澳門商戶百科 | CloudPipe AI',
  description: '澳門各行業深度分析文章，數據驅動的平台比較、趨勢報告和行動指南，助力澳門商戶掌握市場脈動。',
  openGraph: {
    title: '深度分析 — 澳門商戶百科 | CloudPipe AI',
    description: '澳門各行業深度分析文章，數據驅動的平台比較和行動指南。',
    type: 'website',
    locale: 'zh_TW',
    url: `${siteUrl}/macao/insights`,
  },
  alternates: { canonical: `${siteUrl}/macao/insights` },
}

async function getInsights() {
  const { data } = await supabase
    .from('insights')
    .select('slug, title, subtitle, description, related_industries, tags, word_count, read_time_minutes, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return (data || []) as Pick<InsightArticle, 'slug' | 'title' | 'subtitle' | 'description' | 'related_industries' | 'tags' | 'word_count' | 'read_time_minutes' | 'published_at'>[]
}

const INDUSTRY_LABELS: Record<string, string> = {
  dining: '餐飲美食', hotels: '酒店住宿', attractions: '景點文化',
  shopping: '購物零售', wellness: '健康美容', services: '專業服務',
  education: '教育培訓', tech: '科技創新', nightlife: '夜生活',
  gaming: '博彩娛樂', tourism: '旅遊觀光', finance: '金融保險',
}

export default async function InsightsListPage() {
  const insights = await getInsights()

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '深度分析 — 澳門商戶百科',
    description: '澳門各行業深度分析文章',
    url: `${siteUrl}/macao/insights`,
    isPartOf: { '@type': 'WebSite', name: 'CloudPipe AI 澳門商戶百科', url: siteUrl },
    numberOfItems: insights.length,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: insights.length,
      itemListElement: insights.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: a.title,
        url: `${siteUrl}/macao/insights/${a.slug}`,
      })),
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CloudPipe AI', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: '澳門商戶百科', item: `${siteUrl}/macao` },
      { '@type': 'ListItem', position: 3, name: '深度分析', item: `${siteUrl}/macao/insights` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="hero-gradient text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 md:py-18 text-center">
          <p className="text-sm tracking-[0.3em] uppercase text-blue-200 mb-4">CloudPipe AI</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">深度分析</h1>
          <div className="gold-line w-16 mx-auto mb-4"></div>
          <p className="text-base md:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            數據驅動的澳門行業洞察 — 平台比較、趨勢報告、行動指南
          </p>
        </div>
      </div>
      <div className="gold-line"></div>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <nav className="text-sm text-gray-400 mb-8">
          <a href="/macao" className="hover:text-[#0f4c81] transition-colors">澳門百科</a>
          <span className="mx-2">/</span>
          <span className="text-[#1a1a2e]">深度分析</span>
        </nav>

        {insights.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">文章即將發佈</p>
            <p className="text-sm">敬請期待我們的首篇深度分析</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((article) => (
              <a
                key={article.slug}
                href={`/macao/insights/${article.slug}`}
                className="card-hover block bg-white border border-gray-200 rounded-xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 gold-line"></div>
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold text-[#1a1a2e] leading-tight pr-2">{article.title}</h2>
                  <span className="text-xs px-2.5 py-1 bg-[#e8f0fe] text-[#0f4c81] rounded-full font-semibold flex-shrink-0">
                    {article.read_time_minutes} 分鐘
                  </span>
                </div>
                {article.subtitle && (
                  <p className="text-sm text-gray-500 mb-3">{article.subtitle}</p>
                )}
                <p className="text-xs text-gray-600 leading-relaxed mb-4 line-clamp-3">{article.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(article.related_industries || []).slice(0, 3).map(ind => (
                    <span key={ind} className="text-xs px-2 py-0.5 bg-[#e8f0fe] text-[#0f4c81] rounded font-medium">
                      {INDUSTRY_LABELS[ind] || ind}
                    </span>
                  ))}
                  {(article.tags || []).slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
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

        <footer className="border-t border-gray-200 pt-8 mt-14 text-sm text-gray-400 flex flex-col md:flex-row justify-between gap-2">
          <p>由 <a href="https://cloudpipe-landing.vercel.app" className="text-[#0f4c81] hover:underline">CloudPipe AI</a> 自動生成並人工審核</p>
          <div className="text-right">
            <a href="/macao" className="text-[#0f4c81] hover:underline">← 返回澳門百科</a>
            <p className="mt-1">© 2026 CloudPipe AI · CC BY 4.0</p>
          </div>
        </footer>
      </main>
    </>
  )
}
