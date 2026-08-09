/**
 * track-bot.ts — API 路由 AI Bot 訪問追蹤
 * 用於 /api/faq/* 等 API 路由，記錄 AI 爬蟲訪問到 crawler_visits
 * Fire-and-forget（不阻塞回應）
 */

const BOT_PATTERNS: [RegExp, string, string][] = [
  [/GPTBot/i,              'GPTBot',              'OpenAI'],
  [/ChatGPT-User/i,        'ChatGPT-User',        'OpenAI'],
  [/OAI-SearchBot/i,       'OAI-SearchBot',       'OpenAI'],
  [/ClaudeBot/i,           'ClaudeBot',            'Anthropic'],
  [/Claude-Web/i,          'Claude-Web',           'Anthropic'],
  [/anthropic-ai/i,        'anthropic-ai',         'Anthropic'],
  [/PerplexityBot/i,       'PerplexityBot',        'Perplexity'],
  [/Googlebot/i,           'Googlebot',            'Google'],
  [/Google-Extended/i,     'Google-Extended',      'Google'],
  [/Applebot/i,            'Applebot',             'Apple'],
  [/Amazonbot/i,           'Amazonbot',            'Amazon'],
  [/meta-externalagent/i,  'meta-externalagent',   'Meta'],
  [/FacebookBot/i,         'FacebookBot',           'Meta'],
  [/YandexBot/i,           'YandexBot',            'Yandex'],
  [/Bingbot/i,             'Bingbot',              'Microsoft'],
  [/Bytespider/i,          'Bytespider',           'ByteDance'],
  [/SamanthaDoubao/i,      'SamanthaDoubao',       'ByteDance'],
  [/YouBot/i,              'YouBot',               'You.com'],
  [/PetalBot/i,            'PetalBot',             'Aspiegel'],
  [/CCBot/i,               'CCBot',                'Common Crawl'],
  [/cohere-ai/i,           'cohere-ai',            'Cohere'],
  [/AI2Bot/i,              'AI2Bot',               'AI2'],
]

export function detectBot(ua: string): { bot_name: string; bot_owner: string } | null {
  for (const [pattern, name, owner] of BOT_PATTERNS) {
    if (pattern.test(ua)) return { bot_name: name, bot_owner: owner }
  }
  return null
}

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + 'cloudpipe-salt-2026')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/**
 * trackBotVisit — fire-and-forget, never throws
 * Call with: trackBotVisit(request, '/api/faq/index', 'api-faq')
 *
 * ⚠ status_code 現況（2026-08-09 修正）
 * ------------------------------------------------------------------
 * 之前呢度寫死 `status_code: 200`。呢個唔係「預設值」，係一個**假數據**：
 * 5 個 call site（/api/gkg、/api/faq/index、/api/faq/merchant/[id]、
 * /api/knowledge/index、/api/knowledge/entity/[slug]）全部喺 handler 第一句
 * 就 fire-and-forget 咁叫呢個 function，嗰一刻 response 根本仲未存在 ——
 * 所以 404 / 500 一律都被記成 200，crawler_404_report 呢個 view（查
 * `WHERE status_code = 404`）對 API route 永遠係空，等同一個唔會 fire 嘅閘。
 * 例如 /api/faq/merchant/[id] 真係有 `return NextResponse.json(..., {status:404})`
 * 分支，但呢條路徑寫入 DB 一世都係 200。
 *
 * 而家改法：加可選 `statusCode` 參數；冇畀就寫 NULL（老實話「唔知」），
 * 唔再捏造 200。
 *
 * 要真攞返 status（建議做法，唔喺呢次改動範圍，因為要動 5 條生產 API route
 * 嘅控制流，風險同「加儀錶」呢個任務唔對等）：
 *   選項 A（最少改動、可即用）：喺每個 handler 將呼叫由開頭搬去每個 return
 *     之前，逐個 return 傳返真 status，例如
 *       const res = NextResponse.json(payload)
 *       trackBotVisit(request, path, pageType, res.status)
 *       return res
 *     缺點：handler 有多個 return 分支（try/catch + 404 early return），
 *     逐個加容易漏，漏咗嗰條分支就變返冇記錄。
 *   選項 B（推薦、一次過解決）：喺呢個檔案加一個 higher-order wrapper
 *       export function withBotTracking(path, pageType, handler)
 *     由佢包住成個 handler，await 完 response 之後統一讀 `res.status` 再寫，
 *     順便可以量到真 handler 耗時（`Date.now()` 前後夾），寫入
 *     crawler_visits.response_time_ms + response_time_scope='handler'。
 *     route 只需改 export 一行：`export const GET = withBotTracking(...)`。
 *     缺點：dynamic path（/api/faq/merchant/[id]）要傳 path 產生函式，
 *     而且 5 條 route 都要改 export 形式，要獨立驗證。
 */
export async function trackBotVisit(
  request: Request,
  path: string,
  pageType: string = 'api',
  statusCode: number | null = null,
): Promise<void> {
  try {
    const ua = (request.headers as Headers).get('user-agent') || ''
    const bot = detectBot(ua)
    if (!bot) return  // not an AI bot, skip

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return

    const ip = (request.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim()
      || (request.headers as Headers).get('x-real-ip')
      || '0.0.0.0'
    const ipHash = await hashIP(ip)
    const dateStr = new Date().toISOString().slice(0, 10)
    const referer = (request.headers as Headers).get('referer') || null

    // Derive industry from pageType when path has no structured industry (e.g. API FAQ routes)
    const industry = pageType === 'api-faq' ? 'insights' : null

    const row = {
      bot_name: bot.bot_name,
      bot_owner: bot.bot_owner,
      path,
      referer,
      ip_hash: ipHash,
      session_id: `${ipHash}-${bot.bot_name}-${dateStr}`,
      ua_raw: ua.slice(0, 500),
      site: 'cloudpipe-macao-app',
      page_type: pageType,
      industry,
      category: null,
      // 真實 status —— 呼叫方畀到就寫，畀唔到寫 NULL。
      // 絕對唔可以退返寫死 200：假 200 令 404/500 完全睇唔到，
      // 比 NULL（明確「未量度」）差好多。
      status_code: typeof statusCode === 'number' && Number.isFinite(statusCode)
        ? statusCode
        : null,
    }

    // Fire-and-forget: insert without awaiting in caller
    fetch(`${supabaseUrl}/rest/v1/crawler_visits`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    }).catch(() => {/* silently ignore tracking errors */})
  } catch {
    // tracking should never break the API response
  }
}
