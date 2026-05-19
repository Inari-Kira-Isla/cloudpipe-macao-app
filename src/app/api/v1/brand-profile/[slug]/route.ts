import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

// 22 core fields used for completeness calculation
const CORE_FIELDS = [
  'name_zh', 'name_en', 'industry', 'about_zh', 'website_url',
  'address_full', 'phone', 'email', 'maps_url', 'opening_hours',
  'social_facebook', 'social_instagram', 'primary_query', 'target_audience',
  'key_stats', 'authority_sources', 'usp', 'certifications',
  'founded_year', 'company_size', 'media_mentions', 'llms_txt_url',
] as const

type CoreField = typeof CORE_FIELDS[number]

function computeCompleteness(profile: Record<string, unknown>): number {
  let filled = 0
  for (const field of CORE_FIELDS) {
    const val = profile[field as CoreField]
    if (val === null || val === undefined || val === '') continue
    if (Array.isArray(val) && val.length === 0) continue
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as object).length === 0) continue
    filled++
  }
  return Math.round((filled / CORE_FIELDS.length) * 100)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { slug } = await params

  // Prevent cross-brand access
  if (session.brand_slug !== slug) {
    return NextResponse.json({ error: 'Forbidden: token does not match slug' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('brand_slug', slug)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found — return empty template instead of error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    // Return empty template so UI can render an empty form
    return NextResponse.json({
      brand_slug: slug,
      profile_completeness: 0,
      exists: false,
    })
  }

  return NextResponse.json({ ...data, exists: true })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { slug } = await params

  if (session.brand_slug !== slug) {
    return NextResponse.json({ error: 'Forbidden: token does not match slug' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Strip id/created_at from incoming body to prevent overwrite
  const { id: _id, created_at: _ca, ...rest } = body as Record<string, unknown>
  void _id; void _ca

  const completeness = computeCompleteness({ ...rest, brand_slug: slug })

  const upsertData = {
    ...rest,
    brand_slug: slug,
    profile_completeness: completeness,
    updated_at: new Date().toISOString(),
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_profiles')
    .upsert(upsertData, { onConflict: 'brand_slug' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile: data, profile_completeness: completeness })
}
