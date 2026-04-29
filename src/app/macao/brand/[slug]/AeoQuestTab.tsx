'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CP = {
  gold: '#F5C842',
  goldGlow: 'rgba(245,200,66,0.25)',
  navy: '#08111F',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.5)',
  faint: 'rgba(255,255,255,0.3)',
  green: '#4ADE80',
  greenBg: 'rgba(74,222,128,0.08)',
  greenBorder: 'rgba(74,222,128,0.2)',
}

const BRAND_START_DATES: Record<string, string> = {
  'inari-global-foods': '2026-04-19',
  'sea-urchin-delivery': '2026-04-19',
  'after-school-coffee': '2026-04-19',
  'mind-cafe': '2026-04-19',
  'cloudpipe': '2026-04-19',
}

const DIRECTIONS = [
  {
    id: 'rank_first',
    icon: '🏆',
    label: '鞏固排名第一',
    desc: '確保 ChatGPT / Perplexity 持續首推你的品牌',
    color: 'rgba(245,200,66,0.1)',
    border: 'rgba(245,200,66,0.35)',
    activeBg: 'rgba(245,200,66,0.15)',
    textColor: '#F5C842',
    btnBg: 'rgba(245,200,66,0.15)',
    btnBorder: 'rgba(245,200,66,0.4)',
  },
  {
    id: 'expand_reach',
    icon: '📡',
    label: '擴大曝光範圍',
    desc: '拓展 AI 平台引用覆蓋，進入更多關鍵詞排名',
    color: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.35)',
    activeBg: 'rgba(59,130,246,0.15)',
    textColor: '#93c5fd',
    btnBg: 'rgba(59,130,246,0.15)',
    btnBorder: 'rgba(59,130,246,0.4)',
  },
  {
    id: 'deepen_faq',
    icon: '💬',
    label: '強化問答覆蓋',
    desc: '填補採購決策 FAQ，搶佔長尾查詢首位',
    color: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.35)',
    activeBg: 'rgba(139,92,246,0.15)',
    textColor: '#c4b5fd',
    btnBg: 'rgba(139,92,246,0.15)',
    btnBorder: 'rgba(139,92,246,0.4)',
  },
  {
    id: 'build_authority',
    icon: '📰',
    label: '建立行業權威',
    desc: '發布深度文章，成為澳門行業 AI 首選引用源',
    color: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.35)',
    activeBg: 'rgba(16,185,129,0.15)',
    textColor: '#6ee7b7',
    btnBg: 'rgba(16,185,129,0.15)',
    btnBorder: 'rgba(16,185,129,0.4)',
  },
] as const

type DirectionId = typeof DIRECTIONS[number]['id']

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
  direction: string | null
  completed_at?: string
}

type PendingTask = {
  id: string
  action_id: string
  direction: string
  status: 'queued' | 'running' | 'done' | 'failed'
  submitted_at: string
  completed_at?: string
  result_summary?: string
}

