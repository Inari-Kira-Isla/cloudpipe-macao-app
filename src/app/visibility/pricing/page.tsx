import Link from 'next/link'

const PLANS = [
  {
    name: '免費掃描',
    price: '$0',
    period: '',
    highlight: false,
    features: [
      'AEO + SEO + GEO 三維分數',
      '18 項完整檢查',
      '問題清單 + 修復建議',
      '一鍵生成 llms.txt / Schema.org',
    ],
    cta: '立即掃描',
    ctaLink: '/visibility',
  },
  {
    name: '基礎版',
    price: '$199',
    period: '/月/站',
    highlight: false,
    features: [
      '每週自動掃描 + 報告',
      'AI 爬蟲追蹤 Dashboard',
      'Visibility Score 趨勢圖',
      '修復建議自動更新',
      'Email + Telegram 通知',
    ],
    cta: '聯繫我們',
    ctaLink: 'https://wa.me/85362823037?text=我想了解 CloudPipe Visibility Engine 基礎版',
  },
  {
    name: '專業版',
    price: '$499',
    period: '/月/站',
    highlight: true,
    badge: '最受歡迎',
    features: [
      '基礎版全部功能',
      'AI 顧問即時對話',
      '競爭對手追蹤（3 個對手）',
      '一鍵 AEO 自動修復',
      '每月優化報告 + 行動建議',
      '優先技術支援',
    ],
    cta: '聯繫我們',
    ctaLink: 'https://wa.me/85362823037?text=我想了解 CloudPipe Visibility Engine 專業版',
  },
  {
    name: '企業版',
    price: '$999',
    period: '/月/站',
    highlight: false,
    features: [
      '專業版全部功能',
      '專屬 AEO 優化顧問',
      '無限競爭對手追蹤',
      '自訂報告 + 白標',
      'API 串接',
      '多站點批量管理',
      'SLA 保證 + 優先支援',
    ],
    cta: '預約演示',
    ctaLink: 'https://wa.me/85362823037?text=我想預約 CloudPipe Visibility Engine 企業版演示',
  },
]

const STATS = [
  { value: '95', label: '我們客戶最高分', suffix: '分' },
  { value: '25', label: '澳門市場平均', suffix: '分' },
  { value: '0%', label: '澳門企業有 llms.txt', suffix: '' },
  { value: '3.4x', label: '我們 vs 市場差距', suffix: '' },
]

const COMPARISONS = [
  { name: '稻荷環球食品', score: 95, grade: 'A+', type: 'CloudPipe 客戶' },
  { name: 'After School Coffee', score: 97, grade: 'A+', type: 'CloudPipe 客戶' },
  { name: 'Mind Coffee', score: 90, grade: 'A', type: 'CloudPipe 客戶' },
  { name: 'MGM 澳門', score: 25, grade: 'F', type: '六大博企' },
  { name: '威尼斯人', score: 28, grade: 'F', type: '六大博企' },
  { name: '永利澳門', score: 49, grade: 'D', type: '六大博企' },
]

