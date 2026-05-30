'use client'

import { useState, useCallback, useRef } from 'react'

/* ─── Types ───────────────────────────────────────────────────── */
interface MerchantResult {
  id: string; slug: string; name: string; nameEn: string | null
  category: string | null; district: string | null; tier: string
  verified: boolean; updated: string | null
  aeoScore: number; trustScore: number
  subScores: { schema: number; faq: number; kg: number; cite: number }
  faqCount: number; schemaType: string | null; hasKg: boolean
  citations: { chatgpt: boolean; perplexity: boolean; claude: boolean }
}

interface MerchantDetail {
  faqs: Array<{ q: string; a: string; live: boolean }>
  kgFacts: Array<{ label: string; value: string }>
  hasKg: boolean; kgEntityName: string | null
  schemaAnalysis: { have: string[]; miss: string[] }
  recommendations: Array<{ p: string; lvl: string; title: string; desc: string; cta: string }>
  insights: Array<{ title: string; slug: string; date: string | null }>
}

interface Stats { total: number; verified: number; faqTotal: number }

/* ─── Utilities ────────────────────────────────────────────────── */
const scoreColor = (s: number) => s >= 70 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444'
const mono = { fontFamily: "'ui-monospace','JetBrains Mono',monospace" as const }

const P_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  crit: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.28)', text: '#FCA5A5' },
  warn: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.28)', text: '#FCD34D' },
  info: { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.22)', text: '#67E8F9' },
}

/* ─── Ring ─────────────────────────────────────────────────────── */
function Ring({ score, size = 112 }: { score: number; size?: number }) {
  const sw = 9; const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const off = circ * (1 - score / 100)
  const c = scoreColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize: 25, fontWeight: 700, color: c, lineHeight: 1, ...mono }}>{score}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  )
}

/* ─── Bar ──────────────────────────────────────────────────────── */
function Bar({ label, val }: { label: string; val: number }) {
  const c = scoreColor(val)
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.44)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: c, ...mono }}>{val}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${val}%`, background: c, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

/* ─── CiteBadge ────────────────────────────────────────────────── */
function CiteBadge({ label, cited }: { label: string; cited: boolean }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 7,
      padding: '7px 11px', borderRadius: 7,
      background: cited ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${cited ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.07)'}`,
    }}>
      <span style={{ fontSize: 14, color: cited ? '#10B981' : '#EF4444', lineHeight: 1 }}>{cited ? '✓' : '✗'}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: cited ? '#6EE7B7' : 'rgba(255,255,255,0.36)' }}>{label}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>估計</span>
    </div>
  )
}

