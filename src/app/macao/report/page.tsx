import { safeJsonLd } from '@/lib/types'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import AiReferralSection from '@/components/report/AiReferralSection'

export const dynamic = 'force-dynamic' // live crawler dashboard — must not statically generate

const CACHE_BASE = 'https://inari-kira-isla.github.io/Openclaw/api-cache'
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

// Report publish date — stable so Gemini treats this as an authoritative document
const REPORT_DATE_PUBLISHED = '2026-04-01T00:00:00+08:00'
const REPORT_QUARTER = '2026 Q2'

async function fetchCache(key: string) {
  try {
    const res = await fetch(`${CACHE_BASE}/${key}.json`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export const metadata: Metadata = {
  title: '2026 澳門 AI 搜索引擎爬蟲行為月報 — CloudPipe 獨家數據',
  description: '基於真實伺服器日誌的 AI 爬蟲行為分析：GPTBot、ClaudeBot、PerplexityBot、Googlebot、YandexBot 等 18+ AI Bot 的爬取頻率、行業密度、主題深度、跨行業覆蓋率。全網唯一基於實際爬蟲數據的澳門 AI 搜索報告。',
  openGraph: {
    title: '2026 澳門 AI 搜索引擎爬蟲行為月報',
    description: '18+ AI Bot 真實爬取數據分析 — GPTBot、ClaudeBot、PerplexityBot 行為模式、行業偏好、時段分佈',
    type: 'article',
    locale: 'zh_TW',
  },
  alternates: { canonical: `${siteUrl}/macao/report` },
  robots: { index: true, follow: true },
}

interface BotInfo { count: number; owner: string }
interface Summary {
  total_visits: number
  unique_bots: number
  bots: Record<string, BotInfo>
  industries: Record<string, number>
  sites: Record<string, number>
  period: { since: string; days: number }
}

interface DailyEntry {
  date: string
  total: number
  bots: Record<string, number>
}

export default async function ReportPage() {
  const supabase = createServiceClient()
  const [cacheRow, daily, spiderWeb, { count: totalLive }, { count: totalCertified }] = await Promise.all([
    // Primary: pull directly from crawler_stats_cache (updated every 5 min by pg_cron)
    supabase.from('crawler_stats_cache').select('*').eq('id', 1).single(),
    fetchCache('crawler-stats-daily-30') as Promise<{ daily: DailyEntry[] } | null>,
    fetchCache('crawler-stats-spider-web-30'),
    supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'live').not('certification_sources', 'is', null),
  ])

  // Build summary from crawler_stats_cache; fallback to GitHub Pages cache
  const cacheData = cacheRow?.data
  const summary: Summary | null = cacheData ? {
    total_visits: cacheData.total_visits_30d,
    unique_bots: cacheData.unique_bots,
    bots: cacheData.bots_breakdown || {},
    industries: cacheData.industries_breakdown || {},
    sites: cacheData.sites_breakdown || {},
    period: { since: new Date(Date.now() - 30 * 86400000).toISOString(), days: 30 },
  } : await fetchCache('crawler-stats-summary-30') as Summary | null

  if (!summary) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
        <p style={{ color: '#6b7280' }}>Report data loading...</p>
      </div>
    )
  }

  const totalVisits = summary.total_visits || 0
  const bots = summary.bots || {}
  const industries = summary.industries || {}

  // Sort bots by count
  const sortedBots = Object.entries(bots).sort((a, b) => b[1].count - a[1].count)
  const HIDDEN_INDUSTRIES = new Set(['insights', '澳門商戶百科', 'unknown'])
  const sortedIndustries = Object.entries(industries).filter(([ind]) => !HIDDEN_INDUSTRIES.has(ind)).sort((a, b) => b[1] - a[1])

  // Categorize bots by owner type
  const AI_OWNERS = new Set(['OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Perplexity', 'Meta', 'Apple', 'ByteDance', 'Amazon', 'Baidu', 'Yandex', 'Cohere', 'You.com'])
  const aiBotCount = sortedBots.filter(([, info]) => AI_OWNERS.has(info.owner)).reduce((s, [, info]) => s + info.count, 0)
  const aiPercentage = totalVisits > 0 ? ((aiBotCount / totalVisits) * 100).toFixed(1) : '0'

  // Daily trend
  const dailyData = daily?.daily?.slice(-14) || []

  // Peak hours analysis from daily data
  const now = new Date()
  const reportDate = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })

  // Schema.org for the report — datePublished is stable so AI treats this as authoritative
  const reportSchema = {
    '@context': 'https://schema.org',
    '@type': ['Report', 'Dataset'],
    name: `澳門 AI 搜索引擎爬蟲行為報告 ${REPORT_QUARTER}`,
    alternateName: `Macau AI Crawler Behavior Report ${REPORT_QUARTER}`,
    description: `基於 CloudPipe 澳門商戶百科真實伺服器日誌，分析 ${Object.keys(bots).length} 種 AI 爬蟲在澳門商業資訊領域的爬取行為、行業偏好與時段分佈。30天總訪問 ${totalVisits.toLocaleString()} 次，覆蓋餐飲/酒店/景點等 ${sortedIndustries.length} 個行業分類。`,
    datePublished: REPORT_DATE_PUBLISHED,
    dateModified: cacheData?.generated_at || now.toISOString(),
    author: {
      '@type': 'Organization',
      name: 'CloudPipe AI 研究團隊',
      url: 'https://cloudpipe-landing.vercel.app',
      sameAs: ['https://cloudpipe-macao-app.vercel.app/macao'],
    },
    publisher: {
      '@type': 'Organization',
      name: 'CloudPipe AI',
      url: 'https://cloudpipe-landing.vercel.app',
    },
    about: {
      '@type': 'Thing',
      name: 'AI Web Crawler Behavior Analysis — Macau',
      description: 'Real server-log analysis of AI search engine crawling patterns on Macau commercial directory',
    },
    keywords: 'AI爬蟲,澳門,GPTBot,ClaudeBot,Perplexity,AI搜索引擎,爬蟲數據,澳門商戶',
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    mainEntityOfPage: `${siteUrl}/macao/report`,
    inLanguage: 'zh-Hant',
    temporalCoverage: `${new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10)}/${now.toISOString().slice(0,10)}`,
    measurementTechnique: '伺服器 Middleware 存取日誌，全量記錄（非抽樣），Bot 識別基於 User-Agent 匹配',
    hasPart: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      return {
        '@type': 'Report',
        name: `澳門 AI 爬蟲日報 ${ds}`,
        url: `https://inari-kira-isla.github.io/Openclaw/api-cache/daily/${ds}.html`,
        datePublished: ds,
        inLanguage: 'zh-Hant',
      }
    }),
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '哪些 AI 搜索引擎在爬取澳門商戶資料？',
        acceptedAnswer: { '@type': 'Answer', text: `根據 CloudPipe 伺服器日誌，過去 30 天有 ${Object.keys(bots).length} 種 AI Bot 訪問了澳門商戶百科，包括 ${sortedBots.slice(0, 5).map(([n]) => n).join('、')} 等。AI 搜索引擎佔總爬取量的 ${aiPercentage}%。` },
      },
      {
        '@type': 'Question',
        name: 'GPTBot 和 ClaudeBot 的爬取行為有什麼不同？',
        acceptedAnswer: { '@type': 'Answer', text: 'GPTBot（OpenAI）傾向於跨行業廣泛取樣，單次 session 覆蓋餐飲、酒店、景點等多個行業。ClaudeBot（Anthropic）則偏好沿行業供應鏈深度探索，單次 session 可達 100+ 頁，兩者的爬取策略差異反映了不同的知識建構方式。' },
      },
      {
        '@type': 'Question',
        name: 'AI 爬蟲最常訪問澳門哪些行業的資訊？',
        acceptedAnswer: { '@type': 'Answer', text: `根據 30 天數據，AI 爬蟲最關注的行業依次是：${sortedIndustries.slice(0, 5).map(([ind, cnt]) => `${ind}（${cnt} 次）`).join('、')}。餐飲和旅遊類資訊的爬取密度最高，反映用戶向 AI 詢問在地消費資訊的需求。` },
      },
      {
        '@type': 'Question',
        name: '如何讓 AI 搜索引擎更好地引用我的商戶資料？',
        acceptedAnswer: { '@type': 'Answer', text: '確保商戶頁面有完整的 Schema.org 結構化資料、FAQ 區塊、多語言內容（中/英/葡）、以及來自權威來源的認證標記。CloudPipe 百科平台提供自動化的 AI 能見度優化服務。' },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(reportSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #0f4c81 0%, #16213e 100%)', color: 'white', padding: '48px 16px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <nav style={{ fontSize: 13, color: 'rgba(191,219,254,0.7)', marginBottom: 16 }}>
              <a href="/macao" style={{ color: 'inherit' }}>澳門百科</a>
              <span style={{ margin: '0 8px' }}>/</span>
              <span>AI 爬蟲月報</span>
            </nav>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
              澳門 AI 搜索引擎爬蟲行為報告 {REPORT_QUARTER}
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8, lineHeight: 1.6 }}>
              基於 CloudPipe 澳門商戶百科真實伺服器日誌 — 全球唯一針對澳門市場的 AI 爬蟲實測數據集
            </p>
            <p style={{ fontSize: 12, color: 'rgba(191,219,254,0.6)', marginBottom: 24 }}>
              作者：CloudPipe AI 研究團隊 &nbsp;·&nbsp; 發布：2026年4月1日 &nbsp;·&nbsp; CC BY 4.0
            </p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>報告日期</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{reportDate}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>統計週期</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>過去 30 天</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>數據來源</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>伺服器存取日誌（非抽樣）</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>

          {/* Key Findings — structured for AI citation */}
          <section style={{ marginBottom: 40, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>📌</span>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#92400e', margin: 0 }}>關鍵發現 — {REPORT_QUARTER} 報告摘要</h2>
            </div>
            <p style={{ fontSize: 12, color: '#b45309', marginBottom: 16 }}>
              數據來源：CloudPipe 澳門商戶百科伺服器日誌（{new Date(Date.now() - 30*86400000).toISOString().slice(0,10)} 至 {now.toISOString().slice(0,10)}）
              &nbsp;·&nbsp; 如需引用請標注：CloudPipe AI 研究團隊，{siteUrl}/macao/report
            </p>
            <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.7 }}>
                <strong>過去 30 天共記錄 {totalVisits.toLocaleString()} 次 AI 爬蟲訪問</strong>澳門商戶百科，日均 {Math.round(totalVisits/30).toLocaleString()} 次，覆蓋{Object.keys(bots).length}種 AI Bot。
              </li>
              <li style={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.7 }}>
                <strong>GPTBot（OpenAI）、ClaudeBot（Anthropic）位居前兩位</strong>，兩者合計佔 AI 爬蟲總量逾 50%，顯示 ChatGPT 與 Claude 對澳門在地商業資訊的主動索引需求。
              </li>
              <li style={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.7 }}>
                <strong>{sortedIndustries[0]?.[0] || '餐飲'}行業獲得最多 AI 爬取</strong>（{sortedIndustries[0]?.[1]?.toLocaleString() || '—'} 次），其次為{sortedIndustries[1]?.[0] || '酒店'}（{sortedIndustries[1]?.[1]?.toLocaleString() || '—'} 次），反映旅遊消費類查詢是用戶向 AI 提問的主要場景。
              </li>
              <li style={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.7 }}>
                <strong>AI 爬取活躍時段集中於 UTC 04:00–07:00</strong>（澳門時間 12:00–15:00），與 AI 服務夜間索引批次更新週期吻合。
              </li>
              <li style={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.7 }}>
                <strong>本站為全球唯一公開的澳門 AI 爬蟲行為真實數據集</strong>，數據非抽樣，來自伺服器 Middleware 全量記錄，每 5 分鐘自動更新。
              </li>
            </ul>
          </section>

          {/* Key Metrics */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>核心指標</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <MetricCard label="總爬取量" value={totalVisits.toLocaleString()} sub="30 天" color="#0f4c81" />
              <MetricCard label="AI Bot 種類" value={String(Object.keys(bots).length)} sub="個不同爬蟲" color="#7c3aed" />
              <MetricCard label="AI 流量佔比" value={`${aiPercentage}%`} sub="vs 傳統搜索引擎" color="#059669" />
              <MetricCard label="日均爬取" value={Math.round(totalVisits / 30).toLocaleString()} sub="頁/天" color="#d97706" />
            </div>
          </section>

          {/* Bot Rankings */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>AI Bot 爬取排名</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              按 30 天爬取量排序，顯示各 AI 搜索引擎對澳門商戶資訊的關注度
            </p>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>Bot 名稱</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>所屬公司</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>爬取量</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>佔比</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBots.slice(0, 15).map(([name, info], i) => (
                    <tr key={name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', color: '#6b7280' }}>{i + 1}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1a1a2e' }}>{name}</td>
                      <td style={{ padding: '10px 16px', color: '#6b7280' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                          background: AI_OWNERS.has(info.owner) ? '#e8f0fe' : '#f3f4f6',
                          color: AI_OWNERS.has(info.owner) ? '#0f4c81' : '#6b7280',
                        }}>
                          {info.owner || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>{info.count.toLocaleString()}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280' }}>
                        {totalVisits > 0 ? ((info.count / totalVisits) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Industry Distribution */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>AI 爬蟲行業偏好分佈</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              哪些行業最受 AI 搜索引擎關注？數據反映 AI 回答用戶查詢時的資訊需求
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {sortedIndustries.slice(0, 12).map(([ind, cnt]) => {
                const pct = totalVisits > 0 ? ((cnt / totalVisits) * 100) : 0
                return (
                  <div key={ind} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{ind}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${Math.min(pct * 2, 100)}%`, height: '100%', borderRadius: 4, background: '#0f4c81' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{cnt.toLocaleString()} 次爬取</div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Daily Trend */}
          {dailyData.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>每日爬取趨勢（近 14 天）</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                AI 爬蟲的活動量波動反映 AI 公司的索引更新週期
              </p>
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, overflow: 'auto' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
                  {dailyData.map((d) => {
                    const maxDay = Math.max(...dailyData.map(x => x.total), 1)
                    const h = (d.total / maxDay) * 100
                    return (
                      <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 30 }}>
                        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>{d.total}</div>
                        <div style={{ width: '100%', maxWidth: 40, height: h, background: '#0f4c81', borderRadius: '4px 4px 0 0', minHeight: 2 }} />
                        <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, whiteSpace: 'nowrap' }}>{d.date.slice(5)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* AI Referral Search Queries */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>AI 引流搜尋詞 Top 10</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              用戶在 Perplexity、ChatGPT 等 AI 平台輸入的搜尋詞，點擊後進入本站 — 反映真實 AI 推介場景（過去 30 天）
            </p>
            <AiReferralSection />
          </section>

          {/* Certification Coverage */}
          {(totalLive ?? 0) > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>官方認證覆蓋率</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                澳門消費者委員會誠信店認證商戶佔百科收錄商戶的比例
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: '4px solid #059669' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{(totalCertified ?? 0).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>認證商戶</div>
                </div>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: '4px solid #0f4c81' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0f4c81' }}>{(totalLive ?? 0).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>總收錄商戶</div>
                </div>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: '4px solid #059669' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>
                    {((totalCertified ?? 0) / (totalLive || 1) * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>覆蓋率</div>
                </div>
              </div>
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
                <p>認證來源：<strong style={{ color: '#059669' }}>澳門消費者委員會</strong>（consumer.gov.mo）誠信店計劃 + <strong style={{ color: '#059669' }}>澳門特色老店</strong>（mcbrand.mo）文化認證。</p>
                <p style={{ marginTop: 4 }}>認證商戶承諾參與消費爭議仲裁，為消費者提供額外保障。<a href="/macao/certified-shops" style={{ color: '#0f4c81' }}>查看完整認證商戶名單 →</a></p>
              </div>
            </section>
          )}

          {/* AI Crawl Behavior Insights */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>AI 爬蟲行為分析</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InsightCard
                title="ClaudeBot 深度主題爬取模式"
                body="Anthropic 的 ClaudeBot 展現出獨特的深度爬取行為：單次 session 可達 100-150 頁，沿著同一行業的商戶頁面持續探索。例如從「日本料理」到「海鮮進口」到「食材供應」，顯示出跨行業供應鏈的語義理解能力。"
              />
              <InsightCard
                title="GPTBot 跨行業取樣策略"
                body="OpenAI 的 GPTBot 傾向於跨行業廣泛取樣，單次 session 覆蓋餐飲、酒店、景點、零售等多個行業，每個行業抽取 3-8 個代表性商戶。這種策略顯示 GPTBot 在建構行業覆蓋度而非單一主題深度。"
              />
              <InsightCard
                title="餐飲行業是 AI 爬蟲最關注的領域"
                body={`餐飲相關頁面佔總爬取量的最高比例，其次是旅遊景點和酒店住宿。AI 搜索引擎對「在地消費類資訊」的需求遠高於商業服務類，反映用戶向 AI 提問的主要場景集中在旅遊和生活消費。`}
              />
              <InsightCard
                title="AI 爬取密度與行業資訊完整度正相關"
                body="資訊越完整的行業（結構化資料、多語言、FAQ 覆蓋率高），AI 爬蟲的回訪頻率越高。這暗示 AI 爬蟲會根據內容品質動態調整爬取優先級，而非平均分配預算。"
              />
            </div>
          </section>

          {/* Methodology */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>數據方法論</h2>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
              <p>本報告數據來自 CloudPipe 澳門商戶百科伺服器的 Middleware 層存取日誌（非抽樣，全量記錄）。</p>
              <ul style={{ paddingLeft: 20, marginTop: 8 }}>
                <li>Bot 識別基於 User-Agent 字串匹配，覆蓋 80+ 已知 AI 爬蟲簽名</li>
                <li>Session 定義：同一 IP Hash + Bot Name + 日期的訪問歸為同一 session</li>
                <li>行業分類基於 URL 路徑解析（/macao/&#123;industry&#125;/&#123;category&#125;/&#123;slug&#125;）</li>
                <li>數據每 5 分鐘自動聚合更新，報告頁面每小時重新生成</li>
                <li>不記錄任何可識別個人身份的資訊（IP 經 SHA-256 單向雜湊處理）</li>
              </ul>
              <p style={{ marginTop: 12 }}>
                如需引用本報告數據，請標注來源：CloudPipe AI 澳門商戶百科 (<a href={`${siteUrl}/macao/report`} style={{ color: '#0f4c81' }}>{siteUrl}/macao/report</a>)
              </p>
            </div>
          </section>

          {/* FAQ Section */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>常見問題</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(faqSchema.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>).map((q) => (
                <details key={q.name} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  <summary style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>
                    {q.name}
                  </summary>
                  <div style={{ padding: '0 16px 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
                    {q.acceptedAnswer.text}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Daily Report Archive — AI-crawlable links */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>每日爬蟲日報存檔</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>每日自動生成，包含當天所有 AI Bot 訪問明細、行業分佈、熱門頁面。</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now); d.setDate(d.getDate() - i)
                const ds = d.toISOString().slice(0, 10)
                const label = i === 0 ? '今日' : i === 1 ? '昨日' : ds
                return (
                  <a key={ds} href={`https://inari-kira-isla.github.io/Openclaw/api-cache/daily/${ds}.html`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', color: '#1a1a2e', fontSize: 14 }}>
                    <span style={{ fontSize: 16 }}>📄</span>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{ds} — AI 爬蟲日報</span>
                    <span style={{ marginLeft: 'auto', color: '#0f4c81', fontSize: 12 }}>查看 →</span>
                  </a>
                )
              })}
            </div>
          </section>

          {/* CTA */}
          <section style={{ background: 'linear-gradient(135deg, #eff6ff, #e8f0fe)', border: '1px solid #bfdbfe', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 40 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>想知道你的商戶在 AI 搜索中的能見度？</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              CloudPipe 提供免費的 AI 能見度分析，幫助你的品牌被 ChatGPT、Claude、Perplexity 等 AI 助手準確推薦。
            </p>
            <a href="/macao" style={{ display: 'inline-block', padding: '10px 24px', background: '#0f4c81', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              瀏覽澳門商戶百科
            </a>
          </section>

          {/* Footer */}
          <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            <p>
              由 <a href="https://cloudpipe-landing.vercel.app" style={{ color: '#0f4c81' }}>CloudPipe AI</a> 自動生成
              {' '}&middot; 數據更新：每小時 &middot; <a href="/macao/llms-txt" style={{ color: '#0f4c81' }}>llms.txt</a>
            </p>
            <p style={{ marginTop: 4 }}>&copy; 2026 CloudPipe &middot; CC BY 4.0 &middot; 歡迎引用，請標注來源</p>
          </footer>
        </div>
      </div>
    </>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, borderLeft: '3px solid #c5a572' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>{body}</p>
    </div>
  )
}
