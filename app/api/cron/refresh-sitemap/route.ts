/**
 * POST /api/cron/refresh-sitemap
 * 每天 UTC 06:00 自动运行，刷新 sitemap.xml
 * 响应爬虫对新内容的需求
 */

import { execSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // 60s timeout for long-running script

export async function POST(req: NextRequest) {
  // 验证 Vercel Cron 秘钥
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('🔄 [CRON] Starting sitemap refresh...');

    // 运行 sitemap 生成脚本
    const result = execSync(
      'npm run generate-sitemap',
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 30000,
      }
    );

    console.log('✅ [CRON] Sitemap refreshed:', result.slice(0, 200));

    // 记录日志到 Telegram（可选）
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `✅ CloudPipe AEO: Sitemap refreshed at ${new Date().toISOString()}\n\nSitemap: https://cloudpipe-macao-app.vercel.app/sitemap.xml`,
            chat_id: process.env.TELEGRAM_CHAT_ID,
          }),
        });
      } catch (err) {
        console.warn('⚠️ Telegram notify failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Sitemap refreshed successfully',
    });
  } catch (error) {
    console.error('❌ [CRON] Sitemap refresh failed:', error);

    // 错误通知
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `❌ CloudPipe AEO: Sitemap refresh FAILED\n${String(error).slice(0, 200)}`,
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
