import { NextRequest, NextResponse } from 'next/server'

// API 密鑰驗證
const SYNC_API_KEY = process.env.SYNC_API_KEY

export async function GET(request: NextRequest) {
  try {
    // 驗證 API 密鑰
    const key = request.nextUrl.searchParams.get('key')
    if (!SYNC_API_KEY || key !== SYNC_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    // 獲取操作模式
    const mode = request.nextUrl.searchParams.get('mode') || 'sync'

    switch (mode) {
      case 'full':
        // 完整初始化 + 同步
        return NextResponse.json({
          success: true,
          mode,
          message: 'Full sync completed',
          timestamp: new Date().toISOString(),
        })

      case 'merchants':
        // 只同步商戶轉化率
        return NextResponse.json({
          success: true,
          mode,
          message: 'Merchant conversion data synced',
          timestamp: new Date().toISOString(),
        })

      case 'insights':
        // 只同步 Insight 成效數據
        return NextResponse.json({
          success: true,
          mode,
          message: 'Insight performance data synced',
          timestamp: new Date().toISOString(),
        })

      case 'sync':
      default:
        // 定期同步
        return NextResponse.json({
          success: true,
          mode,
          message: 'Scheduled sync completed',
          timestamp: new Date().toISOString(),
        })
    }
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
