'use client'
import { useEffect, useState } from 'react'
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
    desc: '強化競品對比，確保 ChatGPT / Perplexity 持續首推你的品牌',
    color: 'rgba(245,200,66,0.1)',
    border: 'rgba(245,200,66,0.35)',
    textColor: '#F5C842',
  },
  {
    id: 'expand_reach',
    icon: '📡',
    label: '擴大曝光範圍',
    desc: '拓展 AI 平台引用覆蓋，進入更多搜尋關鍵詞排名',
    color: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.35)',
    textColor: '#93c5fd',
  },
  {
    id: 'deepen_faq',
    icon: '💬',
    label: '強化問答覆蓋',
    desc: '填補採購決策 FAQ，搶佔長尾查詢首位排名',
    color: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.35)',
    textColor: '#c4b5fd',
  },
  {
    id: 'build_authority',
    icon: '📰',
    label: '建立行業權威',
    desc: '發布深度旗艦文章，成為澳門行業 AI 首選引用來源',
    color: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.35)',
    textColor: '#6ee7b7',
  },
]

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
  notes?: string
}

type DirectionChoice = {
  id: string
  direction: string
  direction_label: string
  day_number: number
  chosen_at: string
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
  const [directionHistory, setDirectionHistory] = useState<DirectionChoice[]>([])
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null)
  const [directionSaved, setDirectionSaved] = useState(false)
  const [savingDirection, setSavingDirection] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [showAllActions, setShowAllActions] = useState(false)

  const dayNumber = getDayNumber(brandSlug)
  const targetDate = getTargetDate(brandSlug)

  useEffect(() => {
    Promise.all([
      supabase
        .from('brand_aeo_actions')
        .select('*')
        .eq('brand_slug', brandSlug)
        .order('priority')
        .order('action_id'),
      supabase
        .from('brand_direction_choices')
        .select('*')
        .eq('brand_slug', brandSlug)
        .order('chosen_at', { ascending: false })
        .limit(14),
    ]).then(([actRes, dirRes]) => {
      setActions(actRes.data || [])
      const dirs = dirRes.data || []
      setDirectionHistory(dirs)
      const todayChoice = dirs.find((d: DirectionChoice) => d.day_number === dayNumber)
      if (todayChoice) {
        setSelectedDirection(todayChoice.direction)
        setDirectionSaved(true)
      }
      setLoading(false)
    })
  }, [brandSlug, dayNumber])

  const saveDirection = async (dirId: string) => {
    const dir = DIRECTIONS.find(d => d.id === dirId)
    if (!dir || savingDirection) return
    setSavingDirection(true)
    setSelectedDirection(dirId)
    await supabase.from('brand_direction_choices').insert({
      brand_slug: brandSlug,
      direction: dirId,
      direction_label: dir.label,
      day_number: dayNumber,
    })
    setDirectionHistory(prev => [{
      id: `${Date.now()}`,
      direction: dirId,
      direction_label: dir.label,
      day_number: dayNumber,
      chosen_at: new Date().toISOString(),
    }, ...prev])
    setDirectionSaved(true)
    setSavingDirection(false)
  }

  const copyHint = (hint: string, id: string) => {
    navigator.clipboard.writeText(hint)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const done = actions.filter(a => a.status === 'done').length
  const total = actions.length
  const p0Actions = actions.filter(a => a.priority === 'P0')
  const p0Done = p0Actions.filter(a => a.status === 'done').length
  const p0Pending = p0Actions.filter(a => a.status === 'pending' || a.status === 'in_progress')
  const todayMissions = p0Pending.length > 0
    ? p0Pending.slice(0, 2)
    : actions.filter(a => a.status === 'pending').slice(0, 2)
  const latestDirection = directionHistory[0]

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

      {/* ── 14日進度時間軸 ── */}
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
            <span style={{ fontSize: 26, fontWeight: 800, color: CP.gold, lineHeight: 1 }}>{dayNumber}</span>
            <span style={{ fontSize: 13, color: CP.muted }}>天 / 14 日 AI 能見度衝刺</span>
          </div>
          <span style={{ fontSize: 11, color: CP.faint }}>目標 {targetDate}</span>
        </div>

        {/* Day track */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {Array.from({ length: 14 }, (_, i) => {
            const d = i + 1
            const isPast = d < dayNumber
            const isToday = d === dayNumber
            const isFuture = d > dayNumber
            return (
              <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: '100%',
                  height: isToday ? 10 : isPast ? 7 : 5,
                  borderRadius: 3,
                  background: isPast
                    ? `linear-gradient(90deg, ${CP.gold}, #FFD866)`
                    : isToday
                    ? CP.gold
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: isToday ? `0 0 10px ${CP.goldGlow}` : 'none',
                  transition: 'all 0.3s ease',
                }} />
                {(d === 1 || d === 7 || d === 14 || d === dayNumber) && (
                  <span style={{
                    fontSize: 9,
                    color: isToday ? CP.gold : isFuture ? 'rgba(255,255,255,0.2)' : CP.faint,
                    fontWeight: isToday ? 700 : 400,
                  }}>D{d}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{done}/{total}</div>
              <div style={{ fontSize: 10, color: CP.faint }}>任務完成</div>
            </div>
            <div style={{ width: 1, background: CP.glassBorder }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: p0Done === p0Actions.length && p0Actions.length > 0 ? CP.green : CP.gold }}>
                {p0Done}/{p0Actions.length}
              </div>
              <div style={{ fontSize: 10, color: CP.faint }}>P0 緊急</div>
            </div>
          </div>
          {/* Overall progress bar */}
          <div style={{ flex: 1, marginLeft: 20 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: total > 0 ? `${(done / total) * 100}%` : '0%',
                background: `linear-gradient(90deg, ${CP.gold}, #FFD866)`,
                transition: 'width 0.6s ease',
                boxShadow: `0 0 6px ${CP.goldGlow}`,
              }} />
            </div>
            <div style={{ fontSize: 10, color: CP.faint, marginTop: 4, textAlign: 'right' }}>
              {total > 0 ? Math.round((done / total) * 100) : 0}% 完成
            </div>
          </div>
        </div>
      </div>

      {/* ── 今日分析簡報 ── */}
      <div style={{
        background: 'rgba(245,200,66,0.05)',
        border: `1px solid rgba(245,200,66,0.18)`,
        borderRadius: 18, padding: 20,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: CP.gold, letterSpacing: 1, textTransform: 'uppercase' }}>
            📋 D{dayNumber} 今日分析
          </span>
          <span style={{ fontSize: 10, color: CP.faint }}>
            {new Date().toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.75 }}>
          {p0Done === p0Actions.length && p0Actions.length > 0
            ? `🎉 所有緊急任務已完成！現進入深化優化階段。建議聚焦 FAQ 覆蓋擴展與競品對比內容，鞏固 AI 搜尋引擎持續推薦你的品牌。`
            : todayMissions.length > 0
              ? `目前有 ${p0Pending.length} 項緊急行動待處理。今日重點推薦：「${todayMissions[0].title}」— ${todayMissions[0].expected_impact}`
              : `所有任務進展順利。繼續選擇優化方向，AI 系統將自動配置明日策略。`
          }
        </p>
        {latestDirection && (
          <div style={{
            marginTop: 12, padding: '6px 12px',
            background: 'rgba(255,255,255,0.04)', borderRadius: 8,
            fontSize: 12, color: CP.muted, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>當前策略方向：</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{latestDirection.direction_label}</span>
            <span>· D{latestDirection.day_number} 設定</span>
          </div>
        )}
      </div>

      {/* ── 今日任務 ── */}
      {todayMissions.length > 0 && (
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            textTransform: 'uppercase', color: CP.muted, marginBottom: 12,
          }}>
            ⚔️ 今日任務
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todayMissions.map((action, idx) => (
              <div key={action.id} style={{
                background: idx === 0 ? 'rgba(245,200,66,0.06)' : CP.glass,
                border: `1px solid ${idx === 0 ? 'rgba(245,200,66,0.22)' : CP.glassBorder}`,
                borderRadius: 16, padding: 16,
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                position: 'relative', overflow: 'hidden',
              }}>
                {idx === 0 && (
                  <div style={{
                    position: 'absolute', top: 0, left: 12, right: 12, height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(245,200,66,0.2), transparent)',
                    pointerEvents: 'none',
                  }} />
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                    padding: '2px 7px', borderRadius: 6,
                    ...(action.priority === 'P0'
                      ? { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }
                      : action.priority === 'P1'
                      ? { background: 'rgba(234,179,8,0.15)', color: '#fde047', border: '1px solid rgba(234,179,8,0.3)' }
                      : { background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }
                    ),
                  }}>{action.action_id}</span>
                  <span style={{
                    fontSize: 10, color: CP.faint,
                    background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 6,
                  }}>{action.platform}</span>
                  {idx === 0 && (
                    <span style={{
                      fontSize: 10, color: CP.gold,
                      background: 'rgba(245,200,66,0.1)', padding: '2px 8px', borderRadius: 6,
                      border: '1px solid rgba(245,200,66,0.2)',
                    }}>⭐ 今日首選</span>
                  )}
                  {action.status === 'in_progress' && (
                    <span style={{
                      fontSize: 10, color: '#93c5fd',
                      background: 'rgba(59,130,246,0.15)', padding: '2px 7px', borderRadius: 6,
                    }}>🔄 進行中</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.4, marginBottom: 4 }}>
                  {action.title}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: CP.muted, lineHeight: 1.55 }}>
                  {action.expected_impact}
                </p>
                {action.command_hint && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <code style={{
                      flex: 1, fontSize: 12, color: CP.gold,
                      background: 'rgba(0,0,0,0.3)', padding: '7px 12px',
                      borderRadius: 8, fontFamily: 'monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', display: 'block',
                    }}>{action.command_hint}</code>
                    <button
                      onClick={() => copyHint(action.command_hint, String(action.id))}
                      style={{
                        flexShrink: 0, fontSize: 11, padding: '7px 14px', borderRadius: 8,
                        background: copied === String(action.id) ? CP.greenBg : 'rgba(245,200,66,0.1)',
                        color: copied === String(action.id) ? CP.green : CP.gold,
                        border: `1px solid ${copied === String(action.id) ? CP.greenBorder : 'rgba(245,200,66,0.22)'}`,
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                      }}
                    >
                      {copied === String(action.id) ? '✓ 已複製' : '複製指令'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 選擇優化方向 ── */}
      <div style={{
        background: CP.glass, border: `1px solid ${CP.glassBorder}`,
        borderRadius: 18, padding: 20,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 12, right: 12, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          pointerEvents: 'none',
        }} />
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {directionSaved ? '✅ 今日優化方向' : '🧭 選擇今日優化方向'}
          </h3>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: CP.muted, lineHeight: 1.55 }}>
            {directionSaved
              ? '方向已記錄。AI 系統將根據此方向配置明日優化任務。'
              : '選擇後，系統將自動調整優先策略，每日追蹤優化成效。'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {DIRECTIONS.map(dir => {
            const isSelected = selectedDirection === dir.id
            return (
              <button
                key={dir.id}
                onClick={() => !directionSaved && !savingDirection && saveDirection(dir.id)}
                disabled={directionSaved && !isSelected}
                style={{
                  textAlign: 'left', padding: '14px 15px', borderRadius: 14,
                  cursor: directionSaved ? (isSelected ? 'default' : 'not-allowed') : 'pointer',
                  background: isSelected ? dir.color : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? dir.border : CP.glassBorder}`,
                  opacity: directionSaved && !isSelected ? 0.35 : 1,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected ? `0 4px 20px ${dir.color}` : 'none',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 7 }}>{dir.icon}</div>
                <div style={{
                  fontSize: 13, fontWeight: 700, marginBottom: 5,
                  color: isSelected ? dir.textColor : 'rgba(255,255,255,0.75)',
                }}>{dir.label}</div>
                <div style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.55)' : CP.faint, lineHeight: 1.5 }}>
                  {dir.desc}
                </div>
                {isSelected && (
                  <div style={{
                    marginTop: 8, fontSize: 10, color: dir.textColor,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>✓</span>
                    <span>已選擇 · D{dayNumber}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {directionSaved && (
          <button
            onClick={() => { setDirectionSaved(false); setSelectedDirection(null) }}
            style={{
              marginTop: 14, fontSize: 11, color: CP.muted,
              background: 'none', border: 'none', cursor: 'pointer',
              textDecoration: 'underline', fontFamily: 'inherit',
              padding: 0,
            }}
          >
            重新選擇方向
          </button>
        )}
      </div>

      {/* ── 完整行動清單（可收摺）── */}
      <div>
        <button
          onClick={() => setShowAllActions(v => !v)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 14,
            background: CP.glass, border: `1px solid ${CP.glassBorder}`,
            color: CP.muted, fontSize: 12, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            transition: 'border-color 0.2s',
          }}
        >
          <span>📋 完整行動清單（{done}/{total} 完成）</span>
          <span style={{
            fontSize: 10, transition: 'transform 0.2s',
            transform: showAllActions ? 'rotate(180deg)' : 'none',
            display: 'inline-block',
          }}>▼</span>
        </button>

        {showAllActions && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['P0', 'P1', 'P2'] as const).map(priority => {
              const group = actions.filter(a => a.priority === priority)
              if (!group.length) return null
              const headerLabel = priority === 'P0' ? '🔴 P0 緊急' : priority === 'P1' ? '🟡 P1 本週' : '🔵 P2 下週'
              return (
                <div key={priority}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                    color: CP.faint, marginBottom: 6, paddingLeft: 4,
                    textTransform: 'uppercase',
                  }}>{headerLabel}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.map(action => (
                      <div key={action.id} style={{
                        background: action.status === 'done' ? CP.greenBg : CP.glass,
                        border: `1px solid ${action.status === 'done' ? CP.greenBorder : CP.glassBorder}`,
                        borderRadius: 12, padding: '12px 14px',
                        opacity: action.status === 'done' ? 0.6 : 1,
                        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 10, color: CP.faint }}>{action.action_id}</span>
                              <span style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                                ...(action.status === 'done'
                                  ? { background: 'rgba(74,222,128,0.15)', color: CP.green }
                                  : action.status === 'in_progress'
                                  ? { background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }
                                  : { background: 'rgba(107,114,128,0.12)', color: 'rgba(156,163,175,0.7)' }
                                ),
                              }}>
                                {action.status === 'done' ? '✓ 完成' : action.status === 'in_progress' ? '進行中' : '待執行'}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: '#fff', fontWeight: 500 }}>{action.title}</p>
                            {action.completed_at && (
                              <p style={{ margin: '3px 0 0', fontSize: 10, color: 'rgba(74,222,128,0.6)' }}>
                                完成於 {new Date(action.completed_at).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          {action.command_hint && action.status !== 'done' && (
                            <button
                              onClick={() => copyHint(action.command_hint, String(action.id))}
                              style={{
                                flexShrink: 0, fontSize: 10, padding: '5px 10px', borderRadius: 6,
                                background: copied === String(action.id) ? CP.greenBg : 'rgba(245,200,66,0.08)',
                                color: copied === String(action.id) ? CP.green : CP.gold,
                                border: `1px solid ${copied === String(action.id) ? CP.greenBorder : 'rgba(245,200,66,0.15)'}`,
                                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                                transition: 'all 0.15s',
                              }}
                            >
                              {copied === String(action.id) ? '✓' : '複製'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 方向歷史記錄 ── */}
      {directionHistory.length > 0 && (
        <div style={{
          background: CP.glass, border: `1px solid ${CP.glassBorder}`,
          borderRadius: 14, padding: '14px 16px',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            color: CP.faint, marginBottom: 10, textTransform: 'uppercase',
          }}>🕐 歷史方向記錄</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {directionHistory.slice(0, 5).map((h, i) => {
              const dir = DIRECTIONS.find(d => d.id === h.direction)
              return (
                <div key={h.id || i} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{dir?.icon || '•'}</span>
                    <span style={{ fontSize: 12, color: i === 0 ? '#fff' : CP.faint }}>
                      {h.direction_label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, color: i === 0 ? CP.gold : CP.faint,
                    fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)',
                    padding: '2px 6px', borderRadius: 4,
                  }}>D{h.day_number}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
