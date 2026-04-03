import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 10

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TrackArrivalRequest {
  merchant_slug: string
  region: 'macao' | 'hongkong' | 'taiwan' | 'japan'
  referral_source: 'ai' | 'organic' | 'direct'
  session_id: string
  insight_id?: string
  user_agent?: string
}

/**
 * POST /api/v1/track-arrival
 *
 * Track when user arrives at merchant page
 * Called on page load in /merchants/[slug]
 *
 * Updates:
 * - merchant_page_mapping.llm_referral_arrivals++ (if from AI)
 * - Logs to merchant_arrival_log for detailed funnel analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body: TrackArrivalRequest = await request.json()

    const {
      merchant_slug,
      region,
      referral_source,
      session_id,
      insight_id,
      user_agent
    } = body

    // Validate required fields
    if (!merchant_slug || !region || !session_id || !referral_source) {
      return NextResponse.json(
        { error: 'Missing required fields: merchant_slug, region, session_id, referral_source' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // ──────────────────────────────────────────────────
    // Update merchant_page_mapping arrival counter
    // ──────────────────────────────────────────────────
    if (referral_source === 'ai') {
      try {
        // Get industry_page_id for this region
        const { data: metaData } = await supabase
          .from('industry_page_metadata')
          .select('id')
          .eq('region', region)
          .eq('page_type', 'insights_hub')
          .single()

        if (metaData) {
          // Check if mapping exists
          const { data: existing } = await supabase
            .from('merchant_page_mapping')
            .select('id, llm_referral_arrivals')
            .eq('merchant_slug', merchant_slug)
            .eq('industry_page_id', metaData.id)
            .single()

          if (existing) {
            // Increment llm_referral_arrivals
            await supabase
              .from('merchant_page_mapping')
              .update({
                llm_referral_arrivals: (existing.llm_referral_arrivals || 0) + 1,
                updated_at: timestamp
              })
              .eq('merchant_slug', merchant_slug)
              .eq('industry_page_id', metaData.id)
          }
        }
      } catch (err) {
        console.error('Error updating merchant arrival counter:', err)
      }
    }

    // ──────────────────────────────────────────────────
    // Log arrival event for funnel analysis
    // ──────────────────────────────────────────────────
    try {
      await supabase
        .from('merchant_arrival_log')
        .insert({
          merchant_slug,
          region,
          referral_source,
          session_id,
          insight_id,
          user_agent: user_agent || request.headers.get('user-agent'),
          arrived_at: timestamp,
          referrer: request.headers.get('referer')
        })
    } catch (err) {
      console.error('Error logging arrival:', err)
    }

    return NextResponse.json(
      {
        success: true,
        tracked_at: timestamp,
        merchant_slug,
        referral_source,
        session_id
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Track arrival error:', err)
    return NextResponse.json(
      { error: 'Failed to track arrival', details: String(err) },
      { status: 500 }
    )
  }
}

// Handle CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