/* ─── SchemaChip ────────────────────────────────────────────────── */
function SchemaChip({ label, have }: { label: string; have: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, ...mono,
      background: have ? 'rgba(37,99,235,0.13)' : 'rgba(255,255,255,0.03)',
      color: have ? '#93C5FD' : 'rgba(255,255,255,0.22)',
      border: `1px solid ${have ? 'rgba(37,99,235,0.28)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      {have ? '✓' : '○'} {label}
    </span>
  )
}

/* ─── FAQ Item ─────────────────────────────────────────────────── */
function FaqItem({ faq }: { faq: { q: string; a: string; live: boolean } }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, marginBottom: 5, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 7, flex: 1 }}>
          <span style={{ fontSize: 10, color: faq.live ? '#06B6D4' : 'rgba(255,255,255,0.2)', marginTop: 2, flexShrink: 0 }}>{faq.live ? '●' : '○'}</span>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>{faq.q}</span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginTop: 2 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ padding: '0 12px 11px 27px', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{faq.a}</div>}
    </div>
  )
}

/* ─── Sec ────────────────────────────────────────────────────────── */
function Sec({ title, badge, right, children }: { title: string; badge?: string | number; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{title}</span>
          {badge != null && (
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(37,99,235,0.18)', color: '#93C5FD', border: '1px solid rgba(37,99,235,0.28)', ...mono }}>{badge}</span>
          )}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

/* ─── Detail Panel ─────────────────────────────────────────────── */
function DetailPanel({ merchant, detail, loading }: { merchant: MerchantResult | null; detail: MerchantDetail | null; loading: boolean }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

  if (!merchant) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'rgba(255,255,255,0.15)' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1.5"/>
        {[0,90,180,270].map(a => {
          const rad = (a * Math.PI) / 180
          return <line key={a} x1={20 + Math.cos(rad) * 10} y1={20 + Math.sin(rad) * 10} x2={20 + Math.cos(rad) * 18} y2={20 + Math.sin(rad) * 18} stroke="currentColor" strokeWidth="1.5"/>
        })}
      </svg>
      <span style={{ fontSize: 13 }}>選擇左側商戶以查看 AEO 詳情</span>
    </div>
  )

  const { subScores, citations } = merchant

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(37,99,235,0.035)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <Ring score={merchant.aeoScore} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>{merchant.name}</h2>
              {merchant.nameEn && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{merchant.nameEn}</span>}
              {merchant.verified
                ? <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.22)', fontWeight: 700 }}>已核實</span>
                : <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.22)', fontWeight: 700 }}>未核實</span>
              }
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
              {[merchant.category, merchant.district, merchant.updated ? `更新 ${merchant.updated}` : null].filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <CiteBadge label="ChatGPT" cited={citations.chatgpt} />
              <CiteBadge label="Perplexity" cited={citations.perplexity} />
              <CiteBadge label="Claude" cited={citations.claude} />
            </div>
          </div>
          <div style={{ width: 168, flexShrink: 0 }}>
            <Bar label="Schema.org" val={subScores.schema} />
            <Bar label="FAQ 覆蓋率" val={subScores.faq} />
            <Bar label="KG Facts" val={subScores.kg} />
            <Bar label="AI 引用狀態" val={subScores.cite} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,16,32,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>載入詳情中⋯</span>
          </div>
        )}

        {detail ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
            {/* Left */}
            <div>
              <Sec title="Schema 標記" badge={`${detail.schemaAnalysis.have.length}/${detail.schemaAnalysis.have.length + detail.schemaAnalysis.miss.length}`}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {detail.schemaAnalysis.have.map(s => <SchemaChip key={s} label={s} have />)}
                  {detail.schemaAnalysis.miss.map(s => <SchemaChip key={s} label={s} have={false} />)}
                </div>
              </Sec>

              <Sec title="Knowledge Graph Facts" badge={detail.kgFacts.length || (merchant.hasKg ? '有節點' : '未建立')}>
                {detail.kgFacts.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {detail.kgFacts.map((f, i) => (
                      <div key={i} style={{ padding: '7px 9px', borderRadius: 6, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.11)' }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{f.label}</div>
                        <div style={{ fontSize: 11.5, color: '#CBD5E1', fontWeight: 500 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                    {merchant.hasKg ? 'KG 節點存在但公開 facts 為空' : '此商戶尚未建立 Knowledge Graph 節點'}
                  </div>
                )}
              </Sec>

              <Sec title="相關 Insight 文章" badge={detail.insights.length || undefined}>
                {detail.insights.length > 0 ? detail.insights.map((a, i) => (
                  <a key={i} href={`${siteUrl}/macao/insights/${a.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 7, marginBottom: 5, textDecoration: 'none' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#93C5FD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                      {a.date && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{a.date}</div>}
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>↗</span>
                  </a>
                )) : (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>尚無相關 Insight 文章</div>
                )}
              </Sec>
            </div>

            {/* Right */}
            <div>
              <Sec title="優化建議" badge={detail.recommendations.length}>
                {detail.recommendations.map((r, i) => {
                  const s = P_STYLE[r.lvl] ?? P_STYLE.info
                  return (
                    <div key={i} style={{ padding: '11px 12px', background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 7, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, ...mono, background: s.bg, border: `1px solid ${s.border}`, color: s.text, flexShrink: 0 }}>{r.p}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#E2E8F0', marginBottom: 3 }}>{r.title}</div>
                        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{r.desc}</div>
                      </div>
                      <button style={{ padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: 'rgba(37,99,235,0.18)', border: '1px solid rgba(37,99,235,0.32)', color: '#93C5FD', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>{r.cta}</button>
                    </div>
                  )
                })}
              </Sec>

              <Sec title="FAQ 問答庫" badge={detail.faqs.length}
                right={<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>● 已上線 {detail.faqs.filter(f => f.live).length} 條</span>}
              >
                {detail.faqs.length > 0
                  ? detail.faqs.map((f, i) => <FaqItem key={i} faq={f} />)
                  : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>尚無 FAQ 資料</div>
                }
              </Sec>
            </div>
          </div>
        ) : !loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>無法載入詳情</div>
        ) : null}
      </div>
    </div>
  )
}

