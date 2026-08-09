import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
// AI referrer detection: single source of truth shared with /api/v1/track-ai-referral
import { detectAiReferrer } from '@/lib/ai-referrers'

const AI_BOT_PATTERNS = [
  /GPTBot/i, /ChatGPT/i, /OAI-SearchBot/i,
  /ClaudeBot/i, /Claude-Web/i, /Anthropic/i, /anthropic-ai/i,
  /PerplexityBot/i, /Perplexity/i,
  /Googlebot/i, /Google-Extended/i, /GoogleOther/i,
  /Amazonbot/i, /Applebot/i,
  /meta-externalagent/i, /FacebookBot/i, /facebookexternalhit/i, /Facebot/i,
  /YandexBot/i, /Bingbot/i,
  /Bytespider/i, /SamanthaDoubao/i,
  /CCBot/i, /YouBot/i,
  /cohere-ai/i, /PetalBot/i, /AI2Bot/i,
  // 2026-07-25: 數據中心 AI bot 盲點修復
  /CloudflareBot/i, /Cloudflare-Workers/i,
  /DuckAssistBot/i, /HeyGPT/i,
  /kref-ai/i, /tiktoken/i,
  /DataForSeoBot/i, /SerpApi/i,
  // Headless/脚本常见 UA
  /curl/i, /wget/i, /Python-urllib/i, /Go-http-client/i,
  /HttpClient/i, /node-fetch/i, /axios/i,
]

const BOT_NAME_MAP: [RegExp, string, string][] = [
  [/GPTBot|ChatGPT|OAI-SearchBot/i, 'GPTBot', 'OpenAI'],
  [/ClaudeBot|Claude-Web|anthropic-ai/i, 'ClaudeBot', 'Anthropic'],
  [/PerplexityBot|Perplexity-User/i, 'PerplexityBot', 'Perplexity'],
  [/Googlebot|Google-Extended|GoogleOther/i, 'Googlebot', 'Google'],
  [/Amazonbot/i, 'Amazonbot', 'Amazon'],
  [/Applebot/i, 'Applebot', 'Apple'],
  [/meta-externalagent|FacebookBot/i, 'meta-externalagent', 'Meta'],
  // facebookexternalhit / Facebot = Meta's link-preview scraper (fires on FB/IG/
  // Messenger link shares). Separate name from meta-externalagent (the AI crawler)
  // so crawl stats stay clean. Was previously unmatched → recorded as a human
  // visit, leaving Meta crawl data with a blind spot. Added 2026-07-03.
  [/facebookexternalhit|Facebot/i, 'facebookexternalhit', 'Meta'],
  [/YandexBot/i, 'YandexBot', 'Yandex'],
  [/Bingbot/i, 'Bingbot', 'Microsoft'],
  [/Bytespider|SamanthaDoubao/i, 'Bytespider', 'ByteDance'],
  [/YouBot/i, 'YouBot', 'You.com'],
  [/CCBot/i, 'CCBot', 'Common Crawl'],
  [/cohere-ai/i, 'cohere-ai', 'Cohere'],
  [/PetalBot/i, 'PetalBot', 'Aspiegel'],
  [/AI2Bot/i, 'AI2Bot', 'AI2'],
  // 2026-07-25: 數據中心 AI bot 盲點修復
  [/CloudflareBot|Cloudflare-Workers/i, 'CloudflareBot', 'Cloudflare'],
  [/DuckAssistBot/i, 'DuckAssistBot', 'DuckDuckGo'],
  [/HeyGPT/i, 'HeyGPT', 'Hey'],
  [/DataForSeoBot|SerpApi/i, 'DataForSeoBot', 'DataForSeo'],
  // 脚本/headless UA
  [/curl|wget/i, 'ScriptBot', 'Script'],
  [/Python-urllib/i, 'PythonBot', 'Python'],
  [/Go-http-client/i, 'GoBot', 'Go'],
  [/HttpClient|node-fetch|axios/i, 'LibraryBot', 'Library'],
]

// Headless Chrome / server-side fetchers use round version numbers: Chrome/X.0.0.0
// Real Chrome always has non-zero build+patch: Chrome/120.0.6099.71
// Chrome/120 is the most commonly documented Perplexity real-time fetcher UA.
const PERPLEXITY_HEADLESS_UA = /Chrome\/120\.0\.0\.0/
const HEADLESS_CHROME_UA = /Chrome\/\d+\.0\.0\.0/

// Explicit headless token in UA (e.g. "HeadlessChrome")
const HEADLESS_TOKEN_UA = /Headless/i

