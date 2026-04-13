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
  [/PetalBot/i,            'PetalBot',             'Aspiegel'],
  [/CCBot/i,               'CCBot',                'Common Crawl'],
  [/cohere-ai/i,           'cohere-ai',            'Cohere'],
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
 */
export async function trackBotVisit(
  request: Request,
  path: string,
  pageType: string = 'api',
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
      industry: null,
      category: null,
      status_code: 200,
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
