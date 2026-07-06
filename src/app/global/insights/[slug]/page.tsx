import type { Metadata } from 'next'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

// FIX 2026-06-04: 明示 dynamicParams=true 防 force-static desync regression
export const revalidate = 86400
export const dynamicParams = true
// 2026-07-06: 呢條 route 讀 searchParams(lang 切換) → 永久 dynamic；maxDuration 取代
// createServiceClient 移除的 AbortSignal 8s，逐請求上限(否則暴露 Vercel 預設 300s)。
export const maxDuration = 30

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return buildMetadata('GLOBAL', props)
}

export default async function GlobalInsightDetailPage(props: PageProps) {
  return renderInsightPage('GLOBAL', props)
}
