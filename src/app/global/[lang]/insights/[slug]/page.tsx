import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

// FIX 2026-06-04: 明示 dynamicParams=true 防 force-static desync regression
export const revalidate = 86400
export const dynamicParams = true
// 2026-08-09: 補返 maxDuration（HK 嘅 [lang] route 一直有，TW/JP/GLOBAL 三個漏咗）。
// 取代 createServiceClient 移除的 AbortSignal 8s，界定 ISR regen 上限
// (否則暴露 Vercel 預設 300s)。
export const maxDuration = 30
// 2026-08-09 CACHE FIX: 冇 generateStaticParams 嘅 dynamic route 會被 Next 當作永久 dynamic
// (真 curl 實測 cache-control:private,no-store，連續 MISS，TTFB 1.8-3.9s)。對照組
// macao/en/insights/[slug] 有空 generateStaticParams 就 HIT。空陣列 + dynamicParams=true
// = ISR on-demand cache (● SSG)。呢個先係 no-store 嘅根因。
export async function generateStaticParams() {
  return [] // ISR on-demand only
}

// 2026-08-09: 加 'ms' 令 4 個地區白名單對稱（HK 2 篇 / JP 5 篇 lang='ms' 已發布；
// GLOBAL 現時 0 篇）。GLOBAL 冇 ms 內容唔構成風險：getInsight 搵唔到 row 就 notFound()，
// 同未加之前 ?lang=ms 嘅結果一樣係 404。保持對稱避免四條共用同一 renderer 同一條
// redirect 規則嘅 route 白名單分歧。
const VALID_LANG_PATHS = ['en', 'ja', 'pt', 'ms'] as const
type LangPath = (typeof VALID_LANG_PATHS)[number]

interface PageProps {
  params: Promise<{ lang: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params
  if (!VALID_LANG_PATHS.includes(lang as LangPath)) return {}
  return buildMetadata('GLOBAL', { params: Promise.resolve({ slug }), langOverride: lang })
}

export default async function GlobalInsightLangPage({ params }: PageProps) {
  const { lang, slug } = await params
  if (!VALID_LANG_PATHS.includes(lang as LangPath)) notFound()
  return renderInsightPage('GLOBAL', { params: Promise.resolve({ slug }), langOverride: lang })
}
