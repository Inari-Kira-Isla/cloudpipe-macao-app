import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 10

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TrackClickRequest {
  insight_id?: string
  merchant_slug?: string
  page_type: 'insight' | 'merchant' | 'category'
  region: 'macao' | 'hongkong' | 'taiwan' | 'japan'
  referral_source: 'ai' | 'organic' | 'direct'
  session_id: string
  user_agent?: string
}

/**
 * POST /api/v1/track-click
 *
 * Track when user clicks on:
 * - Insight link (insight_id + merchant_slug)
 * - Merchant link from category hub
 * - Cross-region links
 *
 * Updates:
 * - insight_page_mapping.outbound_clicks++
 * - merchant_page_mapping.llm_referral_clicks++ (if from AI)
 */
export async function POST(request: NextRequest) {
  try {
    const body: TrackClickRequest = await request.json()

    const {
      insight_id,
      merchant_slug,
      page_type,
      region,
      referral_source,
      session_id,
      user_agent
    } = body

    // Validate required fields
    if (!page_type || !region || !session_id || !referral_source) {
      return NextResponse.json(
        { error: 'Missing required fields: page_type, region, session_id, referral_source' },
        { status: 400 }
      )
    }

    if (page_type === 'insight' && !insight_id) {
      return NextResponse.json(
        { error: 'insight_id required for page_type=insight' },
        { status: 400 }
      )
    }

    if (page_type === 'merchant' && !merchant_slug) {
      return NextResponse.json(
        { error: 'merchant_slug required for page_type=merchant' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // ──────────────────────────────────────────────────
    // Track Insight Link Clicks
    // ──────────────────────────────────────────────────
    if (insight_id && page_type === 'insight') {
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
            .from('insight_page_mapping')
            .select('id, outbound_clicks')
            .eq('insight_id', insight_id)
            .eq('industry_page_id', metaData.id)
            .single()

          if (existing) {
            // Increment outbound_clicks
            await supabase
              .from('insight_page_mapping')
              .update({
                outbound_clicks: (existing.outbound_clicks || 0) + 1,
                updated_at: timestamp
              })
              .eq('insight_id', insight_id)
              .eq('industry_page_id', metaData.id)
          }
        }
      } catch (err) {
        console.error('Error tracking insight click:', err)
        // Don't fail the request if tracking fails
      }
    }

    // ──────────────────────────────────────────────────
    // Track Merchant Link Clicks (from AI referral)
    // ──────────────────────────────────────────────────
    if (merchant_slug && referral_source === 'ai') {
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
            .select('id, llm_referral_clicks')
            .eq('merchant_slug', merchant_slug)
            .eq('industry_page_id', metaData.id)
            .single()

          if (existing) {
            // Increment llm_referral_clicks
            await supabase
              .from('merchant_page_mapping')
              .update({
                llm_referral_clicks: (existing.llm_referral_clicks || 0) + 1,
                updated_at: timestamp
              })
              .eq('merchant_slug', merchant_slug)
              .eq('industry_page_id', metaData.id)
          }
        }
      } catch (err) {
        console.error('Error tracking merchant click:', err)
      }
    }

    // ──────────────────────────────────────────────────
    // Log click event for detailed analysis
    // ──────────────────────────────────────────────────
    try {
      await supabase
        .from('outbound_click_log')
        .insert({
          insight_id,
          merchant_slug,
          page_type,
          region,
          referral_source,
          session_id,
          user_agent: user_agent || request.headers.get('user-agent'),
          clicked_at: timestamp,
          referrer: request.headers.get('referer')
        })
    } catch (err) {
      console.error('Error logging click:', err)
    }

    return NextResponse.json(
      {
        success: true,
        tracked_at: timestamp,
        insight_id,
        merchant_slug,
        referral_source
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Track click error:', err)
    return NextResponse.json(
      { error: 'Failed to track click', details: String(err) },
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