// Round-version Chrome (Chrome/X.0.0.0) is NOT sufficient to flag headless:
// modern Chrome 110+ reports .0.0.0 due to UA reduction, so real users + AI
// agents all carry it. Require an ADDITIONAL headless signal before bucketing
// as HeadlessFetcher; otherwise treat as normal real traffic (not a bot).
// Signals (best-effort — only use a header if present):
//   - explicit "Headless" token in UA
//   - missing Accept-Language (real browsers always send it; headless often omits)
//   - missing client hints (sec-ch-ua / sec-ch-ua-platform) — real Chrome sends them
// Conservative: prefer under-flagging over killing real user/AI-agent traffic.
function hasHeadlessSignal(ua: string, headers: Headers): boolean {
  if (HEADLESS_TOKEN_UA.test(ua)) return true
  const acceptLanguage = headers.get('accept-language')
  if (!acceptLanguage) return true
  const secChUa = headers.get('sec-ch-ua')
  const secChUaPlatform = headers.get('sec-ch-ua-platform')
  if (!secChUa && !secChUaPlatform) return true
  return false
}

// --- 自我探測排除（2026-08-09）------------------------------------------------
// crawler_integrity_gate.py 嘅 cache 探針用假爬蟲 UA 打生產站，middleware 之前
// 照單全收當真 Googlebot 記落 crawler_visits。實測污染：2026-08-01→08-08 每日
// 37-49 條假 Googlebot（ua_raw 完全等於 'Mozilla/5.0 (compatible; Googlebot/2.1)'），
// 而 08-04 全日真 Googlebot 只得 104 條 —— 即係 ~42% 係我哋自己打出嚟。
// 呢啲行直接餵返去 check_owner_drop() / google_recovery_report()，等同用自己
// 嘅探針去證明自己個爬取量健康。探測量一擴大就會直接主導個指標。
//
// 治法：探針喺 UA 尾帶一個明確自我標記 token，middleware 見到就完全唔記錄。
// 已知取捨：呢個 token 係可以偽造嘅 —— 有心人設呢個 UA 就可以喺我哋嘅爬蟲
// 統計入面隱形。影響面只限「唔被統計」（唔繞任何 auth / rate limit / 內容
// 存取控制），而換返嚟嘅係量度指標唔被自己污染，判斷係值得。
const SELF_PROBE_UA = /CloudPipeCacheProbe/i

function detectBot(ua: string, headers: Headers): { name: string; owner: string } | null {
  for (const [pattern, name, owner] of BOT_NAME_MAP) {
    if (pattern.test(ua)) return { name, owner }
  }
  if (AI_BOT_PATTERNS.some(p => p.test(ua))) return { name: 'UnknownBot', owner: 'Unknown' }
  // Chrome/120.0.0.0 is the documented Perplexity real-time fetcher UA
  if (PERPLEXITY_HEADLESS_UA.test(ua)) return { name: 'PerplexityBot', owner: 'Perplexity' }
  // Round-version headless Chrome ALONE is not enough (UA reduction makes real
  // Chrome 110+ report .0.0.0). Only bucket as HeadlessFetcher when an extra
  // headless signal is present; otherwise fall through → treated as real traffic.
  if (HEADLESS_CHROME_UA.test(ua) && hasHeadlessSignal(ua, headers)) {
    return { name: 'HeadlessFetcher', owner: 'HeadlessFetcher' }
  }
  return null
}

// Our own brand domains — cross-site bot referrer = spider-web signal
const OUR_BRAND_DOMAINS = [
  'inari-kira-isla.github.io',
  'cloudpipe-macao-app.vercel.app',
  'cloudpipemo.com',
  'www.cloudpipemo.com',
]

// Asset/system paths that browsers fetch automatically — exclude from referral tracking
const NON_CONTENT_PATHS = /^\/(manifest\.json|favicon\.ico|robots\.txt|sitemap.*\.xml|llms\.txt|sw\.js|_next\/|opengraph-image|apple-touch-icon)/i

// Technical/system paths that produce industry=null noise in crawler_visits — skip bot tracking
// Note: `canary` matched via (^|/) so nested paths like /macao/canary are also skipped.
const SKIP_BOT_TRACK_PATHS = /(^|\/)canary|^\/(llms[-\w]*|api\/|_next\/|favicon|icons\/|images\/|manifest\.json|robots\.txt|sitemap)/i

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

// --- 耗時量度 ---------------------------------------------------------------
// Edge runtime 有 performance.now()（單調時鐘，唔受系統時間跳動影響），但唔想
// 靠假設，攞唔到就退返 Date.now()。兩者都係毫秒單位，做差值一樣用得。
function nowMs(): number {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now()
    }
  } catch {
    /* fall through */
  }
  return Date.now()
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

