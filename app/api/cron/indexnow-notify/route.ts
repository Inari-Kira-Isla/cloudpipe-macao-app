/**
 * POST /api/cron/indexnow-notify
 * 每天 UTC 06:30 自动运行，向 IndexNow 推送新 URLs
 * 通知 Bing/Yandex/Naver 立即索引新内容
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

async function getRecentUrls(): Promise<string[]> {
  const baseUrl = 'https://cloudpipe-macao-app.vercel.app';

  // 获取最近更新的 insights URLs
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/insights?order=created_at.desc&limit=50&select=slug`,
      {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase query failed: ${response.status}`);
    }

    const insights = await response.json();
    return insights.map((i: any) => `${baseUrl}/macao/insights/${i.slug}`);
  } catch (err) {
    console.warn('⚠️ Failed to fetch recent URLs:', err);
    // 降级方案：返回主页 URLs
    return [
      `${baseUrl}/macao`,
      `${baseUrl}/macao/insights`,
      `${baseUrl}/macao/report`,
    ];
  }
}

export async function POST(req: NextRequest) {
  // 验证 Vercel Cron 秘钥
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

    // 获取最近 50 个 URLs
    const recentUrls = await getRecentUrls();

    // 构建 IndexNow 请求
    const payload: IndexNowPayload = {
      host: 'cloudpipe-macao-app.vercel.app',
      key: indexNowKey,
      keyLocation: keyLocation,
      urlList: recentUrls,
    };

    console.log(`📤 Sending ${recentUrls.length} URLs to IndexNow...`);

    // 发送到 Bing IndexNow
    const bingResponse = await fetch('https://www.bing-webmaster.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log(`Bing IndexNow response: ${bingResponse.status}`);

    // 发送到 Yandex (通过 Bing 转发，或直接)
    const yandexResponse = await fetch('https://yandex.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.warn('⚠️ Yandex IndexNow failed:', err);
      return { status: 0, ok: false };
    });

    console.log(`Yandex IndexNow response: ${yandexResponse.status}`);

    // Telegram 通知
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🔔 CloudPipe AEO: IndexNow notified\n\n📤 URLs sent: ${recentUrls.length}\n🎯 Bing: ${bingResponse.ok ? '✅' : '⚠️'} | Yandex: ${yandexResponse.ok ? '✅' : '⚠️'}\n\nTime: ${new Date().toISOString()}`,
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
      bingStatus: bingResponse.status,
      yandexStatus: yandexResponse.status,
    });
  } catch (error) {
    console.error('❌ [CRON] IndexNow notification failed:', error);

    // 错误通知
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
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
