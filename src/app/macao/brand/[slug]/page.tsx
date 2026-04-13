'use client'

import { useEffect, useState } from 'react'
import { BRAND_CONFIGS } from '@/lib/brand-visibility'
import type { BrandVisibilityData } from '@/lib/brand-visibility'

const PASSWORD = 'cloudpipe2026'

interface CompetitorEntry {
  slug: string; name: string; visits: number; percentage: number
  rank: number; isBrand: boolean; label: string; rating?: number; reviews?: number
  aiSearchRanking?: {
    avgRank: number
    mentioned: boolean
    totalCitations: number
    platforms: Record<string, any>
    keywords?: string[]
  } | null
}
interface CitationData {
  brand: string; brandRank: number; totalCompetitors: number
  competitors: CompetitorEntry[]
  aiSearchData?: {
    lastUpdated: string
    platforms: string[]
    queries: string[]
    keywordAnalysis: Record<string, Record<string, string[]>>
  }
}

const RANK_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

export default function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState(false)
  const [data, setData] = useState<BrandVisibilityData | null>(null)
  const [citation, setCitation] = useState<CitationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => {
      const s = p.slug
      setSlug(s)
      if (typeof window !== 'undefined' && sessionStorage.getItem(`brand_auth_${s}`) === '1') {
        setAuthed(true)
      }
    })
  }, [params])

  const brandConfig = slug ? BRAND_CONFIGS[slug] : null

  useEffect(() => {
    if (!authed || !slug || !brandConfig) return
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/brand-visibility?slug=${slug}&days=30`).then(r => r.json()),
      fetch(`/api/v1/brand-citation?slug=${slug}&days=30&includeAISearch=true`).then(r => r.json()).catch(() => null),
    ]).then(([vis, cit]) => {
      setData(vis)
      // 轉換 brand-citation 返回的競品列表為 citation 格式
      if (cit && !cit.error) {
        const citationData: CitationData = {
          brand: cit.brand,
          brandRank: cit.brandRank,
          totalCompetitors: cit.totalCompetitors,
          competitors: cit.competitors.map((comp: any) => ({
            slug: comp.slug,
            name: comp.name,
            visits: comp.visits,
            percentage: comp.percentage,
            rank: comp.rank,
            isBrand: comp.isBrand,
            label: comp.label,
            rating: comp.rating,
            reviews: comp.reviews,
          })),
          aiSearchData: cit.aiSearchData,
        }
        setCitation(citationData)
      }
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
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pw === PASSWORD) { sessionStorage.setItem(`brand_auth_${slug}`, '1'); setAuthed(true) }
                else setPwError(true)
              }
            }}
            onChange={e => { setPw(e.target.value); setPwError(false) }}
            placeholder="Password"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${pwError ? '#ef4444' : '#e5e7eb'}`, marginBottom: pwError ? 6 : 12, fontSize: 16 }}
          />
          {pwError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>密碼錯誤</p>}
          <button
            onClick={() => {
              if (pw === PASSWORD) { sessionStorage.setItem(`brand_auth_${slug}`, '1'); setAuthed(true) }
              else setPwError(true)
            }}
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

  const { score, intelligenceDensity, bots, milestones, insights, ecosystem, suggestions, graphHealth } = data

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

        {/* Intelligence Density Card */}
        {intelligenceDensity && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>🧠 品牌智力密度</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>衡量品牌大腦的知識深度與圖譜連結品質</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                width: 80, height: 80, borderRadius: '50%',
                border: `4px solid ${intelligenceDensity.gradeColor}`,
                background: `${intelligenceDensity.gradeColor}12`,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: intelligenceDensity.gradeColor }}>{intelligenceDensity.total}</div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>/ 100</div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: intelligenceDensity.gradeColor }}>
                {intelligenceDensity.grade} · {intelligenceDensity.gradeLabel}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: '📖 知識深度', ...intelligenceDensity.knowledgeDepth, color: '#7c3aed' },
              { label: '❓ FAQ 品質', ...intelligenceDensity.faqQuality, color: '#059669' },
              { label: '🕸️ 圖譜連結', ...intelligenceDensity.graphConnectivity, color: '#0f4c81' },
              { label: '🌐 語言覆蓋', ...intelligenceDensity.languageCoverage, color: '#d97706' },
            ].map((dim, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{dim.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: dim.color }}>
                  {dim.score}<span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>/{dim.max}</span>
                </div>
                <div style={{ background: '#e5e7eb', borderRadius: 4, height: 4, marginTop: 6 }}>
                  <div style={{ background: dim.color, borderRadius: 4, height: 4, width: `${(dim.score / dim.max) * 100}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{dim.detail}</div>
              </div>
            ))}
          </div>
        </div>
        )}

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
                左：爬蟲訪問次數 | 右：AI 搜尋平台排名
              </p>
              <p style={{ fontSize: 14, color: '#0f4c81', fontWeight: 600, marginBottom: 16 }}>
                你的排名：第 {citation.brandRank} / {citation.totalCompetitors}
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>品牌</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>爬蟲訪問</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Gemini</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>GPT</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Perplexity</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Claude</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Grok</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>平均排名</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citation.competitors.map((comp, i) => (
                      <tr key={i} style={{ borderBottom: i < citation.competitors.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#9ca3af' }}>#{comp.rank}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontWeight: comp.isBrand ? 700 : 500,
                            color: comp.isBrand ? '#8b5cf6' : '#1a1a2e',
                          }}>
                            {comp.isBrand && '★ '}{comp.name}
                          </span>
                          {!comp.isBrand && comp.label && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{comp.label}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, marginBottom: 2 }}>
                            <div style={{
                              background: RANK_COLORS[i] || '#6b7280',
                              borderRadius: 4, height: 6,
                              width: `${comp.percentage}%`,
                            }} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{comp.percentage}%</span>
                        </td>
                        {comp.aiSearchRanking ? (
                          <>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {comp.aiSearchRanking.platforms.gemini?.position ? (
                                <span style={{
                                  background: comp.aiSearchRanking.platforms.gemini.position <= 3 ? '#dbeafe' : '#f3f4f6',
                                  padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                  color: comp.aiSearchRanking.platforms.gemini.position <= 3 ? '#0369a1' : '#6b7280',
                                }}>
                                  #{comp.aiSearchRanking.platforms.gemini.position}
                                </span>
                              ) : (
                                <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {comp.aiSearchRanking.platforms.gpt?.position ? (
                                <span style={{
                                  background: comp.aiSearchRanking.platforms.gpt.position <= 3 ? '#dbeafe' : '#f3f4f6',
                                  padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                  color: comp.aiSearchRanking.platforms.gpt.position <= 3 ? '#0369a1' : '#6b7280',
                                }}>
                                  #{comp.aiSearchRanking.platforms.gpt.position}
                                </span>
                              ) : (
                                <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {comp.aiSearchRanking.platforms.perplexity?.position ? (
                                <span style={{
                                  background: comp.aiSearchRanking.platforms.perplexity.position <= 3 ? '#dbeafe' : '#f3f4f6',
                                  padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                  color: comp.aiSearchRanking.platforms.perplexity.position <= 3 ? '#0369a1' : '#6b7280',
                                }}>
                                  #{comp.aiSearchRanking.platforms.perplexity.position}
                                </span>
                              ) : (
                                <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {comp.aiSearchRanking.platforms.claude?.position ? (
                                <span style={{
                                  background: comp.aiSearchRanking.platforms.claude.position <= 3 ? '#dbeafe' : '#f3f4f6',
                                  padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                  color: comp.aiSearchRanking.platforms.claude.position <= 3 ? '#0369a1' : '#6b7280',
                                }}>
                                  #{comp.aiSearchRanking.platforms.claude.position}
                                </span>
                              ) : (
                                <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {comp.aiSearchRanking.platforms.grok?.position ? (
                                <span style={{
                                  background: comp.aiSearchRanking.platforms.grok.position <= 3 ? '#dbeafe' : '#f3f4f6',
                                  padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                  color: comp.aiSearchRanking.platforms.grok.position <= 3 ? '#0369a1' : '#6b7280',
                                }}>
                                  #{comp.aiSearchRanking.platforms.grok.position}
                                </span>
                              ) : (
                                <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{
                                background: comp.aiSearchRanking.avgRank <= 3 ? '#dcfce7' : '#f3f4f6',
                                padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                color: comp.aiSearchRanking.avgRank <= 3 ? '#15803d' : '#6b7280',
                              }}>
                                #{comp.aiSearchRanking.avgRank}
                              </span>
                            </td>
                          </>
                        ) : (
                          <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'center', color: '#d1d5db', fontSize: 12 }}>
                            待更新
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 🔍 Keyword Analysis — AI 搜尋關鍵詞分析 */}
            {citation.aiSearchData && citation.aiSearchData.keywordAnalysis && Object.keys(citation.aiSearchData.keywordAnalysis).length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>🔍 AI 搜尋關鍵詞分析</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                  不同 AI 平台在搜尋各關鍵詞時出現的詞彙對比（顯示最相關的 10 個關鍵詞）
                </p>
                {Object.entries(citation.aiSearchData.keywordAnalysis).map(([query, platformKeywords], qIdx) => (
                  <div key={qIdx} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: qIdx < Object.keys(citation.aiSearchData!.keywordAnalysis).length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#0f4c81' }}>
                      🔎 "{query}"
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      {Object.entries(platformKeywords).map(([platform, keywords]) => (
                        <div key={platform} style={{ background: '#f9fafb', borderRadius: 8, padding: 12, border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>
                            {platform === 'gemini' ? '🤖 Gemini' :
                             platform === 'gpt' ? '🧠 ChatGPT' :
                             platform === 'perplexity' ? '🔎 Perplexity' :
                             platform === 'claude' ? '✨ Claude' :
                             platform === 'grok' ? '⚡ Grok' :
                             platform}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {keywords.length > 0 ? (
                              keywords.slice(0, 5).map((keyword, kIdx) => (
                                <span key={kIdx} style={{
                                  background: '#dbeafe', color: '#0369a1', padding: '4px 8px', borderRadius: 4,
                                  fontSize: 12, fontWeight: 500,
                                }}>
                                  {keyword}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>
                            )}
                          </div>
                          {keywords.length > 5 && (
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                              +{keywords.length - 5} 更多
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                {[...insights].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')).slice(0, 20).map((ins, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', maxWidth: 400 }}>
                      <a href={`/macao/insights/${ins.slug}`} style={{ color: '#0f4c81', textDecoration: 'none' }}>
                        {ins.title?.slice(0, 60) || ins.slug.slice(0, 60)}
                      </a>
                      {ins.publishedAt && new Date(ins.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                        <span style={{ marginLeft: 6, fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>NEW</span>
                      )}
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
