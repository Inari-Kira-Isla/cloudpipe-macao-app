'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface PlatformStats {
  total: number
  cited: number
  citedRate: number
  runs: number
}

interface CategoryStats {
  total: number
  cited: number
}

interface RecentRun {
  runId: string
  latest: string
  platforms: string[]
  total: number
  cited: number
  citedRate: number
}

interface RecentSample {
  id: number
  query: string
  platform: string
  cloudpipeCount: number
  cited: boolean
  createdAt: string
}

interface DashboardData {
  summary: {
    totalCitations: number
    totalCited: number
    totalCloudpipeUrls: number
    citedRate: number
  }
  platformBreakdown: Record<string, PlatformStats>
  categoryStats: Record<string, CategoryStats>
  recentRuns: RecentRun[]
  trend: {
    thisWeek: number
    lastWeek: number
    change: number
  }
  uniqueQueries: string[]
  recentSamples: RecentSample[]
  lastUpdated: string
}

/* ─────────────────────────────────────────
   UI Tokens
───────────────────────────────────────── */
const TOKENS = {
  color: {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSubtle: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    accent: '#8b5cf6',
  },
  radius: { sm: '6px', md: '12px' },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    border: '1px solid #e2e8f0',
  }
}

const ENGINE_COLORS: Record<string, string> = {
  gemini: '#fbbf24',
  youcom: '#22c55e',
  perplexity: '#3b82f6',
  openai: '#10b981',
  deepseek: '#f97316',
  kimi: '#ec4899',
  doubao: '#8b5cf6',
  claude: '#a855f7',
  default: '#64748b',
}

function getEngineColor(platform: string): string {
  return ENGINE_COLORS[platform.toLowerCase()] || ENGINE_COLORS.default
}

/* ─────────────────────────────────────────
   Components
───────────────────────────────────────── */
function SummaryCard({ 
  title, 
  value, 
  subtitle, 
  color,
  trend,
}: { 
  title: string
  value: string | number
  subtitle?: string
  color?: string
  trend?: { value: number; label: string }
}) {
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: color || TOKENS.color.text }}>
          {value}
        </span>
        {trend && (
          <span style={{ 
            fontSize: 14, 
            fontWeight: 600,
            color: trend.value >= 0 ? '#16a34a' : '#ef4444',
          }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <span style={{ fontSize: 12, color: TOKENS.color.textMuted, marginTop: 4 }}>
          {subtitle}
        </span>
      )}
      {trend && (
        <span style={{ fontSize: 11, color: TOKENS.color.textMuted, marginTop: 2 }}>
          {trend.label}
        </span>
      )}
    </div>
  )
}

function PlatformCard({ 
  platform, 
  stats 
}: { 
  platform: string
  stats: PlatformStats 
}) {
  const color = getEngineColor(platform)
  
  return (
    <div style={{
      ...TOKENS.card,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
        }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: TOKENS.color.text }}>
          {platform}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 700, color: TOKENS.color.text }}>
            {stats.cited}
          </span>
          <span style={{ fontSize: 11, color: TOKENS.color.textMuted, marginLeft: 4 }}>
            / {stats.total}
          </span>
          <div style={{ fontSize: 10, color: TOKENS.color.textMuted }}>
            引用次數
          </div>
        </div>
        <div>
          <span style={{ 
            fontSize: 20, 
            fontWeight: 700, 
            color: stats.citedRate >= 50 ? '#16a34a' : stats.citedRate >= 25 ? '#f59e0b' : '#ef4444' 
          }}>
            {stats.citedRate}%
          </span>
          <div style={{ fontSize: 10, color: TOKENS.color.textMuted }}>
            引用率
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: TOKENS.color.textMuted, marginTop: 8 }}>
        {stats.runs} 次執行
      </div>
    </div>
  )
}

function CitationRow({ sample }: { sample: RecentSample }) {
  return (
    <tr style={{ borderBottom: `1px solid ${TOKENS.color.border}` }}>
      <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: sample.cited ? '#16a34a' : '#ef4444',
          }} />
          <span style={{ 
            fontSize: 12, 
            fontWeight: 600,
            color: sample.cited ? '#16a34a' : '#ef4444',
          }}>
            {sample.cited ? '✅' : '❌'}
          </span>
        </span>
      </td>
      <td style={{ padding: '10px 8px' }}>
        <div style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 8px',
          borderRadius: 4,
          background: getEngineColor(sample.platform) + '20',
          fontSize: 11,
          fontWeight: 500,
          color: getEngineColor(sample.platform),
        }}>
          {sample.platform}
        </div>
      </td>
      <td style={{ padding: '10px 8px', fontSize: 12, color: TOKENS.color.text, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sample.query}
      </td>
      <td style={{ padding: '10px 8px', fontSize: 12, textAlign: 'center' }}>
        {sample.cloudpipeCount > 0 && (
          <span style={{ 
            background: '#dcfce7', 
            color: '#166534',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
          }}>
            {sample.cloudpipeCount} URLs
          </span>
        )}
      </td>
      <td style={{ padding: '10px 8px', fontSize: 11, color: TOKENS.color.textMuted, whiteSpace: 'nowrap' }}>
        {new Date(sample.createdAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
    </tr>
  )
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function CitationsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ai-citations/dashboard')
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

  const { summary, platformBreakdown, trend, recentSamples, lastUpdated } = data

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
          Cross-Engine 引用追蹤儀表板
        </h1>
        <p style={{ color: TOKENS.color.textSubtle, marginTop: 4 }}>
          跨引擎 AI 引用矩陣即時監控
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
          title="總測試次數" 
          value={summary.totalCitations} 
          subtitle="所有引擎 × 查詢"
        />
        <SummaryCard 
          title="成功引用次數" 
          value={summary.totalCited} 
          color={summary.citedRate >= 50 ? '#16a34a' : '#f59e0b'}
          subtitle={`${summary.citedRate}% 引用率`}
        />
        <SummaryCard 
          title="CloudPipe URL 引用" 
          value={summary.totalCloudpipeUrls} 
          subtitle="URL 總數"
          color="#8b5cf6"
        />
        <SummaryCard 
          title="週趨勢" 
          value={trend.thisWeek} 
          subtitle={`上週: ${trend.lastWeek}`}
          color={trend.change >= 0 ? '#16a34a' : '#ef4444'}
          trend={{ value: trend.change, label: '週環比' }}
        />
      </div>

      {/* Platform Cards */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: TOKENS.color.text, marginBottom: 12 }}>
          引擎表現
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
          gap: 12,
        }}>
          {Object.entries(platformBreakdown)
            .sort((a, b) => b[1].cited - a[1].cited)
            .map(([platform, stats]) => (
              <PlatformCard key={platform} platform={platform} stats={stats} />
            ))}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: TOKENS.color.text, marginBottom: 12 }}>
          最近引用記錄
        </h2>
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
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>狀態</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>引擎</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>查詢</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>引用</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 11, color: TOKENS.color.textSubtle, textTransform: 'uppercase' }}>時間</th>
              </tr>
            </thead>
            <tbody>
              {recentSamples.slice(0, 15).map(sample => (
                <CitationRow key={sample.id} sample={sample} />
              ))}
            </tbody>
          </table>
          {recentSamples.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: TOKENS.color.textSubtle }}>
              暫無引用記錄
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize: 11, color: TOKENS.color.textMuted, textAlign: 'center' }}>
        最後更新: {new Date(lastUpdated).toLocaleString('zh-TW')}
      </div>
    </div>
  )
}
