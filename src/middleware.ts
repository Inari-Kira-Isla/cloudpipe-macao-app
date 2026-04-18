import { NextRequest, NextResponse } from 'next/server'

const AI_BOT_PATTERNS = [
  /GPTBot/i, /ChatGPT/i, /OAI-SearchBot/i,
  /ClaudeBot/i, /Claude-Web/i, /Anthropic/i,
  /PerplexityBot/i, /Perplexity/i,
  /Googlebot/i, /Google-Extended/i, /GoogleOther/i,
  /Amazonbot/i, /Applebot/i,
  /meta-externalagent/i, /FacebookBot/i,
  /YandexBot/i, /Bingbot/i,
  /Bytespider/i, /SamanthaDoubao/i,
]

const BOT_NAME_MAP: [RegExp, string, string][] = [
  [/GPTBot|ChatGPT|OAI-SearchBot/i, 'GPTBot', 'OpenAI'],
  [/ClaudeBot|Claude-Web/i, 'ClaudeBot', 'Anthropic'],
  [/PerplexityBot/i, 'PerplexityBot', 'Perplexity'],
  [/Googlebot|Google-Extended|GoogleOther/i, 'Googlebot', 'Google'],
  [/Amazonbot/i, 'Amazonbot', 'Amazon'],
  [/Applebot/i, 'Applebot', 'Apple'],
  [/meta-externalagent|FacebookBot/i, 'meta-externalagent', 'Meta'],
  [/YandexBot/i, 'YandexBot', 'Yandex'],
  [/Bingbot/i, 'Bingbot', 'Microsoft'],
  [/Bytespider|SamanthaDoubao/i, 'Bytespider', 'ByteDance'],
]

function detectBot(ua: string): { name: string; owner: string } | null {
  for (const [pattern, name, owner] of BOT_NAME_MAP) {
    if (pattern.test(ua)) return { name, owner }
  }
  if (AI_BOT_PATTERNS.some(p => p.test(ua))) return { name: 'UnknownBot', owner: 'Unknown' }
  return null
}

function getPageType(path: string): string {
  if (path.startsWith('/macao/insights/')) return 'insight'
  if (path.match(/^\/macao\/[^/]+\/[^/]+\/[^/]+$/)) return 'merchant'
  if (path.match(/^\/macao\/[^/]+\/[^/]+\/faqs/)) return 'faqs'
  if (path.match(/^\/macao\/[^/]+\/[^/]+$/)) return 'category'
  if (path.match(/^\/macao\/[^/]+$/)) return 'industry'
  if (path === '/macao' || path === '/macao/') return 'home'
  if (path.startsWith('/api/faq/')) return 'api-faq'
  return 'page'
}

function getIndustryCategory(path: string): { industry: string | null; category: string | null } {
  if (!path.startsWith('/macao/')) return { industry: null, category: null }
  const parts = path.replace(/^\/macao\//, '').split('/').filter(Boolean)
  if (parts.length === 0) return { industry: null, category: null }
  if (parts[0] === 'insights') return { industry: 'insights', category: null }
  if (parts[0] === 'faqs') return { industry: null, category: null }
  return { industry: parts[0] || null, category: parts[1] || null }
}

async function trackFaqConversion(path: string, utmMedium: string, supabaseUrl: string, supabaseKey: string) {
  // Extract merchant slug from path: /macao/{industry}/{category}/{slug}
  const merchantMatch = path.match(/^\/macao\/[^/]+\/[^/]+\/([^/]+)$/)
  const merchantSlug = merchantMatch ? merchantMatch[1] : null
  const row = {
    event_type: 'faq_arrival',
    conversion_type: 'faq',
    merchant_slug: merchantSlug,
    region: 'macao',
    metadata: { path, utm_medium: utmMedium, ts: new Date().toISOString() },
    created_at: new Date().toISOString(),
  }
  fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  }).catch(() => {})
}

async function trackVisit(path: string, bot: { name: string; owner: string }, ua: string, supabaseUrl: string, supabaseKey: string) {
  const today = new Date().toISOString().slice(0, 10)
  const ipSeed = ua.slice(0, 20) // lightweight pseudo-hash seed (no IP in middleware)
  const sessionId = `mw-${bot.name}-${today}`
  const { industry, category } = getIndustryCategory(path)
  const row = {
    bot_name: bot.name,
    bot_owner: bot.owner,
    path,
    site: 'cloudpipe-macao-app',
    page_type: getPageType(path),
    industry,
    category,
    session_id: sessionId,
    ua_raw: ua.slice(0, 200),
    ts: new Date().toISOString(),
  }
  // fire-and-forget — never await, never block response
  fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(row),
  }).catch(() => {})
}

export async function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Track FAQ conversion arrivals (human or bot with utm_source=faq)
  const utmSource = request.nextUrl.searchParams.get('utm_source')
  const utmMedium = request.nextUrl.searchParams.get('utm_medium')
  if (utmSource === 'faq' && supabaseUrl && supabaseKey) {
    trackFaqConversion(path, utmMedium || 'unknown', supabaseUrl, supabaseKey)
  }

  const bot = detectBot(ua)
  if (bot && supabaseUrl && supabaseKey) {
    trackVisit(path, bot, ua, supabaseUrl, supabaseKey)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 排除 static files 和 API routes（只追蹤頁面）
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
