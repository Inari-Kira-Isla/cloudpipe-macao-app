'use client'

import { useEffect, useState } from 'react'
import { BRAND_CONFIGS } from '@/lib/brand-visibility'
import type { BrandVisibilityData } from '@/lib/brand-visibility'
import BrandOpsTab from '@/components/BrandOpsTab'
import KnowledgeGraphBlock from '@/components/KnowledgeGraphBlock'

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
interface PlatformRank { position: number; mentioned: boolean; keywords?: string[] }
interface CitationData {
  brand: string; brandRank: number; totalCompetitors: number
  competitors: CompetitorEntry[]
  brandPlatformRanking?: {
    W0: Record<string, PlatformRank>
    W0Label: string | null
    current: Record<string, PlatformRank>
  } | null
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
  const [activeTab, setActiveTab] = useState<'aeo' | 'ops'>('aeo')

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
          brandPlatformRanking: cit.brandPlatformRanking || null,
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

      {/* Tab switcher */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex' }}>
          <button onClick={() => setActiveTab('aeo')} style={{
            padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer', border: 'none',
            background: 'none', color: activeTab === 'aeo' ? '#0f4c81' : '#6b7280',
            borderBottom: activeTab === 'aeo' ? '3px solid #0f4c81' : '3px solid transparent',
          }}>
            📊 AI 能見度
          </button>
          <button onClick={() => setActiveTab('ops')} style={{
            padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer', border: 'none',
            background: 'none', color: activeTab === 'ops' ? '#c5a572' : '#6b7280',
            borderBottom: activeTab === 'ops' ? '3px solid #c5a572' : '3px solid transparent',
          }}>
            🔧 品牌操作台
          </button>
        </div>
      </div>

      {activeTab === 'ops' && slug && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
          <BrandOpsTab slug={slug} brandName={brandConfig.displayName} />
        </div>
      )}

