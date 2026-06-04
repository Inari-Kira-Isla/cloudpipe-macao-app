import { safeJsonLd } from '@/lib/types'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 300 // 5 min ISR

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export const metadata: Metadata = {
  title: 'AI 引用情報 Dashboard — CloudPipe 澳門百科',
  description: '追蹤 Perplexity、ChatGPT、Gemini 等 AI 平台對 CloudPipe 內容的引用情況，發現知識缺口並優化 AI 可見度。',
  robots: { index: false, follow: false }, // internal dashboard
  alternates: { canonical: `${siteUrl}/macao/ai-citations` },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiCitation {
  platform: string | null
  cloudpipe_count: number
  query_text: string | null
  cited_urls: string[] | null
  mentioned_entities: string[] | null
  category: string | null
  created_at: string | null
}

interface AiCitationGap {
  entity_name: string
  category: string | null
  in_cloudpipe: boolean
  priority: number | null
  mentioned_count: number | null
}

interface SummaryData {
  total_citations: number
  queries_covered: number
  platform_breakdown: Record<string, number>
  category_matrix: Record<string, Record<string, number>>
  queries: string[]
  gaps_count: number
  gaps: AiCitationGap[]
  trend: { this_week: number; last_week: number }
  last_run: string
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const CATEGORIES = ['dining', 'attractions', 'shopping', 'seafood_supply', 'hotels'] as const
const CATEGORY_LABELS: Record<string, string> = {
  dining: '餐飲',
  attractions: '景點',
  shopping: '購物',
  seafood_supply: '海鮮供應',
  hotels: '酒店',
}
const PLATFORM_COLORS: Record<string, string> = {
  perplexity: '#6366f1',
  chatgpt: '#10a37f',
  gemini: '#4285f4',
  claude: '#d97706',
}
const PRIORITY_LABELS: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: '最高優先', bg: '#fee2e2', color: '#dc2626' },
  2: { label: '高優先', bg: '#ffedd5', color: '#ea580c' },
  3: { label: '中優先', bg: '#fef9c3', color: '#ca8a04' },
}

