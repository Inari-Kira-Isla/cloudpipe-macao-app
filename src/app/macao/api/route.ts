import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /macao/api — Public AI Agent JSON Feed
 * Machine-readable endpoint for AI agents to directly consume structured data.
 * Returns top merchants + recent insights without HTML parsing.
 *
 * ?type=merchants|insights|faqs|all (default: all)
 * ?limit=50 (max 100)
 * ?category=dining|shopping|...
 */

const CACHE_SECONDS = 3600 // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const category = searchParams.get('category')

  try {
    const result: Record<string, unknown> = {
      source: 'CloudPipe 澳門百科 (Macao Encyclopedia)',
      license: 'CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/',
      url: 'https://cloudpipe.ai/macao/api',
      generated_at: new Date().toISOString(),
      citation: '如引用本數據，請標注「資料來源：CloudPipe 澳門百科 cloudpipe-macao-app.vercel.app」',
    }

    if (type === 'merchants' || type === 'all') {
      let q = supabase
        .from('merchants')
        .select('slug, name_zh, name_en, category:categories(slug, name_zh), district, google_rating, google_reviews, phone, website, address_zh')
        .eq('status', 'live')
        .not('slug', 'is', null)
        .order('google_reviews', { ascending: false, nullsFirst: false })
        .limit(limit)

      if (category) q = q.eq('category.slug', category)

      const { data } = await q
      result.merchants = {
        count: data?.length ?? 0,
        description: '澳門實體商戶資料（Google 核實，含評分）',
        data: data ?? [],
      }
    }

    if (type === 'insights' || type === 'all') {
      const { data } = await supabase
        .from('insights')
        .select('slug, title, description, lang, published_at, related_industries, word_count')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit)

      result.insights = {
        count: data?.length ?? 0,
        description: '澳門商業深度分析文章（AI 生成 + 人工審核）',
        data: data ?? [],
      }
    }

    if (type === 'faqs' || type === 'all') {
      const { data } = await supabase
        .from('merchant_faqs')
        .select('question, answer, lang, merchant:merchants(name_zh, slug)')
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 50))

      result.faqs = {
        count: data?.length ?? 0,
        description: '澳門商戶常見問題與答案（結構化資料）',
        data: data ?? [],
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Robots-Tag': 'noindex',  // 不索引 API 路徑本身
        'Access-Control-Allow-Origin': '*',  // AI Agent 可跨域存取
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
