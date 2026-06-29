import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CloudPipe — 澳門首個 AI 知識認證網絡 | 讓 AI 引用你的品牌',
  description: 'CloudPipe 是澳門首個 AI 知識認證網絡，連接 520+ 政府官方來源、米芝蓮指南、黑珍珠認證，助品牌被 ChatGPT、Perplexity、Claude 等 8 個 AI 平台認識和引用。47,000+ 篇知識文章，235,000+ 條已核實事實。',
  openGraph: {
    title: 'CloudPipe — 澳門首個 AI 知識認證網絡',
    description: '連接 520+ 官方政府來源 · 米芝蓮指南 · 黑珍珠認證。讓你的品牌被 ChatGPT、Perplexity、Claude 認識和引用。',
    type: 'website',
  },
}

const WHATSAPP_URL = 'https://wa.me/85362823037?text=你好，我想了解 CloudPipe AI 能見度免費診斷'
const AUDIT_URL = '/cloudpipe/audit'

const STATS = [
  { num: 'AI', label: '購買決策愈來愈受 AI 影響', source: '行業趨勢' },
  { num: 'AEO', label: 'AI Overview 改變傳統搜尋流量', source: '行業趨勢' },
  { num: '✓', label: '稻荷獲 Perplexity 引用', source: '真實案例' },
]

const PAIN_POINTS = [
  {
    icon: '📈',
    title: 'AI 問詢量爆升',
    body: '愈來愈多消費者透過 ChatGPT、Perplexity 等 AI 搜尋產品與服務，而你的對手正在被引用。',
  },
  {
    icon: '👻',
    title: 'AI 不認識你的生意',
    body: 'AI 引用的是有結構化數據、FAQ schema 和知識圖譜的品牌。沒有這些，你對 AI 是隱形的。',
  },
  {
    icon: '💸',
    title: '傳統 SEO 失效',
    body: 'Google AI Overview 正在壓縮傳統搜尋的點擊流量。繼續只做 SEO，是在一個縮小的池塘裡競爭。',
  },
]

const TIMELINE = [
  { week: '第一步', label: 'AI 診斷', desc: 'ChatGPT、Perplexity 完全不知道稻荷存在' },
  { week: '第二步', label: '知識注入', desc: '語義 facts + FAQ schema 上線' },
  { week: '第三步', label: 'AI 引用', desc: 'GPTBot + ClaudeBot 開始深度爬取' },
  { week: '第四步', label: '獲 AI 引用', desc: '「澳門日本海膽供應商」查詢中獲 Perplexity 引用稻荷環球食品' },
]

const STEPS = [
  { n: '01', title: 'AI 現況診斷', desc: '掃描你的品牌在 ChatGPT / Perplexity / Gemini 的引用狀態，找出缺口。免費，30 分鐘完成。' },
  { n: '02', title: '知識圖譜建立', desc: '注入結構化 facts、FAQ schema、llms.txt——讓 AI 引擎看到你、理解你、信任你。' },
  { n: '03', title: '持續監控優化', desc: '每日追蹤 AI 爬蟲行為、引用率、競品動向，每月報告，持續提升排名。' },
]

