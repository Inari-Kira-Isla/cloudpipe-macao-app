import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'
import { embedText } from '@/lib/brandEmbeddings'

export const maxDuration = 30

interface SearchResult {
  id?: string
  content: string
  content_type: string
  metadata?: Record<string, unknown>
  similarity?: number
  search_mode: 'vector' | 'fts' | 'fallback'
}

/**
 * POST /api/v1/brand-knowledge/[slug]/search
 * Body: { query: string, limit?: number }
 *
 * Dual-track search:
 *   Strategy A: Vector similarity via pgvector RPC (if embeddings exist)
 *   Strategy B: Full-text search via fts_vector (always available)
 *   Fallback:   Return brand profile summary from brand_profiles
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params

    if (session.brand_slug !== slug) {
      return NextResponse.json({ error: 'Forbidden: token does not match brand slug' }, { status: 403 })
    }

    const body = await request.json()
    const { query, limit = 5 } = body as { query: string; limit?: number }

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const results: SearchResult[] = []

    // ─── Strategy A: Vector search ─────────────────────────────────────────
    const queryEmbedding = await embedText(query)

    if (queryEmbedding) {
      try {
        const { data: vectorRows, error: vectorError } = await supabase.rpc(
          'match_brand_knowledge',
          {
            query_embedding: queryEmbedding,
            brand_slug_filter: slug,
            match_threshold: 0.7,
            match_count: limit,
          }
        )

        if (!vectorError && vectorRows && vectorRows.length > 0) {
          for (const row of vectorRows) {
            results.push({
              id: row.id,
              content: row.content,
              content_type: row.content_type,
              metadata: row.metadata,
              similarity: row.similarity,
              search_mode: 'vector',
            })
          }
          return NextResponse.json({ results, query, search_mode: 'vector' })
        }
      } catch {
        // Vector search failed, fall through to FTS
      }
    }

    // ─── Strategy B: Full-text search ──────────────────────────────────────
    try {
      // Build FTS query: take first 6 words, join with & for AND matching
      const ftsQuery = query
        .split(/\s+/)
        .filter(w => w.length > 1)
        .slice(0, 6)
        .join(' & ')

      if (ftsQuery) {
        const { data: ftsRows, error: ftsError } = await supabase
          .from('brand_knowledge')
          .select('id, content, content_type, metadata')
          .eq('brand_slug', slug)
          .textSearch('fts_vector', ftsQuery, { type: 'plain' })
          .limit(limit)

        if (!ftsError && ftsRows && ftsRows.length > 0) {
          for (const row of ftsRows) {
            results.push({
              id: row.id,
              content: row.content,
              content_type: row.content_type,
              metadata: row.metadata,
              search_mode: 'fts',
            })
          }
          return NextResponse.json({ results, query, search_mode: 'fts' })
        }
      }
    } catch {
      // FTS failed, fall through to fallback
    }

    // ─── Fallback: Return brand profile summary ─────────────────────────────
    try {
      const { data: profile } = await supabase
        .from('brand_profiles')
        .select('name_zh, name_en, industry, about_zh, primary_query')
        .eq('brand_slug', slug)
        .single()

      if (profile) {
        const summary = [
          profile.name_zh ? `品牌: ${profile.name_zh}` : '',
          profile.industry ? `行業: ${profile.industry}` : '',
          profile.about_zh ? `關於: ${profile.about_zh}` : '',
          profile.primary_query ? `主要查詢: ${profile.primary_query}` : '',
        ].filter(Boolean).join('\n')

        results.push({
          content: summary,
          content_type: 'profile',
          search_mode: 'fallback',
        })
      }
    } catch {
      // If even fallback fails, return empty results
    }

    return NextResponse.json({
      results,
      query,
      search_mode: results[0]?.search_mode ?? 'none',
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Search failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
