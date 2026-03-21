'use client'

import { useState } from 'react'

interface Check { id: string; name: string; dim: string; max: number; score: number; detail: string }
interface Fix { check_id: string; check_name: string; dimension: string; current_score: number; max_score: number; fix: string }
interface DimScore { score: number; max: number; pct: number }
interface ScanResult {
  url: string; score: number; grade: string
  aeo: DimScore; seo: DimScore; geo: DimScore
  checks: Check[]; issues: Check[]; fixes: Fix[]
  scan_time: number; scanned_at: string; error?: string
}

const DIM_COLORS: Record<string, string> = {
  AEO: '#10a37f',
  SEO: '#4285f4',
  GEO: '#ff9900',
}

const DIM_ICONS: Record<string, string> = {
  AEO: '🤖',
  SEO: '🔍',
  GEO: '📍',
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10a37f', A: '#10a37f', 'B+': '#4285f4', B: '#4285f4',
  C: '#ff9900', D: '#e74c3c', F: '#c0392b',
}

function CircleScore({ score, max, label, color }: { score: number; max: number; label: string; color: string }) {
  const pct = max ? Math.round(score / max * 100) : 0
  const r = 40, c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#eee" strokeWidth={8} />
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={50} y={46} textAnchor="middle" fontSize={20} fontWeight={700} fill="#111">{pct}%</text>
        <text x={50} y={62} textAnchor="middle" fontSize={10} fill="#888">{score}/{max}</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function VisibilityPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const doScan = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/v1/visibility-scan?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      if (data.error && !data.score && data.score !== 0) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (e) {
      setError('掃描失敗，請稍後重試')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
          CloudPipe Visibility Engine
        </h1>
        <p style={{ color: '#666', fontSize: 15, margin: '8px 0 0' }}>
          AEO + SEO + GEO 三維掃描 — 讓 AI 和搜尋引擎都看見你的生意
        </p>
      </div>

      {/* Scan Input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doScan()}
          placeholder="輸入網址，例如 https://example.com"
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 10, border: '2px solid #ddd',
            fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#4285f4'}
          onBlur={e => e.target.style.borderColor = '#ddd'}
        />
        <button
          onClick={doScan}
          disabled={loading}
          style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: loading ? '#999' : '#111', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? '掃描中...' : '掃描'}
        </button>
      </div>

      {error && <p style={{ color: '#e74c3c', textAlign: 'center', padding: 12, background: '#fef0f0', borderRadius: 8 }}>{error}</p>}

      {/* Results */}
      {result && !result.error && (
        <div>
          {/* Score Overview */}
          <div style={{
            background: '#fafafa', borderRadius: 16, padding: '24px 20px', marginBottom: 20,
            border: '1px solid #eee', textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>{result.url}</div>
            <div style={{
              fontSize: 64, fontWeight: 800, color: GRADE_COLORS[result.grade] || '#333',
              lineHeight: 1.1,
            }}>
              {result.score}<span style={{ fontSize: 24, color: '#999' }}>/100</span>
            </div>
            <div style={{
              display: 'inline-block', padding: '4px 16px', borderRadius: 20,
              background: GRADE_COLORS[result.grade] || '#333', color: '#fff',
              fontWeight: 700, fontSize: 14, marginTop: 8,
            }}>
              {result.grade}
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
              掃描時間 {result.scan_time}s
            </div>
          </div>

          {/* Three Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#f0faf5', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid #c8f5d5' }}>
              <CircleScore score={result.aeo.score} max={result.aeo.max} label="🤖 AEO — AI 可見度" color="#10a37f" />
            </div>
            <div style={{ background: '#f0f4ff', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid #c8ddf5' }}>
              <CircleScore score={result.seo.score} max={result.seo.max} label="🔍 SEO — 搜尋排名" color="#4285f4" />
            </div>
            <div style={{ background: '#fff8f0', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid #f5dfc8' }}>
              <CircleScore score={result.geo.score} max={result.geo.max} label="📍 GEO — 本地曝光" color="#ff9900" />
            </div>
          </div>

          {/* Issues & Fixes */}
          {result.fixes.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#e74c3c' }}>
                ⚠️ {result.fixes.length} 個問題需要修復
              </h3>
              {result.fixes.map((fix, i) => (
                <div key={fix.check_id} style={{
                  padding: '12px 0', borderBottom: i < result.fixes.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        background: DIM_COLORS[fix.dimension] + '15', color: DIM_COLORS[fix.dimension],
                        fontSize: 11, fontWeight: 700, marginRight: 8,
                      }}>{DIM_ICONS[fix.dimension]} {fix.dimension}</span>
                      {fix.check_name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e74c3c' }}>
                      {fix.current_score}/{fix.max_score}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#666', paddingLeft: 4 }}>
                    💡 {fix.fix}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Checks Detail */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #eee' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
              📋 完整檢查明細 ({result.checks.filter(c => c.score >= c.max * 0.6).length}/{result.checks.length} 通過)
            </h3>
            {['AEO', 'SEO', 'GEO'].map(dim => (
              <div key={dim} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: DIM_COLORS[dim],
                  marginBottom: 8, paddingBottom: 4, borderBottom: `2px solid ${DIM_COLORS[dim]}20`,
                }}>
                  {DIM_ICONS[dim]} {dim}
                </div>
                {result.checks.filter(c => c.dim === dim).map(c => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', fontSize: 13,
                  }}>
                    <span>
                      <span style={{ color: c.score >= c.max * 0.6 ? '#10a37f' : '#e74c3c', marginRight: 6 }}>
                        {c.score >= c.max * 0.6 ? '✓' : '✗'}
                      </span>
                      {c.name}
                      <span style={{ color: '#aaa', marginLeft: 8, fontSize: 11 }}>{c.detail}</span>
                    </span>
                    <span style={{ fontWeight: 600, color: c.score >= c.max * 0.6 ? '#10a37f' : '#e74c3c' }}>
                      {c.score}/{c.max}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* One-Click Fix Generator */}
          {result.fixes.length > 0 && (
            <FixGenerator url={result.url} score={result.score} />
          )}

          {/* CTA */}
          <div style={{
            marginTop: 24, padding: 20, borderRadius: 12, textAlign: 'center',
            background: 'linear-gradient(135deg, #111 0%, #333 100%)', color: '#fff',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              想讓 CloudPipe 幫你全面優化？
            </div>
            <div style={{ fontSize: 13, color: '#ccc', marginBottom: 16 }}>
              專業版包含：AI Agent 對話顧問 + 每週自動報告 + AI 爬蟲追蹤 + 持續優化
            </div>
            <a href="https://cloudpipe-landing.vercel.app" target="_blank" style={{
              display: 'inline-block', padding: '10px 28px', borderRadius: 8,
              background: '#10a37f', color: '#fff', textDecoration: 'none',
              fontWeight: 600, fontSize: 14,
            }}>
              了解方案 →
            </a>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15 }}>輸入任意網址，4 秒內取得 AEO + SEO + GEO 三維分數</div>
          <div style={{ fontSize: 13, marginTop: 8, color: '#bbb' }}>
            免費掃描 · 無需註冊 · 即時結果
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, textAlign: 'center', fontSize: 11, color: '#ccc' }}>
        CloudPipe Visibility Engine — AEO + SEO + GEO 三維掃描
        <br />Powered by CloudPipe AI · 18 項檢查 · 即時修復建議
      </div>
    </div>
  )
}

// ── Fix Generator Component ──

function FixGenerator({ url, score }: { url: string; score: number }) {
  const [bizName, setBizName] = useState('')
  const [bizType, setBizType] = useState('')
  const [desc, setDesc] = useState('')
  const [phone, setPhone] = useState('')
  const [addr, setAddr] = useState('')
  const [fixes, setFixes] = useState<Record<string, string> | null>(null)
  const [instructions, setInstructions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const generate = async () => {
    if (!bizName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/visibility-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url, business_name: bizName, business_type: bizType,
          description: desc, phone, address: addr, fix_type: 'all',
        }),
      })
      const data = await res.json()
      setFixes(data.files || {})
      setInstructions(data.instructions || [])
    } catch {
      alert('生成失敗，請稍後重試')
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    alert(`已複製 ${label} 到剪貼板！`)
  }

  return (
    <div style={{
      marginTop: 20, borderRadius: 12, border: '2px solid #10a37f',
      overflow: 'hidden',
    }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '16px 20px', border: 'none', cursor: 'pointer',
        background: '#f0faf5', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', fontSize: 15, fontWeight: 700, color: '#10a37f',
      }}>
        <span>🔧 一鍵生成修復檔案（llms.txt + Schema.org + robots.txt）</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: 20, background: '#fff' }}>
          {!fixes ? (
            <div>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>
                填寫基本資訊，自動生成所有 AEO 必備檔案
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input placeholder="商戶名稱 *" value={bizName} onChange={e => setBizName(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
                <input placeholder="業務類型（餐廳/酒店/銀行...）" value={bizType} onChange={e => setBizType(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
                <input placeholder="電話 (+853...)" value={phone} onChange={e => setPhone(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
                <input placeholder="地址" value={addr} onChange={e => setAddr(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              </div>
              <textarea placeholder="商戶簡介（50-200 字）" value={desc} onChange={e => setDesc(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minHeight: 60, resize: 'vertical', boxSizing: 'border-box' }} />
              <button onClick={generate} disabled={loading || !bizName.trim()} style={{
                marginTop: 12, padding: '10px 24px', borderRadius: 8, border: 'none',
                background: loading ? '#999' : '#10a37f', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              }}>
                {loading ? '生成中...' : '🚀 一鍵生成所有修復檔案'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
                {Object.keys(fixes).map(filename => (
                  <span key={filename} style={{
                    padding: '4px 12px', borderRadius: 20, background: '#e8f5e9',
                    color: '#2e7d32', fontSize: 12, fontWeight: 600,
                  }}>✓ {filename}</span>
                ))}
              </div>

              {Object.entries(fixes).map(([filename, content]) => (
                <div key={filename} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>📄 {filename}</span>
                    <button onClick={() => copyToClipboard(content, filename)} style={{
                      padding: '4px 12px', borderRadius: 6, border: '1px solid #ddd',
                      background: '#fff', fontSize: 12, cursor: 'pointer',
                    }}>📋 複製</button>
                  </div>
                  <pre style={{
                    background: '#f5f5f5', padding: 12, borderRadius: 8,
                    fontSize: 11, overflow: 'auto', maxHeight: 200,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>{content}</pre>
                </div>
              ))}

              {instructions.length > 0 && (
                <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, marginTop: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📝 安裝步驟：</div>
                  {instructions.map((inst, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{inst}</div>
                  ))}
                </div>
              )}

              <button onClick={() => { setFixes(null); setBizName(''); setBizType(''); setDesc(''); setPhone(''); setAddr('') }}
                style={{ marginTop: 12, padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
                ← 重新生成
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
