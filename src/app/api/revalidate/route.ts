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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, paths, tags, slug } = body

    // Auth check
    if (!REVALIDATE_TOKEN || token !== REVALIDATE_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const revalidated: string[] = []
    const failed: string[] = []

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
    if (slug) {
      safeRevalidate(`/macao/insights/${slug}`, revalidated, failed)
      for (const lang of ['en', 'pt', 'ja']) {
        safeRevalidate(`/macao/${lang}/insights/${slug}`, revalidated, failed)
      }
      safeRevalidate('/macao/insights', revalidated, failed)
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
