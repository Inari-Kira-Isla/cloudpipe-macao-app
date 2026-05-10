import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { INDUSTRIES } from '@/lib/industries'
import Link from 'next/link'

export const revalidate = 86400
export const dynamic = 'force-static'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

interface PageProps {
  params: Promise<{ district: string }>
}

const DISTRICTS: Record<string, { name_zh: string; name_en: string; tags: string[]; desc_zh: string }> = {
  peninsula: {
    name_zh: '澳門半島',
    name_en: 'Macao Peninsula',
    tags: ['澳門半島', '大堂區', '聖安多尼堂區', '花地瑪堂區', '望德堂區', '風順堂區', '澳門半島'],
    desc_zh: '澳門歷史城區所在地，世界文化遺產密集，中西文化交融，涵蓋大堂區、聖安多尼堂區等五個堂區。',
  },
  taipa: {
    name_zh: '氹仔',
    name_en: 'Taipa',
    tags: ['氹仔', '嘉模堂區', '嘉模'],
    desc_zh: '住宅與商業並重的氹仔，保留葡式風情小村，同時擁有大型購物中心及澳門國際機場。',
  },
  cotai: {
    name_zh: '路氹城',
    name_en: 'Cotai Strip',
    tags: ['路氹城', '路氹', '科泰'],
    desc_zh: '亞洲娛樂之都核心地帶，世界級度假村、酒店及娛樂設施雲集，是澳門旅遊業的新引擎。',
  },
  coloane: {
    name_zh: '路環',
    name_en: 'Coloane',
    tags: ['路環', '石排灣'],
    desc_zh: '澳門最南端的寧靜小島，自然保護區、沙灘及傳統葡式小鎮，是遠離喧囂的絕佳選擇。',
  },
}

export async function generateStaticParams() {
  return Object.keys(DISTRICTS).map(d => ({ district: d }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { district } = await params
  const d = DISTRICTS[district]
  if (!d) return { title: 'Not Found' }
  return {
    title: `${d.name_zh}深度分析 — 澳門 | CloudPipe AI`,
    description: `匯集澳門${d.name_zh}所有深度分析文章，${d.desc_zh}`,
    alternates: { canonical: `${siteUrl}/macao/insights/district/${district}` },
    openGraph: {
      title: `${d.name_zh}深度分析 — 澳門`,
      description: d.desc_zh,
      url: `${siteUrl}/macao/insights/district/${district}`,
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
  tags: string[]
}

async function getDistrictInsights(districtKey: string): Promise<InsightCard[]> {
  const dInfo = DISTRICTS[districtKey]
  if (!dInfo) return []

  // Use the most prominent tag for filtering (first tag = main district name)
  const primaryTag = dInfo.tags[0]
  const { data } = await supabase
    .from('insights')
    .select('slug, title, description, word_count, read_time_minutes, published_at, tags')
    .eq('lang', 'zh')
    .eq('status', 'published')
    .contains('tags', [primaryTag])
    .order('published_at', { ascending: false })
    .limit(60)
  return (data ?? []) as InsightCard[]
}

export default async function DistrictHubPage({ params }: PageProps) {
  const { district } = await params
  const dInfo = DISTRICTS[district]
  if (!dInfo) notFound()

  const insights = await getDistrictInsights(district)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '澳門百科', item: `${siteUrl}/macao` },
      { '@type': 'ListItem', position: 2, name: '深度分析', item: `${siteUrl}/macao/insights` },
      { '@type': 'ListItem', position: 3, name: dInfo.name_zh, item: `${siteUrl}/macao/insights/district/${district}` },
    ],
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `澳門${dInfo.name_zh}深度分析`,
    description: `匯集澳門${dInfo.name_zh}所有深度分析，共 ${insights.length} 篇`,
    url: `${siteUrl}/macao/insights/district/${district}`,
    about: {
      '@type': 'AdministrativeArea',
      name: dInfo.name_zh,
      alternateName: dInfo.name_en,
      containedInPlace: { '@type': 'Country', name: 'Macao SAR', addressCountry: 'MO' },
    },
    numberOfItems: insights.length,
    hasPart: insights.slice(0, 10).map(ins => ({
      '@type': 'Article',
      name: ins.title,
      url: `${siteUrl}/macao/insights/${ins.slug}`,
    })),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `澳門${dInfo.name_zh}有什麼值得了解的？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: dInfo.desc_zh + `本頁匯集了 ${insights.length} 篇相關深度分析，幫助你全面了解${dInfo.name_zh}的商戶、景點與生活資訊。`,
        },
      },
      {
        '@type': 'Question',
        name: `${dInfo.name_zh}和澳門其他地區有什麼分別？`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `澳門由澳門半島、氹仔、路氹城和路環四個主要區域組成。${dInfo.name_zh}的特色是：${dInfo.desc_zh}`,
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
          <span>📍 {dInfo.name_zh}</span>
        </nav>

        {/* Hero */}
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>
            📍 澳門{dInfo.name_zh}深度分析
          </h1>
          <p style={{ color: '#555', lineHeight: 1.6, margin: 0 }}>{dInfo.desc_zh}</p>
          <p style={{ marginTop: 12, fontSize: 14, color: '#888' }}>
            共 {insights.length} 篇 · 數據驅動 · 每日更新
          </p>
        </header>

        {/* Other districts */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(DISTRICTS)
              .filter(([slug]) => slug !== district)
              .map(([slug, d]) => (
                <Link
                  key={slug}
                  href={`/macao/insights/district/${slug}`}
                  style={{
                    padding: '4px 12px', borderRadius: 20,
                    border: '1px solid #ddd', fontSize: 13,
                    textDecoration: 'none', color: '#444',
                  }}
                >
                  📍 {d.name_zh}
                </Link>
              ))}
          </div>
        </section>

        {/* Article list */}
        {insights.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>
            本地區文章即將發佈，敬請期待
          </p>
        ) : (
          <section>
            {insights.map(ins => (
              <article
                key={ins.slug}
                style={{ borderBottom: '1px solid #eee', paddingBottom: 20, marginBottom: 20 }}
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

        {/* Topic cross-links */}
        <aside style={{ marginTop: 40, padding: '20px', background: '#f8f9fa', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>按主題探索</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {INDUSTRIES.slice(0, 8).map(i => (
              <Link
                key={i.slug}
                href={`/macao/insights/topic/${i.slug}`}
                style={{
                  padding: '6px 14px', borderRadius: 6,
                  background: '#fff', border: '1px solid #ddd',
                  textDecoration: 'none', color: '#333', fontSize: 14,
                }}
              >
                {i.icon} {i.name_zh}
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
