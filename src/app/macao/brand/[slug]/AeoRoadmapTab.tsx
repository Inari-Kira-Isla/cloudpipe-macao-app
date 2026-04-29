'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type AeoAction = {
  id: number
  action_id: string
  priority: 'P0' | 'P1' | 'P2'
  platform: string
  title: string
  description: string
  expected_impact: string
  status: 'pending' | 'in_progress' | 'done' | 'skipped'
  command_hint: string
  completed_at?: string
  completed_by?: string
  notes?: string
}

const PRIORITY_COLOR = {
  P0: 'bg-red-500/20 text-red-300 border border-red-500/30',
  P1: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  P2: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
}

const STATUS_COLOR = {
  pending: 'bg-gray-500/20 text-gray-400',
  in_progress: 'bg-blue-500/20 text-blue-300',
  done: 'bg-green-500/20 text-green-300',
  skipped: 'bg-gray-600/20 text-gray-500 line-through',
}

const STATUS_LABEL = {
  pending: '⏳ 待執行',
  in_progress: '🔄 進行中',
  done: '✅ 完成',
  skipped: '⏭ 跳過',
}

// Inline styles using CP design tokens to match parent page
const CP = {
  gold: '#F5C842',
  navy: '#08111F',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.5)',
  faint: 'rgba(255,255,255,0.35)',
  green: '#4ADE80',
}