const LANG_PATH_SEGMENTS = new Set(['en', 'ja', 'pt', 'ms'])

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

async function trackUserVisit(
  path: string, ua: string, referer: string | undefined,
  sessionId: string, ipRaw: string | null,
  supabaseUrl: string, supabaseKey: string,
  request: NextRequest,
) {
  // Skip non-content paths (assets, API, sitemaps)
  if (NON_CONTENT_PATHS.test(path)) return

  const isMobile = /mobile|android|iphone|ipad/i.test(ua)
  const isTablet = /tablet|ipad/i.test(ua)
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  let refererDomain: string | null = null
  try { if (referer) refererDomain = new URL(referer).hostname } catch { /* ignore */ }

  const { industry, category } = getIndustryCategory(path)
  const ip_hash = await hashIp(ipRaw)

  const row = {
    session_id: sessionId,
    device_type: deviceType,
    path,
    page_type: getPageType(path, referer),
    industry,
    category,
    referer: referer ? referer.slice(0, 500) : null,
    referer_domain: refererDomain,
    utm_source: request.nextUrl.searchParams.get('utm_source'),
    utm_medium: request.nextUrl.searchParams.get('utm_medium'),
    utm_campaign: request.nextUrl.searchParams.get('utm_campaign'),
    utm_content: request.nextUrl.searchParams.get('utm_content'),
    utm_term: request.nextUrl.searchParams.get('utm_term'),
    is_bot: false,
    ip_hash,
  }
  ;(async () => {
    try {
      await fetch(`${supabaseUrl}/rest/v1/user_visits`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        },
        body: JSON.stringify(row),
      })
    } catch { /* swallow — never block user response */ }
  })().catch(() => {})
}

// Inari buffer — fallback when main Supabase is down
// Key loaded from env at runtime (set INARI_SERVICE_ROLE_KEY in Vercel)
const INARI_BUFFER_URL = 'https://cqartwwsbxnjjatmndtt.supabase.co/rest/v1/bot_tracking_buffer'

