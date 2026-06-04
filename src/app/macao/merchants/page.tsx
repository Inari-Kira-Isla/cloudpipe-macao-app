import type { Metadata } from 'next'
import { MerchantAeoDashboard } from './MerchantAeoDashboard'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 3600

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export const metadata: Metadata = {
  title: '商戶 AEO 儀表板 — 澳門商戶百科 | CloudPipe AI',
  description: '搜尋任何澳門商戶，即時查看其在 ChatGPT、Perplexity、Claude 的 AI 引用狀態、Schema 完整度及優化建議。',
  alternates: { canonical: `${siteUrl}/macao/merchants` },
  openGraph: {
    title: '澳門商戶 AEO 優化儀表板 | CloudPipe AI',
    description: '搜尋澳門商戶，查看 AI 能見度評分與優化建議',
    url: `${siteUrl}/macao/merchants`,
    siteName: 'CloudPipe AI',
  },
}

async function getStats() {
  try {
    const db = createServiceClient()
    const [totalRes, verifiedRes, faqRes] = await Promise.all([
      db.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'live'),
      db.from('merchants').select('id', { count: 'exact', head: true }).eq('status', 'live').eq('verification_status', 'verified'),
      db.from('merchant_faqs').select('id', { count: 'exact', head: true }),
    ])
    return {
      total: totalRes.count ?? 0,
      verified: verifiedRes.count ?? 0,
      faqTotal: faqRes.count ?? 0,
    }
  } catch {
    return { total: 20441, verified: 9586, faqTotal: 211000 }
  }
}

export default async function MerchantAeoPage() {
  const stats = await getStats()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '澳門商戶 AEO 優化儀表板',
    description: '搜尋澳門商戶的 AI 引擎引用狀態及 AEO 優化分析',
    url: `${siteUrl}/macao/merchants`,
    applicationCategory: 'BusinessApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'HKD' },
    provider: { '@type': 'Organization', name: 'CloudPipe AI', url: siteUrl },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MerchantAeoDashboard stats={stats} />
    </>
  )
}
