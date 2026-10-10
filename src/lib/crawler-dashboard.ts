// Pure helpers for /macao/crawler-dashboard (no React, no I/O) so they can be unit-tested
// with the repo's zero-framework tsc+node pattern (see ai-referrers.test.ts).

// ── Bot classification ───────────────────────────────────────────────────────
// The dashboard used to label every crawler as an "AI Bot", including SEO tools
// (DataForSeoBot) and heuristic headless-browser buckets (HeadlessFetcher). Split into
// three honest groups. Matching is by bot_name (the owner granularity is too coarse:
// Google/Microsoft own both a search bot and an AI-training bot).
export type BotCategory = 'ai_engine' | 'search_engine' | 'link_preview' | 'seo_tool'

export const BOT_CATEGORY_META: Record<BotCategory, { label: string; hint: string; color: string }> = {
  ai_engine:     { label: 'AI 引擎爬蟲',          hint: 'UA 具名嘅 AI / LLM 引擎爬蟲（ClaudeBot、GPTBot、PerplexityBot 等）', color: '#10a37f' },
  search_engine: { label: '搜尋引擎',            hint: '傳統搜尋引擎爬蟲（Googlebot、Bingbot、YandexBot、PetalBot 等）',     color: '#4285f4' },
  link_preview:  { label: '連結預覽・社交',      hint: '社交平台讀取分享連結預覽嘅爬蟲（facebookexternalhit、Twitterbot、LinkedInBot 等）：用戶貼連結時先會訪問，唔係搜尋引擎亦唔係 AI 訓練爬蟲', color: '#8e6bbf' },
  seo_tool:      { label: 'SEO 工具・無頭瀏覽器・其他', hint: 'SEO 分析工具、啟發式無頭瀏覽器桶（HeadlessFetcher）、腳本及未識別爬蟲', color: '#c0392e' },
}

// Same AI-engine list as crawler_alltime_cache.py AI_ENGINE_BOTS (Kira 2026-09-12) plus
// UA-named LLM bots that appear in the 1/7/30/90-day windows.
const AI_ENGINE_BOT_NAMES = new Set([
  'claudebot', 'claude-user', 'claude-searchbot', 'anthropic-ai',
  'gptbot', 'oai-searchbot', 'chatgpt-user',
  'perplexitybot', 'perplexity-user',
  'meta-externalagent', 'bytespider', 'amazonbot', 'applebot-extended', 'claude-web',
  'youbot', 'duckassistbot', 'ccbot', 'google-extended', 'cohere-ai',
])

const SEARCH_ENGINE_BOT_NAMES = new Set([
  'googlebot', 'googlebot-image', 'bingbot', 'yandexbot', 'petalbot', 'sogou', 'baiduspider',
  'duckduckbot', 'slurp', 'seznambot', 'naverbot', 'yeti',
  // Applebot (2026-10-08 review): Apple's crawler feeding Siri/Spotlight search; the AI-training
  // opt-out signal is the separate token Applebot-Extended (kept under ai_engine above).
  'applebot',
])

// facebookexternalhit & friends fetch a URL only when someone shares it (link-preview unfurl) — they are
// neither a search engine nor an SEO tool nor an AI crawler (2026-10-08 review), so they get their own bucket.
const LINK_PREVIEW_BOT_NAMES = new Set([
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'slackbot', 'discordbot', 'whatsapp', 'telegrambot',
])

// Strict "UA-named LLM" subset — mirrors STRICT_UA_TOKENS in crawler_alltime_cache.py
// (excludes Amazonbot / Applebot, which are general-purpose crawlers).
//
// ONE definition for ALL views (1/7/30/90 days and 全部). It is computed from bot_name only, in
// summarizeBotCategories().strictLlmCount. Do NOT use alltime.meta.totals.strict_llm_engines_ua_named
// for display: that figure is matched on ua_raw tokens (46.9% of the all-time total) and disagrees with
// this bot_name definition (48.1%) on the same screen.
// Reconciliation of the three figures a reader may meet:
//   - 48.1% (all-time) / 49.1% (90 days): this definition (bot_name in the list below).
//   - 46.9% (all-time): the python ua_raw-token count, retired from the UI.
//   - 45.8% (90 days, analysis report 2026-10-08): an owner-level set (OpenAI / Anthropic / Perplexity /
//     Meta + OAI-SearchBot) that omits Bytespider, YouBot, DuckAssistBot, CCBot — an older, narrower set.
export const STRICT_LLM_DEFINITION =
  '「UA 實名 LLM」＝爬蟲自報名稱屬 ClaudeBot、GPTBot、OAI-SearchBot、ChatGPT-User、PerplexityBot、Meta-ExternalAgent、Bytespider、YouBot、DuckAssistBot、CCBot 之一；唔計 Amazonbot、Applebot 同啟發式無頭瀏覽器。全站 1／7／30／90 日同「全部」用同一個定義。'