const PRIORITY_STYLE: Record<string, React.CSSProperties> = {
  P0: { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 10, padding: '2px 7px', fontWeight: 700, fontFamily: 'monospace' },
  P1: { background: 'rgba(234,179,8,0.15)', color: '#fde047', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 6, fontSize: 10, padding: '2px 7px', fontWeight: 700, fontFamily: 'monospace' },
  P2: { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, fontSize: 10, padding: '2px 7px', fontWeight: 700, fontFamily: 'monospace' },
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending: { background: 'rgba(107,114,128,0.2)', color: 'rgba(209,213,219,0.7)', borderRadius: 6, fontSize: 10, padding: '2px 7px' },
  in_progress: { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', borderRadius: 6, fontSize: 10, padding: '2px 7px' },
  done: { background: 'rgba(74,222,128,0.15)', color: '#4ADE80', borderRadius: 6, fontSize: 10, padding: '2px 7px' },
  skipped: { background: 'rgba(107,114,128,0.1)', color: 'rgba(107,114,128,0.7)', borderRadius: 6, fontSize: 10, padding: '2px 7px', textDecoration: 'line-through' },
}

export default function AeoRoadmapTab({ brandSlug }: { brandSlug: string }) {
  const [actions, setActions] = useState<AeoAction[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('brand_aeo_actions')
      .select('*')
      .eq('brand_slug', brandSlug)
      .order('priority', { ascending: true })
      .order('action_id', { ascending: true })
      .then(({ data }) => {
        setActions(data || [])
        setLoading(false)
      })
  }, [brandSlug])

  const copyHint = (hint: string, id: string) => {
    navigator.clipboard.writeText(hint)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const done = actions.filter(a => a.status === 'done').length
  const total = actions.length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.08)',
        borderTop: `2px solid ${CP.gold}`,
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )

  if (total === 0) return (
    <div style={{
      textAlign: 'center', padding: '64px 24px',
      background: CP.glass, border: `1px solid ${CP.glassBorder}`,
      borderRadius: 18,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>路線圖尚未建立</div>
      <div style={{ fontSize: 13, color: CP.muted }}>
        執行 /chatgpt-verifier 建立基線後，系統將自動生成 AEO 行動計劃
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Progress Header */}
      <div style={{
        borderRadius: 18, border: `1px solid ${CP.glassBorder}`,
        background: CP.glass, backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', padding: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* top shine */}
        <div style={{
          position: 'absolute', top: 0, left: 12, right: 12, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>AI 能見度優化進度</h3>
          <span style={{ color: CP.gold, fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>
            {done}/{total} 完成
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: total ? `${(done / total) * 100}%` : '0%',
            background: `linear-gradient(90deg, ${CP.gold}, #FFD866)`,
            borderRadius: 4,
            transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: `0 0 8px rgba(245,200,66,0.4)`,
          }} />
        </div>
        <p style={{ color: CP.faint, fontSize: 11, marginTop: 8, marginBottom: 0 }}>
          基線：2026-04-29 ChatGPT Search 驗證 · T+14 重測：2026-05-13
        </p>
      </div>

      {/* Actions by Priority */}
      {(['P0', 'P1', 'P2'] as const).map(priority => {
        const group = actions.filter(a => a.priority === priority)
        if (!group.length) return null
        const headerLabel = priority === 'P0'
          ? '🔴 P0 — 立即執行'
          : priority === 'P1'
          ? '🟡 P1 — 本週內'
          : '🔵 P2 — 下週'

        return (
          <div key={priority}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', color: CP.muted, marginBottom: 12,
            }}>
              {headerLabel}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.map(action => (
                <div
                  key={action.id}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${action.status === 'done' ? 'rgba(74,222,128,0.2)' : CP.glassBorder}`,
                    background: action.status === 'done' ? 'rgba(74,222,128,0.04)' : CP.glass,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: 16,
                    opacity: action.status === 'done' ? 0.65 : 1,
                    position: 'relative', overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* top shine */}
                  <div style={{
                    position: 'absolute', top: 0, left: 12, right: 12, height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                    pointerEvents: 'none',
                  }} />

                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Tags row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={PRIORITY_STYLE[action.priority]}>{action.action_id}</span>
                        <span style={{
                          fontSize: 10, color: CP.faint,
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 7px', borderRadius: 6,
                        }}>
                          {action.platform}
                        </span>
                        <span style={STATUS_STYLE[action.status]}>{STATUS_LABEL[action.status]}</span>
                      </div>

                      {/* Title */}
                      <p style={{
                        margin: 0, fontSize: 14, fontWeight: 600,
                        color: '#fff', lineHeight: 1.4,
                      }}>
                        {action.title}
                      </p>

                      {/* Impact */}
                      <p style={{
                        margin: '4px 0 0', fontSize: 12,
                        color: CP.muted, lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      } as React.CSSProperties}>
                        {action.expected_impact}
                      </p>
                    </div>
                  </div>

                  {/* Command Hint */}
                  {action.command_hint && action.status !== 'done' && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{
                        flex: 1, fontSize: 12,
                        background: 'rgba(0,0,0,0.35)',
                        color: CP.gold,
                        padding: '7px 12px', borderRadius: 8,
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}>
                        {action.command_hint}
                      </code>
                      <button
                        onClick={() => copyHint(action.command_hint, String(action.id))}
                        style={{
                          flexShrink: 0, fontSize: 11,
                          padding: '7px 12px', borderRadius: 8,
                          background: copied === String(action.id)
                            ? 'rgba(74,222,128,0.15)'
                            : 'rgba(245,200,66,0.1)',
                          color: copied === String(action.id) ? CP.green : CP.gold,
                          border: `1px solid ${copied === String(action.id) ? 'rgba(74,222,128,0.3)' : 'rgba(245,200,66,0.2)'}`,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {copied === String(action.id) ? '✓ 已複製' : '複製指令'}
                      </button>
                    </div>
                  )}

                  {/* Completion info */}
                  {action.completed_at && (
                    <p style={{
                      margin: '10px 0 0', fontSize: 11,
                      color: 'rgba(74,222,128,0.6)',
                    }}>
                      完成於 {new Date(action.completed_at).toLocaleString('zh-HK')}
                      {action.completed_by && ` · by ${action.completed_by}`}
                    </p>
                  )}

                  {/* Notes */}
                  {action.notes && (
                    <p style={{
                      margin: '8px 0 0', fontSize: 11,
                      color: CP.faint, fontStyle: 'italic',
                    }}>
                      📝 {action.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Footer note */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(245,200,66,0.05)',
        border: '1px solid rgba(245,200,66,0.15)',
        borderRadius: 12, fontSize: 12, color: '#fde68a',
      }}>
        <strong>執行方式：</strong>複製指令後在 Claude Code 執行，或說「執行 {brandSlug} 的 {'{action_id}'}」觸發 /aeo-action Skill 自動完成。
      </div>
    </div>
  )
}
