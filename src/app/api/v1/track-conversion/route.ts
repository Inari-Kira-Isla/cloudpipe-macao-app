import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 10

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TrackConversionRequest {
  merchant_slug: string
  region: 'macao' | 'hongkong' | 'taiwan' | 'japan'
  conversion_type: 'sale' | 'inquiry' | 'call' | 'whatsapp' | 'appointment' | 'email'
  session_id: string
  referral_source?: 'ai' | 'organic' | 'direct'
  user_agent?: string
  notes?: string
}

/**
 * POST /api/v1/track-conversion
 *
 * Track merchant conversions (final step in LLM funnel):
 * - WhatsApp button click
 * - Phone call button click
 * - Order submission
 * - Email inquiry
 * - Appointment booking
 *
 * Updates:
 * - merchant_page_mapping.conversions++
 * - merchant_page_mapping.conversion_rate recalculation
 * - Logs to conversion_log for detailed ROI analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body: TrackConversionRequest = await request.json()

    const {
      merchant_slug,
      region,
      conversion_type,
      session_id,
      referral_source = 'direct',
      user_agent,
      notes
    } = body

    // Validate required fields
    if (!merchant_slug || !region || !conversion_type || !session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: merchant_slug, region, conversion_type, session_id' },
        { status: 400 }
      )
    }

    const validTypes = ['sale', 'inquiry', 'call', 'whatsapp', 'appointment', 'email']
    if (!validTypes.includes(conversion_type)) {
      return NextResponse.json(
        { error: `Invalid conversion_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()

    // ──────────────────────────────────────────────────
    // Update merchant_page_mapping conversion counter
    // ──────────────────────────────────────────────────
    try {
      // Get industry_page_id for this region
      const { data: metaData } = await supabase
        .from('industry_page_metadata')
        .select('id')
        .eq('region', region)
        .eq('page_type', 'insights_hub')
        .single()

      if (metaData) {
        // Get current merchant mapping with arrivals count
        const { data: existing } = await supabase
          .from('merchant_page_mapping')
          .select('id, conversions, llm_referral_arrivals')
          .eq('merchant_slug', merchant_slug)
          .eq('industry_page_id', metaData.id)
          .single()

        if (existing) {
          const newConversions = (existing.conversions || 0) + 1
          const arrivals = existing.llm_referral_arrivals || 1
          const newConversionRate = Math.round((newConversions / arrivals) * 10000) / 100

          // Update conversion counter and conversion_rate
          await supabase
            .from('merchant_page_mapping')
            .update({
              conversions: newConversions,
              conversion_rate: newConversionRate,
              conversion_type: conversion_type,
              updated_at: timestamp
            })
            .eq('merchant_slug', merchant_slug)
            .eq('industry_page_id', metaData.id)
        }
      }
    } catch (err) {
      console.error('Error updating merchant conversion counter:', err)
    }

    // ──────────────────────────────────────────────────
    // Log conversion event for detailed ROI analysis
    // ──────────────────────────────────────────────────
    try {
      await supabase
        .from('conversion_log')
        .insert({
          merchant_slug,
          region,
          conversion_type,
          session_id,
          referral_source,
          user_agent: user_agent || request.headers.get('user-agent'),
          converted_at: timestamp,
          referrer: request.headers.get('referer'),
          notes
        })
    } catch (err) {
      console.error('Error logging conversion:', err)
    }

    // ──────────────────────────────────────────────────
    // Send real-time notification to Telegram
    // ──────────────────────────────────────────────────
    try {
      const tgMessage = `✅ 轉化！
商戶: ${merchant_slug}
地區: ${region}
類型: ${conversion_type}
時間: ${new Date(timestamp).toLocaleString('zh-HK')}
來源: ${referral_source}`

      // Optional: Post to OpenClaw Telegram bot
      const openclawUrl = 'https://api.inariglobal.workers.dev/openclaw-webhook'
      await fetch(openclawUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'conversion',
          merchant: merchant_slug,
          conversion_type,
          region,
          message: tgMessage
        })
      }).catch(() => {}) // Non-critical, don't fail request
    } catch (err) {
      console.error('Error sending TG notification:', err)
    }

    return NextResponse.json(
      {
        success: true,
        tracked_at: timestamp,
        merchant_slug,
        conversion_type,
        session_id
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Track conversion error:', err)
    return NextResponse.json(
      { error: 'Failed to track conversion', details: String(err) },
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
