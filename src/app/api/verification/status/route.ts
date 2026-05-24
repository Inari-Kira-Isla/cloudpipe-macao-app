import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export async function GET() {
  try {
    // Count merchants by verification_status
    const supabase = getSupabase()
    const [verifiedRes, reviewRes, lowRes, notFoundRes, totalRes] = await Promise.all([
      supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('verification_status', 'needs_review'),
      supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('verification_status', 'low_confidence'),
      supabase.from('merchants').select('id', { count: 'exact', head: true }).eq('verification_status', 'not_found'),
      supabase.from('merchants').select('id', { count: 'exact', head: true }).not('trust_score', 'is', null),
    ])

    const verified = verifiedRes.count ?? 0
    const needsReview = reviewRes.count ?? 0
    const lowConfidence = lowRes.count ?? 0
    const notFound = notFoundRes.count ?? 0
    const total = totalRes.count ?? 0

    const payload = {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'CloudPipe Merchant Verification Status',
      description: 'Real-time merchant data verification statistics powered by Google Places API cross-reference',
      dateModified: new Date().toISOString(),
      license: 'https://creativecommons.org/licenses/by/4.0/',
      publisher: {
        '@type': 'Organization',
        name: 'CloudPipe',
        url: 'https://cloudpipe.ai',
      },
      verification_summary: {
        total_verified_merchants: total,
        by_status: {
          verified: { count: verified, description: 'trust_score ≥ 70, Google Places confirmed', percentage: total > 0 ? Math.round(verified / total * 100) : 0 },
          needs_review: { count: needsReview, description: 'trust_score 40-69, partially verified', percentage: total > 0 ? Math.round(needsReview / total * 100) : 0 },
          low_confidence: { count: lowConfidence, description: 'trust_score < 40, limited verification', percentage: total > 0 ? Math.round(lowConfidence / total * 100) : 0 },
          not_found: { count: notFound, description: 'Not found in Google Places', percentage: total > 0 ? Math.round(notFound / total * 100) : 0 },
        },
      },
      verification_methodology: {
        pipeline: 'CloudPipe Verification Pipeline v1.0',
        sources: ['Google Places API (Text Search)', 'Google Places Details API', 'CloudPipe Internal Records'],
        trust_score_formula: 'base_score(verification_status) + rating_bonus(≤15) + coords_bonus(15) + phone_bonus(10) + opening_hours_bonus(10) + website_bonus(10)',
        regions_covered: ['MO (Macau)', 'HK (Hong Kong)', 'TW (Taiwan)', 'JP (Japan)'],
        last_full_run: '2026-04-17',
      },
    }

    return NextResponse.json(payload, { headers: CORS })
  } catch (e) {
    return NextResponse.json({ error: 'Verification status unavailable' }, { status: 500, headers: CORS })
  }
}