async function writeToInariBuffer(bufferPayload: {
  visit_time: string
  bot_name: string | null
  bot_owner: string | null
  ua_raw: string
  path: string
  site_id: string
  region: string
}): Promise<void> {
  const inariKey = process.env.INARI_SERVICE_ROLE_KEY
  if (!inariKey) return // buffer unavailable — skip silently
  try {
    await fetch(INARI_BUFFER_URL, {
      method: 'POST',
      headers: {
        'apikey': inariKey,
        'Authorization': `Bearer ${inariKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(bufferPayload),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    /* buffer write also failed — visits lost, acceptable last resort */
  }
}

/**
 * trackVisit
 *
 * `middlewareMs` — ⚠ 老實講清楚呢個數字係咩，因為好易被當成 TTFB 用：
 *   量到嘅係 **middleware 自己嗰一段**：由 middleware() 入口，到 bot 判定完
 *   派發呢個 tracking call 嗰一刻。呢段入面最重之嘅係
 *   `supabaseAuthClient.auth.getUser()` 嗰個真網絡 round-trip。
 *
 *   佢**唔係**端到端 TTFB。middleware 行完之後仲有：route handler 執行、
 *   ISR / edge cache 查詢、RSC render、response 串流、網絡傳輸 —— 全部唔喺
 *   呢個數字入面。Next.js middleware 喺 response 產生**之前**行完就 return，
 *   架構上冇任何途徑喺 middleware 入面等到 first byte 出街先計時，所以喺呢一
 *   層量真 TTFB 係做唔到嘅，唔係「未做」。
 *
 *   即係話 response_time_ms 喺 scope='middleware' 之下應該當 **server TTFB 嘅
 *   下限**嚟解讀：呢個數大 = 一定慢；呢個數細 ≠ 用戶/爬蟲收得快。
 *
 *   要真 TTFB 有兩條路（兩條都唔喺呢次改動範圍）：
 *     a) 由外部探針量（crawler_integrity_gate.py 已經係咁做，量緊真端到端）；
 *     b) middleware 出 `Server-Timing` header + Vercel log drain 回填，
 *        寫入時用新 scope 值（例如 'ttfb'），唔好覆蓋 'middleware' 語義。
 */
async function trackVisit(path: string, bot: { name: string; owner: string }, ua: string, supabaseUrl: string, supabaseKey: string, referer?: string, ipRaw?: string | null, middlewareMs?: number | null) {
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
      // 2026-08-09 新增儀錶。量唔到就 NULL，唔填假值。
      response_time_ms: typeof middlewareMs === 'number' && Number.isFinite(middlewareMs)
        ? Math.max(0, Math.round(middlewareMs))
        : null,
      response_time_scope: typeof middlewareMs === 'number' && Number.isFinite(middlewareMs)
        ? 'middleware'
        : null,
    }
    const postRow = async (body: Record<string, unknown>) => fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000), // 5s hard timeout — prevent edge isolate hang
    })
    let mainOk = false
    try {
      const res = await postRow(row)
      mainOk = res.ok
      // Deploy-ordering 安全網：如果 20260809000000 條 migration 未 apply 到
      // production，PostgREST 會對未知欄位回 400 / PGRST204，令**成張表**嘅
      // 寫入全數失敗 —— 加一個儀錶反而整死咗爬蟲追蹤 SSOT，係最差結果。
      // 撞 400 就即刻退返做原本嘅 row（去走兩條新欄位）重試一次。
      // 正確次序仍然係「先 apply migration 再 deploy」，呢度只係唔想次序搞錯
      // 就靜默斷線。
      if (!mainOk && res.status === 400) {
        const { response_time_ms: _ms, response_time_scope: _scope, ...legacyRow } = row
        void _ms; void _scope
        const retry = await postRow(legacyRow)
        mainOk = retry.ok
      }
    } catch {
      /* main DB unreachable */
    }
    // Fallback: buffer in Inari DB when main write failed
    if (!mainOk) {
      await writeToInariBuffer({
        visit_time: row.ts,
        bot_name: bot.name,
        bot_owner: bot.owner,
        ua_raw: ua.slice(0, 200),
        path,
        site_id: 'cloudpipe-macao-app',
        region: 'MO',
      })
    }
  })().catch(() => {})
}

export async function middleware(request: NextRequest) {
  // ⚠ 呢個 t0 必須係 middleware 入口第一句 —— 之後任何一句都會令量到嘅
  // 「middleware 分段耗時」少計。留意佢仍然只係 server TTFB 嘅下限，
  // 詳見 trackVisit() 上面嘅註解。
  const mwStart = nowMs()
  const ua = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  // 自家 cache 探針：唔記錄爬蟲訪問，亦唔記錄做真人訪客（見 SELF_PROBE_UA）
  const isSelfProbe = SELF_PROBE_UA.test(ua)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const utmSource = request.nextUrl.searchParams.get('utm_source')
  const utmMedium = request.nextUrl.searchParams.get('utm_medium')

  const referer = request.headers.get('referer') || undefined

  // --- Supabase session refresh (required for @supabase/ssr) ---
  let supabaseResponse = NextResponse.next({ request })

  // PERF (2026-08-09): auth.getUser() is a BLOCKING network round-trip to
  // Supabase Auth. It used to run on every matched request — i.e. effectively
  // the whole site (all insight/merchant/category/industry pages, sitemap*.xml,
  // llms.txt, robots.txt) plus every AI-crawler hit — even though the resulting
  // `user` is read in exactly one place: the /inari/portal/* guard below.
  // Cookie session refresh only matters where auth is actually read server-side,
  // which is likewise only under /inari/portal (portal/dashboard page.tsx calls
  // supabase.auth.getUser()). /api/* is not matched by this middleware at all
  // (see config.matcher), so API auth is unaffected.
  // Prefix chosen as a strict superset of the guarded paths below, and it also
  // keeps session refresh on the /inari/portal login page itself.
  const needsAuth = path.startsWith('/inari/portal')

  if (needsAuth) {
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
  }
  // --- End Supabase session refresh ---

  // 取 client IP（Vercel x-forwarded-for / x-vercel-forwarded-for / x-real-ip）
  // 唔存 raw IP — 只 hash 後寫入 crawler_visits.ip_hash 供 bot IP abuse detection
  const ipRaw = extractClientIp(request)

  const bot = isSelfProbe ? null : detectBot(ua, request.headers)
  if (bot && supabaseUrl && supabaseKey && !SKIP_BOT_TRACK_PATHS.test(path)) {
    // middleware 分段耗時：喺呢一刻先計，令 auth.getUser() round-trip 計入去。
    trackVisit(path, bot, ua, supabaseUrl, supabaseKey, referer, ipRaw, nowMs() - mwStart)
  } else if (!bot && !isSelfProbe && supabaseUrl && supabaseKey) {
    // 真人訪客：取/建 cp_sid cookie（30d）— 用於 attribution funnel cross-event join
    const sessionId = getOrCreateSessionId(request, supabaseResponse)

    // Track all real human page visits → user_visits table (fire-and-forget)
    trackUserVisit(path, ua, referer, sessionId, ipRaw, supabaseUrl, supabaseKey, request)

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
