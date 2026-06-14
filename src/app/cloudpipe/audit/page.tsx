'use client'

import { useState } from 'react'

const ENGINES = [
  { id: 'youcom', name: 'You.com', icon: '🔎', live: true },
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖', live: false },
  { id: 'perplexity', name: 'Perplexity', icon: '🔍', live: false },
]

const CATEGORIES = [
  '餐飲 / 食品',
  '零售 / 商店',
  'B2B 供應商',
  '酒店 / 住宿',
  '美容 / 健康',
  '專業服務',
  '教育 / 培訓',
  '其他',
]

const REGIONS = ['澳門', '香港', '台灣', '日本']

interface AuditResult {
  score: number
  brand: string
  category: string
  region: string
  engines: {
    name: string
    cited: boolean
    competitors: string[]
    snippet?: string
  }[]
  topGap: string
  recommendation: string
  crawlTotal?: number
  crawlByBot?: Record<string, number>
  platforms?: { google: boolean; openrice: boolean; tripadvisor: boolean; yp: boolean }
  sourceDomains?: string[]
  merchantSlug?: string | null
  meta?: {
    layer1Cited: boolean
    layer2Score: number
    factCount: number
    hasVerified: boolean
    hasInsight: boolean
    hasFaq: boolean
    youLive: boolean
  }
}

