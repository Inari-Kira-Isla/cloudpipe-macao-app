'use client'

import type { Metadata } from 'next'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const EXAMPLE_MERCHANTS = [
  { name: '仁和堂中醫', slug: 'renhe-tang-tcm-wellness-center' },
  { name: '新濠天地', slug: 'city-of-dreams' },
  { name: '大三巴商業中心', slug: 'ruins-of-st-paul' },
  { name: 'Galaxy Macau 澳門銀河', slug: 'galaxy-macau' },
  { name: '澳門旅遊塔', slug: 'macau-tower' },
]

type SearchResult = {
  slug: string
  name_zh: string | null
  name_en: string | null
  category: string | null
  district: string | null
}

export default function AuditLandingPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/audit/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A1628', color: '#fff', fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif' }}>
      {/* Hero */}
      <section style={{ padding: '80px 24px 64px', textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 13, color: '#00d4ff', marginBottom: 20 }}>
          🤖 免費 · 即時查詢 · 無需登入
        </div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
          發現您的商戶在
          <span style={{ background: 'linear-gradient(135deg,#00d4ff,#0f4c81)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block' }}>
            AI 時代的曝光度
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', marginBottom: 40, lineHeight: 1.6 }}>
          ChatGPT、Claude、Perplexity 每日爬取澳門商戶資料<br />
          輸入您的商戶名稱，即時查看 AI 引擎有否索引您的業務
        </p>

        {/* Search box */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, maxWidth: 560, margin: '0 auto 24px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="輸入商戶名稱，例如：仁和堂、星巴克澳門..."
            style={{
              flex: 1, minWidth: 200, padding: '14px 20px', borderRadius: 12,
              border: '1.5px solid rgba(0,212,255,0.3)', background: 'rgba(255,255,255,0.06)',
              color: '#fff', fontSize: 16, outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '14px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#00d4ff,#0f4c81)', color: '#fff',
              fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap',
            }}
          >
            查詢 →
          </button>
        </form>

        {/* Example chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
          {EXAMPLE_MERCHANTS.map(m => (
            <button
              key={m.slug}
              onClick={() => router.push(`/audit/${m.slug}`)}
              style={{
                padding: '7px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Search results */}
        {loading && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>搜尋中...</p>}
        {!loading && searched && results.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>找不到相關商戶。試試按行業搜尋，或<a href="mailto:inariglobal@gmail.com" style={{ color: '#00d4ff' }}>聯絡我們</a>手動申請。</p>
        )}
        {results.length > 0 && (
          <div style={{ textAlign: 'left', maxWidth: 560, margin: '0 auto', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
            {results.map((r, i) => (
              <a
                key={r.slug}
                href={`/audit/${r.slug}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px', background: i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  color: '#fff', textDecoration: 'none', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.name_zh || r.name_en || r.slug}</div>
                  {r.name_en && r.name_zh && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{r.name_en}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {r.category && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>{r.category}</span>}
                  <span style={{ color: '#00d4ff', fontSize: 18 }}>›</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 32 }}>為什麼 AI 爬取次數重要？</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
          {[
            { icon: '🤖', title: 'AI 已記錄您的資料', desc: 'ChatGPT 等 AI 引擎定期爬取澳門商戶資料，建立它們的知識庫' },
            { icon: '❓', title: '但有否向顧客推介？', desc: '爬取≠推薦。AI 有沒有在顧客問問題時主動提及您的商戶？' },
            { icon: '📈', title: 'CloudPipe 負責監測', desc: '我們追蹤您在 ChatGPT、Claude、Perplexity 的引用率，並提升它' },
          ].map(item => (
            <div key={item.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.35)', fontSize: 13, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        CloudPipe AI Visibility Platform · <a href="mailto:inariglobal@gmail.com" style={{ color: '#00d4ff' }}>inariglobal@gmail.com</a>
      </footer>
    </div>
  )
}