function getDayNumber(brandSlug: string): number {
  const startStr = BRAND_START_DATES[brandSlug]
  if (!startStr) return 1
  const start = new Date(startStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(Math.max(diff + 1, 1), 14)
}

function getTargetDate(brandSlug: string): string {
  const startStr = BRAND_START_DATES[brandSlug]
  if (!startStr) return ''
  const d = new Date(startStr)
  d.setDate(d.getDate() + 13)
  return d.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric' })
}

export default function AeoQuestTab({ brandSlug }: { brandSlug: string }) {
  const [actions, setActions] = useState<AeoAction[]>([])
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [submitting, setSubmitting] = useState<DirectionId | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const dayNumber = getDayNumber(brandSlug)
  const targetDate = getTargetDate(brandSlug)

  const loadData = useCallback(async () => {
    const [actRes, taskRes] = await Promise.all([
      supabase
        .from('brand_aeo_actions')
        .select('*')
        .eq('brand_slug', brandSlug)
        .order('priority')
        .order('action_id'),
      supabase
        .from('brand_pending_tasks')
        .select('*')
        .eq('brand_slug', brandSlug)
        .order('submitted_at', { ascending: false })
        .limit(20),
    ])
    setActions(actRes.data || [])
    setPendingTasks(taskRes.data || [])
    setLoading(false)
  }, [brandSlug])

  useEffect(() => { loadData() }, [loadData])

  // Poll for status updates when there are queued/running tasks
  useEffect(() => {
    const hasActive = pendingTasks.some(t => t.status === 'queued' || t.status === 'running')
    if (!hasActive) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('brand_pending_tasks')
        .select('*')
        .eq('brand_slug', brandSlug)
        .order('submitted_at', { ascending: false })
        .limit(20)
      if (data) setPendingTasks(data)
    }, 15000)
    return () => clearInterval(interval)
  }, [pendingTasks, brandSlug])

  const submitTask = async (dirId: DirectionId) => {
    const dir = DIRECTIONS.find(d => d.id === dirId)
    if (!dir || submitting) return

    // Find best pending action for this direction
    const target = actions.find(a =>
      a.direction === dirId && (a.status === 'pending' || a.status === 'in_progress')
    )
    if (!target) return

    setSubmitting(dirId)

    // Insert into execution queue
    const { data: task, error } = await supabase
      .from('brand_pending_tasks')
      .insert({
        brand_slug: brandSlug,
        action_id: target.action_id,
        action_title: target.title,
        direction: dirId,
        command_hint: target.command_hint,
        status: 'queued',
      })
      .select()
      .single()

    if (!error && task) {
      setPendingTasks(prev => [task, ...prev])
      // Update action status to in_progress
      await supabase
        .from('brand_aeo_actions')
        .update({ status: 'in_progress' })
        .eq('brand_slug', brandSlug)
        .eq('action_id', target.action_id)
      setActions(prev => prev.map(a =>
        a.action_id === target.action_id ? { ...a, status: 'in_progress' as const } : a
      ))
    }

    setSubmitting(null)
  }

  // Derived data
  const done = actions.filter(a => a.status === 'done').length
  const total = actions.length
  const p0Actions = actions.filter(a => a.priority === 'P0')
  const p0Done = p0Actions.filter(a => a.status === 'done').length

  // For each direction: find the next pending action
  const directionTasks = DIRECTIONS.map(dir => {
    const pending = actions.find(a =>
      a.direction === dir.id && (a.status === 'pending' || a.status === 'in_progress')
    )
    const allDone = actions.filter(a => a.direction === dir.id).every(a => a.status === 'done' || a.status === 'skipped')
    const latestPending = pendingTasks.find(t => t.direction === dir.id && (t.status === 'queued' || t.status === 'running'))
    const latestDone = pendingTasks.find(t => t.direction === dir.id && t.status === 'done')
    return { dir, action: pending, allDone, latestPending, latestDone }
  })

  // Today's recommended direction (first with pending P0 action)
  const recommendedDir = directionTasks.find(dt =>
    dt.action && dt.action.priority === 'P0' && dt.action.status === 'pending'
  )?.dir.id || directionTasks.find(dt => dt.action)?.dir.id

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.08)',
        borderTop: `2px solid ${CP.gold}`,
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── 14日進度 ── */}
      <div style={{
        background: CP.glass, border: `1px solid ${CP.glassBorder}`,
        borderRadius: 18, padding: '18px 20px',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 12, right: 12, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, color: CP.muted }}>第</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: CP.gold, lineHeight: 1 }}>{dayNumber}</span>
            <span style={{ fontSize: 13, color: CP.muted }}>天 / 14 日衝刺</span>
          </div>
          <span style={{ fontSize: 11, color: CP.faint }}>目標 {targetDate}</span>
        </div>

        {/* Day track */}
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: 14 }, (_, i) => {
            const d = i + 1
            const isPast = d < dayNumber
            const isToday = d === dayNumber
            return (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: '100%', height: isToday ? 10 : 6, borderRadius: 3,
                  background: (isPast || isToday) ? `linear-gradient(90deg, ${CP.gold}, #FFD866)` : 'rgba(255,255,255,0.08)',
                  boxShadow: isToday ? `0 0 10px ${CP.goldGlow}` : 'none',
                }} />
                {(d === 1 || d === 7 || d === 14 || d === dayNumber) && (
                  <span style={{ fontSize: 9, color: isToday ? CP.gold : CP.faint, fontWeight: isToday ? 700 : 400 }}>D{d}</span>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{done}/{total}</div>
              <div style={{ fontSize: 10, color: CP.faint }}>已完成</div>
            </div>
            <div style={{ width: 1, background: CP.glassBorder }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: p0Done === p0Actions.length && p0Actions.length > 0 ? CP.green : CP.gold }}>
                {p0Done}/{p0Actions.length}
              </div>
              <div style={{ fontSize: 10, color: CP.faint }}>P0 緊急</div>
            </div>
          </div>
          <div style={{ flex: 1, marginLeft: 20 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: total > 0 ? `${(done / total) * 100}%` : '0%',
                background: `linear-gradient(90deg, ${CP.gold}, #FFD866)`,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize: 10, color: CP.faint, marginTop: 3, textAlign: 'right' }}>
              {total > 0 ? Math.round((done / total) * 100) : 0}% 完成
            </div>
          </div>
        </div>
      </div>

      {/* ── 今日簡報 ── */}
      <div style={{
        background: 'rgba(245,200,66,0.05)',
        border: '1px solid rgba(245,200,66,0.18)',
        borderRadius: 16, padding: '14px 18px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: CP.gold, letterSpacing: 1, marginBottom: 7, textTransform: 'uppercase' }}>
          📋 D{dayNumber} · {new Date().toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
          {recommendedDir
            ? `選擇以下任一方向，AI 系統將立即排隊執行對應任務。${p0Done < p0Actions.length ? `建議優先處理 P0 緊急任務（${p0Actions.length - p0Done} 項待完成）。` : '所有緊急任務已完成，可繼續深化優化。'}`
            : '所有方向任務均已完成！繼續保持 AI 能見度監控。'
          }
        </p>
      </div>

      {/* ── 方向選擇 + 任務執行（核心區域）── */}
      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase', color: CP.muted, marginBottom: 14,
        }}>
          ⚔️ 選擇方向並執行任務
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {directionTasks.map(({ dir, action, allDone, latestPending, latestDone }) => {
            const isSubmitting = submitting === dir.id
            const isQueued = !!latestPending
            const isRecommended = dir.id === recommendedDir
            const hasP0 = action?.priority === 'P0'

            return (
              <div
                key={dir.id}
                style={{
                  borderRadius: 18,
                  border: `1px solid ${isQueued ? CP.greenBorder : isRecommended ? dir.border : CP.glassBorder}`,
                  background: isQueued ? CP.greenBg : isRecommended ? dir.color : CP.glass,
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  padding: 18,
                  position: 'relative', overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  opacity: allDone ? 0.5 : 1,
                }}
              >
                {/* Shine */}
                <div style={{
                  position: 'absolute', top: 0, left: 12, right: 12, height: 1,
                  background: `linear-gradient(90deg, transparent, ${isRecommended ? dir.border : 'rgba(255,255,255,0.06)'}, transparent)`,
                  pointerEvents: 'none',
                }} />

                {/* Recommended badge */}
                {isRecommended && !isQueued && !allDone && (
                  <div style={{
                    position: 'absolute', top: 14, right: 16,
                    fontSize: 9, fontWeight: 700,
                    color: dir.textColor,
                    background: dir.color,
                    border: `1px solid ${dir.border}`,
                    padding: '2px 8px', borderRadius: 20,
                    letterSpacing: 0.8,
                  }}>
                    ⭐ 今日推薦
                  </div>
                )}

                {/* Direction header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{dir.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isRecommended ? dir.textColor : '#fff', marginBottom: 3 }}>
                      {dir.label}
                    </div>
                    <div style={{ fontSize: 11, color: CP.faint, lineHeight: 1.5 }}>{dir.desc}</div>
                  </div>
                </div>

                {/* Associated task */}
                {action && !allDone && (
                  <div style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
                        padding: '1px 6px', borderRadius: 4,
                        ...(action.priority === 'P0'
                          ? { background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }
                          : action.priority === 'P1'
                          ? { background: 'rgba(234,179,8,0.2)', color: '#fde047', border: '1px solid rgba(234,179,8,0.3)' }
                          : { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }
                        ),
                      }}>{action.action_id}</span>
                      <span style={{ fontSize: 10, color: CP.faint, background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>
                        {action.platform}
                      </span>
                      {action.status === 'in_progress' && (
                        <span style={{ fontSize: 9, color: '#93c5fd', background: 'rgba(59,130,246,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                          🔄 進行中
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                      {action.title}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: CP.muted, lineHeight: 1.5 }}>
                      {action.expected_impact}
                    </p>
                  </div>
                )}

                {/* All done state */}
                {allDone && (
                  <div style={{ marginTop: 12, fontSize: 12, color: CP.green }}>
                    ✅ 此方向所有任務已完成
                  </div>
                )}

                {/* Execute button area */}
                {!allDone && action && (
                  <div style={{ marginTop: 14 }}>
                    {isQueued ? (
                      // Queued/running state
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 10,
                        background: CP.greenBg, border: `1px solid ${CP.greenBorder}`,
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: `2px solid ${CP.green}`,
                          borderTop: '2px solid transparent',
                          animation: latestPending?.status === 'running' ? 'spin 0.8s linear infinite' : 'none',
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: CP.green }}>
                            {latestPending?.status === 'running' ? '🔄 執行中...' : '⏳ 已排隊，等待執行'}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(74,222,128,0.6)', marginTop: 2 }}>
                            提交於 {new Date(latestPending!.submitted_at).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Execute button
                      <button
                        onClick={() => submitTask(dir.id)}
                        disabled={isSubmitting}
                        style={{
                          width: '100%', padding: '12px 20px',
                          borderRadius: 12, cursor: isSubmitting ? 'wait' : 'pointer',
                          background: isSubmitting ? 'rgba(255,255,255,0.05)' : dir.btnBg,
                          border: `1px solid ${isSubmitting ? CP.glassBorder : dir.btnBorder}`,
                          color: isSubmitting ? CP.muted : dir.textColor,
                          fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          transition: 'all 0.2s ease',
                          boxShadow: isSubmitting ? 'none' : `0 2px 12px ${dir.color}`,
                        }}
                      >
                        {isSubmitting ? (
                          <>
                            <div style={{
                              width: 12, height: 12, borderRadius: '50%',
                              border: `2px solid ${CP.muted}`,
                              borderTop: `2px solid ${dir.textColor}`,
                              animation: 'spin 0.8s linear infinite',
                            }} />
                            排隊中...
                          </>
                        ) : (
                          <>
                            <span>▶</span>
                            <span>選擇此方向並執行</span>
                            {hasP0 && <span style={{ fontSize: 10, opacity: 0.7 }}>· P0 緊急</span>}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Latest done result */}
                {latestDone && !isQueued && (
                  <div style={{
                    marginTop: 10, padding: '7px 12px',
                    background: 'rgba(74,222,128,0.06)', borderRadius: 8,
                    fontSize: 11, color: 'rgba(74,222,128,0.7)',
                  }}>
                    ✓ 上次執行：{new Date(latestDone.submitted_at).toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' })}
                    {latestDone.result_summary && ` · ${latestDone.result_summary}`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 執行歷史 ── */}
      {pendingTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: 12,
              background: CP.glass, border: `1px solid ${CP.glassBorder}`,
              color: CP.muted, fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span>🕐 執行記錄（{pendingTasks.length} 筆）</span>
            <span style={{ fontSize: 10, transform: showHistory ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
          </button>

          {showHistory && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingTasks.slice(0, 10).map(task => {
                const dir = DIRECTIONS.find(d => d.id === task.direction)
                return (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    background: CP.glass, border: `1px solid ${CP.glassBorder}`,
                    gap: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{dir?.icon || '•'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.action_id} · {actions.find(a => a.action_id === task.action_id)?.title || task.action_id}
                        </div>
                        <div style={{ fontSize: 10, color: CP.faint, marginTop: 1 }}>
                          {new Date(task.submitted_at).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                      ...(task.status === 'done'
                        ? { background: 'rgba(74,222,128,0.15)', color: CP.green }
                        : task.status === 'running'
                        ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }
                        : task.status === 'failed'
                        ? { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }
                        : { background: 'rgba(245,200,66,0.12)', color: CP.gold }
                      ),
                    }}>
                      {task.status === 'done' ? '✓ 完成' : task.status === 'running' ? '🔄 執行中' : task.status === 'failed' ? '✗ 失敗' : '⏳ 排隊中'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 完整行動清單 ── */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${CP.glassBorder}`,
        borderRadius: 12, fontSize: 12, color: CP.faint, lineHeight: 1.6,
      }}>
        📋 共 {total} 項行動 · {done} 已完成 · {total - done} 待執行 ·
        <span style={{ color: CP.gold }}> 選擇方向即自動排隊執行</span>
      </div>
    </div>
  )
}
