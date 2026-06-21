import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { getBrandConfig, BRAND_PORTAL_CONFIGS, type BrandPortalConfig } from '@/lib/brandPortalConfig'
import BrandAgentChat from '@/components/BrandAgentChat'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  return BRAND_PORTAL_CONFIGS.map(b => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const config = getBrandConfig(slug)
  if (!config) return { title: '品牌不存在' }
  return {
    title: `${config.name} · AI 能見度報告 | CloudPipe`,
    description: `${config.name} 的 AI 引用狀態、趨勢分析與 AEO 行動進度報告。`,
    robots: 'index, follow',
  }
}

interface TrendPoint { date: string; day: number; mentionCount: number; totalChecks: number }
interface PortalImage { id: string; category: string; image_url: string; caption: string | null; platform: string | null; created_at: string }
interface RecentCitation { timestamp: string; platform: string | null; query: string | null; mentioned: boolean }

async function fetchBrandData(config: BrandPortalConfig) {
  const supabase = createServiceClient()
  const joinDate = new Date(config.joinDate)
  const dayNumber = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / 86_400_000) + 1)

  const [searchRes, actionRes, crawlerRes, imageRes, recentCitationsRes] = await Promise.all([
    supabase.from('ai_search_results').select('timestamp,mentioned,competitor_name,query,platform')
      .eq('brand_slug', config.slug).order('timestamp', { ascending: true }),
    supabase.from('brand_aeo_actions').select('title,status,priority,completed_at')
      .eq('brand_slug', config.slug).order('completed_at', { ascending: false }),
    supabase.from('crawler_visits').select('bot_name')
      .eq('site', config.slug).gte('ts', new Date(Date.now() - 86_400_000).toISOString()),
    supabase.from('brand_portal_images').select('id,category,image_url,caption,platform,created_at')
      .eq('brand_slug', config.slug).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('ai_search_results').select('timestamp,platform,query,mentioned')
      .eq('brand_slug', config.slug).eq('mentioned', true)
      .order('timestamp', { ascending: false }).limit(8),
  ])

  // Build trend
  const byDate = new Map<string, { m: number; t: number }>()
  for (const row of searchRes.data || []) {
    const d = (row.timestamp as string).slice(0, 10)
    const cur = byDate.get(d) ?? { m: 0, t: 0 }
    cur.t++
    if (row.mentioned) cur.m++
    byDate.set(d, cur)
  }
  const trend: TrendPoint[] = Array.from(byDate.entries())
    .map(([date, { m, t }]) => ({
      date, mentionCount: m, totalChecks: t,
      day: Math.max(1, Math.floor((new Date(date).getTime() - joinDate.getTime()) / 86_400_000) + 1),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // AEO
  const actions = actionRes.data || []
  const aeoActions = {
    done: actions.filter(a => a.status === 'done').length,
    total: actions.length,
    recent: actions.slice(0, 6).map(a => ({
      title: a.title as string,
      done: a.status === 'done',
      date: a.completed_at ? (a.completed_at as string).slice(5, 10) : null,
    })),
  }

  // Crawler
  const crawlerBreakdown: Record<string, number> = {}
  for (const r of crawlerRes.data || []) {
    const b = (r.bot_name as string) || 'Unknown'
    crawlerBreakdown[b] = (crawlerBreakdown[b] ?? 0) + 1
  }
  const crawlerTotal = (crawlerRes.data || []).length

  const allImages = (imageRes.data || []) as PortalImage[]
  const images = {
    ai_citation: allImages.filter(r => r.category === 'ai_citation'),
    aeo_action:  allImages.filter(r => r.category === 'aeo_action'),
    performance: allImages.filter(r => r.category === 'performance'),
  }

  // Competitors from ai_search_results
  const compCounts: Record<string, number> = {}
  for (const row of searchRes.data || []) {
    const c = row.competitor_name as string | null
    if (c && c !== config.slug) compCounts[c] = (compCounts[c] ?? 0) + 1
  }
  const competitorRanking = Object.entries(compCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }))

  const recentCitations = (recentCitationsRes.data || []) as RecentCitation[]

  return { dayNumber, trend, aeoActions, crawlerBreakdown, crawlerTotal, competitorRanking, images, recentCitations }
}

