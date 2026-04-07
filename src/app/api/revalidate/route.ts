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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, paths, tags, slug } = body

    // Auth check
    if (!REVALIDATE_TOKEN || token !== REVALIDATE_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const revalidated: string[] = []

    // Revalidate specific paths
    if (Array.isArray(paths)) {
      for (const p of paths) {
        revalidatePath(p)
        revalidated.push(`path:${p}`)
      }
    }

    // Revalidate by tag
    if (Array.isArray(tags)) {
      for (const t of tags) {
        revalidateTag(t)
        revalidated.push(`tag:${t}`)
      }
    }

    // Shortcut: if slug provided, revalidate that insight page + sitemap + insights index
    if (slug) {
      revalidatePath(`/macao/insights/${slug}`)
      revalidatePath('/macao/insights')
      revalidatePath('/sitemap.xml')
      revalidated.push(`slug:${slug}`, 'path:/macao/insights', 'path:/sitemap.xml')
    }

    // Default: always revalidate sitemap + insights index when no specific target
    if (!paths && !tags && !slug) {
      revalidatePath('/sitemap.xml')
      revalidatePath('/macao/insights')
      revalidated.push('path:/sitemap.xml', 'path:/macao/insights')
    }

    return NextResponse.json({
      revalidated,
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