const STRICT_LLM_BOT_NAMES = new Set([
  'claudebot', 'gptbot', 'oai-searchbot', 'chatgpt-user', 'meta-externalagent',
  'bytespider', 'perplexitybot', 'youbot', 'duckassistbot', 'ccbot',
])

export function classifyBot(botName: string): BotCategory {
  const n = (botName || '').trim().toLowerCase()
  if (AI_ENGINE_BOT_NAMES.has(n)) return 'ai_engine'
  if (SEARCH_ENGINE_BOT_NAMES.has(n)) return 'search_engine'
  if (LINK_PREVIEW_BOT_NAMES.has(n)) return 'link_preview'
  return 'seo_tool' // HeadlessFetcher, DataForSeoBot, ScriptBot, GoBot, PythonBot, UnknownBot, ... (shown as 「其他」)
}

export function isStrictLlmBot(botName: string): boolean {
  return STRICT_LLM_BOT_NAMES.has((botName || '').trim().toLowerCase())
}

export interface BotCountInfo { count: number; owner: string }
export interface BotCategorySummary {
  total: number
  strictLlmCount: number
  byCategory: Record<BotCategory, { count: number; kinds: number; pct: number; bots: [string, BotCountInfo][] }>
}

export function summarizeBotCategories(bots: Record<string, BotCountInfo>): BotCategorySummary {
  const out: BotCategorySummary = {
    total: 0,
    strictLlmCount: 0,
    byCategory: {
      ai_engine: { count: 0, kinds: 0, pct: 0, bots: [] },
      search_engine: { count: 0, kinds: 0, pct: 0, bots: [] },
      link_preview: { count: 0, kinds: 0, pct: 0, bots: [] },
      seo_tool: { count: 0, kinds: 0, pct: 0, bots: [] },
    },
  }
  for (const [name, info] of Object.entries(bots || {})) {
    const c = Number(info?.count) || 0
    const cat = classifyBot(name)
    out.total += c
    out.byCategory[cat].count += c
    out.byCategory[cat].kinds += 1
    out.byCategory[cat].bots.push([name, info])
    if (isStrictLlmBot(name)) out.strictLlmCount += c
  }
  for (const cat of Object.keys(out.byCategory) as BotCategory[]) {
    out.byCategory[cat].bots.sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0))
    out.byCategory[cat].pct = out.total > 0 ? (out.byCategory[cat].count / out.total) * 100 : 0
  }
  return out
}

// ── Trend-series aggregation ─────────────────────────────────────────────────
export type Granularity = 'day' | 'week' | 'month'

export interface SeriesPoint {
  date: string // YYYY-MM-DD
  total: number
  by_owner?: Record<string, number>
}
export interface AggPoint extends SeriesPoint {
  label: string      // axis label
  span: number       // number of source days folded into this bucket
  partial: boolean   // true if the bucket is not fully covered by the data (first / last bucket)
  title: string      // tooltip range text
}

// > 90 days → weekly; > 365 days → monthly (report §4(d)(3)).
export function chooseGranularity(numPoints: number): Granularity {
  if (numPoints > 365) return 'month'
  if (numPoints > 90) return 'week'
  return 'day'
}

function parseUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1)
}
function fmtUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
// Monday-start ISO week bucket key (pure string/UTC math — no local-timezone dependence).
export function weekStart(date: string): string {
  const ms = parseUtc(date)
  const dow = new Date(ms).getUTCDay() // 0=Sun
  const back = (dow + 6) % 7
  return fmtUtc(ms - back * 86400000)
}

export function aggregateSeries(points: SeriesPoint[], g: Granularity): AggPoint[] {
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  if (g === 'day') {
    return sorted.map(p => ({ ...p, label: p.date.slice(5).replace('-', '/'), span: 1, partial: false, title: p.date }))
  }
  const buckets = new Map<string, { total: number; by_owner: Record<string, number>; first: string; last: string; n: number; hasOwner: boolean }>()
  for (const p of sorted) {
    const key = g === 'week' ? weekStart(p.date) : p.date.slice(0, 7)
    let b = buckets.get(key)
    if (!b) { b = { total: 0, by_owner: {}, first: p.date, last: p.date, n: 0, hasOwner: false }; buckets.set(key, b) }
    b.total += p.total
    b.n += 1
    b.last = p.date
    if (p.by_owner) {
      b.hasOwner = true
      for (const [o, c] of Object.entries(p.by_owner)) b.by_owner[o] = (b.by_owner[o] || 0) + c
    }
  }
  const keys = [...buckets.keys()].sort()
  return keys.map((key, idx) => {
    const b = buckets.get(key)!
    let expected: number
    if (g === 'week') expected = 7
    else {
      const [y, m] = key.split('-').map(Number)
      expected = new Date(Date.UTC(y, m, 0)).getUTCDate()
    }
    // Only the first/last bucket can be truncated by the data range; middle gaps are real zero days.
    const edge = idx === 0 || idx === keys.length - 1
    const partial = edge && b.n < expected
    const label = g === 'week' ? key.slice(5).replace('-', '/') : key
    const title = g === 'week' ? `${key} 起一週` : key
    return {
      date: key, total: b.total, label, span: b.n, partial,
      title: `${title}${partial ? '（不完整）' : ''}`,
      ...(b.hasOwner ? { by_owner: b.by_owner } : {}),
    }
  })
}