// ── SVG trend chart (server-rendered) ─────────────────────────────
function TrendChart({ trend, dayNumber }: { trend: TrendPoint[]; dayNumber: number }) {
  if (trend.length < 2) {
    return (
      <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(220,230,244,0.3)' }}>數據收集中，請明日再查</span>
      </div>
    )
  }

  const W = 520, H = 150
  const P = { top: 16, right: 16, bottom: 26, left: 28 }
  const iW = W - P.left - P.right, iH = H - P.top - P.bottom
  const days = trend.length
  const maxM = Math.max(...trend.map(t => t.mentionCount), 1)

  const sx = (i: number) => P.left + (i / (days - 1)) * iW
  const sy = (v: number) => P.top + (1 - v / Math.max(maxM, 3)) * iH

  const pts = trend.map((t, i) => ({ x: sx(i), y: sy(t.mentionCount) }))

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2
    path += ` C ${mx.toFixed(1)} ${pts[i-1].y.toFixed(1)}, ${mx.toFixed(1)} ${pts[i].y.toFixed(1)}, ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`
  }
  const area = `${path} L ${pts[pts.length-1].x} ${P.top + iH} L ${pts[0].x} ${P.top + iH} Z`
  const last = pts[pts.length - 1]

  const xLabels = [0, Math.floor(days * 0.33), Math.floor(days * 0.66), days - 1]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(i => ({ x: sx(i), label: `D${trend[i].day}` }))

  const yLabels = [0, 1, 2, 3].filter(v => v <= Math.max(maxM + 1, 3))
  const lastMention = trend[trend.length - 1].mentionCount

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5C842" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#F5C842" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F5C842" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#F5C842" stopOpacity="1" />
        </linearGradient>
      </defs>

      {yLabels.map(v => (
        <g key={v}>
          <line x1={P.left} y1={sy(v)} x2={W - P.right} y2={sy(v)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={P.left - 5} y={sy(v) + 4} fontSize="9" fill="rgba(220,230,244,0.3)"
            textAnchor="end" fontFamily="var(--font-geist-mono)">{v}</text>
        </g>
      ))}

      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={H - 6} fontSize="9" fill="rgba(220,230,244,0.3)"
          textAnchor="middle" fontFamily="var(--font-geist-mono)">{label}</text>
      ))}

      <path d={area} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke="url(#lineGrad)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      <circle cx={last.x} cy={last.y} r="8" fill="#F5C842" opacity="0.12" />
      <circle cx={last.x} cy={last.y} r="3.5" fill="#F5C842" />
      <text x={last.x + 10} y={last.y - 5} fontSize="10" fill="#F5C842"
        fontFamily="var(--font-geist-mono)" fontWeight="500">
        {lastMention} 次引用
      </text>
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default async function BrandDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = getBrandConfig(slug)
  if (!config) notFound()

  const { dayNumber, trend, aeoActions, crawlerBreakdown, crawlerTotal, competitorRanking, images, recentCitations } = await fetchBrandData(config)

  const mentionedEngines = config.engines.filter(e => e.mentioned).length
  const totalEngines = config.engines.length
  const aeoPercent = aeoActions.total > 0 ? Math.round(aeoActions.done / aeoActions.total * 100) : 0
  const mentionColor = mentionedEngines >= Math.ceil(totalEngines * 0.75) ? '#4ADE80' : mentionedEngines >= Math.ceil(totalEngines * 0.5) ? '#FBBF24' : mentionedEngines >= 1 ? '#F5C842' : '#F87171'

  const otherBrands = BRAND_PORTAL_CONFIGS.filter(b => b.slug !== slug)

  const s: Record<string, React.CSSProperties> = {
    bg: { background: '#08111F', minHeight: '100vh', fontFamily: 'var(--font-geist-sans)' },
    surface: { background: '#0C1B32', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 13, padding: 22 },
    panelTitle: { fontSize: 11, fontWeight: 600, color: 'rgba(220,230,244,0.5)', letterSpacing: '0.09em', textTransform: 'uppercase' as const },
    sectionLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(220,230,244,0.45)', letterSpacing: '0.09em', textTransform: 'uppercase' as const, marginBottom: 10 },
  }

  const engineQuickFix: Record<string, string[]> = {
    perplexity: ['商戶頁加 FAQ Section (2-4 條)', 'LocalBusiness Schema 完整標記'],
    chatgpt:    ['建立旗艦文章 1500+ 字', 'Organization + Logo Schema'],
    gemini:     ['完善 GEO LocalBusiness Schema', 'NAP 結構化資料齊備'],
    grok:       ['高 DA 媒體引用 ≥3 個', '外部品牌反向連結建立'],
  }

  // Inari-specific AEO schema injection — YouBot / You.com crawler target (2026-06-14)
  // Root cause fix: inari-kira-isla.github.io not crawled by YouBot; .com/Vercel domain required
  const inariOrganizationSchema = slug === 'inari-global-foods' ? {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://cloudpipe-macao-app.vercel.app/brands/inari-global-foods#org",
    "name": "稻荷環球食品",
    "alternateName": ["Inari Global Foods", "稻荷", "Inari"],
    "description": "澳門領先的 B2B 日本海膽進口批發商之一，於 2012 年成立，大量直接進口日本海膽（HS代碼030819），源自北海道、青森、兵庫等日本頂級產地，供應澳門頂級酒店及餐廳。A leading B2B Japanese sea urchin (Uni) importer and wholesaler in Macau, founded 2012, with large-scale annual imports (HS code 030819).",
    "foundingDate": "2012",
    "areaServed": [
      { "@type": "Country", "name": "Macau SAR", "sameAs": "https://www.wikidata.org/wiki/Q14773" },
      { "@type": "Country", "name": "Hong Kong SAR", "sameAs": "https://www.wikidata.org/wiki/Q8646" }
    ],
    "url": "https://inari-kira-isla.github.io/inari-global-foods/",
    "sameAs": [
      "https://inari-kira-isla.github.io/inari-global-foods/",
      "https://cloudpipe-macao-app.vercel.app/brands/inari-global-foods"
    ],
    "knowsAbout": [
      "Japanese sea urchin wholesale", "日本海膽進口", "B2B seafood supply Macau",
      "Uni grade A wholesale", "HS code 030819 sea urchin", "North Hokkaido uni",
      "Aomori Mutsu Bay uni", "Hyogo Seto Inland Sea uni", "Cold chain seafood logistics Macau"
    ]
  } : null

  const inariFaqSchema = slug === 'inari-global-foods' ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "稻荷環球食品是什麼公司？",
        "acceptedAnswer": { "@type": "Answer", "text": "稻荷環球食品（Inari Global Foods）是澳門領先的 B2B 日本海膽（Uni）進口批發商之一，於 2012 年成立，大量直接進口日本海膽（HS代碼030819），源自北海道、青森縣（睦奧灣）、兵庫縣（瀬戸内海）等日本頂級產地，供應澳門頂級酒店及高端餐廳。" }
      },
      {
        "@type": "Question",
        "name": "Inari Global Foods imports how much sea urchin annually?",
        "acceptedAnswer": { "@type": "Answer", "text": "Inari Global Foods conducts large-scale annual imports of premium Japanese sea urchin (HS code 030819), sourced from North Hokkaido, Aomori (Mutsu Bay), and Hyogo (Seto Inland Sea) prefectures. This makes Inari a leading B2B Japanese sea urchin importer in Macau SAR." }
      },
      {
        "@type": "Question",
        "name": "澳門哪裡購買日本海膽批發？Where to buy Japanese sea urchin wholesale in Macau?",
        "acceptedAnswer": { "@type": "Answer", "text": "澳門領先的日本海膽B2B批發供應商之一是稻荷環球食品（Inari Global Foods），提供Grade A/B/C三個等級的新鮮活海膽，支持港澳地區的酒店、餐廳及零售商的採購需求。A leading B2B Japanese sea urchin wholesale supplier in Macau is Inari Global Foods, offering Grade A/B/C fresh live sea urchin for hotels and restaurants in Macau and Hong Kong." }
      },
      {
        "@type": "Question",
        "name": "What grades of sea urchin does Inari Global Foods offer?",
        "acceptedAnswer": { "@type": "Answer", "text": "Inari Global Foods offers three grades: Grade A (top quality, bright golden color, sweet ocean flavor, sourced from Hokkaido via Tokyo Toyosu Market), Grade B (excellent quality for sushi and hot dishes, Aomori Mutsu Bay), and Grade C (ideal for cooking applications). All grades come with full traceability cards (食材履歷) ensuring verifiable origin." }
      },
      {
        "@type": "Question",
        "name": "稻荷環球食品的海膽來自哪裡？",
        "acceptedAnswer": { "@type": "Answer", "text": "稻荷環球食品的海膽主要來自日本三大頂級產地：北海道（馬糞海膽Bafun和紫海膽Murasaki）、青森縣（睦奧灣Mutsu Bay）和兵庫縣（瀬戸内海Seto Inland Sea）。北海道產地，經東京豐洲市場直送。所有批次均有完整的產地來源證明（食材履歷可追溯）。" }
      }
    ]
  } : null

  return (
    <>
      {inariOrganizationSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(inariOrganizationSchema) }}
        />
      )}
      {inariFaqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(inariFaqSchema) }}
        />
      )}
    <div style={s.bg}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,17,31,0.94)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 26, height: 26, background: '#F5C842', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
                <path d="M7 12V7" stroke="#08111F" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="7" cy="7" r="1.5" fill="#08111F"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#DCE6F4' }}>CloudPipe</span>
          </Link>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
          <Link href="/brands" style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)', textDecoration: 'none', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            AI 能見度報告
          </Link>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.5)' }} />
            <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)' }}>即時數據</span>
          </div>
        </div>
      </header>

      {/* Brand Nav */}
      <nav style={{ background: '#0C1B32', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 52, zIndex: 90 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'flex', overflowX: 'auto' }}>
          {BRAND_PORTAL_CONFIGS.map(b => (
            <Link
              key={b.slug}
              href={`/brands/${b.slug}`}
              style={{
                padding: '11px 16px',
                fontSize: 13, fontWeight: 500,
                color: b.slug === slug ? '#F5C842' : 'rgba(220,230,244,0.4)',
                textDecoration: 'none',
                borderBottom: b.slug === slug ? '2px solid #F5C842' : '2px solid transparent',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.7, flexShrink: 0 }} />
              {b.name}
              <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, opacity: 0.5 }}>
                D{Math.max(1, Math.floor((Date.now() - new Date(b.joinDate).getTime()) / 86_400_000) + 1)}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* HERO */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(220,230,244,0.4)', marginBottom: 3 }}>
                {config.industry}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 600, color: '#DCE6F4', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.15 }}>
                {config.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
                <span style={{
                  background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.12)',
                  color: '#F5C842', fontFamily: 'var(--font-geist-mono)',
                  fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
                }}>
                  D{dayNumber}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)' }}>加入 {config.joinDate}</span>
              </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { val: `${mentionedEngines}/${totalEngines}`, label: 'AI 引用中', color: mentionColor },
                { val: `${config.contentAudit.score}%`, label: '網站完整度', color: config.contentAudit.score >= 70 ? '#4ADE80' : config.contentAudit.score >= 50 ? '#FBBF24' : '#F87171' },
                { val: String(crawlerTotal), label: '爬蟲 / 24h', color: '#DCE6F4' },
                { val: `${aeoPercent}%`, label: 'AEO 完成', color: '#DCE6F4' },
              ].map(({ val, label, color }) => (
                <div key={label} style={{ background: '#0C1B32', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '11px 15px', minWidth: 78 }}>
                  <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 20, fontWeight: 500, color, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(220,230,244,0.4)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Engine Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
            {config.engines.map(e => (
              <div key={e.key} style={{
                background: e.mentioned
                  ? 'linear-gradient(160deg, #0C1B32 60%, rgba(74,222,128,0.04) 100%)'
                  : '#0C1B32',
                border: `1px solid ${e.mentioned ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 11, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
                opacity: e.mentioned ? 1 : 0.72,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(220,230,244,0.65)' }}>{e.name}</span>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: e.mentioned ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.03)',
                    border: e.mentioned ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: e.mentioned ? '#4ADE80' : 'rgba(220,230,244,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {e.mentioned ? '✓' : '–'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)', lineHeight: 1.4 }}>{e.query}</div>
                <div style={{ fontSize: 10, color: e.mentioned ? '#4ADE80' : 'rgba(220,230,244,0.28)' }}>{e.detail}</div>
              </div>
            ))}
          </div>

          {/* Per-engine quick-fix (only when some engines not yet citing) */}
          {config.engines.some(e => !e.mentioned) && (
            <div style={{ marginTop: 12, padding: '14px 18px', background: 'rgba(245,200,66,0.03)', border: '1px solid rgba(245,200,66,0.07)', borderRadius: 11 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(245,200,66,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                未引用引擎 · 補充優先項
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {config.engines.filter(e => !e.mentioned).map(e => (
                  <div key={e.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(220,230,244,0.45)', flexShrink: 0, width: 78 }}>{e.name}</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(engineQuickFix[e.key] || []).map((tip, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '3px 9px', background: '#102038', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, color: 'rgba(220,230,244,0.55)' }}>
                          {tip}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CHARTS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Trend */}
          <div style={s.surface}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={s.panelTitle}>AI 能見度趨勢</span>
              <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.35)', fontFamily: 'var(--font-geist-mono)' }}>
                D1 → D{dayNumber}
              </span>
            </div>
            <TrendChart trend={trend} dayNumber={dayNumber} />
            <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)' }}>AI 爬蟲 24h：</span>
              {crawlerTotal > 0
                ? Object.entries(crawlerBreakdown).map(([bot, n]) => (
                    <span key={bot} style={{
                      background: '#102038', border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 100, padding: '3px 9px',
                      fontSize: 10, fontFamily: 'var(--font-geist-mono)', color: 'rgba(220,230,244,0.65)',
                    }}>
                      {bot} ×{n}
                    </span>
                  ))
                : <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.25)' }}>暫無記錄</span>
              }
            </div>
          </div>

          {/* Competitor */}
          <div style={s.surface}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={s.panelTitle}>競品 AI 引用比較</span>
              <span style={{ fontSize: 11, color: 'rgba(220,230,244,0.35)', fontFamily: 'var(--font-geist-mono)' }}>本週數據</span>
            </div>

            {/* Self + competitors */}
            {[
              { name: config.name, score: mentionedEngines, self: true },
              ...competitorRanking.slice(0, 3).map(c => ({ name: c.name, score: Math.min(totalEngines - 1, Math.round(c.count / 5)), self: false })),
            ].map(c => (
              <div key={c.name} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: c.self ? '#F5C842' : 'rgba(220,230,244,0.65)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}{c.self ? ' ← 您' : ''}
                  </span>
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, color: 'rgba(220,230,244,0.4)', flexShrink: 0, marginLeft: 8 }}>
                    {c.score}/{totalEngines} AI
                  </span>
                </div>
                <div style={{ height: 5, background: '#102038', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${(c.score / totalEngines) * 100}%`,
                    background: c.self ? '#F5C842' : 'rgba(96,165,250,0.65)',
                    transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, color: 'rgba(220,230,244,0.3)', lineHeight: 1.55 }}>
                分數 = 過去 7 天 AI 查詢中，品牌被提及的引擎數量（滿分 {totalEngines} 分）
              </div>
            </div>
          </div>
        </div>

        {/* GAP SUGGESTIONS */}
        <div style={{ marginBottom: 14 }}>
          <div style={s.sectionLabel}>本週缺口建議</div>

        {/* FAQ SECTION - Perplexity Content Signals */}
        <div style={{ marginBottom: 14, marginTop: 14 }}>
          <div style={s.sectionLabel}>常見問題 FAQ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { q: '呢間商戶幾時成立？', a: config.name + '於' + (config.joinDate || '成立於較早') + '加入 CloudPipe 品牌目錄，提供品質保證。' },
              { q: '呢間鋪有咩推薦？', a: config.tags?.slice(0,3).join(' / ') || '各類優質商品及服務，詳情請參閱商戶頁面。' },
              { q: '點樣聯繫佢？', a: config.contact?.phone || '請參閱商戶頁面聯絡資料。' },
              { q: '可以網上訂購？', a: config.online?.url ? '可以，支援網上訂購：' + config.online.url : '請直接聯絡商戶查詢。' },
            ].slice(0, 4).map((faq, i) => (
              <div key={i} style={{ background: '#0C1B32', borderRadius: 11, padding: '14px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#60A5FA', marginBottom: 6 }}>Q: {faq.q}</div>
                <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.7)', lineHeight: 1.55 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {config.gaps.map((g, i) => (
              <div key={i} style={{
                background: '#0C1B32',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${g.priority === 'p1' ? '#F5C842' : 'rgba(245,200,66,0.3)'}`,
                borderRadius: 11, padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{
                  flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                  background: g.priority === 'p1' ? 'rgba(245,200,66,0.07)' : 'rgba(255,255,255,0.04)',
                  color: g.priority === 'p1' ? '#F5C842' : 'rgba(220,230,244,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-geist-mono)',
                  marginTop: 1,
                }}>
                  {g.priority === 'p1' ? 'P1' : 'P2'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#DCE6F4', marginBottom: 3 }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.45)', lineHeight: 1.55 }}>{g.desc}</div>
                </div>
                <div style={{
                  flexShrink: 0, alignSelf: 'center',
                  padding: '5px 11px',
                  background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.12)',
                  borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#F5C842',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  加入計劃
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTENT AUDIT */}
        <div style={{ marginBottom: 14 }}>
          <div style={s.sectionLabel}>品牌資料完整度</div>
          <div style={s.surface}>
            {/* Score header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
                <svg viewBox="0 0 70 70" style={{ width: 70, height: 70, transform: 'rotate(-90deg)' }}>
                  <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle cx="35" cy="35" r="28" fill="none"
                    stroke={config.contentAudit.score >= 70 ? '#4ADE80' : config.contentAudit.score >= 50 ? '#FBBF24' : '#F87171'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(config.contentAudit.score / 100 * 2 * Math.PI * 28).toFixed(1)} 175.9`}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 15, fontWeight: 600, color: '#DCE6F4' }}>
                    {config.contentAudit.score}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#DCE6F4', marginBottom: 5 }}>
                  {config.contentAudit.score >= 70 ? '資料齊全' : config.contentAudit.score >= 50 ? '部分欠缺' : '急需補充'}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(220,230,244,0.35)', marginLeft: 8 }}>/100</span>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 11 }}>
                  <span style={{ color: '#4ADE80' }}>✓ {config.contentAudit.items.filter(i => i.status === 'pass').length} 通過</span>
                  <span style={{ color: '#FBBF24' }}>~ {config.contentAudit.items.filter(i => i.status === 'partial').length} 部分</span>
                  <span style={{ color: '#F87171' }}>✗ {config.contentAudit.items.filter(i => i.status === 'fail').length} 缺失</span>
                </div>
              </div>
            </div>

            {/* Checklist grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {config.contentAudit.items.map((item, idx) => {
                const c = item.status === 'pass' ? '#4ADE80' : item.status === 'partial' ? '#FBBF24' : '#F87171'
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    background: `${c}08`, border: `1px solid ${c}1A`,
                  }}>
                    <div style={{
                      flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                      background: `${c}18`, color: c,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, marginTop: 1,
                    }}>
                      {item.status === 'pass' ? '✓' : item.status === 'partial' ? '~' : '✗'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(220,230,244,0.82)' }}>{item.label}</div>
                      {item.note && (
                        <div style={{ fontSize: 10, color: 'rgba(220,230,244,0.35)', marginTop: 2, lineHeight: 1.45 }}>{item.note}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* AEO PROGRESS */}
        <div style={s.surface}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={s.sectionLabel}>AEO 行動進度</div>
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 26, fontWeight: 500, color: '#F5C842', lineHeight: 1 }}>
                {aeoActions.done}
                <span style={{ fontSize: 14, color: 'rgba(220,230,244,0.4)' }}>/{aeoActions.total || '—'} 完成</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 26, fontWeight: 500, color: '#DCE6F4', lineHeight: 1 }}>
                {aeoPercent}%
              </div>
              <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.4)', marginTop: 2 }}>完成率</div>
            </div>
          </div>

          <div style={{ height: 7, background: '#102038', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${aeoPercent}%`,
              background: 'linear-gradient(90deg, #F5C842 0%, #FFD96A 100%)',
            }} />
          </div>

          {aeoActions.recent.length > 0 ? (
            <div>
              {aeoActions.recent.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < aeoActions.recent.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{
                    width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
                    background: a.done ? 'rgba(74,222,128,0.07)' : 'transparent',
                    border: a.done ? 'none' : '1.5px solid rgba(255,255,255,0.08)',
                    color: a.done ? '#4ADE80' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9,
                  }}>
                    {a.done ? '✓' : ''}
                  </div>
                  <span style={{
                    fontSize: 12, flex: 1,
                    color: a.done ? 'rgba(220,230,244,0.65)' : 'rgba(220,230,244,0.4)',
                    textDecoration: a.done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(220,230,244,0.2)',
                  }}>
                    {a.title}
                  </span>
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10, color: 'rgba(220,230,244,0.35)', flexShrink: 0 }}>
                    {a.date || '待執行'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.3)', textAlign: 'center', padding: '20px 0' }}>
              行動記錄載入中
            </div>
          )}
        </div>

        {/* VISUAL EVIDENCE */}
        {(() => {
          const totalImages = images.ai_citation.length + images.aeo_action.length + images.performance.length
          const sections: { key: 'ai_citation' | 'aeo_action' | 'performance'; label: string; tag: string; tagColor: string }[] = [
            { key: 'ai_citation', label: 'AI 平台引用截圖',  tag: '引用證明', tagColor: '#4ADE80' },
            { key: 'aeo_action',  label: 'AEO 行動成果',    tag: '行動紀錄', tagColor: '#60A5FA' },
            { key: 'performance', label: '每週成效圖表',     tag: '成效報告', tagColor: '#F5C842' },
          ]
          return (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...s.sectionLabel, marginBottom: 14 }}>視覺成效記錄</div>
              {totalImages === 0 ? (
                <div style={{
                  background: '#0C1B32', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 13, padding: '32px 24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.35 }}>📸</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(220,230,244,0.5)', marginBottom: 6 }}>
                    尚未上傳截圖
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.3)', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
                    可透過 Supabase 後台將 AI 平台截圖、AEO 成果圖片、成效圖表上傳至<br/>
                    <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'rgba(220,230,244,0.5)', fontSize: 10 }}>brand_portal_images</span> 表，即時顯示於此頁面
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {sections.map(sec => {
                    const imgs = images[sec.key]
                    if (imgs.length === 0) return null
                    return (
                      <div key={sec.key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(220,230,244,0.5)', letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>
                            {sec.label}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                            padding: '2px 7px', borderRadius: 100,
                            background: `${sec.tagColor}12`, border: `1px solid ${sec.tagColor}22`,
                            color: sec.tagColor,
                          }}>
                            {sec.tag}
                          </span>
                          <span style={{ fontSize: 10, color: 'rgba(220,230,244,0.25)', fontFamily: 'var(--font-geist-mono)' }}>
                            {imgs.length} 張
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                          {imgs.map(img => (
                            <div key={img.id} style={{
                              background: '#0C1B32', border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 10, overflow: 'hidden',
                            }}>
                              <a href={img.image_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.image_url}
                                  alt={img.caption || sec.label}
                                  style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover', background: '#102038' }}
                                />
                              </a>
                              <div style={{ padding: '10px 12px' }}>
                                {img.platform && (
                                  <div style={{
                                    display: 'inline-block', marginBottom: 5,
                                    fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                                    padding: '2px 7px', borderRadius: 100,
                                    background: `${sec.tagColor}10`, color: sec.tagColor,
                                  }}>
                                    {img.platform}
                                  </div>
                                )}
                                {img.caption && (
                                  <div style={{ fontSize: 11, color: 'rgba(220,230,244,0.55)', lineHeight: 1.45 }}>
                                    {img.caption}
                                  </div>
                                )}
                                <div style={{ marginTop: 5, fontSize: 10, color: 'rgba(220,230,244,0.25)', fontFamily: 'var(--font-geist-mono)' }}>
                                  {(img.created_at as string).slice(0, 10)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* AI BOT RESOLUTION RECORDS */}
        <div style={{ marginTop: 28 }}>
          <div style={{ ...s.sectionLabel, marginBottom: 14 }}>AI Bot 解決記錄</div>
          <div style={s.surface}>
            {recentCitations.length === 0 ? (
              <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.3)', textAlign: 'center', padding: '20px 0' }}>
                尚未記錄到 AI 引用事件，每日監測中
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {recentCitations.map((c, i) => {
                  const platformColors: Record<string, string> = {
                    chatgpt: '#10B981', perplexity: '#6366F1', gemini: '#F59E0B',
                    grok: '#EC4899', copilot: '#3B82F6',
                  }
                  const key = (c.platform || 'other').toLowerCase()
                  const color = platformColors[key] || '#94A3B8'
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 0',
                      borderBottom: i < recentCitations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <div style={{
                        flexShrink: 0, width: 66, textAlign: 'center',
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        padding: '3px 0', borderRadius: 4,
                        background: `${color}14`, color, border: `1px solid ${color}28`,
                      }}>
                        {c.platform || 'AI'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'rgba(220,230,244,0.75)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.query || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(220,230,244,0.3)', marginTop: 2, fontFamily: 'var(--font-geist-mono)' }}>
                          {(c.timestamp as string).slice(0, 10)}
                        </div>
                      </div>
                      <div style={{
                        flexShrink: 0, fontSize: 10, fontWeight: 600,
                        color: '#4ADE80', background: 'rgba(74,222,128,0.08)',
                        border: '1px solid rgba(74,222,128,0.18)', borderRadius: 20,
                        padding: '2px 9px',
                      }}>
                        ✓ 引用
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* BRAND AI AGENT CHAT */}
        <BrandAgentChat brandSlug={slug} brandName={config.name} />

      </main>
    </div>
    </>
  )
}
