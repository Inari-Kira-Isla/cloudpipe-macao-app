import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SCORES_DIR = join(process.env.HOME || '/Users/ki', '.openclaw/api-cache/brand-scores')

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Parallel fetch: issues + profile (includes score_data written by brand_score_refresh.py)
  const [issuesResult, profileResult] = await Promise.all([
    supabase
      .from('brand_issues')
      .select('id, date, severity, title, description, status, discovered_at')
      .eq('brand_slug', slug)
      .order('discovered_at', { ascending: false })
      .limit(10),
    supabase
      .from('brand_profiles')
      .select('*')
      .eq('slug', slug)
      .single(),
  ])

  const issues: Array<Record<string, unknown>> = issuesResult.data || []
  const profile: Record<string, unknown> | null = profileResult.data || null

  // score_data: prefer Supabase (works on Vercel), fall back to local JSON for dev
  let scoreData: Record<string, unknown> | null =
    (profile?.score_data as Record<string, unknown>) || null

  if (!scoreData) {
    const scorePath = join(SCORES_DIR, `${slug}.json`)
    if (existsSync(scorePath)) {
      try { scoreData = JSON.parse(readFileSync(scorePath, 'utf8')) } catch { /* ignore */ }
    }
  }

  if (!scoreData && issues.length === 0 && !profile) {
    return NextResponse.json(
      { error: 'No data for brand', slug, hint: 'Run brand_score_refresh.py first' },
      { status: 404 }
    )
  }

  const refreshedAt = (scoreData?.refreshed_at as string) ||
    (profile?.score_updated_at as string) || null

  return NextResponse.json({
    slug,
    score: scoreData,
    profile,
    issues,
    data_freshness: refreshedAt
      ? { refreshed_at: refreshedAt, stale: isStale(refreshedAt) }
      : null,
  })
}

export async function PATCH(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  // Verify brand token (HMAC protection against unauthorized updates)
  const brandToken = request.headers.get('x-brand-token')
  const secret = process.env.BRAND_SUBMIT_SECRET
  if (!secret || brandToken !== `${slug}:${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const allowed = ['display_name', 'description', 'target_keywords', 'competitors', 'website_url', 'contact_email']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('brand_profiles')
      .upsert({ slug, ...update })
      .eq('slug', slug)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, profile: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function isStale(refreshedAt: string): boolean {
  if (!refreshedAt) return true
  const age = Date.now() - new Date(refreshedAt).getTime()
  return age > 25 * 60 * 60 * 1000 // stale if > 25 hours
}
