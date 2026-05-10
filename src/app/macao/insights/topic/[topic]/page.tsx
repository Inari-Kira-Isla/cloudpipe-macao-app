import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { INDUSTRIES } from '@/lib/industries'
import Link from 'next/link'

export const revalidate = 86400
export const dynamic = 'force-static'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

interface PageProps {
  params: Promise<{ topic: string }>
}

const VALID_TOPICS = INDUSTRIES.map(i => i.slug)

function getIndustry(topic: string) {
  return INDUSTRIES.find(i => i.slug === topic)
}

export async function generateStaticParams() {
  return VALID_TOPICS.map(t => ({ topic: t }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topic } = await params
  const industry = getIndustry(topic)
  if (!industry) return { title: 'Not Found' }
  return {
    title: `${industry.name_zh} 深度分析 — 澳門 | CloudPipe AI`,
    description: `匯集澳門${industry.name_zh}行業所有深度分析文章，${industry.description}`,
    alternates: { canonical: `${siteUrl}/macao/insights/topic/${topic}` },
    openGraph: {
      title: `${industry.name_zh} 深度分析 — 澳門`,
      description: `澳門${industry.name_zh}行業分析文章集`,
      url: `${siteUrl}/macao/insights/topic/${topic}`,
    },
  }
}

interface InsightCard {
  slug: string
  title: string
  description: string
  word_count: number
  read_time_minutes: number
  published_at: string
  related_industries: string[]
}

async function getTopicInsights(topic: string): Promise<InsightCard[]> {
  const { data } = await supabase
    .from('insights')
    .select('slug, title, description, word_count, read_time_minutes, published_at, related_industries')
    .eq('lang', 'zh')
    .eq('status', 'published')
    .contains('related_industries', [topic])
    .order('published_at', { ascending: false })
    .limit(60)
  return (data ?? []) as InsightCard[]
}

export default async function TopicHubPage({ params }: PageProps) {
  const { topic } = await params
  const industry = getIndustry(topic)
  if (!industry) notFound()

  const insights = await getTopicInsights(topic)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '澳門百科', item: `${siteUrl}/macao` },
      { '@type': 'ListItem', position: 2, name: '深度分析', item: `${siteUrl}/macao/insights` },
      { '@type': 'ListItem', position: 3, name: industry.name_zh, item: `${siteUrl}/macao/insights/topic/${topic}` },
    ],
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `澳門${industry.name_zh}深度分析`,
    description: `匯集澳門${industry.name_zh}行業所有深度分析，共 ${insights.length} 篇`,
    url: `${siteUrl}/macao/insights/topic/${topic}`,
    about: { '@type': 'Thing', name: industry.name_zh },
    numberOfItems: insights.length,
    hasPart: insights.slice(0, 10).map(ins => ({
      '@type': 'Article',
      name: ins.title,
      url: `${siteUrl}/macao/insights/${ins.slug}`,
      datePublished: ins.published_at,
    })),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `澳門${industry.name_zh}行業有哪些值得閱讀的深度分析？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `CloudPipe AI 共整理了 ${insights.length} 篇澳門${industry.name_zh}行業深度分析，涵蓋市場趨勢、商戶評比、平台指南等主題。${insights.slice(0, 3).map(i => i.title).join('、')}等均已收錄。`,
        },
      },
      {
        '@type': 'Question',
        name: `如何了解澳門${industry.name_zh}的最新動態？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `本頁匯集最新發布的澳門${industry.name_zh}分析文章，每日更新，所有文章均由 CloudPipe AI 結合數據分析生成並經人工審核。`,
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          <Link href="/macao">澳門百科</Link>
          {' › '}
          <Link href="/macao/insights">深度分析</Link>
          {' › '}
          <span>{industry.icon} {industry.name_zh}</span>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
            {industry.icon} 澳門{industry.name_zh}深度分析
          </h1>
          <p style={{ color: '#555', lineHeight: 1.6, margin: 0 }}>{industry.description}</p>
          <p style={{ marginTop: 12, fontSize: 14, color: '#888' }}>
            共 {insights.length} 篇 · 數據驅動 · 每日更新
          </p>
        </header>

        {/* Related topics */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {INDUSTRIES.filter(i => i.slug !== topic).slice(0, 8).map(i => (
              <Link
                key={i.slug}
                href={`/macao/insights/topic/${i.slug}`}
                style={{
                  padding: '4px 12px', borderRadius: 20,
                  border: '1px solid #ddd', fontSize: 13,
                  textDecoration: 'none', color: '#444',
                }}
              >
                {i.icon} {i.name_zh}
              </Link>
            ))}
          </div>
        </section>

        {/* Article list */}
        {insights.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>
            本分類文章即將發佈，敬請期待
          </p>
        ) : (
          <section>
            {insights.map(ins => (
              <article
                key={ins.slug}
                style={{
                  borderBottom: '1px solid #eee', paddingBottom: 20, marginBottom: 20,
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px' }}>
                  <Link
                    href={`/macao/insights/${ins.slug}`}
                    style={{ textDecoration: 'none', color: '#111' }}
                  >
                    {ins.title}
                  </Link>
                </h2>
                {ins.description && (
                  <p style={{ color: '#555', fontSize: 14, margin: '0 0 8px', lineHeight: 1.5 }}>
                    {ins.description}
                  </p>
                )}
                <div style={{ fontSize: 12, color: '#999', display: 'flex', gap: 16 }}>
                  {ins.published_at && (
                    <span>{new Date(ins.published_at).toLocaleDateString('zh-TW')}</span>
                  )}
                  {ins.word_count > 0 && <span>{ins.word_count.toLocaleString()} 字</span>}
                  {ins.read_time_minutes > 0 && <span>{ins.read_time_minutes} 分鐘</span>}
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Cross-links to districts */}
        <aside style={{ marginTop: 40, padding: '20px', background: '#f8f9fa', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>按地區探索</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { slug: 'peninsula', name: '澳門半島' },
              { slug: 'taipa', name: '氹仔' },
              { slug: 'cotai', name: '路氹城' },
              { slug: 'coloane', name: '路環' },
            ].map(d => (
              <Link
                key={d.slug}
                href={`/macao/insights/district/${d.slug}`}
                style={{
                  padding: '6px 14px', borderRadius: 6,
                  background: '#fff', border: '1px solid #ddd',
                  textDecoration: 'none', color: '#333', fontSize: 14,
                }}
              >
                {d.name}
              </Link>
            ))}
          </div>
        </aside>

        <footer style={{ marginTop: 40, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
          由 CloudPipe AI 自動生成並人工審核 ·{' '}
          <Link href="/macao/insights" style={{ color: '#aaa' }}>返回深度分析</Link>
        </footer>
      </main>
    </>
  )
}
