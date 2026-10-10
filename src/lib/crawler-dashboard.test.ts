// Run: npm run test:lib   (tsc -> node, zero framework deps; see scripts/run-lib-tests.mjs)
import {
  aggregateSeries, alltimeToSummaryShape, barLimit, chooseGranularity, classifyBot,
  createRequestGuard, dailyTotalGap, isStrictLlmBot, summarizeBotCategories, weekStart,
  type AlltimeLike, type SeriesPoint,
} from './crawler-dashboard'
import { assertEqual, assertTrue, finish } from './test-helpers'

async function main() {
  // ── bot classification: DataForSeoBot / HeadlessFetcher are NOT AI engines ──
  assertEqual(classifyBot('ClaudeBot'), 'ai_engine', 'ClaudeBot -> ai_engine')
  assertEqual(classifyBot('GPTBot'), 'ai_engine', 'GPTBot -> ai_engine')
  assertEqual(classifyBot('PerplexityBot'), 'ai_engine', 'PerplexityBot -> ai_engine')
  assertEqual(classifyBot('DataForSeoBot'), 'seo_tool', 'DataForSeoBot -> seo_tool (not AI)')
  assertEqual(classifyBot('HeadlessFetcher'), 'seo_tool', 'HeadlessFetcher -> seo_tool (not AI)')
  assertEqual(classifyBot('ScriptBot'), 'seo_tool', 'ScriptBot -> seo_tool')
  assertEqual(classifyBot('Googlebot'), 'search_engine', 'Googlebot -> search_engine')
  assertEqual(classifyBot('Bingbot'), 'search_engine', 'Bingbot -> search_engine')
  assertEqual(classifyBot('SomeNewBot'), 'seo_tool', 'unknown bot defaults to seo_tool, never silently AI')
  assertEqual(classifyBot('clAudeBot'), 'ai_engine', 'classification is case-insensitive')
  assertEqual(isStrictLlmBot('Amazonbot'), false, 'Amazonbot is not strict-LLM')
  assertEqual(isStrictLlmBot('GPTBot'), true, 'GPTBot is strict-LLM')

  // ── full classification table (every bot seen in production; a reclassification must turn this red) ──
  const TABLE: [string, string][] = [
    ['ClaudeBot', 'ai_engine'], ['Claude-Web', 'ai_engine'], ['anthropic-ai', 'ai_engine'], ['GPTBot', 'ai_engine'],
    ['OAI-SearchBot', 'ai_engine'], ['ChatGPT-User', 'ai_engine'], ['PerplexityBot', 'ai_engine'],
    ['meta-externalagent', 'ai_engine'], ['Bytespider', 'ai_engine'], ['Amazonbot', 'ai_engine'],
    ['Applebot-Extended', 'ai_engine'], ['YouBot', 'ai_engine'], ['DuckAssistBot', 'ai_engine'], ['CCBot', 'ai_engine'],
    ['Google-Extended', 'ai_engine'], ['cohere-ai', 'ai_engine'],
    ['Googlebot', 'search_engine'], ['Bingbot', 'search_engine'], ['YandexBot', 'search_engine'],
    ['PetalBot', 'search_engine'], ['Sogou', 'search_engine'], ['DuckDuckBot', 'search_engine'],
    ['Applebot', 'search_engine'], // 2026-10-08: Apple's search/Siri crawler, NOT an AI engine
    ['facebookexternalhit', 'link_preview'], // 2026-10-08: link-preview unfurl, not an SEO tool
    ['Twitterbot', 'link_preview'], ['LinkedInBot', 'link_preview'],
    ['HeadlessFetcher', 'seo_tool'], ['DataForSeoBot', 'seo_tool'], ['ScriptBot', 'seo_tool'], ['GoBot', 'seo_tool'],
    ['PythonBot', 'seo_tool'], ['UnknownBot', 'seo_tool'], ['cloudpipe-bot', 'seo_tool'],
  ]
  for (const [name, cat] of TABLE) assertEqual(classifyBot(name), cat, `classifyBot(${name}) -> ${cat}`)
  // strict-LLM membership table: exactly these 10 (bot_name), nothing else
  const STRICT: string[] = ['ClaudeBot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'meta-externalagent', 'Bytespider', 'PerplexityBot', 'YouBot', 'DuckAssistBot', 'CCBot']
  for (const n of STRICT) assertEqual(isStrictLlmBot(n), true, `${n} is strict-LLM`)
  for (const n of ['Amazonbot', 'Applebot', 'Applebot-Extended', 'Claude-Web', 'Googlebot', 'PetalBot', 'HeadlessFetcher', 'facebookexternalhit', 'ScriptBot'])
    assertEqual(isStrictLlmBot(n), false, `${n} is NOT strict-LLM`)
  // one definition for every view: strict count is derived from bot_name and is a subset of ai_engine for this fixture
  const defFixture = { ClaudeBot: { count: 100, owner: 'Anthropic' }, Amazonbot: { count: 50, owner: 'Amazon' }, Applebot: { count: 30, owner: 'Apple' }, facebookexternalhit: { count: 5, owner: 'Meta' } }
  const defSum = summarizeBotCategories(defFixture)
  assertEqual(defSum.strictLlmCount, 100, 'strict count = ClaudeBot only (Amazonbot/Applebot excluded)')
  assertEqual(defSum.byCategory.ai_engine.count, 150, 'ai_engine = ClaudeBot + Amazonbot (Applebot moved to search)')
  assertEqual(defSum.byCategory.search_engine.count, 30, 'Applebot counted under search_engine')
  assertEqual(defSum.byCategory.link_preview.count, 5, 'facebookexternalhit counted under link_preview')

  // ── daily-vs-total reconciliation (90-day chart 1,801,442 vs KPI 1,892,951 case) ──
  const g = dailyTotalGap([{ total: 1_801_442 }], 1_892_951)
  assertEqual(g?.gap, 91_509, 'dailyTotalGap reports the 91,509 shortfall')
  assertEqual(dailyTotalGap([{ total: 990 }, { total: 10 }], 1000), null, 'exact match -> no note')
  assertEqual(dailyTotalGap([{ total: 985 }], 1000), null, '1.5% gap is below the 2% threshold -> no note')
  assertEqual(dailyTotalGap([], 1000), null, 'no daily data -> no note')

  // 90-day snapshot (2026-10-08 Blob) subset: shares must match hand-computed numbers
  const bots = {
    HeadlessFetcher: { count: 458698, owner: 'HeadlessFetcher' },
    ClaudeBot: { count: 333800, owner: 'Anthropic' },
    GPTBot: { count: 203027, owner: 'OpenAI' },
    Googlebot: { count: 46787, owner: 'Google' },
    DataForSeoBot: { count: 21919, owner: 'DataForSeo' },
  }
  const sum = summarizeBotCategories(bots)
  assertEqual(sum.total, 458698 + 333800 + 203027 + 46787 + 21919, 'category total = sum of bots')
  assertEqual(sum.byCategory.ai_engine.count, 333800 + 203027, 'ai_engine count excludes HeadlessFetcher/DataForSeo')
  assertEqual(sum.byCategory.seo_tool.count, 458698 + 21919, 'seo_tool = HeadlessFetcher + DataForSeoBot')
  assertEqual(sum.byCategory.search_engine.count, 46787, 'search_engine = Googlebot')
  assertEqual(sum.byCategory.ai_engine.kinds, 2, 'ai_engine kinds = 2')
  const pctSum = sum.byCategory.ai_engine.pct + sum.byCategory.search_engine.pct + sum.byCategory.seo_tool.pct
  assertTrue(Math.abs(pctSum - 100) < 1e-9, 'category shares add up to 100%')
  assertEqual(sum.strictLlmCount, 333800 + 203027, 'strictLlmCount')
  assertEqual(summarizeBotCategories({}).total, 0, 'empty bots -> total 0, no NaN')

  // ── granularity thresholds ──
  assertEqual(chooseGranularity(30), 'day', '30 points -> day')
  assertEqual(chooseGranularity(90), 'day', '90 points -> day (boundary)')
  assertEqual(chooseGranularity(91), 'week', '91 points -> week')
  assertEqual(chooseGranularity(365), 'week', '365 points -> week (boundary)')
  assertEqual(chooseGranularity(366), 'month', '366 points -> month')

  // ── bar cap: old code capped at 30 even for 90 days ──
  assertEqual(barLimit(1), 7, 'barLimit(1)=7')
  assertEqual(barLimit(7), 7, 'barLimit(7)=7')
  assertEqual(barLimit(14), 14, 'barLimit(14)=14')
  assertEqual(barLimit(30), 30, 'barLimit(30)=30')
  assertEqual(barLimit(31), 30, 'barLimit(31)=30 (30-day window carries 31 points; unchanged)')
  assertEqual(barLimit(90), 90, 'barLimit(90)=90 (was 30 — the bug)')
  assertEqual(barLimit(212), 212, 'barLimit(212)=212')

  // ── week / month aggregation ──
  assertEqual(weekStart('2026-10-08'), '2026-10-05', '2026-10-08 (Thu) -> Monday 10-05')
  assertEqual(weekStart('2026-10-05'), '2026-10-05', 'Monday maps to itself')
  assertEqual(weekStart('2026-10-11'), '2026-10-05', 'Sunday maps to previous Monday')
  assertEqual(weekStart('2026-01-01'), '2025-12-29', 'week bucket crosses year boundary')

  // 2026-03-08 (Sun) .. 2026-10-07 inclusive, one point per day with value (i+1)
  const pts: SeriesPoint[] = []
  const t0 = Date.UTC(2026, 2, 8)
  for (let i = 0; i < 214; i++) {
    pts.push({ date: new Date(t0 + i * 86400000).toISOString().slice(0, 10), total: i + 1, by_owner: { A: i + 1 } })
  }
  const grand = pts.reduce((s, p) => s + p.total, 0)
  const wk = aggregateSeries(pts, 'week')
  assertEqual(wk.reduce((s, p) => s + p.total, 0), grand, 'weekly aggregation preserves grand total')
  assertEqual(wk.reduce((s, p) => s + (p.by_owner?.A || 0), 0), grand, 'weekly aggregation preserves by_owner total')
  assertEqual(wk.reduce((s, p) => s + p.span, 0), 214, 'weekly spans cover every day exactly once')
  assertEqual(wk[0].date, '2026-03-02', 'first week bucket starts Monday 03-02')
  assertEqual(wk[0].partial, true, 'first week (only Sun 03-08 present) is partial')
  assertEqual(wk[0].total, 1, 'first week holds only day 1')
  assertEqual(wk[1].partial, false, 'middle week is complete')
  assertEqual(wk[1].span, 7, 'middle week spans 7 days')
  assertEqual(wk.length, 32, '214 days from a Sunday -> 32 week buckets')
  const mo = aggregateSeries(pts, 'month')
  assertEqual(mo.reduce((s, p) => s + p.total, 0), grand, 'monthly aggregation preserves grand total')
  assertEqual(mo.map(m => m.date).join(','), '2026-03,2026-04,2026-05,2026-06,2026-07,2026-08,2026-09,2026-10', 'month keys')
  assertEqual(mo[1].span, 30, 'April spans 30 days')
  assertEqual(mo[0].partial, true, 'March partial (starts 03-08)')
  assertEqual(mo[7].partial, true, 'October partial (ends 10-07)')
  const unsorted = aggregateSeries([pts[5], pts[0], pts[3]], 'day')
  assertEqual(unsorted.map(p => p.date), [pts[0].date, pts[3].date, pts[5].date], 'day mode sorts by date')
  assertEqual(aggregateSeries([], 'week').length, 0, 'empty series -> empty')

  // ── alltime -> summary shape ──
  const at: AlltimeLike = {
    meta: { rows_total: 100, range: { min_ts: 'a', max_ts: 'b' }, totals: { all: 100, identified_ai_engines: 60, excluding_headless: 80, strict_llm_engines_ua_named: 50 } },
    bots_alltime: {
      ai_engines: [{ bot_name: 'ClaudeBot', bot_owner: 'Anthropic', count: 60 }],
      search_and_other: [{ bot_name: 'HeadlessFetcher', bot_owner: 'HeadlessFetcher', count: 20 }, { bot_name: 'Googlebot', bot_owner: 'Google', count: 20 }],
    },
    page_types: [{ page_type: 'merchant', count: 70 }],
    daily_totals: [{ date: '2026-03-08', count: 100 }],
  }
  let shape = alltimeToSummaryShape(at)
  assertEqual(shape.total_visits, 100, 'summary total_visits = totals.all')
  assertEqual(shape.unique_bots, 3, 'unique_bots counts both bot lists')
  assertEqual(shape.daily_basis, 'utc', 'no hkt array -> utc basis')
  shape = alltimeToSummaryShape({ ...at, daily_totals_hkt: [{ date: '2026-03-09', count: 100, by_owner: { Anthropic: 60 } }] })
  assertEqual(shape.daily_basis, 'hkt', 'hkt array present -> hkt basis')
  assertEqual(shape.daily[0].date, '2026-03-09', 'hkt daily preferred over utc daily')
  assertEqual(summarizeBotCategories(shape.bots).byCategory.ai_engine.count, 60, 'all-time bots flow through classifier')

  // ── request guard: out-of-order responses can never overwrite newer data ──
  const guard = createRequestGuard()
  let committed = ''
  const run = async (label: string, delayMs: number, t: ReturnType<typeof guard.begin>) => {
    await new Promise(r => setTimeout(r, delayMs))
    if (!t.isCurrent()) return
    committed = label
  }
  const slow = guard.begin() // "90 天" — slow
  const slowRun = run('90d', 40, slow)
  const fast = guard.begin() // user switches to "今天" — fast
  const fastRun = run('1d', 5, fast)
  assertEqual(slow.signal.aborted, true, 'starting a new request aborts the previous AbortController')
  assertEqual(fast.signal.aborted, false, 'newest request is not aborted')
  await Promise.all([slowRun, fastRun])
  assertEqual(committed, '1d', 'slow stale response did not overwrite the newest data')
  assertEqual(slow.isCurrent(), false, 'old ticket no longer current')
  assertEqual(fast.isCurrent(), true, 'new ticket current')
  guard.abort()
  assertEqual(fast.isCurrent(), false, 'abort() (unmount) invalidates the in-flight ticket')
  assertEqual(fast.signal.aborted, true, 'abort() aborts the in-flight signal')

  finish()
}
main()
