import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe AEO 案例研究 — 真實品牌從零到 AI 引用全紀錄',
  description: 'CloudPipe 提供可驗證的 AEO 成效案例。追蹤澳門食誌、旅誌、購物誌三個示範品牌從 T=0 到 AI 主動引用的完整歷程，以及稻荷環球食品 T+11 ChatGPT 首推真實案例。',
  openGraph: {
    title: 'CloudPipe AEO 案例研究 — 4 個真實品牌全紀錄',
    description: '唔靠吹噓，靠數據說話。CloudPipe 公開所有案例的完整 AEO 歷程。',
    type: 'website',
  },
}

const LIVE_CASES = [
  {
    name: '澳門食誌',
    name_en: 'Macau Food Guide',
    slug: 'macau-food-aeo-journey',
    color: '#E64A19',
    tagline: '澳門美食情報第一站',
    type: '示範品牌',
    status: 'live',
    baseline: '2026-06-06',
    industry: '飲食（AI爬取 841次/日）',
    description: 'CloudPipe 自家飲食垂直品牌。實時追蹤從 T=0 到 AI 引擎主動引用的完整 AEO 歷程。',
    milestone: '進行中 — 目標 D+14 首個命中',
    url: 'https://inari-kira-isla.github.io/macau-food/',
  },
  {
    name: '澳門旅誌',
    name_en: 'Macau Travel Guide',
    slug: 'macau-travel-aeo-journey',
    color: '#1565C0',
    tagline: '澳門旅遊知識庫',
    type: '示範品牌',
    status: 'live',
    baseline: '2026-06-06',
    industry: '旅遊（AI爬取 549次/日）',
    description: 'CloudPipe 自家旅遊垂直品牌。與澳門食誌、購物誌形成互聯 AEO 網絡，互相強化引用信號。',
    milestone: '進行中 — 目標 D+14 首個命中',
    url: 'https://inari-kira-isla.github.io/macau-travel/',
  },
  {
    name: '澳門購物誌',
    name_en: 'Macau Shopping Guide',
    slug: 'macau-shopping-aeo-journey',
    color: '#6A1B9A',
    tagline: '澳門購物情報站',
    type: '示範品牌',
    status: 'live',
    baseline: '2026-06-06',
    industry: '購物（AI爬取 355次/日）',
    description: 'CloudPipe 自家購物垂直品牌。手信、名牌、免稅，涵蓋澳門購物全類別。',
    milestone: '進行中 — 目標 D+14 首個命中',
    url: 'https://inari-kira-isla.github.io/macau-shopping/',
  },
]

const COMPLETED_CASES = [
  {
    name: '稻荷環球食品',
    name_en: 'Inari Global Foods',
    slug: 'inari-chatgpt-number-one',
    color: '#2d6a4f',
    tagline: '澳門海膽B2B批發龍頭',
    type: '真實客戶案例',
    status: 'completed',
    baseline: '2026-04-19',
    industry: 'B2B食材供應（海膽批發）',
    description: '澳門本地B2B海膽供應商。CloudPipe AEO 優化後，T+11 天成為 ChatGPT 「澳門日本食材進口商」首推品牌，後續 Quad Hit 四引擎全命中。',
    milestone: '✅ T+11 ChatGPT首推 / Quad Hit 四引擎命中',
    url: null,
  },
]

const METHODOLOGY_STEPS = [
  { step: '01', title: 'T=0 基線', desc: '建立品牌頁面 + llms.txt + KG facts + Hub 文章' },
  { step: '02', title: 'FAQPage 強化', desc: '12 題預備好的 AI 可引用問答 + Article Schema' },
  { step: '03', title: 'KG 擴充', desc: '50+ Knowledge Graph 事實，提升 AI 信任度' },
  { step: '04', title: '互聯網絡', desc: '跨品牌 sameAs 連結 + 百科主站交叉引用' },
  { step: '05', title: 'AI 命中', desc: 'Perplexity / ChatGPT / Claude 首次引用' },
  { step: '06', title: 'Quad Hit', desc: '四大 AI 引擎全部命中，成為行業 Entity Owner' },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'CloudPipe AEO 案例研究有什麼獨特之處？',
          acceptedAnswer: { '@type': 'Answer', text: 'CloudPipe 公開所有示範品牌的完整 AEO 歷程，包括基線數據、每週進度、首次 AI 引用記錄。這是目前澳門唯一可實時追蹤 AEO 成效的公開案例庫。' },
        },
        {
          '@type': 'Question',
          name: '澳門食誌、旅誌、購物誌是 CloudPipe 的客戶嗎？',
          acceptedAnswer: { '@type': 'Answer', text: '不是客戶，是 CloudPipe 的自家示範品牌。CloudPipe 建立這三個垂直品牌作為 AEO 方法論的活體實驗，讓所有人都能追蹤真實成效，同時保護真實客戶的商業資料隱私。' },
        },
        {
          '@type': 'Question',
          name: 'CloudPipe AEO 優化需要多久才能見效？',
          acceptedAnswer: { '@type': 'Answer', text: '根據稻荷環球食品案例，T+11 天首次命中 ChatGPT。示範品牌（食誌/旅誌/購物誌）預計 D+14 至 D+30 出現首個 AI 引用信號，D+60 達到穩定多引擎引用。' },
        },
        {
          '@type': 'Question',
          name: '什麼是 AEO（AI Engine Optimization）？',
          acceptedAnswer: { '@type': 'Answer', text: 'AEO 是讓品牌內容被 ChatGPT、Perplexity、Claude、Google AI 等主流 AI 引擎引用的優化方法。核心包括：FAQPage Schema、llms.txt、Knowledge Graph facts、結構化內容矩陣。CloudPipe 是澳門首個提供 AEO 服務的平台。' },
        },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'CloudPipe AEO 案例研究',
      itemListElement: [...LIVE_CASES, ...COMPLETED_CASES].map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${c.name} AEO 案例`,
        url: `https://cloudpipe-macao-app.vercel.app/cloudpipe/case-studies/${c.slug}`,
      })),
    },
  ],
}