async function fetchData(): Promise<SummaryData | null> {
  try {
    const supabase = createServiceClient()

    const [citationsResult, gapsResult] = await Promise.all([
      supabase
        .from('ai_citations')
        .select('platform, cloudpipe_count, query_text, cited_urls, mentioned_entities, category, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('ai_citation_gaps')
        .select('entity_name, category, in_cloudpipe, priority, mentioned_count')
        .eq('in_cloudpipe', false)
        .order('priority', { ascending: true })
        .limit(50),
    ])

    const citations: AiCitation[] = citationsResult.data || []
    const gaps: AiCitationGap[] = gapsResult.data || []

    const total_citations = citations.reduce((sum, r) => sum + (r.cloudpipe_count || 0), 0)
    const queries_covered = new Set(citations.map(r => r.query_text).filter(Boolean)).size

    const platform_breakdown: Record<string, number> = {}
    for (const row of citations) {
      if (row.platform) {
        platform_breakdown[row.platform] = (platform_breakdown[row.platform] || 0) + (row.cloudpipe_count || 0)
      }
    }

    // Build category × query matrix
    const allQueries: string[] = Array.from(
      new Set(citations.map(r => r.query_text).filter((q): q is string => !!q))
    ).slice(0, 15)

    const category_matrix: Record<string, Record<string, number>> = {}
    for (const cat of CATEGORIES) {
      category_matrix[cat] = {}
      for (const q of allQueries) {
        category_matrix[cat][q] = 0
      }
    }
    for (const row of citations) {
      const cat = row.category || 'other'
      const query = row.query_text
      if (!query || !allQueries.includes(query)) continue
      if (CATEGORIES.includes(cat as typeof CATEGORIES[number])) {
        category_matrix[cat][query] = (category_matrix[cat][query] || 0) + (row.cloudpipe_count || 0)
      }
    }

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)

    const thisWeek = citations
      .filter(r => r.created_at && new Date(r.created_at) >= weekAgo)
      .reduce((s, r) => s + (r.cloudpipe_count || 0), 0)
    const lastWeek = citations
      .filter(r => r.created_at && new Date(r.created_at) >= twoWeeksAgo && new Date(r.created_at) < weekAgo)
      .reduce((s, r) => s + (r.cloudpipe_count || 0), 0)

    return {
      total_citations,
      queries_covered,
      platform_breakdown,
      category_matrix,
      queries: allQueries,
      gaps_count: gaps.length,
      gaps,
      trend: { this_week: thisWeek, last_week: lastWeek },
      last_run: now.toISOString(),
    }
  } catch (err) {
    console.error('ai-citations page data error:', err)
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AiCitationsPage() {
  const data = await fetchData()

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'AI 引用情報 Dashboard',
    description: 'CloudPipe 澳門百科 AI 引用追蹤系統 — 記錄 Perplexity/ChatGPT/Gemini 對本站內容的引用情況與知識缺口分析',
    url: `${siteUrl}/macao/ai-citations`,
    inLanguage: 'zh-Hant',
  }

  // Empty state
  if (!data || (data.total_citations === 0 && data.gaps_count === 0)) {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(pageSchema) }} />
        <div style={{ minHeight: '100vh', background: '#fafbfc' }}>
          <PageHero lastRun={data?.last_run} />
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>尚無引用數據</h2>
              <p style={{ fontSize: 14, color: '#6b7280' }}>
                系統將在 AI 查詢記錄寫入後自動顯示。請確認 <code>ai_citations</code> 與 <code>ai_citation_gaps</code> 表已建立。
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const trendDelta = data.trend.last_week > 0
    ? (((data.trend.this_week - data.trend.last_week) / data.trend.last_week) * 100).toFixed(0)
    : null
  const trendUp = trendDelta !== null && Number(trendDelta) >= 0

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(pageSchema) }} />
      <div style={{ minHeight: '100vh', background: '#fafbfc' }}>

        {/* ── Hero ── */}
        <PageHero lastRun={data.last_run} />

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>

          {/* ── 區塊 1: KPI Cards ── */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>整體引用概覽</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <KpiCard
                label="總引用次數"
                value={data.total_citations.toLocaleString()}
                sub="cloudpipe_count 加總"
                color="#0f4c81"
              />
              <KpiCard
                label="覆蓋查詢數"
                value={data.queries_covered.toLocaleString()}
                sub="distinct query_text"
                color="#7c3aed"
              />
              <KpiCard
                label="已發現缺口"
                value={data.gaps_count.toLocaleString()}
                sub="待補充知識項目"
                color="#dc2626"
              />
              <div style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16,
                borderLeft: `4px solid ${trendUp ? '#059669' : '#f59e0b'}`,
              }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>本週 vs 上週</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: trendUp ? '#059669' : '#f59e0b' }}>
                  {trendDelta !== null ? `${trendUp ? '+' : ''}${trendDelta}%` : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  本週 {data.trend.this_week} / 上週 {data.trend.last_week}
                </div>
              </div>
            </div>
          </section>

          {/* ── 區塊 2: 平台引用排行 ── */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>平台引用排行</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              各 AI 平台引用 CloudPipe 內容的次數分佈
            </p>
            {Object.keys(data.platform_breakdown).length === 0 ? (
              <EmptyCard message="尚無平台引用數據" />
            ) : (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                {Object.entries(data.platform_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([platform, count]) => {
                    const total = Object.values(data.platform_breakdown).reduce((s, v) => s + v, 0)
                    const pct = total > 0 ? (count / total) * 100 : 0
                    const color = PLATFORM_COLORS[platform.toLowerCase()] || '#6b7280'
                    return (
                      <div key={platform} style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', textTransform: 'capitalize' }}>{platform}</span>
                            <span style={{ fontSize: 13, color: '#6b7280' }}>{count.toLocaleString()} 次（{pct.toFixed(1)}%）</span>
                          </div>
                          <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8 }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </section>

          {/* ── 區塊 3: 分類 × 查詢 熱力圖 ── */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>引用熱力圖</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              行 = 分類、欄 = 查詢，顏色深淺代表 CloudPipe 被引用次數（灰=0、淡綠=1-2、深綠=3+）
            </p>
            {data.queries.length === 0 ? (
              <EmptyCard message="尚無查詢數據可生成熱力圖" />
            ) : (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 100 }}>分類</th>
                      {data.queries.map(q => (
                        <th key={q} style={{
                          textAlign: 'center', padding: '10px 8px', color: '#6b7280', fontWeight: 500,
                          maxWidth: 100, overflow: 'hidden',
                          writingMode: 'horizontal-tb',
                        }}>
                          <div style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 auto' }} title={q}>
                            {q.length > 14 ? q.slice(0, 14) + '…' : q}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map(cat => (
                      <tr key={cat} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap' }}>
                          {CATEGORY_LABELS[cat] || cat}
                        </td>
                        {data.queries.map(q => {
                          const count = data.category_matrix[cat]?.[q] || 0
                          const { bg, text } = heatColor(count)
                          // Build cited_urls tooltip from raw data if available
                          return (
                            <td key={q} style={{ textAlign: 'center', padding: '8px 4px' }}>
                              <div
                                title={count > 0 ? `${CATEGORY_LABELS[cat]} × "${q}": ${count} 次引用` : '尚未引用'}
                                style={{
                                  width: 36, height: 36, borderRadius: 6, margin: '0 auto',
                                  background: bg, color: text,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 700,
                                  cursor: count > 0 ? 'pointer' : 'default',
                                  border: count > 0 ? `1px solid ${text}30` : '1px solid #e5e7eb',
                                }}>
                                {count > 0 ? count : ''}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '10px 14px', display: 'flex', gap: 16, alignItems: 'center', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>圖例：</span>
                  {[
                    { label: '0 次', bg: '#f3f4f6', text: '#9ca3af' },
                    { label: '1-2 次', bg: '#d1fae5', text: '#059669' },
                    { label: '3+ 次', bg: '#047857', text: '#fff' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: item.bg, border: '1px solid #e5e7eb' }} />
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── 區塊 4: 知識缺口列表 ── */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>知識缺口列表</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              AI 提及但 CloudPipe 尚未收錄的實體，按優先度排序。共 <strong>{data.gaps_count}</strong> 項待補充。
            </p>
            {data.gaps.length === 0 ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 14, color: '#15803d', fontWeight: 600 }}>目前無知識缺口！</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>AI 提及的內容均已在 CloudPipe 收錄。</p>
              </div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>實體名稱</th>
                      <th style={{ textAlign: 'left', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>分類</th>
                      <th style={{ textAlign: 'center', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>AI 提及次數</th>
                      <th style={{ textAlign: 'center', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>優先度</th>
                      <th style={{ textAlign: 'center', padding: '10px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.gaps.map((gap, i) => {
                      const pInfo = PRIORITY_LABELS[gap.priority ?? 3] || PRIORITY_LABELS[3]
                      return (
                        <tr key={`${gap.entity_name}-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a1a2e' }}>{gap.entity_name}</td>
                          <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                            {CATEGORY_LABELS[gap.category || ''] || gap.category || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', color: '#1a1a2e', fontWeight: 600 }}>
                            {gap.mentioned_count ?? '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              background: pInfo.bg, color: pInfo.color,
                              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            }}>
                              {pInfo.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              background: '#fef3c7', color: '#92400e',
                              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            }}>
                              待補充
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {data.gaps_count > 20 && (
                  <div style={{ padding: '10px 16px', textAlign: 'center', fontSize: 12, color: '#9ca3af', borderTop: '1px solid #f3f4f6' }}>
                    顯示前 20 項，共 {data.gaps_count} 項缺口。
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            <p>
              資料更新：{data.last_run ? new Date(data.last_run).toLocaleString('zh-TW') : '—'}
              {' '}&middot; ISR 每 5 分鐘刷新 &middot;{' '}
              <a href="/macao/report" style={{ color: '#0f4c81' }}>爬蟲月報</a>
              {' '}&middot;{' '}
              <a href="/macao" style={{ color: '#0f4c81' }}>澳門百科</a>
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function PageHero({ lastRun }: { lastRun?: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f4c81 0%, #1e3a5f 60%, #16213e 100%)',
      color: 'white', padding: '48px 16px 40px',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <nav style={{ fontSize: 13, color: 'rgba(191,219,254,0.7)', marginBottom: 16 }}>
          <a href="/macao" style={{ color: 'inherit' }}>澳門百科</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span>AI 引用情報</span>
        </nav>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
          AI 引用情報 Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 24, lineHeight: 1.6 }}>
          追蹤 Perplexity、ChatGPT、Gemini 等 AI 平台引用 CloudPipe 內容的情況，並發現知識缺口。
        </p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>數據來源</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>ai_citations / ai_citation_gaps</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>最後更新</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {lastRun ? new Date(lastRun).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>API</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              <a href="/api/ai-citations/summary" style={{ color: 'rgba(147,210,255,0.9)', textDecoration: 'none' }}>/api/ai-citations/summary →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, textAlign: 'center' }}>
      <p style={{ fontSize: 14, color: '#9ca3af' }}>{message}</p>
    </div>
  )
}

function heatColor(count: number): { bg: string; text: string } {
  if (count === 0) return { bg: '#f3f4f6', text: '#9ca3af' }
  if (count <= 2) return { bg: '#d1fae5', text: '#065f46' }
  return { bg: '#047857', text: '#fff' }
}
