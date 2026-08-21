'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// Upgrade Modal Component
function UpgradeModal({ isOpen, onClose, plan, onSubmit }: {
  isOpen: boolean
  onClose: () => void
  plan: typeof PLANS[number] | null
  onSubmit: (email: string, name: string) => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  if (!isOpen || !plan) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const tier = plan.name === '個人版' ? 'free' : plan.name === '專業版' ? 'pro' : 'enterprise'
      
      const res = await fetch('/api/cloudnote/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, tier }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '升級失敗，請稍後重試')
        setLoading(false)
        return
      }

      // If there's a payment URL, redirect to it
      if (data.payment_url && tier !== 'free') {
        setSuccess(true)
        setLoading(false)
        // Redirect to payment URL after a brief delay
        setTimeout(() => {
          window.location.href = data.payment_url
        }, 1500)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setEmail('')
        setName('')
      }, 3000)
    } catch (err) {
      setError('網絡錯誤，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: '#12121a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 420, padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>
            升級至 {plan.name}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#4ade80', marginBottom: 8 }}>
              {plan.price === '$0' ? '已提交申請' : '正在跳轉到付款頁面...'}
            </div>
            <div style={{ fontSize: 14, color: '#888' }}>
              {plan.price === '$0' 
                ? '您可以開始使用 CloudNote' 
                : '如果沒有自動跳轉，請點擊下方連結'}
            </div>
            {plan.price !== '$0' && paymentUrl && (
              <a 
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', marginTop: 16, color: '#4ade80', fontSize: 13, textDecoration: 'underline' }}
              >
                點擊此處前往付款 →
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>名稱（可選）</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="您的名字"
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>
            {plan.price !== '$0' && (
              <div style={{ padding: 12, background: 'rgba(74,222,128,0.1)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#4ade80' }}>
                💳 確認後我們會發送支付連結（支援澳門通、支付寶、微信、信用卡）
              </div>
            )}
            {error && (
              <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: 12, background: '#4ade80', border: 'none', borderRadius: 8,
                color: '#000', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '處理中...' : plan.price === '$0' ? '開始使用' : '確認升級'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// CloudNote Pricing Plans
const PLANS = [
  {
    name: '個人版',
    price: '$0',
    period: '永久免費',
    highlight: false,
    description: '適合個人學習和筆記整理',
    features: [
      '無限筆記數量',
      '六步閉環追蹤',
      'Brain 同步檢索',
      '本地儲存（瀏覽器）',
      '基本數據導出',
    ],
    limits: [
      '僅支援單一用戶',
      '無團隊協作',
      '無優先支援',
    ],
    cta: '免費開始',
    ctaLink: '/notes',
  },
  {
    name: '專業版',
    price: '$99',
    period: '/月',
    highlight: true,
    badge: '最受歡迎',
    description: '適合獨立顧問和小型團隊',
    features: [
      '個人版全部功能',
      '雲端同步（多設備）',
      '團隊共享空間（至多5人）',
      'API 接入',
      '優先技術支援',
      '進階分析報告',
      '自訂品牌',
    ],
    limits: [],
    cta: '立即升級',
    ctaLink: 'https://wa.me/85362823037?text=我想了解 CloudNote 專業版',
  },
  {
    name: '企業版',
    price: '$299',
    period: '/月',
    highlight: false,
    description: '適合大型組織和代理商',
    features: [
      '專業版全部功能',
      '無限團隊成員',
      'SSO 企業登入',
      '自訂域名',
      '專屬客戶成功經理',
      'SLA 保證',
      '批量帳戶管理',
      'Webhooks 集成',
    ],
    limits: [],
    cta: '聯繫銷售',
    ctaLink: 'https://wa.me/85362823037?text=我想了解 CloudNote 企業版',
  },
]

// Feature comparison matrix
const COMPARISON = [
  { feature: '筆記數量', free: '無限', pro: '無限', enterprise: '無限' },
  { feature: '六步閉環', free: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Brain 同步', free: '✓', pro: '✓', enterprise: '✓' },
  { feature: '雲端同步', free: '✗', pro: '✓', enterprise: '✓' },
  { feature: '團隊共享', free: '✗', pro: '5人', enterprise: '無限' },
  { feature: 'API 接入', free: '✗', pro: '✓', enterprise: '✓' },
  { feature: 'SSO 登入', free: '✗', pro: '✗', enterprise: '✓' },
  { feature: '自訂域名', free: '✗', pro: '✗', enterprise: '✓' },
  { feature: '優先支援', free: '✗', pro: '✓', enterprise: '✓' },
  { feature: 'SLA 保證', free: '✗', pro: '✗', enterprise: '✓' },
]

const FAQS = [
  {
    q: 'CloudNote 跟其他筆記 app 有什麼分別？',
    a: 'CloudNote 專注於「學習閉環」— 不是普通筆記，而是記錄 → 搜尋 → 比對 → 審計 → 建議 → 存檔的完整流程。配合 Brain 語義搜尋，讓你的知識真正「活」起來。',
  },
  {
    q: '免費版會一直免費嗎？',
    a: '是的，個人免費版會一直免費。我們希望每個人都能用 AI 輔助學習。但專業版和企業版提供更多協作和同步功能，適合團隊使用。',
  },
  {
    q: '如何升級到專業版？',
    a: '直接在定價頁點擊「立即升級」，輸入 email 即可開始流程。我們會發送支付連結（支援澳門通、支付寶、微信支付、信用卡）。升級後帳戶立即生效。',
  },
  {
    q: '可以試用專業版嗎？',
    a: '可以！我們提供 14 天專業版免費試用。聯繫 WhatsApp 索取試用帳戶。',
  },
  {
    q: '數據安全嗎？',
    a: '所有數據加密傳輸和儲存。企業版提供額外的數據保留政策和合規報告。',
  },
]

export default function CloudNotePricingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0f' }}>載入中...</div>}>
      <CloudNotePricingContent />
    </Suspense>
  )
}

function CloudNotePricingContent() {
  const searchParams = useSearchParams()
  const [upgradeModalPlan, setUpgradeModalPlan] = useState<typeof PLANS[number] | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment) {
      setPaymentStatus(payment)
      // Clear the URL params after reading
      window.history.replaceState({}, '', '/notes/pricing')
    }
  }, [searchParams])

  const handleUpgradeClick = (plan: typeof PLANS[number]) => {
    setUpgradeModalPlan(plan)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f',
      color: '#e4e4e7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <UpgradeModal
        isOpen={!!upgradeModalPlan}
        onClose={() => setUpgradeModalPlan(null)}
        plan={upgradeModalPlan}
        onSubmit={() => {}}
      />
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 0',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/notes" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ fontSize: 24 }}>📝</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>CloudNote</span>
          </Link>
          <nav style={{ display: 'flex', gap: 24 }}>
            <Link href="/notes" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>筆記</Link>
            <Link href="/notes/pricing" style={{ color: '#4ade80', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>定價</Link>
            <Link href="/visibility/pricing" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>Visibility</Link>
          </nav>
        </div>
      </header>

      {/* Payment Status Banner */}
      {paymentStatus === 'success' && (
        <div style={{ 
          padding: '16px 20px', 
          background: 'rgba(74,222,128,0.15)', 
          borderBottom: '1px solid rgba(74,222,128,0.3)',
          textAlign: 'center',
          color: '#4ade80',
          fontWeight: 600,
        }}>
          ✅ 付款成功！您的 CloudNote 專業版已啟用
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div style={{ 
          padding: '16px 20px', 
          background: 'rgba(239,68,68,0.15)', 
          borderBottom: '1px solid rgba(239,68,68,0.3)',
          textAlign: 'center',
          color: '#ef4444',
          fontWeight: 600,
        }}>
          ⚠️ 付款已取消。如需協助，請聯繫 WhatsApp
        </div>
      )}

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '60px 20px 40px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', letterSpacing: 2, marginBottom: 12 }}>
          CLOUDNOTE PRICING
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2, color: '#fff' }}>
          讓你的學習<br />形成閉環
        </h1>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
          筆記不是終點 而是學習的起點<br />
          搜尋 → 比對 → 審計 → 建議 → 存檔，六步閉環讓知識真正沉澱
        </p>
      </div>

      {/* Pricing Cards */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: plan.highlight ? 'rgba(74,222,128,0.08)' : '#12121a',
              border: `1px solid ${plan.highlight ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16,
              padding: 28,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  padding: '4px 16px', borderRadius: 20, background: '#4ade80',
                  color: '#000', fontSize: 11, fontWeight: 700,
                }}>{plan.badge}</div>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4, color: '#fff' }}>
                {plan.price}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                {plan.description}
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: '#e4e4e7', padding: '6px 0', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
                {plan.limits.map(l => (
                  <li key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', padding: '6px 0', display: 'flex', gap: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>•</span> {l}
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleUpgradeClick(plan)}
                style={{
                  display: 'block', width: '100%', textAlign: 'center', padding: '12px 0',
                  borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14,
                  background: plan.highlight ? '#4ade80' : 'rgba(255,255,255,0.1)',
                  color: plan.highlight ? '#000' : '#fff',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ background: '#12121a', padding: '60px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 32px', color: '#fff' }}>
            功能對比
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>功能</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>個人免費</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', color: '#4ade80', fontWeight: 600 }}>專業版</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>企業版</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} style={{ borderBottom: i === COMPARISON.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', color: '#e4e4e7' }}>{row.feature}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', color: row.free === '✓' ? '#4ade80' : row.free === '✗' ? 'rgba(255,255,255,0.3)' : '#e4e4e7' }}>{row.free}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', background: 'rgba(74,222,128,0.05)', color: row.pro === '✓' ? '#4ade80' : '#e4e4e7' }}>{row.pro}</td>
                    <td style={{ textAlign: 'center', padding: '12px 16px', color: row.enterprise === '✓' ? '#4ade80' : '#e4e4e7' }}>{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', margin: '0 0 32px', color: '#fff' }}>
          常見問題
        </h2>
        {FAQS.map(faq => (
          <div key={faq.q} style={{ marginBottom: 16, padding: '20px 24px', borderRadius: 12, background: '#12121a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: '#fff' }}>{faq.q}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{faq.a}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        textAlign: 'center', padding: '60px 20px', background: 'linear-gradient(180deg, #12121a 0%, #0a0a0f 100%)',
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px', color: '#fff' }}>
          準備好開始了嗎？
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px' }}>
          免費版已經足夠個人使用<br />
          團隊協作升級專業版
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link href="/notes" style={{
            padding: '12px 28px', borderRadius: 8,
            background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none',
            fontWeight: 600, fontSize: 14,
          }}>
            免費開始 →
          </Link>
          <a href="https://wa.me/85362823037?text=我想了解 CloudNote" style={{
            padding: '12px 28px', borderRadius: 8,
            background: '#4ade80', color: '#000', textDecoration: 'none',
            fontWeight: 600, fontSize: 14,
          }}>
            聯繫 WhatsApp
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '30px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
        <div style={{ marginBottom: 8 }}>
          <Link href="/notes" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', margin: '0 12px' }}>CloudNote</Link>
          <Link href="/visibility/pricing" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', margin: '0 12px' }}>Visibility Engine</Link>
          <Link href="/macao/about" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none', margin: '0 12px' }}>關於我們</Link>
        </div>
        <div>© 2026 CloudPipe AI · WhatsApp: +853 6282 3037</div>
      </footer>
    </div>
  )
}
