import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const CLOUDPIPE_DEV_URL = process.env.CLOUDPIPE_DEV_URL || 'https://ckij.taild5212b.ts.net:4000'
const BRAND_ANALYZE_SECRET = process.env.BRAND_ANALYZE_SECRET || ''

/**
 * POST /api/v1/brand-ops/analyze
 * Proxies content extraction to cloudpipe-dev (Claude Max on Mac mini).
 * Body: { slug, content, type, filename?, save?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      slug: string
      content: string
      type: string
      filename?: string
      save?: boolean      // whether to persist chunks to Supabase
      asset_id?: string
    }

    const { slug, content, type, filename, save = true, asset_id } = body

    if (!slug || !content || content.length < 50) {
      return NextResponse.json({ error: 'slug and content required' }, { status: 400 })
    }

    // Forward to cloudpipe-dev
    const devRes = await fetch(`${CLOUDPIPE_DEV_URL}/api/brand/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, content, type, filename, secret: BRAND_ANALYZE_SECRET }),
      signal: AbortSignal.timeout(110000),
    })

    if (!devRes.ok) {
      const err = await devRes.text()
      return NextResponse.json(
        { error: `cloudpipe-dev error ${devRes.status}`, detail: err.slice(0, 200) },
        { status: 502 }
      )
    }

    const result = await devRes.json() as {
      ok: boolean
      chunks: Array<{
        schema_type: string; title: string; content: string
        structured_data?: Record<string, unknown>; source_quote?: string
        confidence: number; lang?: string; tags?: string[]
      }>
      count: number
      model: string
      elapsed_ms: number
    }

    // Optionally persist to Supabase
    let saved = 0
    if (save && result.chunks?.length) {
      const supabase = createServiceClient()
      const now = new Date().toISOString()
      const rows = result.chunks.map((c, idx) => ({
        brand_slug: slug,
        schema_type: c.schema_type,
        title: c.title.slice(0, 500),
        content: c.content.slice(0, 10000),
        source_type: type,
        status: 'pending',
        priority: c.confidence >= 0.8 ? 1 : 2,
        asset_id: asset_id ?? undefined,
        chunk_index: idx,
        lang: c.lang ?? 'zh-HK',
        confidence: c.confidence,
        tags: c.tags ?? [],
        content_hash: crypto.createHash('sha256').update(c.content).digest('hex').slice(0, 16),
        structured_data: c.structured_data ?? null,
        source_quote: c.source_quote?.slice(0, 1000) ?? null,
        created_at: now,
        updated_at: now,
      }))

      const { error } = await supabase.from('brand_ops_knowledge').insert(rows)
      if (!error) {
        saved = rows.length
        if (asset_id) {
          await supabase
            .from('brand_ops_assets')
            .update({ parse_status: 'parsed', parse_model: result.model, parse_completed_at: now })
            .eq('id', asset_id)
        }
      } else {
        console.error('[brand-ops/analyze] Supabase insert error:', error.message)
      }
    }

    return NextResponse.json({
      ok: true,
      chunks: result.chunks,
      count: result.count,
      saved,
      model: result.model,
      elapsed_ms: result.elapsed_ms,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const timedOut = msg.includes('timed out') || msg.includes('AbortError')
    return NextResponse.json(
      { error: timedOut ? 'Analysis timed out — content too large' : msg },
      { status: timedOut ? 504 : 500 }
    )
  }
}

/**
 * GET /api/v1/brand-ops/analyze/health
 * Check if cloudpipe-dev Claude endpoint is reachable
 */
export async function GET() {
  try {
    const res = await fetch(`${CLOUDPIPE_DEV_URL}/api/brand/analyze/health`, {
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    return NextResponse.json({ ok: res.ok, ...data })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unreachable' }, { status: 503 })
  }
}
