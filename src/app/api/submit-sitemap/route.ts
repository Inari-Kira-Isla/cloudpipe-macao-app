/**
 * Sitemap & IndexNow Submission Handler
 * 立即通知搜索引擎和 AI 爬虫更新
 *
 * Triggers:
 * - POST /api/submit-sitemap (Manual trigger)
 * - Automatic on sitemap.xml generation
 *
 * Services:
 * - Google Search Console (sitemap)
 * - Bing Webmaster Tools (IndexNow + sitemap)
 * - Yandex (sitemap)
 */

import { NextRequest, NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe.ai'
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`

// IndexNow key (generate from Bing Webmaster Tools)
const INDEX_NOW_KEY = process.env.BING_INDEX_NOW_KEY || ''

interface SubmissionResult {
  service: string
  status: 'success' | 'failed' | 'skipped'
  message: string
  timestamp: string
}

async function submitToGoogle(): Promise<SubmissionResult> {
  try {
    const googleUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(googleUrl, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.ok || response.status === 204) {
      return {
        service: 'Google Search Console',
        status: 'success',
        message: `Sitemap submitted successfully`,
        timestamp: new Date().toISOString(),
      }
    }
    throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    return {
      service: 'Google Search Console',
      status: 'failed',
      message: `Failed: ${String(error)}`,
      timestamp: new Date().toISOString(),
    }
  }
}

async function submitToBing(): Promise<SubmissionResult> {
  try {
    const bingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(bingUrl, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.ok || response.status === 204) {
      return {
        service: 'Bing Webmaster Tools',
        status: 'success',
        message: `Sitemap submitted successfully`,
        timestamp: new Date().toISOString(),
      }
    }
    throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    return {
      service: 'Bing Webmaster Tools',
      status: 'failed',
      message: `Failed: ${String(error)}`,
      timestamp: new Date().toISOString(),
    }
  }
}

async function submitIndexNow(): Promise<SubmissionResult> {
  if (!INDEX_NOW_KEY) {
    return {
      service: 'IndexNow (Bing/Yandex/Naver)',
      status: 'skipped',
      message: 'BING_INDEX_NOW_KEY not configured',
      timestamp: new Date().toISOString(),
    }
  }

  try {
    // IndexNow URLs to submit (top priority pages)
    const urlsToIndex = [
      `${SITE_URL}/macao`,
      `${SITE_URL}/macao/insights`,
      `${SITE_URL}/macao/certified-shops`,
      `${SITE_URL}/macao/report`,
      `${SITE_URL}/llms.txt`,
      `${SITE_URL}/sitemap.xml`,
    ]

    const payload = {
      host: new URL(SITE_URL).hostname,
      key: INDEX_NOW_KEY,
      keyLocation: `${SITE_URL}/indexnow.txt`,
      urlList: urlsToIndex,
    }

    // Submit to IndexNow (works for Bing, Yandex, Naver)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.ok || response.status === 202) {
      return {
        service: 'IndexNow (Bing/Yandex/Naver)',
        status: 'success',
        message: `${urlsToIndex.length} URLs submitted for immediate indexing`,
        timestamp: new Date().toISOString(),
      }
    }
    throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    return {
      service: 'IndexNow (Bing/Yandex/Naver)',
      status: 'failed',
      message: `Failed: ${String(error)}`,
      timestamp: new Date().toISOString(),
    }
  }
}

async function submitToYandex(): Promise<SubmissionResult> {
  try {
    const yandexUrl = `https://www.yandex.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(yandexUrl, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (response.ok || response.status === 204) {
      return {
        service: 'Yandex',
        status: 'success',
        message: `Sitemap submitted successfully`,
        timestamp: new Date().toISOString(),
      }
    }
    throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    return {
      service: 'Yandex',
      status: 'failed',
      message: `Failed: ${String(error)}`,
      timestamp: new Date().toISOString(),
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  console.log('🚀 Starting sitemap and IndexNow submission...')
  console.log(`📍 Site URL: ${SITE_URL}`)
  console.log(`📄 Sitemap: ${SITEMAP_URL}`)

  // Submit to all services in parallel
  const results = await Promise.all([
    submitToGoogle(),
    submitToBing(),
    submitIndexNow(),
    submitToYandex(),
  ])

  const duration = Date.now() - startTime
  const successCount = results.filter(r => r.status === 'success').length
  const failureCount = results.filter(r => r.status === 'failed').length

  const summary = {
    timestamp: new Date().toISOString(),
    sitemap_url: SITEMAP_URL,
    total_services: results.length,
    successful: successCount,
    failed: failureCount,
    duration_ms: duration,
    results: results,
  }

  console.log('✅ Submission completed:', JSON.stringify(summary, null, 2))

  return NextResponse.json(summary, {
    status: failureCount > 0 && successCount === 0 ? 500 : 200,
  })
}

export async function GET(request: NextRequest) {
  // Health check / last submission status
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    site_url: SITE_URL,
    sitemap_url: SITEMAP_URL,
    index_now_configured: !!INDEX_NOW_KEY,
    endpoint: '/api/submit-sitemap',
    method: 'POST',
  })
}
