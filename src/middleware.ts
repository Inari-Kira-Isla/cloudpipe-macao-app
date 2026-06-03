import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// AI platform referrers — humans clicking from AI answers
// Match on hostname only (not full URL) — avoid utm_source=chatgpt.com false positives
const AI_REFERRER_HOSTS: [RegExp, string][] = [
  [/^(www\.)?perplexity\.ai$/i,                          'perplexity'],
  [/^(www\.)?(chatgpt\.com|chat\.openai\.com)$/i,        'chatgpt'],
  [/^(www\.)?claude\.ai$/i,                              'claude'],
  [/^(gemini|bard)\.google\.com$/i,                      'gemini'],
  [/^(copilot\.microsoft\.com|(www\.)?bing\.com)$/i,     'copilot'],
  [/^(grok\.x\.ai|(www\.)?x\.com)$/i,                    'grok'],
  [/^(www\.)?you\.com$/i,                                'you'],
  [/^(www\.)?kagi\.com$/i,                               'kagi'],
  [/^(www\.)?phind\.com$/i,                              'phind'],
]

function detectAiReferrer(referer: string): string | null {
  try {
    const host = new URL(referer).hostname
    for (const [pattern, name] of AI_REFERRER_HOSTS) {
      if (pattern.test(host)) return name
    }
  } catch { /* invalid URL */ }
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
  [/PerplexityBot|Perplexity-User/i, 'PerplexityBot', 'Perplexity'],
  [/Googlebot|Google-Extended|GoogleOther/i, 'Googlebot', 'Google'],
  [/Amazonbot/i, 'Amazonbot', 'Amazon'],
  [/Applebot/i, 'Applebot', 'Apple'],
  [/meta-externalagent|FacebookBot/i, 'meta-externalagent', 'Meta'],
  [/YandexBot/i, 'YandexBot', 'Yandex'],
  [/Bingbot/i, 'Bingbot', 'Microsoft'],
  [/Bytespider|SamanthaDoubao/i, 'Bytespider', 'ByteDance'],
]

// Headless Chrome / server-side fetchers use round version numbers: Chrome/X.0.0.0
// Real Chrome always has non-zero build+patch: Chrome/120.0.6099.71
// Chrome/120 is the most commonly documented Perplexity real-time fetcher UA.
const PERPLEXITY_HEADLESS_UA = /Chrome\/120\.0\.0\.0/
const HEADLESS_CHROME_UA = /Chrome\/\d+\.0\.0\.0/

function detectBot(ua: string): { name: string; owner: string } | null {
  for (const [pattern, name, owner] of BOT_NAME_MAP) {
    if (pattern.test(ua)) return { name, owner }
  }
  if (AI_BOT_PATTERNS.some(p => p.test(ua))) return { name: 'UnknownBot', owner: 'Unknown' }
  // Chrome/120.0.0.0 is the documented Perplexity real-time fetcher UA
  if (PERPLEXITY_HEADLESS_UA.test(ua)) return { name: 'PerplexityBot', owner: 'Perplexity' }
  // Other round-version headless Chrome = generic AI headless fetcher
  if (HEADLESS_CHROME_UA.test(ua)) return { name: 'HeadlessFetcher', owner: 'HeadlessFetcher' }
  return null
}

// Our own brand domains — cross-site bot referrer = spider-web signal
const OUR_BRAND_DOMAINS = [
  'inari-kira-isla.github.io',
  'inariglobal.com.mo',
  'cloudpipe-macao-app.vercel.app',
]

// Asset/system paths that browsers fetch automatically — exclude from referral tracking
const NON_CONTENT_PATHS = /^\/(manifest\.json|favicon\.ico|robots\.txt|sitemap.*\.xml|llms\.txt|sw\.js|_next\/|opengraph-image|apple-touch-icon)/i

// Technical/system paths that produce industry=null noise in crawler_visits — skip bot tracking
const SKIP_BOT_TRACK_PATHS = /^\/(canary|llms[-\w]*|api\/|_next\/|favicon|icons\/|images\/|manifest\.json|robots\.txt|sitemap)/i

function isOwnDomain(host: string): boolean {
  return OUR_BRAND_DOMAINS.some(d => host === d || host.endsWith('.' + d))
}

