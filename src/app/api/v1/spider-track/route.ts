import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/v1/spider-track
 *
 * Cross-site beacon endpoint — 方案 C
 * Brand sites (GitHub Pages) POST here when they detect an AI bot visit.
 * This lets us track the full spider web journey across all sites.
 *
 * Body: {
 *   site: "yamanakada" | "inari-global-foods" | ...
 *   bot_name: "GPTBot" | "ClaudeBot" | ...
 *   path: "/llms.txt" | "/products/..."
 *   referer?: string
 *   ua?: string
 * }
 */

const ALLOWED_SITES = new Set([
  'yamanakada', 'inari-global-foods', 'after-school-coffee', 'sea-urchin-delivery',
  'aeo-demo-education', 'aeo-demo-finance', 'aeo-demo-luxury', 'aeo-demo-travel-food',
  'cloudpipe-macao-app', 'mind-coffee', 'bni-macau', 'test-cafe-demo',
  'world-encyclopedia', 'japan-encyclopedia', 'cloudpipe-landing', 'cloudpipe-directory', 'openclaw',
])

const BOT_OWNERS: Record<string, string> = {
  'GPTBot': 'OpenAI', 'ChatGPT-User': 'OpenAI', 'OAI-SearchBot': 'OpenAI',
  'Google-Extended': 'Google', 'Googlebot': 'Google', 'Bingbot': 'Microsoft',
  'anthropic-ai': 'Anthropic', 'ClaudeBot': 'Anthropic', 'Claude-Web': 'Anthropic',
  'PerplexityBot': 'Perplexity', 'Bytespider': 'ByteDance', 'cohere-ai': 'Cohere',
  'Applebot': 'Apple', 'Applebot-Extended': 'Apple', 'YouBot': 'You.com',
  'Amazonbot': 'Amazon', 'meta-externalagent': 'Meta', 'FacebookBot': 'Meta',
  'AI2Bot': 'AI2', 'Diffbot': 'Diffbot', 'CCBot': 'Common Crawl',
  'iaskspider': 'iAsk', 'PetalBot': 'Aspiegel', 'YandexBot': 'Yandex',
  'ia_archiver': 'Internet Archive',
}

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + 'cloudpipe-salt-2026')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/** Detect if referer is from another spider web site */
function detectFromSite(referer: string | null): string | null {
  if (!referer) return null
  for (const site of ALLOWED_SITES) {
    if (referer.includes(site)) return site
  }
  return null
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body = await request.json()
    const { site, bot_name, path, referer, ua } = body

    // Validate required fields
    if (!site || !bot_name || !path) {
      return NextResponse.json({ error: 'Missing required fields: site, bot_name, path' }, { status: 400, headers: corsHeaders })
    }
    if (!ALLOWED_SITES.has(site)) {
      return NextResponse.json({ error: 'Unknown site' }, { status: 400, headers: corsHeaders })
    }
    if (!BOT_OWNERS[bot_name]) {
      return NextResponse.json({ error: 'Unknown bot' }, { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server config missing' }, { status: 500, headers: corsHeaders })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '0.0.0.0'
    const ipHash = await hashIP(ip)
    const dateStr = new Date().toISOString().slice(0, 10)
    const fromSite = detectFromSite(referer || null)

    const row = {
      bot_name,
      bot_owner: BOT_OWNERS[bot_name],
      path,
      referer: referer || null,
      ip_hash: ipHash,
      session_id: `${ipHash}-${bot_name}-${dateStr}`,
      ua_raw: (ua || '').slice(0, 500),
      site,
      page_type: fromSite ? 'spider-web' : (path === '/' || path === '/index.html' ? 'home' : 'page'),
      industry: fromSite || null,
      category: null,
    }

    // Write to Supabase
    await fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    })

    return NextResponse.json({ ok: true }, { headers: corsHeaders })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
