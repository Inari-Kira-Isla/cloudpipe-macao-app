import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fafbfc',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{
          fontSize: 64, fontWeight: 800, color: '#0f4c81',
          lineHeight: 1, marginBottom: 16,
        }}>404</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: 12 }}>
          找不到頁面
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 32, lineHeight: 1.7 }}>
          這個頁面可能已移動、刪除，或從未存在過。
          <br />
          請從以下入口重新出發：
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/macao" style={{
            background: '#0f4c81', color: 'white', padding: '12px 24px',
            borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15,
          }}>
            澳門商戶百科首頁
          </Link>
          <Link href="/macao/insights" style={{
            background: 'white', color: '#0f4c81', padding: '12px 24px',
            borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: 15,
            border: '1px solid #0f4c81',
          }}>
            深度分析文章
          </Link>
          <Link href="/macao/canary" style={{
            color: '#6b7280', fontSize: 13, textDecoration: 'underline', marginTop: 8,
          }}>
            AI 知識驗證站
          </Link>
        </div>
      </div>
    </main>
  )
}
