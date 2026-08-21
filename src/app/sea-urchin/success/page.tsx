'use client'

import { useEffect, useState } from 'react'

export default function SuccessPage() {
  const [loading, setLoading] = useState(true)
  const [orderData, setOrderData] = useState<{
    orderId: string
    amount: number
    status: string
  } | null>(null)

  useEffect(() => {
    // Get session_id from URL
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const orderId = params.get('order_id')

    if (!sessionId) {
      setLoading(false)
      return
    }

    // Verify payment status with our backend
    fetch(`/api/v1/checkout?session_id=${sessionId}&order_id=${orderId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.paid) {
          setOrderData({
            orderId: data.orderId || orderId || 'Unknown',
            amount: data.amount || 0,
            status: 'paid',
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Space Grotesk', system-ui, sans-serif"
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48,
            border: '3px solid #222',
            borderTopColor: '#ff5c00',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#555', letterSpacing: '0.1em' }}>
            確認付款狀態...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Space Grotesk', system-ui, sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#111',
        border: '1px solid #1e1e1e',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center'
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
          color: '#fff'
        }}>
          ✓
        </div>

        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.15em',
          color: '#666',
          marginBottom: 8
        }}>
          PAYMENT SUCCESSFUL · 付款成功
        </div>

        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 4
        }}>
          感謝您的訂單！
        </div>

        <div style={{
          fontSize: 13,
          color: '#888',
          marginBottom: 32
        }}>
          我們會盡快安排配送，敬請留意 WhatsApp 通知
        </div>

        {orderData && (
          <div style={{
            background: '#0a0a0a',
            borderRadius: 10,
            padding: 20,
            marginBottom: 24,
            textAlign: 'left'
          }}>
            {[
              ['ORDER NO.', `#${orderData.orderId}`],
              ['金額', `MOP$ ${(orderData.amount / 100).toLocaleString()}`],
              ['狀態', '已付款 ✓'],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid #1a1a1a',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11
              }}>
                <span style={{ color: '#555', letterSpacing: '0.08em' }}>{k}</span>
                <span style={{ color: '#ccc' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <a
            href="/sea-urchin"
            style={{
              display: 'block',
              background: '#ff5c00',
              color: '#fff',
              borderRadius: 10,
              padding: '14px 20px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.06em'
            }}
          >
            返回商店 →
          </a>
        </div>
      </div>
    </div>
  )
}
