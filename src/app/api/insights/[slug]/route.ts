import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import type { InsightArticle } from '@/lib/types'
import { getStaticInsight } from '@/data/static-insights'

const VALID_LANGS = ['zh', 'en', 'pt', 'ja'] as const
type Lang = (typeof VALID_LANGS)[number]

function parseLang(raw?: string | null): Lang {
  if (raw && VALID_LANGS.includes(raw as Lang)) return raw as Lang
  return 'zh'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const langParam = request.nextUrl.searchParams.get('lang')
  const lang = parseLang(langParam)

  const { data, error } = await supabase
    .from('insights')
    .select('*')
    .eq('slug', slug)
    .eq('lang', lang)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const article = (data as InsightArticle | null) || getStaticInsight(slug, lang)
  if (!article) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json(
    { data: article },
    {
      headers: {
        // Cache at edge for 1 hour — lang variants are also relatively stable
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