const FAQS = [
  {
    q: 'CloudPipe 是什麼？',
    a: 'CloudPipe 是澳門首個 AI 知識認證網絡，連接政府官方數據（澳門旅遊局、統計局）、米芝蓮指南、黑珍珠認證等 520+ 權威來源，助品牌被 ChatGPT、Perplexity、Claude 等 AI 引擎認識和引用。',
  },
  {
    q: 'CloudPipe 與 Semrush、Otterly 等 AEO 工具有什麼分別？',
    a: 'Semrush、Otterly 是監測工具——告訴你「有無被引用」。CloudPipe 是知識網絡——讓你的品牌事實連接到 AI 已信任的權威來源，從根本建立引用基礎。監測工具賣報告，CloudPipe 賣接入。',
  },
  {
    q: '什麼是 AEO 優化？',
    a: 'AEO（Answer Engine Optimization）優化是讓你的品牌被 ChatGPT、Perplexity、Claude、Google AI Mode 等 AI 問答引擎在回答用戶問題時直接引用和推薦的過程。與傳統 SEO 不同，AEO 針對的是 AI 答案，而非搜尋排名。',
  },
  {
    q: 'CloudPipe 連接了哪些權威資料來源？',
    a: 'CloudPipe 百科生態系連接超過 520 個官方政府來源，包括：澳門旅遊局（MGTO）、澳門統計局（DSEC）、博彩監察局（DICJ）、消費者委員會、經濟局、衛生局、交通局；以及米芝蓮指南（12,000+ 篇文章引用）、黑珍珠餐廳指南、澳門特色店認證、誠信店計劃、UNESCO 澳門美食之都認定（10,000+ 篇文章）。',
  },
  {
    q: '品牌加入 CloudPipe 後需要多久見效？',
    a: '因為品牌事實連接到已被 AI 認識的知識網絡（47,000+ 篇百科、235,000+ 條核實事實），AI 透過關聯傳遞信任。通常 2-4 週內 AI 爬蟲重新收錄，D7/D14/D21 三階段量度見到明顯改善。自建 AEO 需要 2-3 年建立信任，加入 CloudPipe 利用現有積累。',
  },
  {
    q: 'CloudPipe 如何驗證品牌事實？',
    a: 'CloudPipe 採用兩層核實機制：第一層連接政府官方數據和第三方認證（米芝蓮、黑珍珠等）作為錨點；第二層由品牌提供事實，系統自動比對官方來源，人工審核後標記為「已核實」。目前 5 個試點品牌共有 139 條已核實品牌事實。',
  },
  {
    q: 'CloudPipe 覆蓋哪些 AI 平台？',
    a: 'CloudPipe 生態系同步覆蓋 8 個主要 AI 平台：ChatGPT（OpenAI）、Perplexity AI、Claude（Anthropic）、Google AI Mode、You.com、Apple Intelligence、Bing AI、ByteDance AI。我們追蹤每個平台的引用率，Perplexity 轉化率達 9.4%（行業最高）。',
  },
  {
    q: '澳門本地品牌適合用 CloudPipe 嗎？',
    a: 'CloudPipe 專為澳門及大灣區本地品牌設計。我們的知識庫覆蓋澳門、香港、日本、台灣四個地區，繁體中文、英文、日文三語，針對本地政府認證和餐飲旅遊業態優化。現有試點包括稻荷環球食品（B2B 海産）、Mind Cafe（精品咖啡）、After School Coffee（外賣咖啡）、海膽速遞（B2C 食材）。',
  },
  {
    q: '什麼是 GEO 優化？',
    a: 'GEO（Generative Engine Optimization）是針對生成式 AI 的可見度優化，確保 AI 在生成答案時引用你的品牌事實。GEO 與 AEO 相輔相成：AEO 側重問答引擎，GEO 側重生成式 AI 的知識吸收。CloudPipe 同時提供 AEO 和 GEO 優化服務。',
  },
  {
    q: 'CloudPipe 的百科生態系有多大？',
    a: '截至 2026 年，CloudPipe 百科生態系包含：47,000+ 篇知識文章（澳門/香港/日本/台灣/世界）、235,000+ 條已核實知識事實、連接 520+ 官方政府來源、12,000+ 篇文章引用米芝蓮指南、10,000+ 篇文章引用 UNESCO 澳門美食之都認定，每日被 8 個 AI 平台爬取。',
  },
  {
    q: 'CloudPipe 如何量度 AI 引用效果？',
    a: 'CloudPipe 採用 Absorption 量度法（而非單純引用計數）：追蹤品牌核心事實是否真正被 AI 答案吸收，分 D7、D14、D21 三個時間點評估。比引用次數更能反映 AI 知識吸收程度。Perplexity 基準轉化率 9.4%，目標全平台均值 ≥3%。',
  },
  {
    q: '澳門特色店和誠信店認證與 CloudPipe 有什麼關係？',
    a: '澳門特色店和誠信店是消費者委員會主導的本地認證計劃。CloudPipe 百科生態系收錄這些認證資料，品牌若擁有此類認證，加入 CloudPipe 後可將認證事實連接到官方來源，強化 AI 可信度。本地政府認證是 AI 引擎判斷品牌可信度的重要信號。',
  },
  {
    q: '稻荷環球食品如何通過 CloudPipe 被 AI 引用？',
    a: '稻荷環球食品是澳門 B2B 日本海産供應商，透過 CloudPipe 完成 26 條品牌事實核實，連接日本農林水產省等官方來源。當 Perplexity 被問到「澳門海産批發供應商」時，稻荷是首要引用品牌之一。',
  },
  {
    q: 'CloudPipe 支援哪些語言？',
    a: 'CloudPipe 生態系支援繁體中文、英文、日文三語，百科文章覆蓋澳門（MO）、香港（HK）、日本（JP）、台灣（TW）、世界（World）五個地區。多語言覆蓋令品牌同時在中文和英文 AI 問答中獲得引用。',
  },
  {
    q: '如何讓我的品牌加入 CloudPipe？',
    a: '加入 CloudPipe 分三步：(1) 品牌 AEO 掃描——分析你的品牌在 8 個 AI 平台的現有引用狀況；(2) 事實核實——提交品牌核心事實，系統連接官方來源核實；(3) 接入網絡——品牌 entity 連接 CloudPipe 知識網絡，開始 D7/D14/D21 追蹤。',
  },
]

