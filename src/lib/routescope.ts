import { createServiceClient } from '@/lib/supabase'

export type RouteScope = 'layer0' | 'layer1' | 'layer2'

const INTENT_ROUTES = ['for-rag', 'for-training', 'for-research'] as const
type IntentRoute = (typeof INTENT_ROUTES)[number] | null

const BOT_PATTERNS: [RegExp, string][] = [
  [/GPTBot/i, 'GPTBot'],
  [/ClaudeBot/i, 'ClaudeBot'],
  [/PerplexityBot/i, 'PerplexityBot'],
  [/anthropic-ai/i, 'Anthropic'],
  [/Googlebot/i, 'Googlebot'],
  [/bingbot/i, 'Bingbot'],
  [/Bytespider/i, 'Bytespider'],
  [/YouBot/i, 'YouBot'],
  [/cohere-ai/i, 'Cohere'],
  [/meta-externalagent/i, 'MetaAI'],
  [/applebot/i, 'AppleBot'],
  [/YandexBot/i, 'YandexBot'],
  [/DuckDuckBot/i, 'DuckDuckBot'],
]

function detectIntentRoute(referer: string | null): IntentRoute {
  if (!referer) return null
  for (const r of INTENT_ROUTES) {
    if (referer.includes(`/ai/${r}`)) return r
  }
  return null
}

function detectBot(ua: string | null): string | null {
  if (!ua) return null
  for (const [pattern, name] of BOT_PATTERNS) {
    if (pattern.test(ua)) return name
  }
  return null
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface LogApiEventOpts {
  req: Request
  tier: RouteScope
  apiKeyPrefix?: string
  responseMs: number
  statusCode: number
}

export function logApiEvent(opts: LogApiEventOpts): void {
  // Fire-and-forget — never await in the calling route
  ;(async () => {
    try {
      const url = new URL(opts.req.url)
      const ua = opts.req.headers.get('user-agent')
      const referer = opts.req.headers.get('referer') ?? opts.req.headers.get('referrer')
      const rawIp =
        opts.req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

      const ipHash = await sha256Hex(rawIp)

      const db = createServiceClient()
      await db.from('api_events').insert({
        path: url.pathname,
        method: opts.req.method,
        tier: opts.tier,
        intent_route: detectIntentRoute(referer),
        api_key_prefix: opts.apiKeyPrefix ?? null,
        bot_name: detectBot(ua),
        response_ms: opts.responseMs,
        status_code: opts.statusCode,
        ip_hash: ipHash,
      })
    } catch {
      // Logging must never break the API
    }
  })()
}
