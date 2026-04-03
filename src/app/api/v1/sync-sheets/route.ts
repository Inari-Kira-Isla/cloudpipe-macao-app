/**
 * API 端點: GET /api/v1/sync-sheets
 *
 * 觸發 Google Sheet 同步
 * 支持四個操作模式：
 * 1. ?mode=full - 完整同步（確保 sheets + 推送所有數據）
 * 2. ?mode=sync - 定期同步（只推送數據，用於 cron jobs）
 * 3. ?mode=merchants - 只推送商戶轉化率數據
 * 4. ?mode=insights - 只推送 Insight 成效數據
 *
 * 需要 API 密鑰驗證: ?key=YOUR_API_KEY
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fullSync,
  scheduledSync,
  pushMerchantConversionData,
  pushInsightPerformanceData,
} from '@/lib/google-sheet-sync'

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

    let result

    switch (mode) {
      case 'full':
        // 完整初始化 + 同步
        result = await fullSync()
        return NextResponse.json({
          success: result,
          mode,
          message: 'Full sync completed',
          timestamp: new Date().toISOString(),
        })

      case 'merchants':
        // 只同步商戶轉化率
        result = await pushMerchantConversionData()
        return NextResponse.json({
          success: result,
          mode,
          message: 'Merchant conversion data synced',
          timestamp: new Date().toISOString(),
        })

      case 'insights':
        // 只同步 Insight 成效
        result = await pushInsightPerformanceData()
        return NextResponse.json({
          success: result,
          mode,
          message: 'Insight performance data synced',
          timestamp: new Date().toISOString(),
        })

      case 'sync':
      default:
        // 定期同步（推薦用於 cron）
        result = await scheduledSync()
        return NextResponse.json({
          success: result.success,
          mode,
          message: 'Scheduled sync completed',
          ...result,
        })
    }
  } catch (error) {
    console.error('[Sync API] Error:', error)
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 支持 POST 請求（便於 webhook）
    const key = request.nextUrl.searchParams.get('key')
    if (!SYNC_API_KEY || key !== SYNC_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const mode = body.mode || 'sync'

    let result

    switch (mode) {
      case 'full':
        result = await fullSync()
        break
      case 'merchants':
        result = await pushMerchantConversionData()
        break
      case 'insights':
        result = await pushInsightPerformanceData()
        break
      default:
        result = await scheduledSync()
    }

    return NextResponse.json({
      success: typeof result === 'boolean' ? result : result.success,
      mode,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Sync API] POST Error:', error)
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