/* ─── Merchant List Item ───────────────────────────────────────── */
function MItem({ m, sel, onSelect }: { m: MerchantResult; sel: boolean; onSelect: () => void }) {
  const sc = scoreColor(m.aeoScore)
  return (
    <div onClick={onSelect} style={{ padding: '13px 15px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.045)', borderLeft: `3px solid ${sel ? '#2563EB' : 'transparent'}`, background: sel ? 'rgba(37,99,235,0.1)' : 'transparent', transition: 'background 0.12s, border-color 0.12s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: sel ? '#BFDBFE' : '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
            {!m.verified && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.13)', color: '#FCD34D', border: '1px solid rgba(245,158,11,0.22)', fontWeight: 700, flexShrink: 0 }}>未核實</span>}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>{[m.category, m.district].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: sc, lineHeight: 1, ...mono }}>{m.aeoScore}</div>
          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>AEO</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 9 }}>
        {([['chatgpt', 'GPT'], ['perplexity', 'PPL'], ['claude', 'CLD']] as const).map(([k, lbl]) => (
          <span key={k} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 600, ...mono, background: m.citations[k] ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', color: m.citations[k] ? '#6EE7B7' : 'rgba(255,255,255,0.18)', border: `1px solid ${m.citations[k] ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.06)'}` }}>{lbl}</span>
        ))}
        {m.updated && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{m.updated}</span>}
      </div>
    </div>
  )
}

