/**
 * POST /api/cron/aeo-monitor
 * 每 6 小时自动运行，监控爬虫访问趋势
 * 检测異常、追蹤 Claude/Perplexity/OpenAI 活動
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

interface CrawlerStats {
  today_total: number;
  yesterday_total: number;
  by_bot: Record<string, number>;
  top_industry: string;
  recent_volume: number; // 过去1小时
}

async function getCrawlerStats(): Promise<CrawlerStats> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Supabase config missing');
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();

  try {
    // 今日总数
    const todayRes = await fetch(
      `${baseUrl}/rest/v1/crawler_visits?ts=gte.${today}T00:00:00Z&select=count()`,
      { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } }
    );
    const todayCount = todayRes.ok ? parseInt(todayRes.headers.get('content-range') || '0', 10) : 0;

    // 昨日总数
    const yesterdayRes = await fetch(
      `${baseUrl}/rest/v1/crawler_visits?ts=gte.${yesterday}T00:00:00Z&ts=lt.${today}T00:00:00Z&select=count()`,
      { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } }
    );
    const yesterdayCount = yesterdayRes.ok ? parseInt(yesterdayRes.headers.get('content-range') || '0', 10) : 0;

    // 过去1小时
    const recentRes = await fetch(
      `${baseUrl}/rest/v1/crawler_visits?ts=gte.${oneHourAgo}&select=count()`,
      { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } }
    );
    const recentCount = recentRes.ok ? parseInt(recentRes.headers.get('content-range') || '0', 10) : 0;

    // 按爬虫统计 (仅获取前5名)
    const botsRes = await fetch(
      `${baseUrl}/rest/v1/crawler_visits?ts=gte.${today}T00:00:00Z&select=bot_owner,count&order=count.desc&limit=5`,
      { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } }
    );

    const bots: Record<string, number> = {};
    if (botsRes.ok) {
      const botList = await botsRes.json();
      for (const bot of botList) {
        bots[bot.bot_owner || 'unknown'] = bot.count || 0;
      }
    }

    // 按行业统计
    const industryRes = await fetch(
      `${baseUrl}/rest/v1/crawler_visits?ts=gte.${today}T00:00:00Z&select=industry,count&order=count.desc&limit=1`,
      { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } }
    );

    let topIndustry = 'unknown';
    if (industryRes.ok) {
      const industries = await industryRes.json();
      if (industries.length > 0) {
        topIndustry = industries[0].industry || 'unknown';
      }
    }

    return {
      today_total: todayCount,
      yesterday_total: yesterdayCount,
      by_bot: bots,
      top_industry: topIndustry,
      recent_volume: recentCount,
    };
  } catch (error) {
    console.error('Failed to fetch crawler stats:', error);
    return {
      today_total: 0,
      yesterday_total: 0,
      by_bot: {},
      top_industry: 'error',
      recent_volume: 0,
    };
  }
}

export async function POST(req: NextRequest) {
  // 验证 Vercel Cron 秘钥
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('📊 [CRON] Starting AEO monitor...');

    const stats = await getCrawlerStats();

    // 检测异常
    const dayOverDay = stats.yesterday_total > 0
      ? ((stats.today_total - stats.yesterday_total) / stats.yesterday_total * 100).toFixed(1)
      : 'N/A';

    const anomaly = stats.today_total < stats.yesterday_total * 0.5
      ? '⚠️ ALERT: Crawler volume dropped >50%'
      : stats.today_total > stats.yesterday_total * 2
      ? '📈 SPIKE: Crawler volume doubled'
      : '✅ Normal';

    console.log(`Today: ${stats.today_total} | Yesterday: ${stats.yesterday_total} | Change: ${dayOverDay}%`);
    console.log(`Recent (1h): ${stats.recent_volume} | Top industry: ${stats.top_industry}`);
    console.log(`Anomaly: ${anomaly}`);

    // Telegram 监控报告
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
      try {
        const botList = Object.entries(stats.by_bot)
          .map(([bot, count]) => `${bot}: ${count}`)
          .join('\n');

        const message = `📊 CloudPipe AEO Monitor (6h interval)\n\n` +
          `📈 Today: ${stats.today_total} visits\n` +
          `📉 Yesterday: ${stats.yesterday_total} visits\n` +
          `${dayOverDay !== 'N/A' ? `📊 Change: ${dayOverDay}%\n` : ''}` +
          `⏱️ Recent (1h): ${stats.recent_volume}\n\n` +
          `🤖 Top Bots:\n${botList || 'No data'}\n\n` +
          `🎯 Top Industry: ${stats.top_industry}\n` +
          `${anomaly}\n\n` +
          `Time: ${new Date().toISOString()}`;

        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message,
            chat_id: process.env.TELEGRAM_CHAT_ID,
          }),
        });
      } catch (err) {
        console.warn('⚠️ Telegram notify failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      anomaly,
      dayOverDay: dayOverDay === 'N/A' ? null : parseFloat(dayOverDay as string),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [CRON] AEO monitor failed:', error);

    // 错误通知
    if (process.env.TELEGRAM_NOTIFY_ENDPOINT) {
      try {
        await fetch(process.env.TELEGRAM_NOTIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `❌ CloudPipe AEO Monitor FAILED\n${String(error).slice(0, 200)}`,
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
