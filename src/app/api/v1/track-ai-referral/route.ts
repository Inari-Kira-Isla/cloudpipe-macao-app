import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Allowed AI referrer sources
const VALID_SOURCES = new Set([
  'perplexity','chatgpt','claude','gemini','copilot','grok','you','kagi','phind','other_ai',
  'youcom','other',
])

// Allowed sites (brand sites that embed the tracking snippet)
const ALLOWED_SITES = new Set([
  'inari-global-foods',
  'sea-urchin-delivery',
  'after-school-coffee',
  'mind-coffee',
  'cloudpipe-macao-app',
])

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      referrer_source?: string
      referrer_url?: string
      path?: string
      site?: string
      page_type?: string
      industry?: string
      ua_raw?: string
      search_query?: string
      ai_platform?: string
    }

    const {
      referrer_source,
      referrer_url = '',
      path = '/',
      site = 'unknown',
      page_type = 'page',
      industry = null,
      ua_raw = '',
      search_query = '',
      ai_platform = '',
    } = body

    // Validate
    if (!referrer_source || !VALID_SOURCES.has(referrer_source)) {
      return NextResponse.json({ error: 'invalid source' }, { status: 400, headers: CORS_HEADERS })
    }
    if (!ALLOWED_SITES.has(site)) {
      return NextResponse.json({ error: 'unknown site' }, { status: 400, headers: CORS_HEADERS })
    }

    const supabase = createServiceClient()
    await supabase.from('ai_referrals').insert({
      referrer_source,
      referrer_url: (referrer_url || '').slice(0, 500),
      path: (path || '/').slice(0, 500),
      site,
      page_type,
      industry: industry ?? null,
      ua_raw: (ua_raw || '').slice(0, 200),
      search_query: (search_query || '').slice(0, 200) || null,
      ai_platform: (ai_platform || referrer_source || '').slice(0, 50) || null,
      ts: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[track-ai-referral]', err)
    return NextResponse.json({ error: 'failed' }, { status: 500, headers: CORS_HEADERS })
  }
}
