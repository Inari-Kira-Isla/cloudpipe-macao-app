import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Top 10 AI 引流搜尋詞 API
// 聚合 ai_referrals.search_query，回傳過去 30 天最多點擊的搜尋詞
export async function GET() {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 拉取近 30 天有 search_query 的記錄（限 500 筆，避免超時）
  const { data: topQueries, error: qErr } = await supabase
    .from('ai_referrals')
    .select('search_query, referrer_source, ai_platform, ts')
    .not('search_query', 'is', null)
    .neq('search_query', '')
    .gte('ts', since)
    .order('ts', { ascending: false })
    .limit(500)

  // 平台分佈（全部記錄，含無搜尋詞的）
  const { data: byPlatform, error: pErr } = await supabase
    .from('ai_referrals')
    .select('referrer_source, ai_platform')
    .gte('ts', since)

  if (qErr || pErr) {
    return NextResponse.json(
      { error: qErr?.message ?? pErr?.message },
      { status: 500 }
    )
  }

  // 聚合 search_query
  const queryCount: Record<string, { count: number; platforms: string[]; latest: string }> = {}
  for (const row of topQueries ?? []) {
    const q = row.search_query as string
    if (!q) continue
    if (!queryCount[q]) queryCount[q] = { count: 0, platforms: [], latest: row.ts as string }
    queryCount[q].count++
    const platform = (row.ai_platform ?? row.referrer_source ?? 'other') as string
    if (!queryCount[q].platforms.includes(platform)) {
      queryCount[q].platforms.push(platform)
    }
    if ((row.ts as string) > queryCount[q].latest) {
      queryCount[q].latest = row.ts as string
    }
  }

  const topQueryList = Object.entries(queryCount)
    .map(([query, info]) => ({ query, ...info }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 平台計數
  const platformCount: Record<string, number> = {}
  for (const row of byPlatform ?? []) {
    const p = (row.ai_platform ?? row.referrer_source ?? 'other') as string
    platformCount[p] = (platformCount[p] ?? 0) + 1
  }

  const total = byPlatform?.length ?? 0

  return NextResponse.json({
    topQueries: topQueryList,
    byPlatform: platformCount,
    total,
    hasData: (topQueries?.length ?? 0) > 0,
    since,
  })
}
