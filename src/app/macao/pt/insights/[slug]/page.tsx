import type { Metadata } from 'next'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

export const revalidate = 86400
export const dynamic = 'force-static'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return buildMetadata('MO', { params, langOverride: 'pt' })
}

export default async function MacaoInsightPtPage({ params }: PageProps) {
  return renderInsightPage('MO', { params, langOverride: 'pt' })
}
