import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
// Shared AI referrer detection (same list as middleware) — single source of truth
import { detectAiReferrer, AI_REFERRER_SOURCES } from '@/lib/ai-referrers'

export const dynamic = 'force-dynamic'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Allowed AI referrer sources (engine names + catch-all buckets, from shared constant)
const VALID_SOURCES = AI_REFERRER_SOURCES

// Allowed sites (brand sites that embed the tracking snippet)
const ALLOWED_SITES = new Set([
  'inari-global-foods',
  'sea-urchin-express',
  'after-school-coffee',
  'mind-cafe',
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
      session_id?: string
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
      session_id = '',
    } = body

    // Fallback: 從 cookie 讀 cp_sid（client snippet 漏傳時兜底）
    const cookieSid = req.cookies.get('cp_sid')?.value || ''
    const finalSessionId = (session_id || cookieSid).slice(0, 100) || null

    // Server-side re-detect from referrer_url — catches engines a stale GH-page
    // client snippet misses (e.g. 中國 AI / meta). Server detection wins when it
    // resolves a concrete engine; otherwise fall back to the client-sent source.
    const serverDetected = referrer_url ? detectAiReferrer(referrer_url) : null
    const finalSource = serverDetected || referrer_source

    // Validate
    if (!finalSource || !VALID_SOURCES.has(finalSource)) {
      return NextResponse.json({ error: 'invalid source' }, { status: 400, headers: CORS_HEADERS })
    }
    if (!ALLOWED_SITES.has(site)) {
      return NextResponse.json({ error: 'unknown site' }, { status: 400, headers: CORS_HEADERS })
    }

    const supabase = createServiceClient()
    await supabase.from('ai_referrals').insert({
      referrer_source: finalSource,
      referrer_url: (referrer_url || '').slice(0, 500),
      path: (path || '/').slice(0, 500),
      site,
      page_type,
      industry: industry ?? null,
      ua_raw: (ua_raw || '').slice(0, 200),
      search_query: (search_query || '').slice(0, 200) || null,
      ai_platform: (ai_platform || finalSource || '').slice(0, 50) || null,
      session_id: finalSessionId,
      ts: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
  } catch (err) {
    console.error('[track-ai-referral]', err)
    return NextResponse.json({ error: 'failed' }, { status: 500, headers: CORS_HEADERS })
  }
}