/* ─── Main Dashboard ───────────────────────────────────────────── */
export function MerchantAeoDashboard({ stats }: { stats: Stats }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MerchantResult[]>([])
  const [sel, setSel] = useState<MerchantResult | null>(null)
  const [detail, setDetail] = useState<MerchantDetail | null>(null)
  const [searching, setSearching] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchDetail = useCallback(async (slug: string) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/merchants/aeo-detail/${slug}`)
      const data = await res.json()
      setDetail(data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const doSearch = useCallback(async (override?: string) => {
    const term = (override ?? q).trim()
    if (!term) return
    setListLoading(true)
    setSearchError('')
    setSearching(true)
    setResults([])
    setSel(null)
    setDetail(null)
    try {
      const res = await fetch(`/api/merchants/aeo-search?q=${encodeURIComponent(term)}`)
      const data = await res.json()
      const r: MerchantResult[] = data.results ?? []
      setResults(r)
      if (r[0]) {
        setSel(r[0])
        fetchDetail(r[0].slug)
      }
    } catch {
      setSearchError('搜尋失敗，請稍後再試')
    } finally {
      setListLoading(false)
    }
  }, [q, fetchDetail])

  const quickSearch = (term: string) => {
    setQ(term)
    setTimeout(() => doSearch(term), 10)
  }

  const handleSelect = (m: MerchantResult) => {
    setSel(m)
    fetchDetail(m.slug)
  }

  const faqFormatted = stats.faqTotal >= 1000
    ? stats.faqTotal >= 100000 ? `${Math.round(stats.faqTotal / 1000)}K` : `${(stats.faqTotal / 1000).toFixed(0)}K`
    : String(stats.faqTotal)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A1020', color: '#CBD5E1', fontFamily: '-apple-system,BlinkMacSystemFont,"Inter",sans-serif', WebkitFontSmoothing: 'antialiased' }}>

      {/* Topbar */}
      <div style={{ height: 50, flexShrink: 0, background: 'rgba(10,16,32,0.97)', borderBottom: '1px solid rgba(255,255,255,0.055)', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#2563EB 0%,#06B6D4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>CP</div>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.2px' }}>CloudPipe</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>|</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>商戶 AEO 儀表板</span>
        </div>
        <div style={{ flex: 1 }} />
        {searching && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 7, padding: '5px 11px' }}>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>⌕</span>
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12.5, color: '#E2E8F0', width: 180 }} placeholder="搜尋商戶..." />
            </div>
            <button onClick={() => doSearch()} style={{ padding: '5px 13px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'rgba(37,99,235,0.85)', border: 'none', color: 'white', cursor: 'pointer' }}>搜尋</button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{stats.total.toLocaleString()} 間商戶</span>
        </div>
      </div>

      {/* Body */}
      {!searching ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 36, padding: 40, background: 'radial-gradient(ellipse 80% 60% at 50% 100%,rgba(37,99,235,0.06) 0%,transparent 70%)' }}>
          <div style={{ textAlign: 'center', maxWidth: 560 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.22em', color: '#06B6D4', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>AEO Intelligence Platform</div>
            <h1 style={{ fontSize: 38, fontWeight: 800, color: '#F1F5F9', lineHeight: 1.18, marginBottom: 14, letterSpacing: '-0.5px' }}>
              澳門商戶 AI 能見度<br />
              <span style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text', backgroundImage: 'linear-gradient(90deg,#2563EB,#06B6D4)' }}>一搜即知</span>
            </h1>
            <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>搜尋任何澳門商戶，查看其在 ChatGPT、Perplexity、Claude 的引用狀態、Schema 完整度及優化建議</p>
          </div>
          <div style={{ width: '100%', maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(37,99,235,0.32)', borderRadius: 13, padding: '13px 14px', boxShadow: '0 0 50px rgba(37,99,235,0.08),0 2px 20px rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>⌕</span>
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15.5, color: '#E2E8F0' }} placeholder="輸入商戶名稱，例如：威尼斯人酒店" autoFocus />
              <button onClick={() => doSearch()} style={{ padding: '9px 20px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', border: 'none', color: 'white', cursor: 'pointer', boxShadow: '0 2px 14px rgba(37,99,235,0.3)' }}>搜尋</button>
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 13, justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>快速搜尋：</span>
              {['威尼斯人', '米其林', '葡萄牙餐廳', '五星酒店'].map(t => (
                <button key={t} onClick={() => quickSearch(t)} style={{ padding: '4px 11px', borderRadius: 5, fontSize: 11.5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.42)', cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 44 }}>
            {[
              [stats.total.toLocaleString(), '澳門商戶'],
              [stats.verified.toLocaleString(), '已核實'],
              [faqFormatted, '已注入 FAQ'],
            ].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', ...mono }}>{v}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left list */}
          <div style={{ width: 308, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.055)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.045)', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                搜尋 「<span style={{ color: '#93C5FD' }}>{q}</span>」 · {listLoading ? '搜尋中⋯' : `${results.length} 個結果`}
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {listLoading ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>搜尋中⋯</div>
              ) : searchError ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#FCA5A5' }}>{searchError}</div>
              ) : results.length > 0 ? (
                results.map(m => <MItem key={m.id} m={m} sel={sel?.id === m.id} onSelect={() => handleSelect(m)} />)
              ) : (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>找不到相關商戶</div>
              )}
            </div>
            <div style={{ padding: '9px 14px', borderTop: '1px solid rgba(255,255,255,0.045)', flexShrink: 0 }}>
              <button onClick={() => { setSearching(false); setResults([]); setSel(null); setDetail(null); setQ('') }} style={{ width: '100%', padding: '7px', borderRadius: 7, fontSize: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>← 返回搜尋</button>
            </div>
          </div>
          {/* Right detail */}
          <DetailPanel merchant={sel} detail={detail} loading={detailLoading} />
        </div>
      )}
    </div>
  )
}
