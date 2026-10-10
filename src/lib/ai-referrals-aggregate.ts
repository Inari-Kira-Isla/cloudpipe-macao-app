import { detectAiReferrer } from './ai-referrers'

// Read-time re-verification of historical ai_referrals rows.
//
// Before the 2026-09-12 classifier fix, track-ai-referral stored bing.com (organic search)
// as 'copilot' and x.com as 'grok'. Those rows are still in the table (2026-10-08: 264 of 266
// 'copilot' rows in the 90-day window had referrer bing.com). The classifier fix only protects
// NEW rows, so aggregation re-checks the polluted buckets against the stored referrer_url and
// drops rows whose host is not a dedicated AI host.
export const REVERIFY_SOURCES = new Set(['copilot', 'grok', 'kagi'])

export interface ReferralRow {
  ts: string
  referrer_source?: string | null
  referrer_url?: string | null
  path?: string | null
  page_type?: string | null
  industry?: string | null
}

// Returns the source to count the row under, or null if the row is NOT an AI referral.
export function reverifyReferralSource(row: Pick<ReferralRow, 'referrer_source' | 'referrer_url'>): string | null {
  const src = row.referrer_source ?? 'other_ai'
  if (!REVERIFY_SOURCES.has(src)) return src
  if (!row.referrer_url) return src // nothing to verify against — keep (cannot prove it wrong)
  const detected = detectAiReferrer(row.referrer_url)
  return detected === src ? src : null
}

export interface SourceMeta { label: string; color: string; icon: string; unverified?: boolean; note?: string }

export interface AggregatedReferrals {
  total: number
  days: number
  since: string
  by_source: Record<string, { count: number; pages: Record<string, number>; industries: Record<string, number>; latest: string }>
  source_meta: Record<string, SourceMeta>
  top_pages: { path: string; visits: number; sources: string[] }[]
  daily: Record<string, Record<string, number>>
  recent: { ts: string; source: string; path: string; page_type: string | null | undefined; industry: string | null | undefined }[]
  excluded_non_ai: { total: number; by_source: Record<string, number>; reason: string }
}

export function aggregateAiReferrals(
  inputRows: ReferralRow[],
  days: number,
  since: string,
  sourceMeta: Record<string, SourceMeta>,
): AggregatedReferrals {
  const excludedBySource: Record<string, number> = {}
  const rows: (ReferralRow & { src: string })[] = []
  for (const r of inputRows) {
    const v = reverifyReferralSource(r)
    if (v === null) {
      const s = r.referrer_source ?? 'other_ai'
      excludedBySource[s] = (excludedBySource[s] ?? 0) + 1
      continue
    }
    rows.push({ ...r, src: v })
  }

  const bySource: AggregatedReferrals['by_source'] = {}
  const topPages: Record<string, { visits: number; sources: string[] }> = {}
  const daily: Record<string, Record<string, number>> = {}
  for (const row of rows) {
    const path = row.path ?? ''
    if (!bySource[row.src]) bySource[row.src] = { count: 0, pages: {}, industries: {}, latest: row.ts }
    const b = bySource[row.src]
    b.count++
    b.pages[path] = (b.pages[path] ?? 0) + 1
    if (row.industry) b.industries[row.industry] = (b.industries[row.industry] ?? 0) + 1
    if (row.ts > b.latest) b.latest = row.ts

    if (!topPages[path]) topPages[path] = { visits: 0, sources: [] }
    topPages[path].visits++
    if (!topPages[path].sources.includes(row.src)) topPages[path].sources.push(row.src)

    const day = row.ts.slice(0, 10)
    if (!daily[day]) daily[day] = {}
    daily[day][row.src] = (daily[day][row.src] ?? 0) + 1
  }

  const sortedPages = Object.entries(topPages)
    .sort((a, b) => b[1].visits - a[1].visits)
    .slice(0, 20)
    .map(([path, d]) => ({ path, ...d }))

  const excludedTotal = Object.values(excludedBySource).reduce((s, n) => s + n, 0)
  return {
    total: rows.length,
    days,
    since,
    by_source: bySource,
    source_meta: sourceMeta,
    top_pages: sortedPages,
    daily,
    recent: rows.slice(0, 50).map(r => ({
      ts: r.ts, source: r.src, path: r.path ?? '', page_type: r.page_type, industry: r.industry,
    })),
    excluded_non_ai: {
      total: excludedTotal,
      by_source: excludedBySource,
      reason: '按 referrer_url 主機重新驗證：copilot／grok／kagi 桶內主機唔係專屬 AI 主機（例如 bing.com 自然搜尋、x.com 一般瀏覽）嘅記錄已排除，唔計入 AI 推介',
    },
  }
}