// Bar cap for the trend charts. The old cap was `days<=7?7:days<=14?14:30`, so selecting
// 90 days still drew only the last 30 bars. Keep the old caps up to ~31 points, then show all.
export function barLimit(n: number): number {
  if (n <= 7) return 7
  if (n <= 14) return 14
  if (n <= 31) return 30
  return n
}

// ── Out-of-order response protection ─────────────────────────────────────────
// Each begin() aborts the previous request's AbortController and bumps an id; callers must
// check isCurrent() before committing state, so a slow older response (e.g. "90 天" finishing
// after the user already switched to "今天") can never overwrite newer data.
export interface RequestTicket { id: number; signal: AbortSignal; isCurrent: () => boolean }
export function createRequestGuard() {
  let current = 0
  let ctrl: AbortController | null = null
  return {
    begin(): RequestTicket {
      ctrl?.abort()
      ctrl = new AbortController()
      const id = ++current
      return { id, signal: ctrl.signal, isCurrent: () => id === current }
    },
    abort() {
      current++
      ctrl?.abort()
      ctrl = null
    },
  }
}

// ── "全部" view: derive a Summary-shaped object from crawler-stats-alltime.json ──
export interface AlltimeLike {
  meta: {
    rows_total: number
    range: { min_ts: string; max_ts: string }
    totals: { all: number; identified_ai_engines: number; excluding_headless: number; strict_llm_engines_ua_named: number }
    generated_at?: string
  }
  bots_alltime: {
    ai_engines: { bot_name: string; bot_owner: string; count: number }[]
    search_and_other: { bot_name: string; bot_owner: string; count: number }[]
  }
  page_types: { page_type: string; count: number }[]
  daily_totals: { date: string; count: number }[]
  daily_totals_hkt?: { date: string; count: number; by_owner?: Record<string, number> }[]
}

export interface AlltimeSummaryShape {
  total_visits: number
  unique_bots: number
  bots: Record<string, BotCountInfo>
  page_types: Record<string, number>
  daily: { date: string; total: number; by_owner?: Record<string, number> }[]
  daily_basis: 'hkt' | 'utc'
}

export function alltimeToSummaryShape(a: AlltimeLike): AlltimeSummaryShape {
  const bots: Record<string, BotCountInfo> = {}
  for (const b of [...a.bots_alltime.ai_engines, ...a.bots_alltime.search_and_other]) {
    bots[b.bot_name] = { count: b.count, owner: b.bot_owner }
  }
  const page_types: Record<string, number> = {}
  for (const p of a.page_types) page_types[p.page_type] = p.count
  const hkt = a.daily_totals_hkt && a.daily_totals_hkt.length > 0
  const daily = hkt
    ? a.daily_totals_hkt!.map(d => ({ date: d.date, total: d.count, ...(d.by_owner ? { by_owner: d.by_owner } : {}) }))
    : a.daily_totals.map(d => ({ date: d.date, total: d.count }))
  return {
    total_visits: a.meta.totals.all,
    unique_bots: Object.keys(bots).length,
    bots,
    page_types,
    daily,
    daily_basis: hkt ? 'hkt' : 'utc',
  }
}

// ── Daily-series vs headline-total reconciliation ────────────────────────────
// The 90-day summary's `daily` comes from crawler_daily_stats, which under-counts ~20 days
// (2026-08-21..09-08 + the current day) versus the raw-visits total used for `total_visits`
// (analysis report §3.1). Surface the gap instead of letting the chart silently disagree with the KPI.
export interface DailyGap { dailySum: number; total: number; gap: number; pct: number }
export function dailyTotalGap(daily: { total: number }[] | undefined, totalVisits: number, thresholdPct = 2): DailyGap | null {
  if (!daily || daily.length === 0 || !(totalVisits > 0)) return null
  const dailySum = daily.reduce((s, d) => s + (Number(d.total) || 0), 0)
  const gap = totalVisits - dailySum
  const pct = (Math.abs(gap) / totalVisits) * 100
  return pct > thresholdPct ? { dailySum, total: totalVisits, gap, pct } : null
}
