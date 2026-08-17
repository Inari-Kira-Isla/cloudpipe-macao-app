'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Breakdown {
  trust: number
  verification: number
  fact_check: number
  freshness: number
  uniqueness: number
}

interface InsightOriginality {
  slug: string
  title: string | null
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  citation_worthy: boolean
  trust_score: number | null
  verification_sources_count: number
  has_schema: boolean
  has_faq: boolean
  fact_check_score: number | null
  updated_at: string
  breakdown: Breakdown
}

interface Summary {
  total: number
  citation_worthy: number
  grade_distribution: { A: number; B: number; C: number; D: number; F: number }
  avg_score: number
}

interface DashboardData {
  summary: Summary
  insights: InsightOriginality[]
}

/* ─────────────────────────────────────────
   UI Tokens (matches admin/brands)
───────────────────────────────────────── */
const TOKENS = {
  color: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSubtle: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    accent: '#3b82f6',
  },
  radius: { sm: '6px', md: '12px' },
  shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    border: '1px solid #e2e8f0',
  }
}

const GRADE_COLORS: Record<string, string> = {
  A: '#16a34a', // green
  B: '#3b82f6', // blue
  C: '#f59e0b', // amber
  D: '#f97316', // orange
  F: '#ef4444', // red
}

/* ─────────────────────────────────────────
   Components
───────────────────────────────────────── */
function GradeBadge({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade] || '#64748b'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: '6px',
      background: color,
      color: '#fff',
      fontSize: 14,
      fontWeight: 700,
    }}>
      {grade}
    </span>
  )
}