export default function CloudPipeLandingPage() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#1a1a2e', overflowX: 'hidden' }}>

      {/* ── S1 HERO ── */}
      <section className="cp-hero" style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 60%, #162848 100%)',
        color: '#fff',
        padding: '80px 24px 72px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(circle at 20% 50%, #C9A961 1px, transparent 1px), radial-gradient(circle at 80% 20%, #C9A961 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div className="cp-stat-strip" style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 40, flexWrap: 'wrap' }}>
          {STATS.map((s, i) => (
            <div key={i} className="cp-stat" style={{
              padding: '10px 24px',
              borderRight: i < STATS.length - 1 ? '1px solid rgba(201,169,97,0.3)' : 'none',
              minWidth: 160,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#C9A961', lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.source}</div>
            </div>
          ))}
        </div>

        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 48px)',
          fontWeight: 900,
          lineHeight: 1.25,
          maxWidth: 780,
          margin: '0 auto 20px',
          letterSpacing: '-0.02em',
        }}>
          澳門首個 <span style={{ color: '#C9A961' }}>AI 知識認證網絡</span>
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2.5vw, 20px)', color: 'rgba(255,255,255,0.8)', maxWidth: 600, margin: '0 auto 36px', lineHeight: 1.6 }}>
          當 ChatGPT、Perplexity、Claude 被問到你的行業，你的品牌應該在答案裡。<br />
          我們用 5 年建立的知識基礎設施，連接 <strong style={{ color: '#C9A961' }}>520+ 官方政府來源</strong>、米芝蓮指南、黑珍珠認證，今天開放品牌接入。
        </p>

        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          background: '#25D366',
          color: '#fff',
          padding: '16px 36px',
          borderRadius: 50,
          fontSize: 'clamp(15px, 3.5vw, 18px)',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(37,211,102,0.4)',
        }}>
          📱 免費 AI 診斷（30 分鐘）
        </a>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 12 }}>完全免費，無銷售壓力</p>
      </section>

      {/* ── S2 PROBLEM ── */}
      <section className="cp-section" style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            AI 搜尋正在重寫競爭規則
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 'clamp(14px, 3vw, 16px)' }}>
            你的客人正在問 AI，AI 正在回答——只是不是你
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {PAIN_POINTS.map((p, i) => (
              <div key={i} style={{
                background: '#fff',
                borderRadius: 16,
                padding: '24px 20px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                borderTop: '3px solid #C9A961',
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{p.title}</h3>
                <p style={{ color: '#555', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S3 CASE STUDY ── */}
      <section className="cp-section" style={{ background: '#0A1628', color: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,169,97,0.15)', border: '1px solid rgba(201,169,97,0.4)', borderRadius: 20, padding: '4px 16px', fontSize: 13, color: '#C9A961', marginBottom: 20 }}>
            真實案例
          </div>
          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            稻荷環球食品 × CloudPipe
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 40, fontSize: 'clamp(13px, 3vw, 16px)' }}>
            澳門領先的 B2B 日本海膽供應商之一
          </p>

          <div className="cp-timeline" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 40 }}>
            {TIMELINE.map((t, i) => (
              <div key={i} style={{ position: 'relative', padding: '20px 14px', background: i === TIMELINE.length - 1 ? 'rgba(201,169,97,0.15)' : 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: '#C9A961', fontWeight: 700, marginBottom: 6 }}>{t.week}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
            {[['多平台', 'AI 引用'], ['語義 KG', '事實注入'], ['短期', '獲 AI 引用']].map(([n, l], i) => (
              <div key={i}>
                <div style={{ fontSize: 'clamp(32px, 8vw, 44px)', fontWeight: 900, color: '#C9A961' }}>{n}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{l}</div>
              </div>
            ))}
          </div>

          <blockquote className="cp-blockquote" style={{ borderLeft: '3px solid #C9A961', paddingLeft: 20, textAlign: 'left', maxWidth: 560, margin: '0 auto', fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontSize: 'clamp(13px, 3vw, 15px)' }}>
            「以前客人問 AI 澳門海膽，出現嘅係日本、香港嘅競爭對手。家依 Perplexity 係推薦我哋。」
            <footer style={{ marginTop: 12, fontStyle: 'normal', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              — 稻荷環球食品
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ── S4 SERVICE ── */}
      <section className="cp-section" style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            三步讓 AI 認識你的生意
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40, fontSize: 'clamp(13px, 3vw, 16px)' }}>
            不需要改網站，不需要 IT 團隊
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: '#0A1628', color: '#C9A961', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                  {s.n}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, marginTop: 0 }}>{s.title}</h3>
                  <p style={{ color: '#555', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S5 SOCIAL PROOF ── */}
      <section className="cp-section" style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(18px, 3vw, 32px)', fontWeight: 800, marginBottom: 40 }}>
            背後的基礎設施
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[
              ['約 1M', 'FAQ 條目'],
              ['每日數千', 'AI 爬蟲訪問'],
              ['約 1,800', '核實澳門商戶'],
              ['約 43K', '語義知識 Facts'],
            ].map(([n, l], i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '24px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: '#0A1628' }}>{n}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 14 }}>已被以下多個 AI 平台爬取</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13, fontWeight: 600, color: '#444' }}>
            {['ChatGPT', 'Perplexity', 'Claude', 'Gemini', 'Bing AI'].map(name => (
              <span key={name} style={{ background: '#fff', padding: '6px 14px', borderRadius: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── S5b LAYER 1: AUTHORITY SOURCES ── */}
      <section className="cp-section" style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: 'rgba(10,22,40,0.08)', border: '1px solid rgba(10,22,40,0.15)', borderRadius: 20, padding: '4px 16px', fontSize: 13, color: '#0A1628', fontWeight: 600, marginBottom: 16 }}>
              Layer 1 — 權威來源錨點
            </div>
            <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
              我們連接的權威來源
            </h2>
            <p style={{ color: '#666', fontSize: 'clamp(13px, 3vw, 16px)' }}>
              47,000+ 篇知識文章 · 235,000+ 條已核實事實 · 8 個 AI 平台同步
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <div style={{ background: '#f8f9fc', borderRadius: 16, padding: '28px 24px', borderTop: '3px solid #0A1628' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16, marginTop: 0, color: '#0A1628' }}>
                🏛️ 15+ 政府機構
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li style={{ fontSize: 14, color: '#444' }}>
                  <a href="https://www.macaotourism.gov.mo" target="_blank" rel="noopener noreferrer" style={{ color: '#0A1628', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>澳門旅遊局 MGTO</a>
                </li>
                <li style={{ fontSize: 14, color: '#444' }}>
                  <a href="https://www.dsec.gov.mo" target="_blank" rel="noopener noreferrer" style={{ color: '#0A1628', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>澳門統計局 DSEC</a>
                </li>
                <li style={{ fontSize: 14, color: '#444' }}>
                  <a href="https://www.dicj.gov.mo" target="_blank" rel="noopener noreferrer" style={{ color: '#0A1628', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>博彩監察局 DICJ</a>
                </li>
                <li style={{ fontSize: 14, color: '#444' }}>
                  <a href="https://www.consumer.gov.mo" target="_blank" rel="noopener noreferrer" style={{ color: '#0A1628', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>消費者委員會</a>
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>（特色店 · 誠信店）</span>
                </li>
                <li style={{ fontSize: 14, color: '#666' }}>經濟局 · 衛生局 · 交通局 · 教育局</li>
              </ul>
              <div style={{ fontSize: 12, color: '#C9A961', fontWeight: 700 }}>520+ 官方政府來源</div>
            </div>

            <div style={{ background: '#f8f9fc', borderRadius: 16, padding: '28px 24px', borderTop: '3px solid #C9A961' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16, marginTop: 0, color: '#0A1628' }}>
                ⭐ 國際認證
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li style={{ fontSize: 14, color: '#444' }}>
                  <a href="https://guide.michelin.com/mo/zh_TW/restaurants" target="_blank" rel="noopener noreferrer" style={{ color: '#0A1628', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>米芝蓮指南</a>
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>12,000+ 篇文章引用</span>
                </li>
                <li style={{ fontSize: 14, color: '#444' }}>黑珍珠餐廳指南</li>
                <li style={{ fontSize: 14, color: '#444' }}>
                  UNESCO 澳門美食之都
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>10,000+ 篇文章</span>
                </li>
              </ul>
              <div style={{ fontSize: 12, color: '#C9A961', fontWeight: 700 }}>覆蓋全球主要權威評鑑</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── S5c LAYER 2: BRAND NODES ── */}
      <section className="cp-section" style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: 'rgba(201,169,97,0.15)', border: '1px solid rgba(201,169,97,0.4)', borderRadius: 20, padding: '4px 16px', fontSize: 13, color: '#C9A961', fontWeight: 600, marginBottom: 16 }}>
              Layer 2 — 品牌節點
            </div>
            <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
              已加入 CloudPipe 認證網絡的品牌
            </h2>
            <p style={{ color: '#666', fontSize: 'clamp(13px, 3vw, 16px)' }}>
              5 個本地品牌 · 139 條已核實品牌事實 · AI 引用驗證
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              {
                href: '/brands/inari-global-foods',
                name: '稻荷環球食品',
                desc: '澳門 B2B 日本海産供應',
                facts: '26 條核實事實',
                external: false,
              },
              {
                href: '/brands/sea-urchin-express',
                name: '海膽速遞',
                desc: '高端海産 B2C · 潮牌定位',
                facts: '19 條核實事實',
                external: false,
              },
              {
                href: '/afterschool-coffee',
                name: 'After School Coffee',
                desc: '台山媽媽外賣咖啡',
                facts: '49 條核實事實',
                external: false,
              },
              {
                href: '/brands',
                name: 'Mind Cafe',
                desc: '澳門精品咖啡先驅 · 10年本地認證',
                facts: '23 條核實事實',
                external: false,
              },
            ].map((brand, i) => (
              <a key={i} href={brand.href} style={{
                display: 'block',
                background: '#fff',
                borderRadius: 16,
                padding: '20px 18px',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                border: '1px solid #eee',
                transition: 'box-shadow 0.2s',
              }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628', marginBottom: 6 }}>{brand.name}</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8, lineHeight: 1.5 }}>{brand.desc}</div>
                <div style={{ fontSize: 11, color: '#C9A961', fontWeight: 700 }}>✓ {brand.facts}</div>
              </a>
            ))}
          </div>

          <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(201,169,97,0.08)', borderRadius: 16, border: '1px dashed rgba(201,169,97,0.5)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 4 }}>
              → 你的品牌（下一個加入）
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>現正接受澳門及大灣區品牌申請</div>
          </div>
        </div>
      </section>

      {/* ── S6 PRICING ── */}
      <section className="cp-pricing-section" style={{ background: '#fff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 8 }}>
            按需選擇，從免費開始
          </h2>
          <p style={{ color: '#666', marginBottom: 48, fontSize: 'clamp(13px, 3vw, 16px)' }}>
            先免費了解你的 AI 能見度，再決定下一步
          </p>

          {/* Free tier — full width highlight */}
          <div className="cp-free-tier" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #162848 100%)', borderRadius: 20, padding: '36px 32px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, textAlign: 'left' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>免費入門</div>
              <h3 style={{ color: '#fff', fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, margin: '0 0 8px' }}>AI 能見度自助審計</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(13px, 3vw, 15px)', margin: 0, maxWidth: 480 }}>
                輸入品牌名稱，即時掃描你喺 ChatGPT、Perplexity、Gemini 的引用狀態——找出 AI 係唔係認識你，競品係唔係比你強。
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                {['ChatGPT 引用報告', 'Perplexity 排名', '競品對標', 'AI Visibility Score'].map(f => (
                  <span key={f} style={{ fontSize: 12, color: '#C9A961', display: 'flex', gap: 4, alignItems: 'center' }}>✓ {f}</span>
                ))}
              </div>
            </div>
            <div className="cp-free-tier-cta" style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#C9A961', lineHeight: 1 }}>MOP 0</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>完全免費，即時出結果</div>
              <a href={AUDIT_URL} style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '13px 32px', borderRadius: 50, fontWeight: 700, fontSize: 'clamp(14px, 3.5vw, 16px)', textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,211,102,0.4)' }}>
                立即免費審計 →
              </a>
            </div>
          </div>

          {/* 3 paid tiers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
            {[
              {
                name: '中級方案',
                sub: 'AEO 搜尋優化',
                price: 'MOP 499',
                per: '/月',
                highlight: false,
                badge: null,
                features: ['月度 Citation 監測報告', '5 條優先 FAQ 優化', 'Citation playbook', 'AI Visibility Score 追蹤'],
                cta: '了解詳情',
                href: WHATSAPP_URL,
                external: true,
              },
              {
                name: '高級方案',
                sub: 'AEO + 行業研究 + KG',
                price: 'MOP 1,499',
                per: '/月',
                highlight: true,
                badge: '最受歡迎',
                features: ['你的事實進入行業知識圖譜', 'AI 答案直接引用你最新數字（規劃中）', 'Verified KG entity 建立', '定制 Insight 文章', '月度 absorption lift 報告（規劃中）'],
                cta: '立即咨詢',
                href: WHATSAPP_URL,
                external: true,
              },
              {
                name: '定制方案',
                sub: '全方位戰略部署',
                price: 'MOP 3,999+',
                per: '/月 or 項目制',
                highlight: false,
                badge: null,
                features: ['企業年度 AI 戰略', '競品 entity 全面對標', '行業 Citation Gap 分析', '季度 absorption 審計（規劃中）', '政府/機構白皮書（可選）'],
                cta: '預約策略會議',
                href: WHATSAPP_URL,
                external: true,
              },
            ].map((plan, i) => (
              <div key={i} className="cp-plan-card" style={{
                border: plan.highlight ? '2px solid #C9A961' : '1px solid #e8e8e8',
                borderRadius: 20,
                padding: '28px 20px',
                position: 'relative',
                background: plan.highlight ? 'rgba(201,169,97,0.04)' : '#fff',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#C9A961', color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{plan.sub}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: '#0A1628' }}>{plan.name}</h3>
                <div style={{ marginBottom: 18 }}>
                  <span style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 900, color: '#0A1628' }}>{plan.price}</span>
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>{plan.per}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', textAlign: 'left' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13, color: '#444', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: plan.highlight ? '#C9A961' : '#0A1628', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.href} {...(plan.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{
                  display: 'block',
                  background: plan.highlight ? '#C9A961' : '#0A1628',
                  color: '#fff',
                  padding: '13px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  textAlign: 'center',
                }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          {/* Government track */}
          <div className="cp-gov-track" style={{ background: '#f8f9fc', border: '1px solid #e0e0e0', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', textAlign: 'left' }}>
            <div style={{ fontSize: 28 }}>🏛️</div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 800, fontSize: 'clamp(14px, 3.5vw, 16px)', color: '#0A1628', marginBottom: 4 }}>政府 / 機構方案 — 地區 AI 能見度白皮書</div>
              <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#666', lineHeight: 1.6 }}>
                面向旅遊局、工業局、行業協會——分析整個地區產業在 AI 引擎的引用現況，提供戰略部署建議。
                MOP 50,000+ / 項目
              </div>
            </div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, background: '#0A1628', color: '#fff', padding: '11px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              聯絡我們
            </a>
          </div>
        </div>
      </section>

      {/* ── S7 FAQ ── */}
      <section className="cp-section" style={{ background: '#f8f9fc', padding: '64px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px, 3.5vw, 36px)', fontWeight: 800, marginBottom: 40 }}>
            常見問題
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 'clamp(14px, 3.5vw, 17px)', fontWeight: 700, marginBottom: 8, marginTop: 0, color: '#0A1628' }}>
                  Q: {faq.q}
                </h3>
                <p style={{ color: '#555', lineHeight: 1.7, fontSize: 'clamp(13px, 3vw, 15px)', margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── S8 FINAL CTA ── */}
      <section className="cp-hero" style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 100%)',
        color: '#fff',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 42px)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>
          你的競爭對手<span style={{ color: '#C9A961' }}>已在行動</span><br />
          你準備好了嗎？
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(14px, 3vw, 17px)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
          免費診斷，30 分鐘了解你的品牌在 AI 世界的位置。
          無需準備，無銷售壓力。
        </p>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          background: '#25D366',
          color: '#fff',
          padding: '18px 48px',
          borderRadius: 50,
          fontSize: 'clamp(16px, 3.5vw, 20px)',
          fontWeight: 800,
          textDecoration: 'none',
          boxShadow: '0 12px 40px rgba(37,211,102,0.5)',
          letterSpacing: '-0.01em',
        }}>
          📱 WhatsApp 免費診斷
        </a>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 16 }}>
          完全免費 · 無合約綁定 · 即日回覆
        </p>
      </section>

      {/* Schema.org JSON-LD — Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': ['Organization', 'SoftwareApplication'],
            name: 'CloudPipe',
            alternateName: 'CloudPipe AEO Platform',
            description: '澳門首個 AI 知識認證網絡——連接政府官方數據、米芝蓮、黑珍珠等權威來源，助品牌被 ChatGPT、Perplexity、Claude 認識和引用',
            url: 'https://cloudpipe-macao-app.vercel.app',
            foundingLocation: {
              '@type': 'Place',
              name: '澳門',
              addressCountry: 'MO',
            },
            areaServed: ['澳門', '香港', '大灣區'],
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            sameAs: [
              'https://www.macaotourism.gov.mo',
              'https://www.dsec.gov.mo',
              'https://guide.michelin.com/mo/zh_TW/restaurants',
            ],
            knowsAbout: [
              'AEO優化', 'GEO優化', 'AI引用率', '品牌AI可見度',
              '澳門餐飲', '澳門旅遊', 'Knowledge Graph', 'FAQPage Schema',
            ],
          }),
        }}
      />

      {/* Schema.org JSON-LD — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      <style>{`
        @media (max-width: 600px) {
          .cp-hero { padding: 52px 16px 44px !important; }
          .cp-section { padding: 44px 16px !important; }
          .cp-pricing-section { padding: 44px 16px !important; }
          .cp-stat-strip { flex-direction: column !important; align-items: center !important; }
          .cp-stat { border-right: none !important; border-bottom: 1px solid rgba(201,169,97,0.2) !important; min-width: auto !important; width: 100% !important; padding: 10px 0 !important; }
          .cp-stat:last-child { border-bottom: none !important; }
          .cp-br-hide { display: none !important; }
          .cp-free-tier { flex-direction: column !important; padding: 24px 20px !important; text-align: center !important; }
          .cp-free-tier-cta { width: 100% !important; }
          .cp-timeline { grid-template-columns: 1fr 1fr !important; }
          .cp-blockquote { padding-left: 12px !important; }
          .cp-plan-card { padding: 24px 16px !important; }
          .cp-gov-track { padding: 18px 16px !important; }
        }
      `}</style>
    </div>
  )
}
