import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

// FIX 2026-06-04: 明示 dynamicParams=true 防 force-static desync regression
export const revalidate = 86400
export const dynamicParams = true
export const maxDuration = 30
// 2026-08-09 CACHE FIX: 冇 generateStaticParams 嘅 dynamic route 會被 Next 當作永久 dynamic
// (真 curl 實測 cache-control:private,no-store，連續 MISS，TTFB 1.8-3.9s)。對照組
// macao/en/insights/[slug] 有空 generateStaticParams 就 HIT。空陣列 + dynamicParams=true
// = ISR on-demand cache (● SSG)。呢個先係 no-store 嘅根因。
export async function generateStaticParams() {
  return [] // ISR on-demand only
}

// 2026-08-09: 加 'ms' — DB 實查 HK 有 2 篇 status='published' 且 lang='ms' 嘅 insight
// (dining-trend-michelin-ai-gba-2026 / cafe-trend-digitalization-hk-gba-2026)。
// 之前 base route 靠 ?lang=ms 讀 searchParams 服務佢哋；而家 searchParams 已移除，
// 改由 next.config.ts 嘅 ?lang=ms 308 redirect 導入呢條 path route。
// 附帶修好一個舊 bug：buildMetadata 一直為呢啲 slug 出 hreflang="ms" 指向
// /hongkong/ms/insights/{slug}，但該 path 因白名單缺 'ms' 而 404。
const VALID_LANG_PATHS = ['en', 'ja', 'pt', 'ms'] as const
type LangPath = (typeof VALID_LANG_PATHS)[number]

interface PageProps {
  params: Promise<{ lang: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params
  if (!VALID_LANG_PATHS.includes(lang as LangPath)) return {}
  return buildMetadata('HK', { params: Promise.resolve({ slug }), langOverride: lang })
}

export default async function HongkongInsightLangPage({ params }: PageProps) {
  const { lang, slug } = await params
  if (!VALID_LANG_PATHS.includes(lang as LangPath)) notFound()
  return renderInsightPage('HK', { params: Promise.resolve({ slug }), langOverride: lang })
}
