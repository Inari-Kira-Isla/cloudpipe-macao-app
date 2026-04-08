'use client'

import { useEffect, useState } from 'react'
import { BRAND_CONFIGS } from '@/lib/brand-visibility'
import type { BrandVisibilityData } from '@/lib/brand-visibility'

const PASSWORD = 'cloudpipe2026'

interface CompetitorEntry {
  slug: string; name: string; visits: number; percentage: number
  rank: number; isBrand: boolean; label: string; rating?: number; reviews?: number
}
interface CitationData {
  brand: string; brandRank: number; totalCompetitors: number
  competitors: CompetitorEntry[]
}

const RANK_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

export default function BrandPage({ params }: { params: { slug: string } }) {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [data, setData] = useState<BrandVisibilityData | null>(null)
  const [citation, setCitation] = useState<CitationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const slug = params.slug
  const brandConfig = BRAND_CONFIGS[slug]

  useEffect(() => {
    if (!authed || !brandConfig) return
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/brand-visibility?slug=${slug}&days=30`).then(r => r.json()),
      fetch(`/api/v1/brand-citation?slug=${slug}&days=30`).then(r => r.json()).catch(() => null),
    ]).then(([vis, cit]) => {
      setData(vis)
      if (cit && !cit.error) setCitation(cit)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [authed, slug, brandConfig])

  if (!brandConfig) {
    return (
      <main style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 16 }}>品牌未找到</h1>
        <p style={{ color: '#6b7280' }}>可用品牌: {Object.keys(BRAND_CONFIGS).join(', ')}</p>
      </main>
    )
  }

  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
        <div style={{ background: 'white', padding: 40, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 8, color: '#0f4c81' }}>🔒 {brandConfig.displayName}</h2>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 24, fontSize: 14 }}>AI Visibility Dashboard</p>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pw === PASSWORD && setAuthed(true)}
            placeholder="Password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 12, fontSize: 16 }}
          />
          <button
            onClick={() => pw === PASSWORD && setAuthed(true)}
            style={{ width: '100%', padding: 12, borderRadius: 8, background: '#0f4c81', color: 'white', border: 'none', fontSize: 16, cursor: 'pointer' }}
          >
            Enter
          </button>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 16 }}>⏳</div>
        <p>正在分析 {brandConfig.displayName} 的 AI 能見度...</p>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: '#dc2626' }}>載入失敗: {error || '未知錯誤'}</p>
      </main>
    )
  }

  const { score, bots, milestones, insights, ecosystem, suggestions, graphHealth } = data

  return (
    <main style={{ background: '#fafbfc', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f4c81, #1a1a2e, #16213e)', color: 'white', padding: '60px 24px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>CloudPipe AI Visibility Dashboard</p>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 8 }}>{brandConfig.displayName}</h1>
              <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 16 }}>{brandConfig.description}</p>
              <p style={{ fontSize: 14, opacity: 0.6 }}>
                🕸️ 生態系角色: {brandConfig.ecosystem}
              </p>
              {milestones[0] && (
                <p style={{ fontSize: 14, marginTop: 12, background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '4px 12px', borderRadius: 20 }}>
                  🤖 首次被 {milestones[0].bot} 發現於 {milestones[0].date.slice(0, 10)}
                </p>
              )}
            </div>
            {/* Score Circle */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 140, height: 140, borderRadius: '50%',
                border: `6px solid ${score.gradeColor}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: 36, fontWeight: 700 }}>{score.total}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>/ 100</div>
              </div>
              <div style={{
                marginTop: 8, padding: '4px 16px', borderRadius: 20,
                background: score.gradeColor, fontSize: 14, fontWeight: 600,
              }}>
                {score.grade} · {score.gradeLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* 4 Dimension Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: '🤖 Bot 觸及', ...score.botReach, color: '#0f4c81' },
            { label: '📝 Insight 覆蓋', ...score.insightCoverage, color: '#059669' },
            { label: '❓ FAQ 密度', ...score.faqDensity, color: '#d97706' },
            { label: '🔗 交叉連結', ...score.crossLinks, color: '#6366f1' },
          ].map((dim, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>{dim.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: dim.color }}>{dim.score}<span style={{ fontSize: 14, fontWeight: 400 }}>/{dim.max}</span></div>
              <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, marginTop: 8 }}>
                <div style={{ background: dim.color, borderRadius: 4, height: 6, width: `${(dim.score / dim.max) * 100}%`, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{dim.detail}</div>
            </div>
          ))}
        </div>

        {/* Bot Breakdown */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>🤖 AI Bot 訪問分佈</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, fontSize: 14, color: '#6b7280' }}>
            <span>共 {data.totalVisits} 次訪問</span>
            <span>·</span>
            <span>{data.uniqueBots} 個 AI 平台</span>
          </div>
          {bots.map((b, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                <span><strong>{b.name}</strong> <span style={{ color: '#9ca3af' }}>{b.owner}</span></span>
                <span style={{ fontWeight: 600 }}>{b.count}</span>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8 }}>
                <div style={{
                  background: b.color, borderRadius: 4, height: 8,
                  width: `${Math.min(100, (b.count / Math.max(bots[0]?.count || 1, 1)) * 100)}%`,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Timeline + Ecosystem side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          {/* Milestones */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>📅 AI 發現里程碑</h2>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative', paddingLeft: 20 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 4,
                  width: 10, height: 10, borderRadius: '50%', background: m.color,
                }} />
                {i < milestones.length - 1 && (
                  <div style={{ position: 'absolute', left: 4, top: 16, width: 2, height: 'calc(100% + 4px)', background: '#e5e7eb' }} />
                )}
                <div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>{m.date.slice(0, 10)}</div>
                  <div style={{ fontSize: 14 }}>{m.event}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Ecosystem */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>🕸️ 知識圖譜生態系</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>你的品牌與生態系內其他成員互相連結，共同提升 AI 能見度</p>
            {ecosystem.map((node, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: i < ecosystem.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{node.name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{node.role}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{node.visits} 次</div>
                  <div style={{ fontSize: 11, color: node.connected ? '#059669' : '#9ca3af' }}>
                    {node.connected ? '✓ 已連結' : '◯ 未連結'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Graph Health — 核心展示區 */}
        <div style={{
          background: 'linear-gradient(135deg, #0f4c81 0%, #16213e 100%)', color: 'white',
          borderRadius: 12, padding: 32, marginBottom: 32,
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>📊 CloudPipe 知識圖譜即時狀態</h2>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
            你的品牌是這個持續擴展的知識網絡的一部分。每天新增的文章和連結都在強化你的 AI 能見度。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {[
              { label: '總 Insights', value: graphHealth.totalInsights.toLocaleString(), sub: '篇深度文章' },
              { label: '商戶數據', value: graphHealth.totalMerchants.toLocaleString(), sub: '個商戶檔案' },
              { label: 'FAQ 覆蓋', value: `${graphHealth.faqCoverage}%`, sub: '持續深化中' },
              { label: 'Sections', value: `${graphHealth.sectionsCoverage}%`, sub: '結構化覆蓋' },
              { label: '每日新增', value: `${graphHealth.dailyNewArticles}+`, sub: '篇/天' },
              { label: '圖譜分數', value: `${graphHealth.graphScore}`, sub: '/100 目標80' },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{stat.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '4px 0' }}>{stat.value}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 13, opacity: 0.8, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 16 }}>
            <strong>生態系運作機制:</strong> 每日 03:00 UTC 自動生成 5 篇品牌旗艦 Insight → 03:30 圖譜深化（Sections + FAQ + Answer Hub）→ 每週一雙向連結重建 → 每月計劃檢視 → AI Bot 自然爬取 → 引用率提升
          </div>
        </div>

        {/* ═══ 同業競品比較 ═══ */}
        {citation && citation.competitors && (
          <>
            {/* Competitor Bar Chart */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>📊 同業競品比較</h2>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
                你的 AI 能見度與同業被 AI 爬蟲訪問次數對比（真實數據，非模擬查詢）
              </p>
              {citation.competitors.map((comp, i) => {
                const maxPct = citation.competitors[0]?.percentage || 1
                return (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>
                        <strong style={{ color: comp.isBrand ? '#8b5cf6' : '#1a1a2e' }}>
                          {comp.name}
                        </strong>
                        {comp.rating && (
                          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
                            ⭐ {comp.rating} ({comp.reviews})
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{comp.percentage}%</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: 6, height: 12, overflow: 'hidden' }}>
                      <div style={{
                        background: RANK_COLORS[i] || '#6b7280',
                        borderRadius: 6, height: 12,
                        width: `${(comp.percentage / maxPct) * 100}%`,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Competition Ranking */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>🏆 競爭態勢排名</h2>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>
                依各競品被 AI 爬蟲訪問次數與覆蓋平台加權計算，排名越前代表 AI 更優先推薦
              </p>
              <p style={{ fontSize: 14, color: '#0f4c81', fontWeight: 600, marginBottom: 16 }}>
                你的排名：第 {citation.brandRank} / {citation.totalCompetitors}
              </p>
              {citation.competitors.map((comp, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < citation.competitors.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: '#9ca3af', width: 28,
                  }}>#{comp.rank}</span>
                  <span style={{
                    fontSize: 14, fontWeight: comp.isBrand ? 700 : 400,
                    color: comp.isBrand ? '#8b5cf6' : '#1a1a2e',
                    flex: 1,
                  }}>
                    {comp.isBrand && '★ '}{comp.name}
                  </span>
                  {!comp.isBrand && (
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: comp.label === '主要競爭者' ? '#fef3c7' : '#f3f4f6',
                      color: comp.label === '主要競爭者' ? '#92400e' : '#6b7280',
                      fontWeight: 500,
                    }}>
                      {comp.label}
                    </span>
                  )}
                  <div style={{ width: 120, textAlign: 'right' }}>
                    <div style={{ background: '#f3f4f6', borderRadius: 4, height: 8, marginBottom: 2 }}>
                      <div style={{
                        background: RANK_COLORS[i] || '#6b7280',
                        borderRadius: 4, height: 8,
                        width: `${comp.percentage}%`,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{comp.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Insight Coverage */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>📝 Insight 覆蓋詳情</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>標題</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>字數</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>FAQ</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Sections</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>連結</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>語言</th>
                </tr>
              </thead>
              <tbody>
                {insights.slice(0, 20).map((ins, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', maxWidth: 400 }}>
                      <a href={`/macao/insights/${ins.slug}`} style={{ color: '#0f4c81', textDecoration: 'none' }}>
                        {ins.title?.slice(0, 60) || ins.slug.slice(0, 60)}
                      </a>
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: ins.wordCount >= 2000 ? '#059669' : '#d97706' }}>
                      {ins.wordCount.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                      {ins.faqCount > 0 ? `✓ ${ins.faqCount}` : <span style={{ color: '#dc2626' }}>✗</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                      {ins.sectionCount > 0 ? `✓ ${ins.sectionCount}` : <span style={{ color: '#dc2626' }}>✗</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px' }}>{ins.crossLinks}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: '#9ca3af' }}>{ins.lang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {insights.length > 20 && (
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>顯示前 20 篇，共 {insights.length} 篇</p>
          )}
        </div>

        {/* Suggestions */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>💡 AI 能見度改善建議</h2>
          {suggestions.map((s, i) => (
            <div key={i} style={{
              padding: 16, marginBottom: 12, borderRadius: 8,
              background: s.priority === 'high' ? '#fef3c7' : s.priority === 'medium' ? '#e8f0fe' : '#f3f4f6',
              borderLeft: `4px solid ${s.priority === 'high' ? '#d97706' : s.priority === 'medium' ? '#0f4c81' : '#9ca3af'}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.icon} {s.title}</div>
              <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>{s.description}</div>
              <div style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>📈 {s.impact}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          background: 'white', borderRadius: 12, padding: 32, border: '2px solid #c5a572',
          textAlign: 'center', marginBottom: 48,
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8, color: '#1a1a2e' }}>加入 CloudPipe 知識圖譜生態系</h2>
          <p style={{ color: '#6b7280', marginBottom: 20, maxWidth: 600, margin: '0 auto 20px' }}>
            每天 175+ 篇新文章持續擴展知識網絡。你的品牌作為生態系的一員，
            每一篇新 Insight 都在強化你的 AI 能見度。這不是一次性服務，而是持續複利增長的生態系。
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={brandConfig.brandUrl} target="_blank" style={{
              padding: '12px 32px', borderRadius: 8, background: '#0f4c81',
              color: 'white', textDecoration: 'none', fontWeight: 600,
            }}>
              訪問品牌官網 →
            </a>
            <a href="/macao/insights" style={{
              padding: '12px 32px', borderRadius: 8, background: '#c5a572',
              color: 'white', textDecoration: 'none', fontWeight: 600,
            }}>
              瀏覽知識百科 →
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1a1a2e', color: 'white', padding: '32px 24px', textAlign: 'center', fontSize: 13, opacity: 0.7 }}>
        CloudPipe AI · 知識圖譜生態系 · {new Date().getFullYear()}
      </footer>
    </main>
  )
}
