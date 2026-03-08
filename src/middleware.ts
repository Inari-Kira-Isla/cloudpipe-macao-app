import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * AI Crawler Detection & Logging Middleware
 * Detects 25+ AI bot user agents, logs per-page visits to Supabase
 */

const AI_BOTS: Record<string, string> = {
  'GPTBot': 'OpenAI',
  'ChatGPT-User': 'OpenAI',
  'OAI-SearchBot': 'OpenAI',
  'Google-Extended': 'Google',
  'Googlebot': 'Google',
  'Bingbot': 'Microsoft',
  'anthropic-ai': 'Anthropic',
  'ClaudeBot': 'Anthropic',
  'Claude-Web': 'Anthropic',
  'PerplexityBot': 'Perplexity',
  'Bytespider': 'ByteDance',
  'cohere-ai': 'Cohere',
  'Applebot': 'Apple',
  'Applebot-Extended': 'Apple',
  'YouBot': 'You.com',
  'Amazonbot': 'Amazon',
  'meta-externalagent': 'Meta',
  'FacebookBot': 'Meta',
  'AI2Bot': 'AI2',
  'Diffbot': 'Diffbot',
  'CCBot': 'Common Crawl',
  'iaskspider': 'iAsk',
  'Scrapy': 'Scrapy',
  'PetalBot': 'Aspiegel',
  'YandexBot': 'Yandex',
}

/** Simple hash for IP anonymization (no PII stored) */
async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + 'cloudpipe-salt-2026')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/** Extract page type and segments from path */
function parsePath(path: string): { pageType: string; industry: string | null; category: string | null } {
  if (path === '/macao' || path === '/macao/') return { pageType: 'home', industry: null, category: null }
  if (path.includes('/llms-txt')) return { pageType: 'llms-txt', industry: null, category: null }
  if (path.includes('/api/')) return { pageType: 'api', industry: null, category: null }
  if (path === '/sitemap.xml') return { pageType: 'sitemap', industry: null, category: null }
  if (path === '/robots.txt') return { pageType: 'robots', industry: null, category: null }

  const segments = path.replace(/^\/macao\//, '').replace(/\/$/, '').split('/')
  if (segments.length === 1) return { pageType: 'industry', industry: segments[0], category: null }
  if (segments.length === 2) return { pageType: 'category', industry: segments[0], category: segments[1] }
  if (segments.length >= 3) return { pageType: 'merchant', industry: segments[0], category: segments[1] }

  return { pageType: 'other', industry: null, category: null }
}

/** Detect AI bot from User-Agent string */
function detectBot(ua: string): { name: string; owner: string } | null {
  for (const [botUA, owner] of Object.entries(AI_BOTS)) {
    if (ua.includes(botUA)) {
      return { name: botUA, owner }
    }
  }
  return null
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const ua = request.headers.get('user-agent') || ''
  const bot = detectBot(ua)

  if (!bot) return response // Not an AI bot, skip

  // Non-blocking: fire and forget the log insertion
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return response

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '0.0.0.0'
    const ipHash = await hashIP(ip)
    const path = request.nextUrl.pathname
    const referer = request.headers.get('referer') || null
    const { pageType, industry, category } = parsePath(path)

    // Session ID: group requests from same bot + IP within same day
    const dateStr = new Date().toISOString().slice(0, 10)
    const sessionId = `${ipHash}-${bot.name}-${dateStr}`

    const row = {
      bot_name: bot.name,
      bot_owner: bot.owner,
      path,
      referer,
      ip_hash: ipHash,
      session_id: sessionId,
      ua_raw: ua.slice(0, 500),
      site: 'cloudpipe-macao-app',
      industry,
      category,
      page_type: pageType,
    }

    // Fire-and-forget: don't await, don't block the response
    fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    }).catch(() => {}) // Silently ignore errors

  } catch {
    // Never block the response
  }

  return response
}

export const config = {
  matcher: [
    '/macao/:path*',
    '/sitemap.xml',
    '/robots.txt',
    '/api/:path*',
  ],
}