      {activeTab === 'aeo' && <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
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

        {/* Pilot AEO Progress — feature flag: 3 pilot brands only */}
        {['inari-global-foods', 'sea-urchin-delivery', 'after-school-coffee'].includes(slug || '') && (
        <div style={{ background: 'linear-gradient(135deg, #0f4c8108, #7c3aed08)', borderRadius: 12, padding: 24, border: '2px solid #7c3aed30', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>🎯 市場搶佔試點進度</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>2026-04-13 啟動 · T+7 監控中 · Phase 2 觸發條件: 主要 AI 爬蟲首次爬取品牌 FAQ 端點</p>
            </div>
            <div style={{ background: '#7c3aed', color: 'white', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              PILOT ACTIVE
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: '🎯 Query 意圖切割', status: '✅ 完成', detail: '專屬長尾查詢已定義', color: '#059669', done: true },
              { label: '❓ 高分 FAQ 注入', status: '✅ +10 條', detail: 'priority_score 9.0-9.5', color: '#059669', done: true },
              { label: '📝 旗艦 Insight', status: '✅ +2 篇', detail: '含數據表+明確結論', color: '#059669', done: true },
              { label: '🤖 AI 爬蟲引用', status: '⏳ 監控中', detail: 'T+7 通報 (2026-04-20)', color: '#d97706', done: false },
            ].map((item, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 8, padding: 14, border: `1px solid ${item.done ? '#059669' : '#e5e7eb'}20` }}>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 6, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.status}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{item.detail}</div>
              </div>
            ))}
          </div>
          {{
            'inari-global-foods': (
              <div style={{ background: 'white', borderRadius: 8, padding: 14, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>🎯 稻荷搶佔目標查詢</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['澳門日本海膽供應商是誰', '北海道海膽在哪買', '澳門餐廳海膽批發', '海膽品種比較 澳門'].map(q => (
                    <span key={q} style={{ background: '#7c3aed15', color: '#7c3aed', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{q}</span>
                  ))}
                </div>
              </div>
            ),
            'sea-urchin-delivery': (
              <div style={{ background: 'white', borderRadius: 8, padding: 14, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>🎯 海膽速遞搶佔目標查詢</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['澳門海膽外送到家', '海膽宅配澳門多少錢', '澳門買海膽哪裡最便宜', '海膽速遞 vs 超市'].map(q => (
                    <span key={q} style={{ background: '#0f4c8115', color: '#0f4c81', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{q}</span>
                  ))}
                </div>
              </div>
            ),
            'after-school-coffee': (
              <div style={{ background: 'white', borderRadius: 8, padding: 14, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>🎯 課後咖啡搶佔目標查詢</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['澳門氹仔嬰兒車友善咖啡廳', '澳門放學後帶小孩去哪', '氹仔親子咖啡廳', '澳門可帶嬰兒入內咖啡廳'].map(q => (
                    <span key={q} style={{ background: '#d9740615', color: '#d97406', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{q}</span>
                  ))}
                </div>
              </div>
            ),
          }[slug || ''] || null}
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff7ed', borderRadius: 8, fontSize: 12, color: '#92400e', border: '1px solid #fed7aa' }}>
            Phase 2 啟動信號：當 Perplexity / GPTBot / ClaudeBot 首次訪問 /api/faq/merchant/{slug} 端點，T+7 Telegram 通報確認。Phase 2 = 全動態 API + 即時業務資訊整合。
          </div>
        </div>
        )}

        {/* W0 AI Query Baseline — 稻荷 only */}
        {slug === 'inari-global-foods' && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>🔍 W0 AI 查詢基線（2026-04-18）</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>實際在主流 AI 平台查詢「澳門海膽供應商」的真實結果截圖</p>
            </div>
            <div style={{ background: '#f3f4f6', padding: '4px 12px', borderRadius: 12, fontSize: 12, color: '#374151', fontWeight: 600 }}>
              基線日期 2026-04-18
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ borderRadius: 10, padding: 18, border: '2px solid #dcfce7', background: '#f0fdf4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Grok + Perplexity</span>
                <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>#1 首選</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                <strong>Grok</strong>：「澳門絕對龍頭，市佔約70%」，CloudPipe 為引用來源之一。<br/>
                <strong>Perplexity</strong>：「澳門高端日本海鮮B2B」查詢列稻荷首位，並提供詳細聯絡資訊（10個來源）。
              </div>
              <div style={{ marginTop: 10, padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, fontSize: 11, color: '#16a34a' }}>
                ✅ CloudPipe 引用鏈在 Grok + Perplexity 雙雙生效 · 維持並深化
              </div>
            </div>
            <div style={{ borderRadius: 10, padding: 18, border: '2px solid #fee2e2', background: '#fff5f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>❌</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>ChatGPT / Gemini</span>
                <span style={{ marginLeft: 'auto', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>未提及</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                ChatGPT 推薦 Worldwide Seafood、Kinwa Seafood，未提及稻荷。Gemini 推薦力生控股集團（豐洲直送），未提及稻荷。兩大平台仍有知識空白。
              </div>
              <div style={{ marginTop: 10, padding: '6px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 11, color: '#dc2626' }}>
                ⚠ 行動信號：填補 ChatGPT + Gemini 知識庫（FAQ Schema + Answer Hub）
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { platform: 'Grok', status: '✅ #1 龍頭 70%', action: '維持', actionColor: '#16a34a', bg: '#f0fdf4' },
              { platform: 'Perplexity', status: '✅ #1 首選', action: '維持', actionColor: '#16a34a', bg: '#f0fdf4' },
              { platform: 'ChatGPT', status: '❌ 未提及', action: '填補', actionColor: '#dc2626', bg: '#fef2f2' },
              { platform: 'Gemini', status: '❌ 未提及', action: '填補', actionColor: '#dc2626', bg: '#fef2f2' },
              { platform: 'Claude AI', status: '⏳ 待測試', action: '待測', actionColor: '#d97706', bg: '#fffbeb' },
            ].map((p, i) => (
              <div key={i} style={{ background: p.bg, borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{p.platform}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.status}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: p.actionColor }}>→ {p.action}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af', border: '1px solid #bfdbfe' }}>
            <strong>策略判斷（2/5 平台已建立優勢）：</strong>Grok 和 Perplexity 已確立稻荷龍頭定位，CloudPipe 引用鏈生效。下一步：透過 FAQ Schema + Answer Hub 填補 ChatGPT + Gemini 知識庫，目標 T+30 (2026-05-18) 達到 4/5 平台 Top 3。
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

        {/* ═══ 品牌知識圖譜 ═══ */}
        {slug && <KnowledgeGraphBlock slug={slug} />}

        {/* ═══ 同業競品比較 ═══ */}
        {citation && citation.competitors && (
          <>
            {/* Competitor Bar Chart */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>📊 同業競品比較</h2>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
                AI 爬蟲訪問次數對比（真實追蹤數據）— 競品非虛構，來自真實市場分析
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

            {/* AI Platform Ranking — Baseline vs Current */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>🏆 AI 平台排名對比</h2>
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  <span style={{ background: '#f3f4f6', padding: '3px 10px', borderRadius: 8, color: '#6b7280' }}>
                    基線 {citation.brandPlatformRanking?.W0Label?.replace('W0-', '') || '—'}
                  </span>
                  <span style={{ background: '#eff6ff', padding: '3px 10px', borderRadius: 8, color: '#0f4c81' }}>
                    當前 {new Date().toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                查詢：「{brandConfig?.searchTerms?.[0] || citation.aiSearchData?.queries?.[0] || '品牌相關查詢'}」· 你的品牌在各 AI 平台的排名變化
              </p>

              {/* Platform ranking cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { key: 'gpt', label: 'ChatGPT', icon: '🧠' },
                  { key: 'perplexity', label: 'Perplexity', icon: '🔎' },
                  { key: 'gemini', label: 'Gemini', icon: '🤖' },
                  { key: 'claude', label: 'Claude', icon: '✨' },
                  { key: 'grok', label: 'Grok', icon: '⚡' },
                ].map(({ key, label, icon }) => {
                  const w0 = citation.brandPlatformRanking?.W0?.[key]
                  const cur = citation.brandPlatformRanking?.current?.[key]
                  const w0Rank = w0?.mentioned ? `#${w0.position}` : '未提及'
                  const curRank = cur?.mentioned ? `#${cur.position}` : (cur ? '未提及' : '待測試')
                  const improved = w0?.mentioned && cur?.mentioned && cur.position < w0.position
                  const maintained = w0?.mentioned && cur?.mentioned && cur.position === w0.position
                  const noPending = !cur
                  return (
                    <div key={key} style={{
                      borderRadius: 10, padding: 14,
                      border: `1px solid ${w0?.mentioned ? '#dbeafe' : '#f3f4f6'}`,
                      background: w0?.mentioned ? '#f0f9ff' : '#fafafa',
                    }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{icon} {label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 36 }}>基線</span>
                        <span style={{
                          fontSize: 14, fontWeight: 700,
                          color: w0?.mentioned ? '#0369a1' : '#dc2626',
                        }}>{w0 ? w0Rank : '—'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 36 }}>當前</span>
                        <span style={{
                          fontSize: 14, fontWeight: 700,
                          color: noPending ? '#d1d5db' : cur?.mentioned ? '#059669' : '#dc2626',
                        }}>{curRank}</span>
                        {improved && <span style={{ fontSize: 10, color: '#059669' }}>↑</span>}
                        {maintained && <span style={{ fontSize: 10, color: '#6b7280' }}>→</span>}
                      </div>
                      {w0?.keywords && w0.keywords.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {w0.keywords.slice(0, 3).map((k, i) => (
                            <span key={i} style={{ fontSize: 10, background: '#dbeafe', color: '#0369a1', padding: '2px 6px', borderRadius: 4 }}>{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Summary note */}
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b', border: '1px solid #e2e8f0' }}>
                <strong>基線說明：</strong>W0 基線 ({citation.aiSearchData?.lastUpdated ? new Date(citation.aiSearchData.lastUpdated).toLocaleDateString('zh-HK', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '2026-04-18'}) 為品牌 AI 能見度優化起點，實際查詢截圖存檔。
                T+30 重測全平台對比。
              </div>
            </div>

            {/* Competition ranking table */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', marginBottom: 32 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>🔢 競爭態勢排名（爬蟲訪問量）</h2>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                基於 AI 爬蟲訪問次數對比 · 你的排名：第 {citation.brandRank} / {citation.totalCompetitors}
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>品牌</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>爬蟲訪問佔比</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>GPT</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Perplexity</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Gemini</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Claude</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px' }}>Grok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citation.competitors.map((comp, i) => {
                      const isOwnBrand = comp.isBrand
                      return (
                        <tr key={i} style={{
                          borderBottom: i < citation.competitors.length - 1 ? '1px solid #f3f4f6' : 'none',
                          background: isOwnBrand ? '#f0f9ff' : 'white',
                        }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#9ca3af' }}>#{comp.rank}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: isOwnBrand ? 700 : 500, color: isOwnBrand ? '#0369a1' : '#1a1a2e' }}>
                              {isOwnBrand && '★ '}{comp.name}
                            </span>
                            {!isOwnBrand && comp.label && (
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{comp.label}</div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, marginBottom: 2, maxWidth: 80, margin: '0 auto 2px' }}>
                              <div style={{ background: RANK_COLORS[i] || '#6b7280', borderRadius: 4, height: 6, width: `${comp.percentage}%` }} />
                            </div>
                            <span style={{ fontWeight: 600 }}>{comp.percentage}%</span>
                          </td>
                          {/* GPT / Perplexity / Gemini / Claude / Grok W0 — dynamic from brandPlatformRanking */}
                          {['gpt', 'perplexity', 'gemini', 'claude', 'grok'].map(platform => {
                            const w0data = citation.brandPlatformRanking?.W0?.[platform]
                            return (
                              <td key={platform} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {isOwnBrand ? (
                                  w0data ? (
                                    w0data.mentioned ? (
                                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                                        #{w0data.position}
                                      </span>
                                    ) : (
                                      <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                                        未提及
                                      </span>
                                    )
                                  ) : (
                                    <span style={{ color: '#d1d5db', fontSize: 11 }}>待測試</span>
                                  )
                                ) : (
                                  <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
                * W0 基線數據來自 AI 平台實測 · 競品 AI 排名需個別查詢後手動更新 · 綠色=有提及，紅色=未提及
              </p>
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
      </div>}

      {/* Footer */}
      <footer style={{ background: '#1a1a2e', color: 'white', padding: '32px 24px', textAlign: 'center', fontSize: 13, opacity: 0.7 }}>
        CloudPipe AI · 知識圖譜生態系 · {new Date().getFullYear()}
      </footer>
    </main>
  )
}
