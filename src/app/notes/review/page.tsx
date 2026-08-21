'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TimelineEvent {
  id: string
  date: string
  type: 'created' | 'updated' | 'reviewed' | 'synced' | 'archived'
  note_title: string
  note_slug: string
  description: string
}

interface BrainSearchResult {
  note_id: string
  title: string
  slug: string
  snippet: string
  relevance: number
  matched_terms: string[]
}

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#0a0a0f',
  card: '#12121a',
  cardBorder: 'rgba(255,255,255,0.08)',
  cardBorderHover: 'rgba(255,255,255,0.15)',
  text: '#e4e4e7',
  muted: 'rgba(255,255,255,0.5)',
  gold: '#fbbf24',
  goldGlow: 'rgba(251,191,36,0.15)',
  green: '#4ade80',
  greenBg: 'rgba(74,222,128,0.1)',
  blue: '#60a5fa',
  purple: '#a78bfa',
  red: '#f87171',
}

// ── Timeline Event Component ────────────────────────────────────────────────
function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const typeConfig = {
    created: { icon: '➕', color: T.blue, label: '建立' },
    updated: { icon: '✏️', color: T.gold, label: '更新' },
    reviewed: { icon: '👁️', color: T.purple, label: '檢閱' },
    synced: { icon: '🔄', color: T.green, label: '同步' },
    archived: { icon: '✅', color: T.green, label: '存檔' },
  }
  const config = typeConfig[event.type]
  
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Timeline line */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        width: 40,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `${config.color}20`,
          border: `2px solid ${config.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}>
          {config.icon}
        </div>
        {!isLast && (
          <div style={{
            width: 2,
            flex: 1,
            background: T.cardBorder,
            marginTop: 8,
            minHeight: 60,
          }} />
        )}
      </div>
      
      {/* Content */}
      <div style={{ 
        flex: 1, 
        paddingBottom: isLast ? 0 : 24,
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          marginBottom: 4,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: config.color, fontWeight: 500 }}>
            {config.label}
          </span>
          <span style={{ fontSize: 12, color: T.muted }}>
            {new Date(event.date).toLocaleDateString('zh-TW', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <h4 style={{ 
          margin: 0, 
          fontSize: 15, 
          fontWeight: 600, 
          color: T.text,
          marginBottom: 4,
        }}>
          {event.note_title}
        </h4>
        <p style={{ 
          margin: 0, 
          fontSize: 13, 
          color: T.muted,
          lineHeight: 1.5,
        }}>
          {event.description}
        </p>
      </div>
    </div>
  )
}

// ── Brain Search Component ──────────────────────────────────────────────────
function BrainSearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BrainSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setSearching(true)
    
    // Mock brain search - in production, call brain API
    await new Promise(r => setTimeout(r, 800))
    
    const mockResults: BrainSearchResult[] = [
      {
        note_id: '1',
        title: 'Brand Onboarding 流程優化',
        slug: 'brand-onboarding-2026',
        snippet: '...記錄 Brand Portal 2.0 上線後的 onboarding 流程優化，特別係用戶體驗方面...',
        relevance: 0.95,
        matched_terms: ['onboarding', '流程', '優化'],
      },
      {
        note_id: '2',
        title: '商戶數據質量提升方案',
        slug: 'merchant-data-quality',
        snippet: '...關於如何提升商戶資料的準確性和完整性，包含數據驗證邏輯...',
        relevance: 0.82,
        matched_terms: ['數據', '質量', '商戶'],
      },
    ]
    
    setResults(mockResults)
    setSearching(false)
  }

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 12,
      padding: 20,
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: 16, 
        fontWeight: 600, 
        color: T.text,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        🧠 Brain 檢索
        <span style={{
          padding: '2px 8px',
          background: T.purple,
          borderRadius: 4,
          fontSize: 11,
          color: '#000',
          fontWeight: 600,
        }}>
          AI
        </span>
      </h3>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="輸入關鍵詞檢索學習記錄..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: T.bg,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: 8,
            color: T.text,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          style={{
            padding: '10px 20px',
            background: searching ? T.cardBorder : T.gold,
            border: 'none',
            borderRadius: 8,
            color: searching ? T.muted : '#000',
            fontSize: 14,
            fontWeight: 600,
            cursor: searching ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {searching ? '搜尋中...' : '搜尋'}
        </button>
      </div>
      
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {results.map(result => (
            <div
              key={result.note_id}
              style={{
                padding: 12,
                background: T.bg,
                border: `1px solid ${T.cardBorder}`,
                borderRadius: 8,
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>
                  {result.title}
                </h4>
                <span style={{
                  padding: '2px 6px',
                  background: `${T.green}20`,
                  borderRadius: 4,
                  fontSize: 11,
                  color: T.green,
                }}>
                  {Math.round(result.relevance * 100)}% 相關
                </span>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: 13, 
                color: T.muted, 
                lineHeight: 1.5,
                marginBottom: 8,
              }}>
                {result.snippet}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {result.matched_terms.map(term => (
                  <span
                    key={term}
                    style={{
                      padding: '2px 6px',
                      background: `${T.gold}20`,
                      borderRadius: 4,
                      fontSize: 11,
                      color: T.gold,
                    }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LearningReviewPage() {
  const router = useRouter()
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free')

  // Check user tier on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cloudnote_user')
      if (stored) {
        const user = JSON.parse(stored)
        setUserTier(user.tier || 'free')
      }
    } catch (e) {
      console.error('Failed to get user tier:', e)
    }
  }, [])

  // Redirect free users to pricing
  useEffect(() => {
    if (!loading && userTier === 'free') {
      // Optionally redirect - for now just show upgrade prompt
    }
  }, [loading, userTier])

  useEffect(() => {
    // Mock timeline data - in production, fetch from Supabase
    const mockTimeline: TimelineEvent[] = [
      {
        id: '1',
        date: '2026-08-16T08:00:00Z',
        type: 'reviewed',
        note_title: '8月 SEO 表現檢閱',
        note_slug: 'seo-august-review',
        description: '完成8月份 SEO 流量分析報告審閱',
      },
      {
        id: '2',
        date: '2026-08-15T14:20:00Z',
        type: 'archived',
        note_title: '商戶數據質量提升方案',
        note_slug: 'merchant-data-quality',
        description: '已同步至 Brain，confidence: 0.87',
      },
      {
        id: '3',
        date: '2026-08-12T16:45:00Z',
        type: 'synced',
        note_title: 'AI Crawler 行為研究',
        note_slug: 'ai-crawler-behavior',
        description: '同步至 Brain， matched 23 entities',
      },
      {
        id: '4',
        date: '2026-08-10T10:30:00Z',
        type: 'archived',
        note_title: 'Brand Onboarding 流程優化',
        note_slug: 'brand-onboarding-2026',
        description: '已存檔至 Brain，confidence: 0.92',
      },
      {
        id: '5',
        date: '2026-08-05T11:00:00Z',
        type: 'updated',
        note_title: '商戶數據質量提升方案',
        note_slug: 'merchant-data-quality',
        description: '更新數據驗證邏輯章節',
      },
      {
        id: '6',
        date: '2026-08-01T09:00:00Z',
        type: 'created',
        note_title: 'Brand Onboarding 流程優化',
        note_slug: 'brand-onboarding-2026',
        description: '建立新筆記',
      },
      {
        id: '7',
        date: '2026-07-20T10:00:00Z',
        type: 'created',
        note_title: 'AI Crawler 行為研究',
        note_slug: 'ai-crawler-behavior',
        description: '建立研究筆記',
      },
    ]
    
    setTimeout(() => {
      setTimeline(mockTimeline)
      setLoading(false)
    }, 500)
  }, [])

  // Group by month
  const groupedTimeline = timeline.reduce((acc, event) => {
    const monthKey = new Date(event.date).toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: 'long',
    })
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(event)
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  // Show upgrade prompt for free tier users
  if (userTier === 'free') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: T.bg,
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
          <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 700, color: T.gold }}>
            專業版專屬
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: T.muted, lineHeight: 1.6 }}>
            學習記錄檢閱頁需要 CloudNote 專業版或企業版。
            <br />
            解鎖時間軸回顧 + Brain 智能檢索 + 團隊共享
          </p>
          <button
            onClick={() => router.push('/notes/pricing')}
            style={{
              padding: '14px 32px',
              background: T.green,
              border: 'none',
              borderRadius: 8,
              color: '#000',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            查看升級方案
          </button>
          <div style={{ marginTop: 24 }}>
            <Link href="/notes" style={{ color: T.muted, fontSize: 14, textDecoration: 'none' }}>
              ← 返回筆記列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: T.bg,
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link 
            href="/notes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: T.muted,
              fontSize: 13,
              textDecoration: 'none',
              marginBottom: 12,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回筆記列表
          </Link>
          
          <h1 style={{ 
            margin: 0, 
            fontSize: 28, 
            fontWeight: 700, 
            color: T.text,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            📊 學習記錄檢閱
          </h1>
          <p style={{ margin: '8px 0 0 0', color: T.muted, fontSize: 15 }}>
            時間軸回顧 • Brain 智能檢索
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 360px', 
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Timeline Section */}
          <div style={{
            background: T.card,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: 12,
            padding: 24,
          }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              fontSize: 16, 
              fontWeight: 600, 
              color: T.text,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              📅 時間軸
            </h3>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>
                載入中...
              </div>
            ) : (
              <div>
                {Object.entries(groupedTimeline).map(([month, events]) => (
                  <div key={month} style={{ marginBottom: 24 }}>
                    <h4 style={{ 
                      margin: '0 0 16px 0', 
                      fontSize: 13, 
                      fontWeight: 600, 
                      color: T.gold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {month}
                    </h4>
                    {events.map((event, idx) => (
                      <TimelineItem 
                        key={event.id} 
                        event={event} 
                        isLast={idx === events.length - 1}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Brain Search Sidebar */}
          <div style={{ position: 'sticky', top: 24 }}>
            <BrainSearchPanel />
            
            {/* Stats */}
            <div style={{
              background: T.card,
              border: `1px solid ${T.cardBorder}`,
              borderRadius: 12,
              padding: 20,
              marginTop: 16,
            }}>
              <h4 style={{ 
                margin: '0 0 16px 0', 
                fontSize: 14, 
                fontWeight: 600, 
                color: T.text,
              }}>
                📈 統計
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{
                  padding: 12,
                  background: T.bg,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.gold }}>
                    {timeline.length}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>總事件</div>
                </div>
                <div style={{
                  padding: 12,
                  background: T.bg,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.green }}>
                    {timeline.filter(e => e.type === 'archived' || e.type === 'synced').length}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>已存檔</div>
                </div>
                <div style={{
                  padding: 12,
                  background: T.bg,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.blue }}>
                    {timeline.filter(e => e.type === 'created').length}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>新建立</div>
                </div>
                <div style={{
                  padding: 12,
                  background: T.bg,
                  borderRadius: 8,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.purple }}>
                    {timeline.filter(e => e.type === 'reviewed').length}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>已檢閱</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
