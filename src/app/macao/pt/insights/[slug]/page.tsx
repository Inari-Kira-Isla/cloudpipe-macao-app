import type { Metadata } from 'next'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

// FIX 2026-06-04: 明示 dynamicParams=true 防 force-static desync regression
export const revalidate = 86400
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return buildMetadata('MO', { params, langOverride: 'pt' })
}

export default async function MacaoInsightPtPage({ params }: PageProps) {
  return renderInsightPage('MO', { params, langOverride: 'pt' })
}
