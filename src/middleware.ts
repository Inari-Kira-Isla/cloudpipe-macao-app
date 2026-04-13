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
  const response = NextResponse.next()
  const ua = request.headers.get('user-agent') || ''

  // 只追蹤 AI 爬蟲的 404（避免 noise）
  if (isAIBot(ua)) {
    const path = request.nextUrl.pathname

    // 在 response header 加標記，供 Edge function 後處理
    // 實際 404 狀態由 response 決定，這裡記錄意圖
    response.headers.set('x-cloudpipe-bot', '1')
    response.headers.set('x-cloudpipe-path', path)
  }

  return response
}

export const config = {
  matcher: [
    // 排除 static files 和 API routes（只追蹤頁面）
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
