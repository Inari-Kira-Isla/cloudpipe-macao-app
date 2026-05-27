import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

export const revalidate = 86400

const VALID_LANG_PATHS = ['en', 'ja', 'pt'] as const
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
