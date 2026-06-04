/**
 * /api/knowledge/index
 *
 * AI 爬蟲發現入口：列出所有 knowledge_entities 分頁索引。
 * 讓 GPTBot/ClaudeBot/Perplexity 可以系統性爬取整個知識圖譜。
 *
 * Cache: Vercel Edge ISR revalidate=3600 (1 hour)
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { trackBotVisit } from '@/lib/track-bot'

export const revalidate = 3600
export const maxDuration = 15

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/ld+json',
  'X-Robots-Tag': 'index, follow',
  'Link': `<${SITE_URL}/llms.txt>; rel="llms-txt"`,
}

function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  const db = supabaseService()
  trackBotVisit(request, '/api/knowledge/index', 'knowledge-index-api')

  const { searchParams } = new URL(request.url)
  const region   = searchParams.get('region')?.toUpperCase()   // MO, HK, TW, JP
  const industry = searchParams.get('industry')                 // dining, hotels, ...
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit    = 100
  const offset   = (page - 1) * limit

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('knowledge_entities')
    .select('entity_id,canonical_name,display_names,region_code,industry_code,confidence_score', { count: 'exact' })
    .order('confidence_score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (region)   query = query.eq('region_code', region)
  if (industry) query = query.eq('industry_code', industry)

  const { data: entities, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)

  const payload = {
    '@context': 'https://schema.org',
    '@type':    'Dataset',
    name:       'CloudPipe Knowledge Graph — Entity Index',
    description: 'Structured knowledge graph of verified businesses, attractions, and points of interest across Macau, Hong Kong, Taiwan, Japan, Malaysia, Japan Shokuhinten ingredients, and Global topics.',
    url:        `${SITE_URL}/api/knowledge/index`,
    license:    'https://creativecommons.org/licenses/by/4.0/',
    dateModified: new Date().toISOString(),
    publisher: {
      '@type': 'Organization',
      name:    'CloudPipe',
      url:     SITE_URL,
    },

    pagination: {
      current_page: page,
      total_pages:  totalPages,
      total_entities: total,
      per_page:     limit,
      next_page:    page < totalPages ? `${SITE_URL}/api/knowledge/index?page=${page + 1}${region ? `&region=${region}` : ''}${industry ? `&industry=${industry}` : ''}` : null,
      prev_page:    page > 1 ? `${SITE_URL}/api/knowledge/index?page=${page - 1}${region ? `&region=${region}` : ''}${industry ? `&industry=${industry}` : ''}` : null,
    },

    filters_available: {
      regions:    ['MO', 'HK', 'TW', 'JP', 'MY', 'JBL', 'GLOBAL'],
      industries: ['dining', 'hotels', 'attractions', 'shopping', 'wellness', 'nightlife', 'culture'],
      example:    `${SITE_URL}/api/knowledge/index?region=MO&industry=dining`,
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entities: (entities ?? []).map((e: any) => {
      const names = (e.display_names as Record<string, string>) ?? {}
      return {
        '@type':       'ListItem',
        entity_id:     e.entity_id,
        name:          names.en || names.zh || names.ja || e.canonical_name,
        canonical_slug: e.canonical_name,
        region:        e.region_code,
        industry:      e.industry_code,
        confidence:    e.confidence_score,
        facts_url:     `${SITE_URL}/api/knowledge/entity/${e.canonical_name}`,
      }
    }),
  }

  return NextResponse.json(payload, { headers: CORS })
}