export default function AuditPage() {
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [region, setRegion] = useState('澳門')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')

  const WHATSAPP_URL = `https://wa.me/85362823037?text=${encodeURIComponent('你好，我完成了 AI 能見度審計，想了解下一步如何提升')}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!brand.trim() || !category) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/cloudpipe/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: brand.trim(), category, region }),
      })
      if (!res.ok) throw new Error('audit_failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('審計暫時無法完成，請稍後再試或 WhatsApp 聯絡我們。')
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (s: number) => s >= 70 ? '#25D366' : s >= 40 ? '#C9A961' : '#e74c3c'
  const scoreLabel = (s: number) => s >= 70 ? '良好' : s >= 40 ? '有待改善' : '急需優化'

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", minHeight: '100vh', background: '#f8f9fc' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #162848 100%)', padding: '40px 20px 48px', textAlign: 'center' }}>
        <a href="/cloudpipe" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 20 }}>
          ← 返回 CloudPipe
        </a>
        <h1 style={{ color: '#fff', fontSize: 'clamp(20px, 5vw, 36px)', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.2 }}>
          AI 能見度免費審計
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(14px, 3.5vw, 16px)', margin: 0, maxWidth: 480, marginInline: 'auto' }}>
          輸入你的品牌名，即時查看 AI 搜尋引擎有否引用你，並分析你的知識圖譜覆蓋缺口
        </p>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px' }}>

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleSubmit}>
            <div className="audit-card" style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 20 }}>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 8 }}>
                  品牌 / 商戶名稱 <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="例：稻荷環球食品、Mind Cafe、添好運"
                  required
                  style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #e0e0e0', borderRadius: 12, fontSize: 16, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = '#C9A961' }}
                  onBlur={e => { e.target.style.borderColor = '#e0e0e0' }}
                />
              </div>

              <div className="audit-selects" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 8 }}>
                    行業類別 <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    required
                    style={{ width: '100%', padding: '13px 12px', border: '1.5px solid #e0e0e0', borderRadius: 12, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    <option value="">請選擇...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 8 }}>
                    地區
                  </label>
                  <select
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    style={{ width: '100%', padding: '13px 12px', border: '1.5px solid #e0e0e0', borderRadius: 12, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <div style={{ background: '#fff5f5', border: '1px solid #ffcccc', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#c0392b' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !brand.trim() || !category}
                style={{
                  width: '100%',
                  background: loading || !brand.trim() || !category ? '#ccc' : '#0A1628',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: 14,
                  fontSize: 17,
                  fontWeight: 800,
                  border: 'none',
                  cursor: loading || !brand.trim() || !category ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {loading ? (
                  <>
                    <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    正在掃描 AI 引擎...
                  </>
                ) : '🔍 立即免費審計'}
              </button>

              <p style={{ textAlign: 'center', color: '#aaa', fontSize: 13, marginTop: 14, marginBottom: 0 }}>
                完全免費，無需註冊，即時出結果
              </p>
            </div>

            {/* What we check */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {ENGINES.map(e => (
                <div key={e.id} style={{ background: '#fff', borderRadius: 12, padding: '9px 16px', fontSize: 14, color: '#444', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {e.icon} {e.name}
                  {e.live && <span style={{ fontSize: 10, background: '#25D36620', color: '#25D366', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>LIVE</span>}
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
              Layer 1：You.com 即時 AI 搜尋（真實查詢）<br />
              Layer 2：ChatGPT / Perplexity 知識圖譜估算
            </p>
          </form>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Score */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '32px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>AI 能見度分數</div>
              <div style={{ fontSize: 'clamp(60px, 20vw, 80px)', fontWeight: 900, color: scoreColor(result.score), lineHeight: 1, marginBottom: 8 }}>
                {result.score}
              </div>
              <div style={{ display: 'inline-block', background: scoreColor(result.score) + '20', color: scoreColor(result.score), padding: '4px 16px', borderRadius: 20, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                {scoreLabel(result.score)}
              </div>
              <p style={{ color: '#555', fontSize: 'clamp(13px, 3.5vw, 15px)', margin: '0 auto', maxWidth: 400, lineHeight: 1.6 }}>
                <strong>{result.brand}</strong> 在 {result.region} {result.category} 類別的 AI 能見度評分
              </p>
            </div>

            {/* Engine breakdown */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>各平台引用狀態</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.engines.map((eng, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px', background: '#f8f9fc', borderRadius: 12 }}>
                    <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: eng.cited ? '#25D36620' : '#e7474720', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {eng.cited ? '✅' : '❌'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 4 }}>
                        {eng.name}
                        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: eng.cited ? '#25D366' : '#e74c3c' }}>
                          {eng.cited ? '有被引用' : '未被引用'}
                        </span>
                      </div>
                      {eng.snippet && (
                        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: eng.competitors.length > 0 ? 6 : 0, wordBreak: 'break-word' }}>
                          「{eng.snippet}」
                        </div>
                      )}
                      {eng.competitors.length > 0 && (
                        <div style={{ fontSize: 12, color: '#888' }}>
                          AI 推薦的是：{eng.competitors.join('、')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Crawl Records */}
            {(result.crawlTotal ?? 0) > 0 && (
              <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>🤖 AI 爬蟲紀錄（過去 30 日）</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>CloudPipe 平台偵測到的 AI 引擎爬取次數</p>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 56, fontWeight: 900, color: '#0A1628', lineHeight: 1 }}>{result.crawlTotal}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>次 AI 爬蟲訪問</div>
                </div>
                {Object.keys(result.crawlByBot ?? {}).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {Object.entries(result.crawlByBot ?? {}).map(([bot, count]) => (
                      <div key={bot} style={{ background: '#f8f9fc', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#0A1628' }}>{count}</div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{bot}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Platform Presence Matrix */}
            <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>📋 平台覆蓋偵測</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>你的商戶資料是否出現在以下平台</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  { name: 'Google Business', present: result.platforms?.google ?? false, icon: '🔵' },
                  { name: 'OpenRice', present: result.platforms?.openrice ?? false, icon: '🍴' },
                  { name: 'TripAdvisor', present: result.platforms?.tripadvisor ?? false, icon: '🦉' },
                  { name: 'yp.mo 澳門黃頁', present: result.platforms?.yp ?? false, icon: '📒' },
                  { name: 'ChatGPT / You.com', present: result.engines.find(e => e.name === 'ChatGPT')?.cited ?? false, icon: '🤖' },
                  { name: 'Perplexity', present: result.engines.find(e => e.name === 'Perplexity')?.cited ?? false, icon: '🔍' },
                ].map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: p.present ? '#25D36610' : '#f8f9fc', borderRadius: 10, border: `1px solid ${p.present ? '#25D36630' : '#f0f0f0'}` }}>
                    <span style={{ fontSize: 18 }}>{p.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{p.name}</span>
                    <span style={{ fontSize: 14 }}>{p.present ? '✅' : '❌'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Sources */}
            {(result.sourceDomains ?? []).length > 0 && (
              <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>📂 知識圖譜資料來源</h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#888' }}>AI 引擎引用你的資料來自以下網站</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.sourceDomains!.map(d => (
                    <span key={d} style={{ padding: '5px 14px', background: '#0A162810', borderRadius: 20, fontSize: 13, color: '#0A1628', fontWeight: 600, border: '1px solid #0A162820' }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Gap + recommendation */}
            <div style={{ background: '#fff8ed', border: '1.5px solid #C9A961', borderRadius: 20, padding: '24px 20px', marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>🎯 主要缺口</h3>
              <p style={{ color: '#444', fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.7, margin: '0 0 14px' }}>{result.topGap}</p>
              <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>💡 建議行動</h3>
              <p style={{ color: '#444', fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.7, margin: 0 }}>{result.recommendation}</p>
            </div>

            {/* CTA */}
            <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #162848 100%)', borderRadius: 20, padding: '28px 20px', textAlign: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: 800, margin: '0 0 8px' }}>想改善這個分數？</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(13px, 3.5vw, 15px)', margin: '0 0 20px' }}>
                中級方案 MOP 499/月 — 每月 Citation 監測 + FAQ 優化
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#fff', padding: '13px 28px', borderRadius: 50, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,211,102,0.4)' }}>
                  📱 WhatsApp 諮詢
                </a>
                <button
                  onClick={() => { setResult(null); setBrand(''); setCategory('') }}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '13px 28px', borderRadius: 50, fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}
                >
                  再審計另一個品牌
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) {
          .audit-selects {
            grid-template-columns: 1fr !important;
          }
          .audit-card {
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
