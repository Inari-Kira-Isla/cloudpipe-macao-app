'use client'
import { useState } from 'react'

export default function B2bPortalPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/inari/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="pt-40 min-h-screen flex items-start justify-center px-6">
      <div className="w-full max-w-md">
        <p className="text-[#C9A961] tracking-[0.3em] text-xs mb-6 text-center">B2B PORTAL</p>
        <h1 className="text-3xl font-light text-center mb-2">批發專區登入</h1>
        <p className="text-[#F5F0E8]/50 text-center text-sm mb-10">
          輸入您的企業電郵，我們將發送免密碼登入連結
        </p>

        {sent ? (
          <div className="border border-[#C9A961]/30 p-8 text-center">
            <p className="text-[#C9A961] text-lg mb-3">✓ 登入連結已發送</p>
            <p className="text-[#F5F0E8]/60 text-sm">
              請檢查您的電郵 <strong>{email}</strong><br />
              連結有效期為 1 小時
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="企業電郵地址"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-transparent border border-[#C9A961]/30 px-4 py-3 text-[#F5F0E8] placeholder-[#F5F0E8]/30 focus:outline-none focus:border-[#C9A961]"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C9A961] text-[#0A1628] font-semibold hover:bg-[#C9A961]/90 transition-colors disabled:opacity-50"
            >
              {loading ? '發送中…' : '發送登入連結'}
            </button>
          </form>
        )}

        <div className="mt-10 pt-8 border-t border-[#C9A961]/20 text-center">
          <p className="text-[#F5F0E8]/40 text-sm mb-3">尚未有批發帳戶？</p>
          <a
            href="https://wa.me/853XXXXXXXX?text=申請稻荷批發帳戶"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C9A961] text-sm hover:underline"
          >
            WhatsApp 聯繫 Kira 申請 →
          </a>
        </div>
      </div>
    </div>
  )
}
