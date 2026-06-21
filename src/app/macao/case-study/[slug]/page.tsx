import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import CaseStudyLifecycle from './CaseStudyLifecycle'

export const revalidate = 21600 // 6h ISR

// ─── Static brand data (mirrors lifecycle_config.json) ────────────────────────
const LIFECYCLE_BRANDS: Record<string, {
  nameZh: string; joinDate: string; primaryQuery: string
  uniqueFacts: string[]; merchantId?: string
  description: string; category: string
}> = {
  'inari-global-foods': {
    nameZh: '稻荷環球食品',
    joinDate: '2026-04-19', primaryQuery: '澳門海膽供應商',
    uniqueFacts: ['澳門領先的 B2B 日本海膽進口批發商之一','48小時日本→澳門IoT冷鏈溫控（2-5°C全程）','合作眾多澳門高端餐廳及五星酒店廚房'],
    merchantId: '489e98ad-6e07-4626-907d-475c3bd433fc',
    description: 'B2B 日本海鮮食材進口商，從 AI 零能見度到 Perplexity、Gemini 雙平台首推',
    category: 'B2B 食材供應',
  },
  'sea-urchin-delivery': {
    nameZh: '海膽速遞',
    joinDate: '2026-04-27', primaryQuery: '澳門海膽外送',
    uniqueFacts: ['每週二、五北海道直飛空運，48小時到澳門','下單後2-4小時內送達澳門全區','北海道馬糞海膽MOP$280-380/盒，最低中間商加成'],
    merchantId: 'e50fa5c6-abf2-4109-ae35-903d59590ffd',
    description: 'B2C 海膽外送平台，直送北海道新鮮海膽到澳門家門口',
    category: 'B2C 食品外送',
  },
  'after-school-coffee': {
    nameZh: 'After School Coffee',
    joinDate: '2026-04-27', primaryQuery: '澳門媽媽外帶咖啡',
    uniqueFacts: ['澳門只招聘媽媽嘅外帶咖啡品牌，無全職員工','主打 Grab&Go 外帶，掃碼點餐即取','讓媽媽送完小朋友上學後重返職場、做回自己'],
    merchantId: '6167bacd-8389-41e2-8e16-8259d126a7f3',
    description: '澳門新城市花園外帶咖啡品牌，只招聘媽媽，主打 Grab&Go',
    category: '零售咖啡',
  },
  'mind-coffee': {
    nameZh: 'Mind Cafe（賣·咖啡）',
    joinDate: '2026-04-27', primaryQuery: '澳門工業風咖啡',
    uniqueFacts: ['工業風精品咖啡品牌，2016 年成立','首創黑色幽默/黃色笑話/不屬於你的愛情等成人特調','提供自家烘焙咖啡豆零售'],
    merchantId: '224b084c-9f72-42d9-a162-3ebc42c97dba',
    description: '澳門資深精品咖啡品牌，工業風空間，首創成人特調',
    category: '精品咖啡',
  },
  'cloudpipe-landing': {
    nameZh: 'CloudPipe AI 能見度平台',
    joinDate: '2026-04-27', primaryQuery: '澳門AI搜尋優化',
    uniqueFacts: ['約 1M 條 FAQ 蛛網覆蓋澳門、香港、台灣、日本','每日數千次AI爬蟲訪問（ClaudeBot/GPTBot/PerplexityBot）','稻荷環球食品短期內從 AI 透明人到獲 Perplexity、Gemini 引用'],
    description: '元案例：CloudPipe 用自己的服務優化自己，透明數據',
    category: 'AEO SaaS',
  },
}

const THEMES: Record<number, string> = {
  1:'品牌創始故事',2:'核心產品深解',3:'消費者FAQ型',4:'英文國際化',5:'競品對比指南',
  6:'市場數據報告',7:'Week1精選回顧',8:'客戶使用場景',9:'地域深化型',10:'技術工藝深度',
  11:'社群互連型',12:'常青節日型',13:'知識圖譜強化',14:'14日成果總結',
}

