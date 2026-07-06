import type { Metadata } from 'next'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

// FIX 2026-06-04: 明示 dynamicParams=true 防 force-static desync regression
export const revalidate = 86400
export const dynamicParams = true
// 2026-07-06: ISR regen timeout backstop (取代 createServiceClient 移除的 AbortSignal 8s)
export const maxDuration = 30
// 2026-07-06: 空 generateStaticParams + dynamicParams=true = ISR on-demand cache (● SSG，同 category)
export async function generateStaticParams() {
  return [] // ISR on-demand only
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return buildMetadata('MO', { params, langOverride: 'en' })
}

export default async function MacaoInsightEnPage({ params }: PageProps) {
  return renderInsightPage('MO', { params, langOverride: 'en' })
}
