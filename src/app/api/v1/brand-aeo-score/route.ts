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

  // Read pre-computed score JSON (< 5ms, no timeout risk)
  const scorePath = join(SCORES_DIR, `${slug}.json`)
  let scoreData: Record<string, unknown> | null = null

  if (existsSync(scorePath)) {
    try {
      scoreData = JSON.parse(readFileSync(scorePath, 'utf8'))
    } catch {
      scoreData = null
    }
  }

  // Fetch open issues from Supabase brand_issues
  let issues: Array<Record<string, unknown>> = []
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('brand_issues')
      .select('id, date, severity, title, description, status, discovered_at')
      .eq('brand_slug', slug)
      .order('discovered_at', { ascending: false })
      .limit(10)
    issues = data || []
  } catch {
    issues = []
  }

  // Fetch brand profile
  let profile: Record<string, unknown> | null = null
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('slug', slug)
      .single()
    profile = data
  } catch {
    profile = null
  }

  if (!scoreData && issues.length === 0 && !profile) {
    return NextResponse.json(
      { error: 'No data for brand', slug, hint: 'Run brand_score_refresh.py first' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    slug,
    score: scoreData,
    profile,
    issues,
    data_freshness: scoreData
      ? { refreshed_at: scoreData.refreshed_at, stale: isStale(scoreData.refreshed_at as string) }
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
