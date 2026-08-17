'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
// 六步閉環步驟
const LOOP_STEPS = [
  { key: 'auto_save', label: '自動存', icon: '💾' },
  { key: 'search_knowledge', label: '搜知識', icon: '🔍' },
  { key: 'compare', label: '比對', icon: '⚖️' },
  { key: 'audit', label: '審計', icon: '📋' },
  { key: 'recommend', label: '建議', icon: '💡' },
  { key: 'bulletin', label: '告示板', icon: '📌' },
] as const

type LoopStepKey = typeof LOOP_STEPS[number]['key']

// 六步閉環完整標籤
export const LOOP_LABELS: Record<LoopStepKey, string> = {
  auto_save: '自動存',
  search_knowledge: '先搜現有知識',
  compare: '比對',
  audit: '成效審計問句',
  recommend: '建議',
  bulletin: '落告示板',
}

interface CloudNote {
  id: string
  slug: string
  title: string
  content: string
  category: string
  tags: string[]
  loop_steps_completed: LoopStepKey[]
  brain_synced_at: string | null
  created_at: string
  updated_at: string
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
}

// ── Components ──────────────────────────────────────────────────────────────
function ArchivedBadge({ syncedAt }: { syncedAt: string | null }) {
  if (!syncedAt) return null
  
  const date = new Date(syncedAt)
  const formatted = date.toLocaleDateString('zh-TW', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).replace(/\//g, '-')
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: T.greenBg,
      border: '1px solid rgba(74,222,128,0.3)',
      borderRadius: 4,
      fontSize: 11,
      color: T.green,
      fontFamily: 'monospace',
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      已存檔於 {formatted}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    learning: { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa' },
    review: { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
    insight: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
    research: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80' },
  }
  const c = colors[category] || colors.insight
  
  const labels: Record<string, string> = {
    learning: '學習',
    review: '檢閱',
    insight: '洞見',
    research: '研究',
  }
  
  return (
    <span style={{
      padding: '2px 8px',
      background: c.bg,
      borderRadius: 4,
      fontSize: 11,
      color: c.text,
    }}>
      {labels[category] || category}
    </span>
  )
}

function LoopStepsBadge({ completed }: { completed: LoopStepKey[] }) {
  if (!completed || completed.length === 0) return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 4,
      fontSize: 11,
      color: '#ef4444',
      fontFamily: 'monospace',
    }}>
      ⚠️ 未走閉環
    </span>
  )
  
  const totalSteps = LOOP_STEPS.length
  const doneCount = completed.length
  const isComplete = doneCount === totalSteps
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: isComplete ? T.greenBg : 'rgba(251,191,36,0.1)',
      border: `1px solid ${isComplete ? 'rgba(74,222,128,0.4)' : 'rgba(251,191,36,0.3)'}`,
      borderRadius: 4,
      fontSize: 11,
      color: isComplete ? T.green : T.gold,
      fontFamily: 'monospace',
    }}>
      {isComplete ? '🎯' : '🔄'} {doneCount}/{totalSteps} 閉環
    </span>
  )
}