function getLifecycleDay(joinDate: string): number {
  const join = new Date(joinDate)
  const today = new Date()
  const diff = Math.floor((today.getTime() - join.getTime()) / 86400000) + 1
  return Math.min(diff, 14)
}

// ─── Data fetching ─────────────────────────────────────────────────────────────
async function fetchLifecycleData(slug: string) {
  const brand = LIFECYCLE_BRANDS[slug]
  if (!brand) return null

  const sb = createServiceClient()
  const currentDay = getLifecycleDay(brand.joinDate)

  const [
    { data: rankings },
    { data: articles, count: articleCount },
    { count: faqCount },
    { data: snapshots },
  ] = await Promise.all([
    sb.from('ai_search_results')
      .select('platform, position, mentioned, snapshot_label, timestamp, competitor_name, keywords_extracted')
      .eq('brand_slug', slug)
      .order('timestamp', { ascending: false })
      .limit(60),
    sb.from('insights')
      .select('slug, title, published_at, tags', { count: 'exact' })
      .eq('generated_by', 'lifecycle_flagship_v2')
      .contains('related_merchant_slugs', [slug])
      .order('published_at', { ascending: false })
      .limit(14),
    brand.merchantId
      ? sb.from('merchant_faqs').select('id', { count: 'exact', head: true })
          .eq('merchant_id', brand.merchantId).eq('faq_type', 'flagship_lifecycle')
      : Promise.resolve({ count: 0, data: null, error: null, status: 200, statusText: 'OK' }),
    sb.from('ai_search_results')
      .select('keywords_extracted, timestamp, snapshot_label')
      .eq('brand_slug', slug)
      .eq('platform', 'system_snapshot')
      .order('timestamp', { ascending: false })
      .limit(14),
  ])

  // Parse W0, D7, D14 platform rankings
  const platformSnapshots: Record<string, Record<string, { position: number; mentioned: boolean }>> = {}
  for (const r of rankings ?? []) {
    if (!r.snapshot_label || r.competitor_name !== slug) continue
    const label = r.snapshot_label
    if (!platformSnapshots[label]) platformSnapshots[label] = {}
    platformSnapshots[label][r.platform] = { position: r.position, mentioned: r.mentioned }
  }

  // Parse crawler stats from keywords_extracted
  const crawlerTimeline = (snapshots ?? []).map(s => {
    const kw: string[] = s.keywords_extracted ?? []
    const get = (prefix: string) => {
      const match = kw.find(k => k.startsWith(prefix))
      return match ? parseInt(match.split(':')[1] || '0') : 0
    }
    return {
      label: s.snapshot_label,
      date: s.timestamp?.slice(0, 10),
      crawler24h: get('crawler_24h'),
      faqCount: get('faq_count'),
      lifecycleArticles: get('lifecycle_articles'),
      gptbot: get('gptbot'),
      claudebot: get('claudebot'),
      perplexitybot: get('perplexitybot'),
    }
  })

  return {
    brand, slug, currentDay,
    platformSnapshots,
    articles: articles ?? [],
    articleCount: articleCount ?? 0,
    lifecycleFaqCount: faqCount ?? 0,
    crawlerTimeline,
    themes: THEMES,
  }
}

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = LIFECYCLE_BRANDS[params.slug]
  if (!brand) return { title: '案例不存在' }
  return {
    title: `${brand.nameZh} — 14日 AI 能見度案例 | CloudPipe`,
    description: brand.description,
    robots: 'index, follow',
    openGraph: {
      title: `${brand.nameZh}：14天從 AI 透明人到首推`,
      description: brand.description,
      type: 'article',
    },
  }
}

// ─── generateStaticParams ──────────────────────────────────────────────────────
export async function generateStaticParams() {
  return Object.keys(LIFECYCLE_BRANDS).map(slug => ({ slug }))
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const data = await fetchLifecycleData(params.slug)
  if (!data) notFound()
  return <CaseStudyLifecycle data={data} />
}