// 從 Vercel / 一般 proxy header 取 client IP；多 hop 時取第一個（客戶端）
function extractClientIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const vff = request.headers.get('x-vercel-forwarded-for')
  if (vff) {
    const first = vff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  return null
}

// 取/建 cp_sid cookie（30 日 session）
// Edge runtime 兼容：用 globalThis.crypto.randomUUID()，不用 node:crypto
// httpOnly=false：之後 Phase 1.5 landing pixel JS 可讀
// 用途：跨 event correlation（referral → landing → WhatsApp click）
function getOrCreateSessionId(request: NextRequest, response: NextResponse): string {
  const existing = request.cookies.get('cp_sid')?.value
  if (existing) return existing

  const newSid = globalThis.crypto.randomUUID()
  response.cookies.set('cp_sid', newSid, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 日
    path: '/',
  })
  return newSid
}

// 隱私保護：SHA-256(salt + ip) 截 16 字元；不可逆推；非 raw IP 儲存
// Edge runtime 使用 Web Crypto API（globalThis.crypto.subtle）
async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null
  try {
    const salt = process.env.IP_HASH_SALT || 'cloudpipe-2026'
    const data = new TextEncoder().encode(salt + ip)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
    const bytes = new Uint8Array(digest)
    let hex = ''
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0')
    }
    return hex.slice(0, 16)
  } catch {
    return null
  }
}

