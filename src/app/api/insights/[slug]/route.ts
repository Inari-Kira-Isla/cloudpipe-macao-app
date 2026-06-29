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

// FIX 2026-06-30: normalize faqs/authority_sources before returning so
// LangAwareContent client-side swap doesn't receive double-JSON-encoded strings
// (same normalization applied in the server page render).
function normalizeInsight(a: InsightArticle | null): InsightArticle | null {
  if (!a) return null
  let faqs: unknown = (a as { faqs?: unknown }).faqs
  if (typeof faqs === 'string') {
    try { const p = JSON.parse(faqs); faqs = Array.isArray(p) ? p : [] } catch { faqs = [] }
  }
  if (!Array.isArray(faqs)) faqs = []
  let authSources: unknown = (a as { authority_sources?: unknown }).authority_sources
  if (typeof authSources === 'string') {
    try { const p = JSON.parse(authSources); authSources = Array.isArray(p) ? p : undefined } catch { authSources = undefined }
  }
  if (authSources !== undefined && !Array.isArray(authSources)) authSources = undefined
  return { ...a, faqs, authority_sources: authSources as InsightArticle['authority_sources'] } as InsightArticle
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
  const article = normalizeInsight((data as InsightArticle | null) || getStaticInsight(slug, lang))
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
