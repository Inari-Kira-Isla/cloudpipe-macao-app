import { NextRequest, NextResponse } from 'next/server'

// AI Bot patterns — 只追蹤已知 AI 爬蟲
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

function isAIBot(ua: string): boolean {
  return AI_BOT_PATTERNS.some(p => p.test(ua))
}

export async function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname

  if (isAIBot(ua)) {
    // 把 pathname 注入到 request header，讓 not-found.tsx Server Component 讀取
    // （not-found 無法直接拿 request.url，只能靠 headers()）
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-cloudpipe-pathname', path)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 排除 static files 和 API routes（只追蹤頁面）
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