function getPageType(path: string, referer?: string): string {
  // Cross-site crawl: bot arrived via referer from one of our own brand sites
  if (referer) {
    try {
      if (isOwnDomain(new URL(referer).hostname)) return 'spider-web'
    } catch { /* invalid referer URL, ignore */ }
  }
  if (path.startsWith('/macao/insights/')) return 'insight'
  // Path-based lang routes: /{region}/{lang}/insights/{slug} (2026-05-27)
  if (/^\/(macao|hongkong|taiwan|japan|global)\/(en|ja|pt)\/insights\//.test(path)) return 'insight'
  // HK/TW/JP/GLOBAL insight canonical routes
  if (/^\/(hongkong|taiwan|japan|global)\/insights\//.test(path)) return 'insight'
  if (path.match(/^\/macao\/[^/]+\/[^/]+\/[^/]+$/)) return 'merchant'
  if (path.match(/^\/macao\/[^/]+\/[^/]+\/faqs/)) return 'faqs'
  if (path.match(/^\/macao\/[^/]+\/[^/]+$/)) return 'category'
  if (path.match(/^\/macao\/[^/]+$/)) return 'industry'
  if (path === '/macao' || path === '/macao/') return 'home'
  if (path.startsWith('/api/faq/')) return 'api-faq'
  return 'page'
}

// Whitelist of real industry slugs — anything else under /macao/ is a merchant slug
// (top-level merchant pages caught by [industry] dynamic route)
// Source: merchants.page_url first segment + legacy paths still being crawled
const VALID_INDUSTRIES = new Set([
  // 19 real industries (from live macao merchants)
  'attractions', 'community', 'dining', 'education', 'events', 'finance',
  'food-supply', 'gaming', 'government', 'hotels', 'luxury', 'media',
  'nightlife', 'professional-services', 'real-estate', 'shopping', 'tech',
  'transport', 'wellness',
  // Meta + legacy paths
  'insights', 'services', 'entertainment', 'heritage', 'tourism', 'culture',
  'merchants', 'lifestyle',
])

const LANG_PATH_SEGMENTS = new Set(['en', 'ja', 'pt'])

// Region+lang-aware insight path regex — captures region and slug for industry lookup.
// Catches BOTH:
//   /(macao|hongkong|taiwan|japan|global)/insights/{slug}
//   /(macao|hongkong|taiwan|japan|global)/(en|ja|pt|ms)/insights/{slug}
// (Previously only non-macao + no `ms` lang were caught, causing 1,651 NULL/day on
// /macao/en|pt|ja/insights/* — see 2026-05-29 audit.)
const INSIGHT_PATH_RE =
  /^\/(macao|hongkong|taiwan|japan|global)(?:\/(en|ja|pt|ms))?\/insights\/([^/?#]+)/

interface InsightPathMatch {
  region: string // lowercased region segment (macao|hongkong|...)
  lang: string | null
  slug: string // url-decoded slug
}

function matchInsightPath(path: string): InsightPathMatch | null {
  const m = path.match(INSIGHT_PATH_RE)
  if (!m) return null
  let slug = m[3]
  try {
    slug = decodeURIComponent(slug)
  } catch {
    /* leave as-is on malformed encoding */
  }
  return { region: m[1], lang: m[2] || null, slug }
}

function getIndustryCategory(path: string): { industry: string | null; category: string | null } {
  // Insight pages — synchronous fallback. The actual industry (from
  // insights.related_industries[0]) is resolved asynchronously inside
  // trackVisit before the row is posted to crawler_visits.
  if (matchInsightPath(path)) {
    return { industry: 'insights', category: null }
  }
  if (!path.startsWith('/macao/')) {
    return { industry: null, category: null }
  }
  const parts = path.replace(/^\/macao\//, '').split('/').filter(Boolean)
  if (parts.length === 0) return { industry: null, category: null }
  if (parts[0] === 'faqs') return { industry: null, category: null }
  // Lang path segments (/{region}/{lang}/insights/{slug}) — handled above; defensive null otherwise
  if (LANG_PATH_SEGMENTS.has(parts[0])) return { industry: null, category: null }
  // Only accept whitelisted industry slugs — otherwise this is a merchant slug
  // at top level (e.g. /macao/cc-foo, /macao/jp-bar) and industry is unknown
  if (!VALID_INDUSTRIES.has(parts[0])) return { industry: null, category: null }
  return { industry: parts[0], category: parts[1] || null }
}

// --- Insight industry LRU cache ---------------------------------------------
// Module-level Map (per edge isolate). Resolves /(region)/(lang?)/insights/{slug}
// to insights.related_industries[0]. Cache size capped; oldest 20% evicted on overflow.
// Cache miss + fetch failure → fallback 'insights' (preserves prior monitoring shape).
const INSIGHT_INDUSTRY_CACHE = new Map<string, string>()
const INSIGHT_CACHE_MAX_SIZE = 5000

// Map URL region segment → insights.region uppercase code
const REGION_CODE_MAP: Record<string, string> = {
  macao: 'MO',
  hongkong: 'HK',
  taiwan: 'TW',
  japan: 'JP',
  global: 'GLOBAL',
}

async function resolveInsightIndustry(
  match: InsightPathMatch,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<string> {
  const regionCode = REGION_CODE_MAP[match.region] || match.region.toUpperCase()
  const cacheKey = `${regionCode}:${match.slug}`
  const cached = INSIGHT_INDUSTRY_CACHE.get(cacheKey)
  if (cached) return cached
  try {
    const url =
      `${supabaseUrl}/rest/v1/insights` +
      `?select=related_industries` +
      `&slug=eq.${encodeURIComponent(match.slug)}` +
      `&region=eq.${regionCode}` +
      `&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) return 'insights'
    const rows = (await res.json()) as Array<{ related_industries?: string[] | null }>
    const derived = rows?.[0]?.related_industries?.[0] || 'insights'
    // Evict oldest 20% if cache is full (simple FIFO eviction — Map preserves insertion order)
    if (INSIGHT_INDUSTRY_CACHE.size >= INSIGHT_CACHE_MAX_SIZE) {
      const evictCount = Math.floor(INSIGHT_CACHE_MAX_SIZE * 0.2)
      const iter = INSIGHT_INDUSTRY_CACHE.keys()
      for (let i = 0; i < evictCount; i++) {
        const k = iter.next().value
        if (k === undefined) break
        INSIGHT_INDUSTRY_CACHE.delete(k)
      }
    }
    INSIGHT_INDUSTRY_CACHE.set(cacheKey, derived)
    return derived
  } catch {
    return 'insights'
  }
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
  sessionId: string,
) {
  const { industry: fallbackIndustry, category } = getIndustryCategory(path)
  const insightMatch = matchInsightPath(path)

  ;(async () => {
    let industry: string | null = fallbackIndustry
    if (insightMatch) {
      industry = await resolveInsightIndustry(insightMatch, supabaseUrl, supabaseKey)
    }
    const row = {
      referrer_source: referrerSource,
      referrer_url: referrerUrl.slice(0, 500),
      path,
      site: 'cloudpipe-macao-app',
      page_type: getPageType(path),
      industry,
      category,
      ua_raw: ua.slice(0, 200),
      session_id: sessionId,
      ts: new Date().toISOString(),
    }
    try {
      await fetch(`${supabaseUrl}/rest/v1/ai_referrals`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(row),
      })
    } catch {
      /* swallow tracking errors */
    }
  })().catch(() => {})
}

async function trackVisit(path: string, bot: { name: string; owner: string }, ua: string, supabaseUrl: string, supabaseKey: string, referer?: string, ipRaw?: string | null) {
  const today = new Date().toISOString().slice(0, 10)
  const sessionId = `mw-${bot.name}-${today}`
  const { industry: fallbackIndustry, category } = getIndustryCategory(path)
  const insightMatch = matchInsightPath(path)

  // Fire-and-forget — caller does NOT await trackVisit, so the optional
  // insight-industry lookup never blocks the user response, only delays
  // the tracking write by one Supabase round-trip (cached after first hit).
  ;(async () => {
    let industry: string | null = fallbackIndustry
    if (insightMatch) {
      industry = await resolveInsightIndustry(insightMatch, supabaseUrl, supabaseKey)
    }
    // 隱私保護：只存 SHA-256 hash，不存 raw IP
    const ip_hash = await hashIp(ipRaw ?? null)
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
      ip_hash,
      ts: new Date().toISOString(),
    }
    try {
      await fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(row),
      })
    } catch {
      /* swallow tracking errors */
    }
  })().catch(() => {})
}

export async function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const utmSource = request.nextUrl.searchParams.get('utm_source')
  const utmMedium = request.nextUrl.searchParams.get('utm_medium')

  const referer = request.headers.get('referer') || undefined

  // --- Supabase session refresh (required for @supabase/ssr) ---
  let supabaseResponse = NextResponse.next({ request })

  const supabaseAuthClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must call getUser() to trigger cookie refresh
  const { data: { user } } = await supabaseAuthClient.auth.getUser()

  // Protect /inari/portal/dashboard and sub-routes
  if (
    path.startsWith('/inari/portal/dashboard') ||
    path.startsWith('/inari/portal/products') ||
    path.startsWith('/inari/portal/order')
  ) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/inari/portal'
      return NextResponse.redirect(url)
    }
  }
  // --- End Supabase session refresh ---

  // 取 client IP（Vercel x-forwarded-for / x-vercel-forwarded-for / x-real-ip）
  // 唔存 raw IP — 只 hash 後寫入 crawler_visits.ip_hash 供 bot IP abuse detection
  const ipRaw = extractClientIp(request)

  const bot = detectBot(ua)
  if (bot && supabaseUrl && supabaseKey && !SKIP_BOT_TRACK_PATHS.test(path)) {
    trackVisit(path, bot, ua, supabaseUrl, supabaseKey, referer, ipRaw)
  } else if (!bot && supabaseUrl && supabaseKey) {
    // 真人訪客：取/建 cp_sid cookie（30d）— 用於 attribution funnel cross-event join
    const sessionId = getOrCreateSessionId(request, supabaseResponse)

    // Track FAQ conversion arrivals — only real humans (bots excluded)
    if (utmSource === 'faq') {
      trackFaqConversion(path, utmMedium || 'unknown', supabaseUrl, supabaseKey)
    }
    // Check if human arrived from an AI platform
    // Skip: (1) self-referrer (own domain) (2) asset paths (manifest/favicon/...) (3) non-AI hosts
    if (referer && !NON_CONTENT_PATHS.test(path)) {
      let refHost = ''
      try { refHost = new URL(referer).hostname } catch { /* ignore */ }
      if (refHost && !isOwnDomain(refHost)) {
        const aiSource = detectAiReferrer(referer)
        if (aiSource) {
          trackAiReferral(path, aiSource, referer, ua, supabaseUrl, supabaseKey, sessionId)
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // 排除 static files 和 API routes（只追蹤頁面）
    // 加入 inari portal 受保護路由以確保 session refresh
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
// Force redeploy Sun Apr 26 12:01:33 CST 2026
