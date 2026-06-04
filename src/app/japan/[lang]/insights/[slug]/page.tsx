import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

// FIX 2026-06-04: 明示 dynamicParams=true 防 force-static desync regression
export const revalidate = 86400
export const dynamicParams = true

const VALID_LANG_PATHS = ['en', 'ja', 'pt'] as const
type LangPath = (typeof VALID_LANG_PATHS)[number]

interface PageProps {
  params: Promise<{ lang: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params
  if (!VALID_LANG_PATHS.includes(lang as LangPath)) return {}
  return buildMetadata('JP', { params: Promise.resolve({ slug }), langOverride: lang })
}

export default async function JapanInsightLangPage({ params }: PageProps) {
  const { lang, slug } = await params
  if (!VALID_LANG_PATHS.includes(lang as LangPath)) notFound()
  return renderInsightPage('JP', { params: Promise.resolve({ slug }), langOverride: lang })
}
