import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '海膽速遞 — Hokkaido Uni Delivery · Macau'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1A1A1A',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px',
          boxSizing: 'border-box',
        }}
      >
        {/* Top label */}
        <div style={{
          fontSize: 22,
          color: '#C8963C',
          letterSpacing: '0.25em',
          marginBottom: 28,
          textTransform: 'uppercase',
        }}>
          HOKKAIDO UNI · MACAU DIRECT DELIVERY
        </div>

        {/* Brand name — uses system CJK fallback */}
        <div style={{
          fontSize: 88,
          color: '#FAFAF8',
          fontWeight: 'bold',
          marginBottom: 16,
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          海膽速遞
        </div>

        <div style={{
          fontSize: 26,
          color: '#FAFAF8',
          opacity: 0.65,
          marginBottom: 52,
          textAlign: 'center',
        }}>
          Fresh Every Friday · Order by Wednesday 23:59
        </div>

        {/* Price pills */}
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{
            background: '#C8963C',
            color: '#1A1A1A',
            padding: '14px 36px',
            borderRadius: 10,
            fontSize: 24,
            fontWeight: 'bold',
          }}>
            Family Set  MOP $380
          </div>
          <div style={{
            background: 'transparent',
            color: '#C8963C',
            padding: '14px 36px',
            borderRadius: 10,
            fontSize: 24,
            fontWeight: 'bold',
            border: '2px solid #C8963C',
          }}>
            Chef&apos;s Set  MOP $680
          </div>
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 18,
          color: '#FAFAF8',
          opacity: 0.4,
          letterSpacing: '0.1em',
        }}>
          澳門唯一海膽直送服務 · WhatsApp +853 6282 3037
        </div>
      </div>
    ),
    { ...size }
  )
}