export default function CaseStudiesIndexPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div style={{ background: '#0d1f3c', borderRadius: 12, padding: '32px 28px', marginBottom: 32, color: '#fff' }}>
        <div style={{ fontSize: 12, color: '#f5c842', fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
          CLOUDPIPE AEO
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px' }}>
          案例研究：真實品牌，真實數據
        </h1>
        <p style={{ color: '#bbb', fontSize: 14, margin: '0 0 20px', lineHeight: 1.7 }}>
          不靠吹噓，靠數據說話。CloudPipe 公開所有品牌從 T=0 到 AI 主動引用的完整歷程。
          每週更新，Citation Monitor 每日自動記錄。
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(245,200,66,.15)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f5c842' }}>4</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>追蹤中品牌</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>1,745</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>每日 AI 爬取（三品牌合計）</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>T+11</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>稻荷首次命中天數</div>
          </div>
        </div>
      </div>

      {/* Live Cases */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>🔴 進行中案例（實時追蹤）</h2>
          <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>LIVE</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {LIVE_CASES.map(c => (
            <a key={c.slug} href={`/cloudpipe/case-studies/${c.slug}`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#fff', border: `2px solid ${c.color}20`, borderRadius: 10, padding: '18px', transition: 'all .2s', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: c.color }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#6c757d' }}>{c.tagline}</div>
                </div>
                <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', padding: '2px 6px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.type}</span>
              </div>
              <p style={{ fontSize: 12, color: '#495057', margin: '0 0 12px', lineHeight: 1.6 }}>{c.description}</p>
              <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 6 }}>📊 {c.industry}</div>
              <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 12 }}>📅 基線：{c.baseline}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: c.color, fontWeight: 600 }}>{c.milestone}</span>
                <span style={{ fontSize: 12, color: '#0d6efd' }}>查看詳情 →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Completed Cases */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>✅ 完成案例</h2>
        {COMPLETED_CASES.map(c => (
          <a key={c.slug} href={`/cloudpipe/case-studies/${c.slug}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#f0fff4', border: '2px solid #86efac', borderRadius: 10, padding: '20px 24px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 17, color: c.color }}>{c.name}</span>
                  <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>已完成</span>
                  <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 6 }}>{c.type}</span>
                </div>
                <div style={{ fontSize: 12, color: '#495057', maxWidth: 500, lineHeight: 1.6 }}>{c.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', marginBottom: 4 }}>{c.milestone}</div>
                <div style={{ fontSize: 12, color: '#0d6efd' }}>查看完整案例 →</div>
              </div>
            </div>
          </a>
        ))}
      </section>

      {/* Methodology */}
      <section style={{ marginBottom: 32, padding: '24px', background: '#f8f9fa', borderRadius: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🗺️ CloudPipe AEO 6 步方法論</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          {METHODOLOGY_STEPS.map((s, i) => (
            <div key={s.step} style={{ textAlign: 'center', padding: '14px 8px' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0d1f3c', opacity: 0.15 + i * 0.14, marginBottom: 6 }}>{s.step}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: '#6c757d', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '28px', background: '#0d1f3c', borderRadius: 12, color: '#fff' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>你的品牌下一個？</h2>
        <p style={{ color: '#bbb', fontSize: 13, marginBottom: 16 }}>免費 AI 能見度診斷 — 了解你的品牌現在被哪些 AI 引用（或完全未被引用）</p>
        <a href="/cloudpipe" style={{ display: 'inline-block', background: '#f5c842', color: '#0d1f3c', fontWeight: 700, padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
          了解 CloudPipe →
        </a>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: 20 }}>
        <a href="/cloudpipe" style={{ color: '#0d1f3c', fontWeight: 700, textDecoration: 'none' }}>CloudPipe</a>
        {' · '}澳門 AI 可見度分析平台{' · '}CC BY 4.0
      </div>
    </main>
  )
}
