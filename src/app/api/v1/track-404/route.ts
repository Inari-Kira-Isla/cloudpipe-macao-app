import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 10

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const AI_BOT_PATTERNS = [
  /GPTBot/i, /ChatGPT/i, /OAI-SearchBot/i,
  /ClaudeBot/i, /Claude-Web/i, /anthropic/i,
  /PerplexityBot/i,
  /Googlebot/i, /Google-Extended/i, /GoogleOther/i,
  /Amazonbot/i, /Applebot/i,
  /meta-externalagent/i,
  /YandexBot/i, /Bingbot/i,
  /Bytespider/i, /SamanthaDoubao/i,
]

function parseBotName(ua: string): string | null {
  if (/GPTBot|ChatGPT|OAI-SearchBot/i.test(ua)) return 'GPTBot'
  if (/ClaudeBot|Claude-Web/i.test(ua)) return 'ClaudeBot'
  if (/PerplexityBot/i.test(ua)) return 'PerplexityBot'
  if (/Googlebot|Google-Extended|GoogleOther/i.test(ua)) return 'Googlebot'
  if (/Amazonbot/i.test(ua)) return 'Amazonbot'
  if (/Applebot/i.test(ua)) return 'Applebot'
  if (/meta-externalagent/i.test(ua)) return 'meta-externalagent'
  if (/YandexBot/i.test(ua)) return 'YandexBot'
  if (/Bingbot/i.test(ua)) return 'Bingbot'
  if (/Bytespider/i.test(ua)) return 'Bytespider'
  if (/SamanthaDoubao/i.test(ua)) return 'SamanthaDoubao'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { path, ua, site } = await request.json()

    if (!path || !ua) {
      return NextResponse.json({ error: 'missing path or ua' }, { status: 400 })
    }

    const isBot = AI_BOT_PATTERNS.some(p => p.test(ua))
    if (!isBot) return NextResponse.json({ skipped: true })

    const botName = parseBotName(ua)
    if (!botName) return NextResponse.json({ skipped: true })

    await supabase.from('crawler_visits').insert({
      ts: new Date().toISOString(),
      path,
      bot_name: botName,
      bot_owner: botName,
      page_type: 'not_found',
      site: site || 'cloudpipe-macao-app',
      status_code: 404,
    })

    return NextResponse.json({ logged: true, bot: botName, path })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
