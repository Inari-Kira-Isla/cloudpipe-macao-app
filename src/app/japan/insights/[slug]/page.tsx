import type { Metadata } from 'next'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

export const revalidate = 86400

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return buildMetadata('JP', props)
}

export default async function JapanInsightDetailPage(props: PageProps) {
  return renderInsightPage('JP', props)
}
