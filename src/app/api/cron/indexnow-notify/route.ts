/**
 * POST /api/cron/indexnow-notify
 * 每天 UTC 06:30 自動運行，向 IndexNow 推送新 URLs
 * 通知 Bing/Yandex/Naver 立即索引新內容
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

async function getRecentUrls(): Promise<string[]> {
  const baseUrl = 'https://cloudpipe-macao-app.vercel.app';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !apiKey) {
      console.warn('⚠️ Supabase config missing, using fallback URLs');
      return [
        `${baseUrl}/macao`,
        `${baseUrl}/macao/insights`,
        `${baseUrl}/macao/report`,
      ];
    }

    // 獲取最近更新的 insights URLs
    const response = await fetch(
      `${supabaseUrl}/rest/v1/insights?status=eq.published&order=created_at.desc&limit=50&select=slug`,
      {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Supabase query failed: ${response.status}`);
      // 降級方案：返回主頁 URLs
      return [
        `${baseUrl}/macao`,
        `${baseUrl}/macao/insights`,
        `${baseUrl}/macao/report`,
      ];
    }

    const insights = await response.json();
    const urls = insights
      .filter((i: any) => i.slug)
      .map((i: any) => `${baseUrl}/macao/insights/${i.slug}`);

    // 至少包含主頁面
    return urls.length > 0 ? urls : [
      `${baseUrl}/macao`,
      `${baseUrl}/macao/insights`,
    ];
  } catch (err) {
    console.warn('⚠️ Failed to fetch recent URLs:', err);
    // 降級方案：返回主頁 URLs
    return [
      `${baseUrl}/macao`,
      `${baseUrl}/macao/insights`,
      `${baseUrl}/macao/report`,
    ];
  }
}

export async function POST(req: NextRequest) {
  // 驗證 Vercel Cron 秘鑰
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔔 [CRON] Starting IndexNow notifications...');

    const indexNowKey = process.env.INDEXNOW_KEY;
    const keyLocation = `https://cloudpipe-macao-app.vercel.app/indexnow-key-${indexNowKey}.txt`;

    if (!indexNowKey) {
      console.warn('⚠️ INDEXNOW_KEY not configured');
      return NextResponse.json({ warning: 'IndexNow key not configured' }, { status: 400 });
    }

    // 獲取最近 50 個 URLs
    const recentUrls = await getRecentUrls();

    // 構建 IndexNow 請求
    const payload: IndexNowPayload = {
      host: 'cloudpipe-macao-app.vercel.app',
      key: indexNowKey,
      keyLocation: keyLocation,
      urlList: recentUrls,
    };

    console.log(`📤 Sending ${recentUrls.length} URLs to IndexNow...`);

    // 發送到 Bing IndexNow
    let bingStatus = 0;
    let bingOk = false;
    try {
      const bingResponse = await fetch('https://www.bing-webmaster.com/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      bingStatus = bingResponse.status;
      bingOk = bingResponse.ok;
      console.log(`Bing IndexNow response: ${bingStatus}`);
    } catch (err) {
      console.warn('⚠️ Bing IndexNow failed:', err);
      bingStatus = 0;
    }

    // 發送到 Yandex
    let yandexStatus = 0;
    let yandexOk = false;
    try {
      const yandexResponse = await fetch('https://yandex.com/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      yandexStatus = yandexResponse.status;
      yandexOk = yandexResponse.ok;
      console.log(`Yandex IndexNow response: ${yandexStatus}`);
    } catch (err) {
      console.warn('⚠️ Yandex IndexNow failed:', err);
      yandexStatus = 0;
    }

    // Telegram 通知
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT && process.env.TELEGRAM_CHAT_ID) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔔 CloudPipe AEO: IndexNow notified\n\n📤 URLs sent: ${recentUrls.length}\n🎯 Bing: ${bingOk ? '✅' : '⚠️'} (${bingStatus}) | Yandex: ${yandexOk ? '✅' : '⚠️'} (${yandexStatus})\n\nTime: ${new Date().toISOString()}`,
            chat_id: process.env.TELEGRAM_CHAT_ID,
          }),
        });
      } catch (err) {
        console.warn('⚠️ Telegram notify failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      urlsSent: recentUrls.length,
      timestamp: new Date().toISOString(),
      bingStatus,
      yandexStatus,
    });
  } catch (error) {
    console.error('❌ [CRON] IndexNow notification failed:', error);

    // 錯誤通知
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT && process.env.TELEGRAM_CHAT_ID) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `❌ CloudPipe AEO: IndexNow FAILED\n${String(error).slice(0, 200)}`,
            chat_id: process.env.TELEGRAM_CHAT_ID,
          }),
        });
      } catch (err) {
        console.warn('⚠️ Telegram error notify failed:', err);
      }
    }

    return NextResponse.json({
      error: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