// Loop steps checkbox selector for form
function LoopStepsSelector({ 
  selected, 
  onChange 
}: { 
  selected: LoopStepKey[], 
  onChange: (steps: LoopStepKey[]) => void 
}) {
  const toggle = (key: LoopStepKey) => {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key))
    } else {
      onChange([...selected, key])
    }
  }
  
  const allSelected = selected.length === LOOP_STEPS.length
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: T.muted }}>六步閉環進度</span>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : LOOP_STEPS.map(s => s.key))}
          style={{
            background: 'transparent',
            border: 'none',
            color: T.blue,
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {allSelected ? '清除全部' : '全選'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LOOP_STEPS.map(step => {
          const isSelected = selected.includes(step.key)
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => toggle(step.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: isSelected ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isSelected ? 'rgba(74,222,128,0.5)' : T.cardBorder}`,
                borderRadius: 6,
                color: isSelected ? T.green : T.muted,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{step.icon}</span>
              <span>{step.label}</span>
              {isSelected && <span>✓</span>}
            </button>
          )
        })}
      </div>
      {selected.length === 0 && (
        <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
          ⚠️ 請至少選擇一個步驟，以追蹤閉環完整性
        </span>
      )}
    </div>
  )
}

// ── Create Note Modal ───────────────────────────────────────────────────────────────
function CreateNoteModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean
  onClose: () => void
  onSubmit: (note: Omit<CloudNote, 'id' | 'slug' | 'created_at' | 'updated_at' | 'brain_synced_at'>) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string>('insight')
  const [tags, setTags] = useState('')
  const [loopSteps, setLoopSteps] = useState<LoopStepKey[]>([])
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!title.trim()) {
      setError('請輸入標題')
      return
    }
    if (!content.trim()) {
      setError('請輸入內容')
      return
    }
    if (loopSteps.length === 0) {
      setError('請至少選擇一個閉環步驟')
      return
    }
    
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      loop_steps_completed: loopSteps,
    })
    
    // Reset form
    setTitle('')
    setContent('')
    setCategory('insight')
    setTags('')
    setLoopSteps([])
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20,
    }}>
      <div style={{
        background: T.card,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 16,
        width: '100%',
        maxWidth: 560,
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: T.text }}>
            📝 新增筆記
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.muted,
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 6 }}>標題</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="輸入筆記標題..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${T.cardBorder}`,
                borderRadius: 8,
                color: T.text,
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 6 }}>內容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="輸入筆記內容..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${T.cardBorder}`,
                borderRadius: 8,
                color: T.text,
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 6 }}>分類</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: 8,
                  color: T.text,
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="learning">學習</option>
                <option value="review">檢閱</option>
                <option value="insight">洞見</option>
                <option value="research">研究</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, color: T.muted, marginBottom: 6 }}>標籤</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: 8,
                  color: T.text,
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <LoopStepsSelector selected={loopSteps} onChange={setLoopSteps} />
          </div>
          
          {error && (
            <div style={{ 
              padding: '10px 12px', 
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${T.cardBorder}`,
                borderRadius: 8,
                color: T.muted,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: T.green,
                border: 'none',
                borderRadius: 8,
                color: '#000',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              建立筆記
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NoteCard({ note }: { note: CloudNote }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 12,
      padding: 20,
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }}
    onClick={() => setExpanded(!expanded)}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = T.cardBorderHover
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = T.cardBorder
      e.currentTarget.style.transform = 'translateY(0)'
    }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: 16, 
            fontWeight: 600, 
            color: T.text,
            marginBottom: 8,
          }}>
            {note.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CategoryBadge category={note.category} />
            <LoopStepsBadge completed={note.loop_steps_completed} />
            <ArchivedBadge syncedAt={note.brain_synced_at} />
            {note.tags.length > 0 && (
              <span style={{ fontSize: 12, color: T.muted }}>
                {note.tags.slice(0, 3).map(t => `#${t}`).join(' ')}
              </span>
            )}
          </div>
        </div>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={T.muted} 
          strokeWidth="2"
          style={{ 
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      
      {expanded && (
        <div style={{ 
          marginTop: 16, 
          paddingTop: 16, 
          borderTop: `1px solid ${T.cardBorder}`,
        }}>
          <p style={{ 
            margin: 0, 
            fontSize: 14, 
            color: T.muted, 
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {note.content.slice(0, 500)}{note.content.length > 500 ? '...' : ''}
          </p>
          <div style={{ 
            marginTop: 16, 
            display: 'flex', 
            gap: 16, 
            fontSize: 12, 
            color: T.muted 
          }}>
            <span>建立: {new Date(note.created_at).toLocaleDateString('zh-TW')}</span>
            <span>更新: {new Date(note.updated_at).toLocaleDateString('zh-TW')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const [notes, setNotes] = useState<CloudNote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    // Mock data for demo - in production, fetch from Supabase
    const mockNotes: CloudNote[] = [
      {
        id: '1',
        slug: 'brand-onboarding-2026',
        title: 'Brand Onboarding 流程優化',
        content: '記錄 Brand Portal 2.0 上線後的 onboarding 流程優化...',
        category: 'learning',
        tags: ['brand', 'onboarding', 'ux'],
        loop_steps_completed: ['auto_save', 'search_knowledge', 'compare', 'audit', 'recommend', 'bulletin'], // 完整閉環
        brain_synced_at: '2026-08-10T10:30:00Z',
        created_at: '2026-08-01T09:00:00Z',
        updated_at: '2026-08-10T10:30:00Z',
      },
      {
        id: '2',
        slug: 'merchant-data-quality',
        title: '商戶數據質量提升方案',
        content: '關於如何提升商戶資料的準確性和完整性...',
        category: 'insight',
        tags: ['data', 'quality', 'merchants'],
        loop_steps_completed: ['auto_save', 'search_knowledge', 'compare'], // 部分閉環
        brain_synced_at: '2026-08-15T14:20:00Z',
        created_at: '2026-08-05T11:00:00Z',
        updated_at: '2026-08-15T14:20:00Z',
      },
      {
        id: '3',
        slug: 'seo-august-review',
        title: '8月 SEO 表現檢閱',
        content: '8月份 SEO 流量分析報告，包含關鍵詞排名變化...',
        category: 'review',
        tags: ['seo', 'analytics', 'august'],
        loop_steps_completed: [], // 未走閉環
        brain_synced_at: null,
        created_at: '2026-08-16T08:00:00Z',
        updated_at: '2026-08-16T08:00:00Z',
      },
      {
        id: '4',
        slug: 'ai-crawler-behavior',
        title: 'AI Crawler 行為研究',
        content: '分析不同 AI bot 的訪問模式和行為特徵...',
        category: 'research',
        tags: ['ai', 'crawler', 'research'],
        loop_steps_completed: ['auto_save', 'search_knowledge', 'compare', 'audit', 'recommend'], // 只欠告示板
        brain_synced_at: '2026-08-12T16:45:00Z',
        created_at: '2026-07-20T10:00:00Z',
        updated_at: '2026-08-12T16:45:00Z',
      },
    ]

    // Load from localStorage if available
    const stored = localStorage.getItem('cloudnotes')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNotes(parsed)
        setLoading(false)
        return
      } catch (e) {
        console.error('Failed to parse stored notes', e)
      }
    }
    setTimeout(() => {
      setNotes(mockNotes)
      setLoading(false)
    }, 500)
  }, [])

  // Save to localStorage when notes change
  useEffect(() => {
    if (!loading && notes.length > 0) {
      localStorage.setItem('cloudnotes', JSON.stringify(notes))
    }
  }, [notes, loading])

  const handleCreateNote = (noteData: Omit<CloudNote, 'id' | 'slug' | 'created_at' | 'updated_at' | 'brain_synced_at'>) => {
    const now = new Date().toISOString()
    const newNote: CloudNote = {
      ...noteData,
      id: Date.now().toString(),
      slug: noteData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      created_at: now,
      updated_at: now,
      brain_synced_at: null,
    }
    setNotes(prev => [newNote, ...prev])
  }

  const filteredNotes = filter === 'all' 
    ? notes 
    : filter === 'archived'
      ? notes.filter(n => n.brain_synced_at)
      : notes.filter(n => n.category === filter)

  const archivedCount = notes.filter(n => n.brain_synced_at).length

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: T.bg,
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <CreateNoteModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateNote}
      />
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: 28, 
              fontWeight: 700, 
              color: T.text,
            }}>
              📝 CloudNote 學習筆記
            </h1>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: T.green,
                border: 'none',
                borderRadius: 8,
                color: '#000',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              新增筆記
            </button>
          </div>
          <p style={{ margin: 0, color: T.muted, fontSize: 15 }}>
            學習記錄 • 檢閱筆記 • 洞見沉澱 • 研究存檔
          </p>
        </div>

        {/* Stats Bar */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 24,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '8px 16px',
              background: filter === 'all' ? T.cardBorder : 'transparent',
              border: `1px solid ${filter === 'all' ? T.gold : T.cardBorder}`,
              borderRadius: 8,
              color: filter === 'all' ? T.gold : T.muted,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            全部 ({notes.length})
          </button>
          <button
            onClick={() => setFilter('archived')}
            style={{
              padding: '8px 16px',
              background: filter === 'archived' ? T.greenBg : 'transparent',
              border: `1px solid ${filter === 'archived' ? T.green : T.cardBorder}`,
              borderRadius: 8,
              color: filter === 'archived' ? T.green : T.muted,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ✅ 已存檔 ({archivedCount})
          </button>
          <button
            onClick={() => setFilter('learning')}
            style={{
              padding: '8px 16px',
              background: filter === 'learning' ? 'rgba(96,165,250,0.15)' : 'transparent',
              border: `1px solid ${filter === 'learning' ? T.blue : T.cardBorder}`,
              borderRadius: 8,
              color: filter === 'learning' ? T.blue : T.muted,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            學習
          </button>
          <button
            onClick={() => setFilter('review')}
            style={{
              padding: '8px 16px',
              background: filter === 'review' ? 'rgba(167,139,250,0.15)' : 'transparent',
              border: `1px solid ${filter === 'review' ? T.purple : T.cardBorder}`,
              borderRadius: 8,
              color: filter === 'review' ? T.purple : T.muted,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            檢閱
          </button>
          <button
            onClick={() => setFilter('insight')}
            style={{
              padding: '8px 16px',
              background: filter === 'insight' ? T.goldGlow : 'transparent',
              border: `1px solid ${filter === 'insight' ? T.gold : T.cardBorder}`,
              borderRadius: 8,
              color: filter === 'insight' ? T.gold : T.muted,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            洞見
          </button>
          <button
            onClick={() => setFilter('research')}
            style={{
              padding: '8px 16px',
              background: filter === 'research' ? T.greenBg : 'transparent',
              border: `1px solid ${filter === 'research' ? T.green : T.cardBorder}`,
              borderRadius: 8,
              color: filter === 'research' ? T.green : T.muted,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            研究
          </button>
        </div>

        {/* Learning Review Link */}
        <Link 
          href="/notes/review"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: `linear-gradient(135deg, ${T.goldGlow}, rgba(167,139,250,0.1))`,
            border: `1px solid rgba(251,191,36,0.3)`,
            borderRadius: 12,
            marginBottom: 24,
            textDecoration: 'none',
            color: T.text,
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
              📊 學習記錄檢閱頁
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>
              時間軸回顧 + Brain 檢索
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Notes List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>
            載入中...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.muted }}>
            暂无笔记
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredNotes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