export default function PricingPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#10a37f', letterSpacing: 2, marginBottom: 8 }}>
          CLOUDPIPE VISIBILITY ENGINE
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2 }}>
          讓 AI 和搜尋引擎<br />都看見你的生意
        </h1>
        <p style={{ fontSize: 16, color: '#666', maxWidth: 600, margin: '0 auto' }}>
          AEO + SEO + GEO 三維優化 — 澳門唯一專注 AI 搜索引擎可見度的平台
        </p>
      </div>

      {/* Market Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        marginBottom: 48, padding: '24px 0',
      }}>
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#111' }}>{s.value}{s.suffix}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div style={{
        background: '#111', borderRadius: 16, padding: '32px 24px',
        marginBottom: 48, color: '#fff',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px', textAlign: 'center' }}>
          CloudPipe 客戶 vs 澳門龍頭企業
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {COMPARISONS.map(c => (
            <div key={c.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderRadius: 10,
              background: c.score >= 80 ? 'rgba(16,163,127,0.15)' : 'rgba(231,76,60,0.15)',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{c.type}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: 24, fontWeight: 800,
                  color: c.score >= 80 ? '#10a37f' : '#e74c3c',
                }}>{c.score}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, marginLeft: 4,
                  padding: '2px 8px', borderRadius: 4,
                  background: c.score >= 80 ? '#10a37f' : '#e74c3c',
                  color: '#fff',
                }}>{c.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Cards */}
      <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>
        選擇適合你的方案
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{
            borderRadius: 16, padding: 24,
            border: plan.highlight ? '2px solid #10a37f' : '1px solid #eee',
            background: plan.highlight ? '#f0faf5' : '#fff',
            position: 'relative',
          }}>
            {plan.badge && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                padding: '4px 16px', borderRadius: 20, background: '#10a37f',
                color: '#fff', fontSize: 11, fontWeight: 700,
              }}>{plan.badge}</div>
            )}
            <div style={{ fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 8 }}>{plan.name}</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
              {plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: '#999' }}>{plan.period}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0' }}>
              {plan.features.map(f => (
                <li key={f} style={{ fontSize: 13, color: '#555', padding: '4px 0', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#10a37f' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href={plan.ctaLink} style={{
              display: 'block', textAlign: 'center', padding: '10px 0',
              borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14,
              background: plan.highlight ? '#10a37f' : '#111',
              color: '#fff',
            }}>
              {plan.cta}
            </a>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: '0 auto 48px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '0 0 24px' }}>常見問題</h2>
        {[
          { q: '什麼是 AEO？為什麼重要？', a: 'AEO（AI Engine Optimization）是讓你的網站被 ChatGPT、Perplexity、Claude 等 AI 搜索引擎看見的優化技術。2026 年超過 40% 的搜尋流量來自 AI，但澳門 95% 的企業完全沒有 AEO。' },
          { q: '多久能看到效果？', a: 'llms.txt 和 Schema.org 加上後，通常 1-2 週內 AI 爬蟲就會開始訪問。我們的客戶平均 2 週內 AI 可見度提升 40%+。' },
          { q: '跟傳統 SEO 有什麼不同？', a: '傳統 SEO 只管 Google 排名。CloudPipe 同時管 AEO（AI 搜索）+ SEO（Google）+ GEO（本地搜索），三維一體。而且我們有 AI 爬蟲即時追蹤，能看到哪個 AI bot 在訪問你。' },
          { q: '免費掃描有什麼限制？', a: '完全沒有！掃描結果包含 18 項檢查 + 修復建議 + 一鍵生成修復檔案。付費方案提供持續監控和 AI 顧問。' },
        ].map(faq => (
          <div key={faq.q} style={{ marginBottom: 16, padding: '16px 20px', borderRadius: 10, background: '#fafafa', border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{faq.q}</div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{faq.a}</div>
          </div>
        ))}
      </div>

      {/* Final CTA */}
      <div style={{
        textAlign: 'center', padding: '40px 20px', borderRadius: 16,
        background: 'linear-gradient(135deg, #111 0%, #333 100%)', color: '#fff',
        marginBottom: 40,
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>
          免費掃描你的網站
        </h2>
        <p style={{ fontSize: 15, color: '#ccc', margin: '0 0 20px' }}>
          4 秒內知道你的 AI 可見度分數，看看你跟競爭對手差多少
        </p>
        <Link href="/visibility" style={{
          display: 'inline-block', padding: '14px 36px', borderRadius: 10,
          background: '#10a37f', color: '#fff', textDecoration: 'none',
          fontWeight: 700, fontSize: 16,
        }}>
          🔍 開始掃描 →
        </Link>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#ccc' }}>
        CloudPipe Visibility Engine · AEO + SEO + GEO 三維優化<br />
        © 2026 CloudPipe AI · WhatsApp: +853 6282 3037
      </div>
    </div>
  )
}
