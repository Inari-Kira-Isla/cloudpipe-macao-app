import type { Metadata } from 'next'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

export const revalidate = 86400
// 2026-06-04 hotfix: 顯式聲明 dynamicParams=true 防 force-static regression（macao bug 同類）
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return buildMetadata('TW', props)
}

export default async function TaiwanInsightDetailPage(props: PageProps) {
  return renderInsightPage('TW', props)
}
