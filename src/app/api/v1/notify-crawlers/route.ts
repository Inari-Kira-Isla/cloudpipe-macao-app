import { NextResponse } from 'next/server'
import { notifySitemaps, notifyRSSAggregators } from '@/lib/notify-crawlers'

export const maxDuration = 10

/**
 * Endpoint to notify crawlers of sitemap updates
 * Can be called from:
 * - Content generation system (after publishing insights)
 * - Scheduled cron jobs
 * - Manual verification
 *
 * Usage: POST /api/v1/notify-crawlers
 * Optional query params:
 *   - type=sitemap (default) | rss | all
 *   - token=<secret> (for security, optional)
 */
export async function POST(request: Request) {
  try {
    // Optional: Verify secret token (implement if needed for security)
    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'sitemap'
    const token = url.searchParams.get('token')

    // If token is provided, verify it (you can add env validation)
    if (token && token !== process.env.CRAWLER_NOTIFY_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results: Record<string, unknown> = {}

    if (type === 'sitemap' || type === 'all') {
      results.sitemap = await notifySitemaps()
    }

    if (type === 'rss' || type === 'all') {
      results.rss = await notifyRSSAggregators()
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    console.error('[notify-crawlers API error]', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for verification and monitoring
 * Usage: GET /api/v1/notify-crawlers?check=true
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const check = url.searchParams.get('check')

  if (check === 'true') {
    return NextResponse.json({
      status: 'ready',
      endpoints: {
        sitemap: 'https://cloudpipe-macao-app.vercel.app/sitemap.xml',
        feed: 'https://cloudpipe-macao-app.vercel.app/feed.xml',
      },
      usage: 'POST /api/v1/notify-crawlers?type=sitemap|rss|all',
      description: 'Notifies Google, Bing, Yandex of sitemap updates',
    })
  }

  return NextResponse.json({
    message: 'POST to trigger crawler notifications',
    usage: 'POST /api/v1/notify-crawlers?type=sitemap|rss|all',
  })
}
