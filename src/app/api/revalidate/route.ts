/**
 * On-demand revalidation endpoint
 * Called by Python scripts after article publish to force Vercel CDN refresh
 *
 * POST /api/revalidate
 * Body: { "token": "<REVALIDATE_TOKEN>", "paths": ["/sitemap.xml", "/macao/insights/..."] }
 * or:   { "token": "...", "tags": ["insights", "sitemap"] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

const REVALIDATE_TOKEN = process.env.REVALIDATE_TOKEN || ''

// 2026-07-06: bound the function; a publish call can now revalidate up to ~50 slugs × 4 langs.
export const maxDuration = 30

// Per-path isolation: one bad path must not 500 the whole batch (partial-success accounting).
function safeRevalidate(p: string, revalidated: string[], failed: string[]) {
  try {
    revalidatePath(p)
    revalidated.push(`path:${p}`)
  } catch (e) {
    failed.push(`${p}:${String(e).slice(0, 80)}`)
  }
}

// 2026-07-25 C3 (omni-audit region-revalidate expansion): path segment per region,
// matching REGION_CONFIGS.pathSegment in src/components/insight-region/InsightPageView.tsx.
// MO stays the default when `region` is omitted so existing MO-only callers (gsc_sitemap_submit.py
// paths-array calls, node_repair_autoloop.py) keep their current behaviour unchanged.
const REGION_PATH_SEGMENTS: Record<string, string> = {
  MO: 'macao',
  HK: 'hongkong',
  TW: 'taiwan',
  JP: 'japan',
  GLOBAL: 'global',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, paths, tags, slug, region } = body

    // Auth check
    if (!REVALIDATE_TOKEN || token !== REVALIDATE_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const revalidated: string[] = []
    const failed: string[] = []
    let regionWarning: string | null = null

    // Revalidate specific paths (per-path isolation)
    if (Array.isArray(paths)) {
      for (const p of paths) safeRevalidate(p, revalidated, failed)
    }

    // Revalidate by tag (Next.js 16 requires cache profile as 2nd arg)
    if (Array.isArray(tags)) {
      for (const t of tags) {
        try {
          revalidateTag(t, 'default')
          revalidated.push(`tag:${t}`)
        } catch (e) {
          failed.push(`tag:${t}:${String(e).slice(0, 80)}`)
        }
      }
    }

    // Shortcut: if slug provided, revalidate that insight page (ALL langs) + sitemap + insights index
    // 2026-07-06: insight pages are now ISR-cached (removed force-no-store); must revalidate the
    // zh path AND the en/pt/ja variant paths, else newly-published multilang insights stay stale 24h.
    // 2026-07-25 (omni-audit C3): region-aware — `region` (MO/HK/TW/JP/GLOBAL) selects the path
    // segment; defaults to MO when omitted so existing callers that don't send `region` keep
    // revalidating /macao/... exactly as before (no regression to the MO behaviour).
    if (slug) {
      const normalizedRegion = String(region || 'MO').toUpperCase()
      const seg = REGION_PATH_SEGMENTS[normalizedRegion] || 'macao'
      // 2026-07-25 (omni-audit C3 critic fix): an unknown region used to fall back to
      // 'macao' silently — the target page never got revalidated and nothing logged it.
      // Fail loud instead: keep the same fallback behaviour (MO flow untouched) but
      // surface it in the response + server log so it's traceable.
      if (region && !REGION_PATH_SEGMENTS[normalizedRegion]) {
        regionWarning = `unknown region '${region}', fallback to macao`
        console.error(`[revalidate] ${regionWarning}`)
      }
      safeRevalidate(`/${seg}/insights/${slug}`, revalidated, failed)
      for (const lang of ['en', 'pt', 'ja']) {
        safeRevalidate(`/${seg}/${lang}/insights/${slug}`, revalidated, failed)
      }
      safeRevalidate(`/${seg}/insights`, revalidated, failed)
      safeRevalidate('/sitemap.xml', revalidated, failed)
    }

    // Default: always revalidate sitemap + insights index when no specific target
    if (!paths && !tags && !slug) {
      safeRevalidate('/sitemap.xml', revalidated, failed)
      safeRevalidate('/macao/insights', revalidated, failed)
    }

    return NextResponse.json({
      revalidated,
      failed,
      ...(regionWarning ? { warning: regionWarning } : {}),
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/revalidate' })
}
