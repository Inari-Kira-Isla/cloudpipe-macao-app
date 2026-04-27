import { NextRequest, NextResponse } from 'next/server'

// AI platform referrers — humans clicking from AI answers
const AI_REFERRER_MAP: [RegExp, string][] = [
  [/perplexity\.ai/i,                          'perplexity'],
  [/chatgpt\.com|chat\.openai\.com/i,          'chatgpt'],
  [/claude\.ai/i,                              'claude'],
  [/gemini\.google\.com|bard\.google\.com/i,   'gemini'],
  [/copilot\.microsoft\.com|bing\.com/i,       'copilot'],
  [/grok\.x\.ai|x\.com/i,                     'grok'],
  [/you\.com/i,                                'you'],
  [/kagi\.com/i,                               'kagi'],
  [/phind\.com/i,                              'phind'],
]

function detectAiReferrer(referer: string): string | null {
  for (const [pattern, name] of AI_REFERRER_MAP) {
    if (pattern.test(referer)) return name
  }
  return null
}

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

// Our own brand domains — cross-site bot referrer = spider-web signal
const OUR_BRAND_DOMAINS = [
  'inari-kira-isla.github.io',
  'inariglobal.com.mo',
  'cloudpipe-macao-app.vercel.app',
]

function getPageType(path: string, referer?: string): string {
  // Cross-site crawl: bot arrived via referer from one of our own brand sites
  if (referer) {
    try {
      const refHost = new URL(referer).hostname
      if (OUR_BRAND_DOMAINS.some(d => refHost === d || refHost.endsWith('.' + d))) {
        return 'spider-web'
      }
    } catch { /* invalid referer URL, ignore */ }
  }
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

async function trackAiReferral(
  path: string,
  referrerSource: string,
  referrerUrl: string,
  ua: string,
  supabaseUrl: string,
  supabaseKey: string,
) {
  const { industry, category } = getIndustryCategory(path)
  const row = {
    referrer_source: referrerSource,
    referrer_url: referrerUrl.slice(0, 500),
    path,
    site: 'cloudpipe-macao-app',
    page_type: getPageType(path),
    industry,
    category,
    ua_raw: ua.slice(0, 200),
    ts: new Date().toISOString(),
  }
  fetch(`${supabaseUrl}/rest/v1/ai_referrals`, {
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

async function trackVisit(path: string, bot: { name: string; owner: string }, ua: string, supabaseUrl: string, supabaseKey: string, referer?: string) {
  const today = new Date().toISOString().slice(0, 10)
  const ipSeed = ua.slice(0, 20) // lightweight pseudo-hash seed (no IP in middleware)
  const sessionId = `mw-${bot.name}-${today}`
  const { industry, category } = getIndustryCategory(path)
  const row = {
    bot_name: bot.name,
    bot_owner: bot.owner,
    path,
    site: 'cloudpipe-macao-app',
    page_type: getPageType(path, referer),
    industry,
    category,
    session_id: sessionId,
    ua_raw: ua.slice(0, 200),
    referer: referer ? referer.slice(0, 500) : null,
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

  const utmSource = request.nextUrl.searchParams.get('utm_source')
  const utmMedium = request.nextUrl.searchParams.get('utm_medium')

  const referer = request.headers.get('referer') || undefined

  const bot = detectBot(ua)
  if (bot && supabaseUrl && supabaseKey) {
    trackVisit(path, bot, ua, supabaseUrl, supabaseKey, referer)
  } else if (!bot && supabaseUrl && supabaseKey) {
    // Track FAQ conversion arrivals — only real humans (bots excluded)
    if (utmSource === 'faq') {
      trackFaqConversion(path, utmMedium || 'unknown', supabaseUrl, supabaseKey)
    }
    // Check if human arrived from an AI platform
    if (referer) {
      const aiSource = detectAiReferrer(referer)
      if (aiSource) {
        trackAiReferral(path, aiSource, referer, ua, supabaseUrl, supabaseKey)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 排除 static files 和 API routes（只追蹤頁面）
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
// Force redeploy Sun Apr 26 12:01:33 CST 2026