function ScoreBar({ score, breakdown }: { score: number; breakdown: Breakdown }) {
  const maxScore = 100
  const width = (score / maxScore) * 100
  
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        height: 8,
        background: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <div style={{
          height: '100%',
          width: `${width}%`,
          background: score >= 60 ? '#16a34a' : score >= 40 ? '#f59e0b' : '#ef4444',
          borderRadius: 4,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#64748b' }}>
        <span>T: {breakdown.trust}</span>
        <span>V: {breakdown.verification}</span>
        <span>F: {breakdown.fact_check}</span>
        <span>Fr: {breakdown.freshness}</span>
        <span>U: {breakdown.uniqueness}</span>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div style={{
      ...TOKENS.card,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <span style={{ fontSize: 12, color: TOKENS.color.textSubtle, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
      <span style={{ fontSize: 32, fontWeight: 700, color: color || TOKENS.color.text, marginTop: 4 }}>
        {value}
      </span>
      {subtitle && (
        <span style={{ fontSize: 12, color: TOKENS.color.textMuted, marginTop: 4 }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}

function GradeDistribution({ distribution }: { distribution: Summary['grade_distribution'] }) {
  const total = distribution.A + distribution.B + distribution.C + distribution.D + distribution.F
  
  return (
    <div style={{
      ...TOKENS.card,
      padding: 20,
    }}>
      <span style={{ fontSize: 12, color: TOKENS.color.textSubtle, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Grade 分佈
      </span>
      <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'flex-end', height: 80 }}>
        {(['A', 'B', 'C', 'D', 'F'] as const).map(grade => {
          const count = distribution[grade]
          const height = total > 0 ? (count / total) * 60 : 0
          return (
            <div key={grade} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: GRADE_COLORS[grade] }}>{count}</span>
              <div style={{
                width: '100%',
                height: Math.max(height, 4),
                background: GRADE_COLORS[grade],
                borderRadius: 4,
                marginTop: 4,
              }} />
              <span style={{ fontSize: 11, color: TOKENS.color.textSubtle, marginTop: 4 }}>{grade}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InsightRow({ insight }: { insight: InsightOriginality }) {
  const isCitationWorthy = insight.citation_worthy
  
  return (
    <tr style={{ borderBottom: `1px solid ${TOKENS.color.border}` }}>
      <td style={{ padding: '12px 8px', verticalAlign: 'middle' }}>
        <GradeBadge grade={insight.grade} />
      </td>
      <td style={{ padding: '12px 8px' }}>
        <div style={{ fontWeight: 500, color: TOKENS.color.text }}>{insight.title || insight.slug}</div>
        <div style={{ fontSize: 11, color: TOKENS.color.textMuted, marginTop: 2 }}>{insight.slug}</div>
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: isCitationWorthy ? '#16a34a' : '#ef4444' }}>
          {insight.score}
        </span>
      </td>
      <td style={{ padding: '12px 8px', fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {insight.verification_sources_count > 0 && (
            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
              來源 x{insight.verification_sources_count}
            </span>
          )}
          {insight.has_schema && (
            <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
              Schema
            </span>
          )}
          {insight.has_faq && (
            <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
              FAQ
            </span>
          )}
          {insight.trust_score !== null && (
            <span style={{ background: '#f3e8ff', color: '#7c3aed', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
              Trust: {insight.trust_score}
            </span>
          )}
        </div>
        <ScoreBar score={insight.score} breakdown={insight.breakdown} />
      </td>
      <td style={{ padding: '12px 8px', fontSize: 11, color: TOKENS.color.textMuted, whiteSpace: 'nowrap' }}>
        {new Date(insight.updated_at).toLocaleDateString('zh-TW')}
      </td>
    </tr>
  )
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function OriginalityDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'citation-worthy'>('all')

  useEffect(() => {
    fetch('/api/originality')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setData(data)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: TOKENS.color.textSubtle }}>
        載入中...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
        錯誤: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: TOKENS.color.textSubtle }}>
        無資料
      </div>
    )
  }

  const { summary, insights } = data
  const filteredInsights = filter === 'citation-worthy' 
    ? insights.filter(i => i.citation_worthy)
    : insights

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: TOKENS.color.bg,
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link 
            href="/admin"
            style={{ 
              color: TOKENS.color.accent, 
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            ← Admin
          </Link>
        </div>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: TOKENS.color.text, 
          marginTop: 8,
          margin: '8px 0 0 0',
        }}>
          原創性儀表板
        </h1>
        <p style={{ color: TOKENS.color.textSubtle, marginTop: 4 }}>
          內容原創性評分與 AI 引用價值分析
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 16,
        marginBottom: 24,
      }}>
        <SummaryCard 
          title="總內容數" 
          value={summary.total} 
          subtitle="所有 insights"
        />
        <SummaryCard 
          title="平均分數" 
          value={summary.avg_score} 
          color={summary.avg_score >= 60 ? '#16a34a' : summary.avg_score >= 40 ? '#f59e0b' : '#ef4444'}
          subtitle="滿分 100"
        />
        <SummaryCard 
          title="值得引用" 
          value={summary.citation_worthy} 
          subtitle={`${Math.round(summary.citation_worthy / summary.total * 100) || 0}%`}
          color="#16a34a"
        />
        <SummaryCard 
          title="A 級內容" 
          value={summary.grade_distribution.A} 
          subtitle={`${Math.round(summary.grade_distribution.A / summary.total * 100) || 0}%`}
          color={GRADE_COLORS.A}
        />
      </div>

      {/* Grade Distribution */}
      <div style={{ marginBottom: 24 }}>
        <GradeDistribution distribution={summary.grade_distribution} />
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: filter === 'all' ? TOKENS.color.accent : '#e2e8f0',
            color: filter === 'all' ? '#fff' : TOKENS.color.text,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          全部 ({insights.length})
        </button>
        <button
          onClick={() => setFilter('citation-worthy')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: filter === 'citation-worthy' ? '#16a34a' : '#e2e8f0',
            color: filter === 'citation-worthy' ? '#fff' : TOKENS.color.text,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          值得引用 ({insights.filter(i => i.citation_worthy).length})
        </button>
      </div>

      {/* Table */}
      <div style={{
        ...TOKENS.card,
        overflow: 'hidden',
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: 13,
        }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${TOKENS.color.border}` }}>
              <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>等級</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>內容</th>
              <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>分數</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>評分細項</th>
              <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>更新時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredInsights.map(insight => (
              <InsightRow key={insight.slug} insight={insight} />
            ))}
          </tbody>
        </table>
        {filteredInsights.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: TOKENS.color.textSubtle }}>
            無符合條件的內容
          </div>
        )}
      </div>
    </div>
  )
}
