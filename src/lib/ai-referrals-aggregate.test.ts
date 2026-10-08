import { aggregateAiReferrals, reverifyReferralSource, type ReferralRow, type SourceMeta } from './ai-referrals-aggregate'
import { assertEqual, finish } from './test-helpers'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SOURCE_LABELS } from './ai-referral-labels'

const meta: Record<string, SourceMeta> = { copilot: { label: 'Copilot', color: '#000', icon: 'c' } }

// bing.com rows stored as 'copilot' by the pre-09-12 classifier must NOT count as AI referrals
assertEqual(reverifyReferralSource({ referrer_source: 'copilot', referrer_url: 'https://www.bing.com/' }), null, 'copilot row from www.bing.com -> excluded')
assertEqual(reverifyReferralSource({ referrer_source: 'copilot', referrer_url: 'https://bing.com/search?q=x' }), null, 'copilot row from bing.com -> excluded')
assertEqual(reverifyReferralSource({ referrer_source: 'copilot', referrer_url: 'https://copilot.microsoft.com/' }), 'copilot', 'copilot row from copilot.microsoft.com -> kept')
assertEqual(reverifyReferralSource({ referrer_source: 'grok', referrer_url: 'https://x.com/home' }), null, 'grok row from x.com -> excluded')
assertEqual(reverifyReferralSource({ referrer_source: 'grok', referrer_url: 'https://grok.com/' }), 'grok', 'grok row from grok.com -> kept')
assertEqual(reverifyReferralSource({ referrer_source: 'copilot', referrer_url: null }), 'copilot', 'no referrer_url -> cannot disprove, kept')
assertEqual(reverifyReferralSource({ referrer_source: 'perplexity', referrer_url: 'https://www.perplexity.ai/' }), 'perplexity', 'non-polluted bucket untouched')
assertEqual(reverifyReferralSource({ referrer_source: 'chatgpt', referrer_url: 'https://weird.example/' }), 'chatgpt', 'only polluted buckets are re-verified')

// Mirrors the 2026-10-08 production shape: 266 copilot rows of which 264 bing.com, plus 15 other AI
const rows: ReferralRow[] = []
for (let i = 0; i < 264; i++) rows.push({ ts: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}T00:00:00Z`, referrer_source: 'copilot', referrer_url: 'https://www.bing.com/', path: '/a' })
for (let i = 0; i < 2; i++) rows.push({ ts: '2026-10-01T00:00:00Z', referrer_source: 'copilot', referrer_url: 'https://copilot.microsoft.com/', path: '/b' })
for (let i = 0; i < 7; i++) rows.push({ ts: '2026-10-02T00:00:00Z', referrer_source: 'chatgpt', referrer_url: 'https://chatgpt.com/', path: '/c' })
for (let i = 0; i < 5; i++) rows.push({ ts: '2026-10-03T00:00:00Z', referrer_source: 'perplexity', referrer_url: 'https://www.perplexity.ai/', path: '/c' })
for (let i = 0; i < 3; i++) rows.push({ ts: '2026-10-04T00:00:00Z', referrer_source: 'gemini', referrer_url: 'https://gemini.google.com/', path: '/d' })
const agg = aggregateAiReferrals(rows, 90, '2026-07-10T00:00:00Z', meta)
assertEqual(rows.length, 281, 'fixture mirrors the 281 rows of the old 90-day view')
assertEqual(agg.total, 17, 'AI referral total after re-verification = 17 (was 281)')
assertEqual(agg.by_source.copilot?.count, 2, 'copilot bucket = 2 real Copilot rows')
assertEqual(agg.excluded_non_ai.total, 264, 'excluded_non_ai.total = 264')
assertEqual(agg.excluded_non_ai.by_source, { copilot: 264 }, 'excluded_non_ai.by_source')
assertEqual(agg.total + agg.excluded_non_ai.total, rows.length, 'nothing silently lost: kept + excluded = input')
assertEqual(Object.values(agg.by_source).reduce((s, b) => s + b.count, 0), agg.total, 'by_source sums to total')
assertEqual(agg.recent.every(r => r.source !== 'copilot' || r.path === '/b'), true, 'recent list has no bing-derived copilot rows')

// 30 / 90 / 全部 must use the SAME re-verification: apply it to the 30-day subset of the same fixture
// (the old 30-day view read a precomputed Blob that skipped it and showed 138 vs 18 for 90 days).
const rows30 = rows.filter(r => r.ts >= '2026-09-10T00:00:00Z')
const agg30 = aggregateAiReferrals(rows30, 30, '2026-09-10T00:00:00Z', meta)
assertEqual(agg30.by_source.copilot?.count, 2, '30-day view: only genuine copilot.microsoft.com rows remain')
assertEqual(agg30.total <= agg.total, true, '30-day total never exceeds 90-day total')
assertEqual(agg30.excluded_non_ai.total > 0, true, '30-day view also reports the excluded bing.com rows')
const aggAll = aggregateAiReferrals(rows, 3650, '2016-01-01T00:00:00Z', meta)
assertEqual(aggAll.total, agg.total, '全部 view total == 90-day total when all rows fall in 90 days')
assertEqual(aggAll.excluded_non_ai.total, agg.excluded_non_ai.total, '全部 view excluded count == 90-day')
// ── parity with the offline Python precompute (scripts/precompute_ai_referrals_v2.py) on SHARED fixtures ──
const fx = JSON.parse(readFileSync(resolve('scripts/fixtures/ai-referrals-rows.json'), 'utf8')) as ReferralRow[]
const exp = JSON.parse(readFileSync(resolve('scripts/fixtures/ai-referrals-expected.json'), 'utf8'))
const fxAgg = aggregateAiReferrals(fx, 3650, '2016-01-01T00:00:00Z', SOURCE_LABELS)
assertEqual(fxAgg.total, exp.total, 'TS aggregate total == Python precompute total (shared fixture)')
assertEqual(Object.fromEntries(Object.entries(fxAgg.by_source).map(([k, v]) => [k, v.count])), exp.by_source_counts, 'TS by_source == Python by_source')
assertEqual(fxAgg.excluded_non_ai.total, exp.excluded_total, 'TS excluded total == Python excluded total')
assertEqual(fxAgg.excluded_non_ai.by_source, exp.excluded_by_source, 'TS excluded by_source == Python')
assertEqual(SOURCE_LABELS, exp.source_meta, 'Python-embedded source_meta == TS SOURCE_LABELS')
finish()
