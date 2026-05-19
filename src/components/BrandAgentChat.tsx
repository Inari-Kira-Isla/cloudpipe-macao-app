'use client'
import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface BrandAgentChatProps {
  brandSlug: string
  brandName: string
}

const COLORS = {
  surface: '#0C1B32',
  border: 'rgba(255,255,255,0.06)',
  gold: '#F5C842',
  goldAlpha: 'rgba(245,200,66,0.12)',
  goldBorder: 'rgba(245,200,66,0.2)',
  text: '#DCE6F4',
  muted: 'rgba(220,230,244,0.4)',
  faint: 'rgba(220,230,244,0.25)',
  asst: 'rgba(255,255,255,0.04)',
  asstBorder: 'rgba(255,255,255,0.07)',
  green: '#4ADE80',
}

export default function BrandAgentChat({ brandSlug, brandName }: BrandAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const key = `bac_${brandSlug}`
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    setSessionId(id)
  }, [brandSlug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const question = input.trim()
    if (!question || loading || !sessionId) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const res = await fetch('/api/v1/visibility-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, brand_slug: brandSlug, session_id: sessionId }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || '暫時無法回應，請稍後再試。',
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '連線錯誤，請重試。' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const SUGGESTIONS = [
    `${brandName} 目前最大的 AEO 缺口是什麼？`,
    '如何讓 Perplexity 開始引用我們？',
    '有什麼可以提升 Copilot 引用率的內容？',
    '現在最應該優先做哪個 AEO 行動？',
  ]

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          AI 策略顧問
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.green, display: 'inline-block' }} />
          <span style={{ fontSize: 10, color: COLORS.green }}>在線</span>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: COLORS.faint, fontFamily: 'var(--font-geist-mono)' }}>
          {brandName} 專屬
        </span>
      </div>

      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 13, overflow: 'hidden' }}>
        {/* Messages */}
        <div style={{ padding: '16px 16px 8px', minHeight: 180, maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 ? (
            <div>
              <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12, lineHeight: 1.6 }}>
                我係 {brandName} 的專屬 AI 策略顧問，可以幫你分析 AEO 缺口、規劃內容策略，對話記憶會保留在本裝置。
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    style={{
                      fontSize: 11, color: COLORS.gold,
                      background: COLORS.goldAlpha, border: `1px solid ${COLORS.goldBorder}`,
                      borderRadius: 20, padding: '5px 11px',
                      cursor: 'pointer', textAlign: 'left', lineHeight: 1.4,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px',
                  background: m.role === 'user' ? COLORS.goldAlpha : COLORS.asst,
                  border: `1px solid ${m.role === 'user' ? COLORS.goldBorder : COLORS.asstBorder}`,
                  fontSize: 13, color: COLORS.text, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '9px 13px', borderRadius: '3px 12px 12px 12px',
                background: COLORS.asst, border: `1px solid ${COLORS.asstBorder}`,
                fontSize: 12, color: COLORS.muted,
              }}>
                AI 顧問思考中…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: '10px 14px', display: 'flex', gap: 9 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`問 ${brandName} 的 AI 策略顧問…`}
            disabled={loading || !sessionId}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '9px 13px',
              fontSize: 13, color: COLORS.text, outline: 'none',
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim() || !sessionId}
            style={{
              background: !loading && input.trim() ? COLORS.gold : 'rgba(245,200,66,0.1)',
              color: !loading && input.trim() ? '#08111F' : 'rgba(245,200,66,0.35)',
              border: 'none', borderRadius: 8, padding: '9px 16px',
              fontSize: 12, fontWeight: 600,
              cursor: !loading && input.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            發送
          </button>
        </div>
      </div>
    </div>
  )
}
