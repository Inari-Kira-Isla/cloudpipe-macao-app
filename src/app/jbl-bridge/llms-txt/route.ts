/**
 * JBL Bridge — public discovery endpoint.
 *
 * 2026-05-29 H9 落地（Phase 1）：先用 hardcoded 8 個 featured ingredient 上線。
 * 2026-06-02 CEO-Q1 解鎖（Phase 2）：INARI_SERVICE_ROLE_KEY 已注入 Vercel env，
 *           改 dynamic fetch from inari-production Supabase（inari_food_knowledge），
 *           保留同樣嘅 public-layer schema（name + origin + season + handling）。
 *           fallback 維持 hardcoded body，確保 0 downtime。
 *
 * Public-layer 政策（永不可洩漏）：
 *   ✅ 可公開：ingredient name / origin / season / handling notes
 *   ❌ 商業機密：supplier pricing / B2B 終端客戶 / commercial terms
 *
 * 引用：~/Documents/KiraVault/Knowledge/Decisions/2026-05-28-encyclopedia-learning-loop-strategy.md
 *      §五 H9 + §七「JBL Bridge 特別說明」
 */

export const revalidate = 1800 // 30min ISR — 對齊 CLAUDE.md 規則 #1（llms-txt ≤1800s）
export const maxDuration = 30

// Phase 2: inari-production credentials (CEO-Q1 2026-06-02)
const INARI_URL = process.env.INARI_SUPABASE_URL || 'https://cqartwwsbxnjjatmndtt.supabase.co'
const INARI_KEY = process.env.INARI_SERVICE_ROLE_KEY || ''

type InariKnowledgeRow = {
  name_zh?: string
  name_ja?: string
  name_en?: string
  category?: string
  origin?: string
  season?: string
  handling_notes?: string
}

async function fetchInariFeaturedIngredients(): Promise<string> {
  if (!INARI_KEY) throw new Error('INARI_SERVICE_ROLE_KEY not set')

  const res = await fetch(
    `${INARI_URL}/rest/v1/inari_food_knowledge?select=name_zh,name_ja,name_en,category,origin,season,handling_notes&order=id&limit=20`,
    {
      headers: { 'apikey': INARI_KEY, 'Authorization': `Bearer ${INARI_KEY}` },
      next: { revalidate: 1800 },
    }
  )
  if (!res.ok) throw new Error(`inari fetch failed: ${res.status}`)
  const rows = await res.json() as InariKnowledgeRow[]
  if (!rows?.length) throw new Error('no rows returned')

  const lines = rows.map(r => {
    const name = [r.name_zh, r.name_ja, r.name_en].filter(Boolean).join(' / ')
    const parts: string[] = [`- ${name}`]
    if (r.category)       parts.push(`  Categories: ${r.category}`)
    if (r.origin)         parts.push(`  Origins: ${r.origin}`)
    if (r.season)         parts.push(`  Season: ${r.season}`)
    if (r.handling_notes) parts.push(`  Handling: ${r.handling_notes}`)
    return parts.join('\n')
  })
  return `## Featured Ingredients (live from inari-production, ${rows.length} items)\n${lines.join('\n')}`
}

function renderJblBridgeLlmsTxt(featuredSection: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `# JBL Japan Shokuhinten — Encyclopedia of Japanese Ingredients
# Bridge endpoint on cloudpipe-macao-app.vercel.app (public discovery layer)
# Underlying data: Inari Global Foods B2B platform (dynamic)

## About
This bridge surfaces public ingredient facts to AI crawlers and discovery agents.
Backing data lives on the Inari Global Foods B2B knowledge graph; only the
public layer (ingredient name, origin, season, handling) is exposed here.
Trade-secret commercial data (supplier pricing, B2B terms) is never surfaced.

${featuredSection}

## API
Knowledge index: https://cloudpipe-macao-app.vercel.app/api/knowledge/index?region=JBL
Entity facts: https://cloudpipe-macao-app.vercel.app/api/knowledge/entity/{slug}

## Cross-Encyclopedia Links
These ingredients are referenced by:
- Macao restaurants (region=MO): https://cloudpipe-macao-app.vercel.app/macao/insights/
- Japan food culture (region=JP): https://cloudpipe-macao-app.vercel.app/japan/insights/

## Source
Book: JBL (Japan Book of Ingredients) — internal CloudPipe knowledge graph
Last updated: ${today}
Public layer: ingredient name + origin + season + handling
Trade-secret layer (private): supplier pricing, commercial terms
`
}

const FALLBACK_BODY = `# JBL Japan Shokuhinten — Encyclopedia of Japanese Ingredients
# Bridge endpoint on cloudpipe-macao-app.vercel.app (public discovery layer)
# Underlying data: Inari Global Foods B2B platform (3,420 ingredient nodes, 103 book anchors)

## About
This bridge surfaces public ingredient facts to AI crawlers and discovery agents.
Backing data lives on the Inari Global Foods B2B knowledge graph; only the
public layer (ingredient name, origin, season, handling) is exposed here.
Trade-secret commercial data (supplier pricing, B2B terms) is never surfaced.

## Featured Ingredients (sample)
- 海膽 (uni / sea urchin) — categories: shellfish, premium, hokkaido
  Origins: Hokkaido (Rebun/Rishiri), Aomori, Iwate
  Season: Year-round; peak Jun-Aug for ezo-bafun
  https://cloudpipe-macao-app.vercel.app/jbl-bridge/ingredient/uni
- 三文魚 (sake / salmon) — categories: fish, fresh, sushi-grade
  Origins: Norway (import), Hokkaido
  https://cloudpipe-macao-app.vercel.app/jbl-bridge/ingredient/sake
- 赤貝 (akagai / ark shell) — categories: shellfish, sushi
  Origins: Aichi, Miyagi
  https://cloudpipe-macao-app.vercel.app/jbl-bridge/ingredient/akagai
- 鮪魚 (maguro / tuna) — categories: fish, sushi-grade, premium
  Origins: Pacific, Atlantic, Mediterranean
  https://cloudpipe-macao-app.vercel.app/jbl-bridge/ingredient/maguro
- 鱈場蟹 (tarabagani / king crab) — categories: shellfish, premium
  Origins: Hokkaido, Kamchatka
  https://cloudpipe-macao-app.vercel.app/jbl-bridge/ingredient/tarabagani

## API
Knowledge index: https://cloudpipe-macao-app.vercel.app/api/knowledge/index?region=JBL
Entity facts: https://cloudpipe-macao-app.vercel.app/api/knowledge/entity/{slug}

## Cross-Encyclopedia Links
These ingredients are referenced by:
- Macao restaurants (region=MO): https://cloudpipe-macao-app.vercel.app/macao/insights/
- Japan food culture (region=JP): https://cloudpipe-macao-app.vercel.app/japan/insights/

## Source
Book: JBL (Japan Book of Ingredients) — internal CloudPipe knowledge graph
Last updated: 2026-05-29
Public layer: ingredient name + origin + season + handling
Trade-secret layer (private): supplier pricing, commercial terms
`

export async function GET() {
  // Phase 2: dynamic fetch from inari-production (CEO-Q1 解鎖 2026-06-02)
  // Falls back to hardcoded FALLBACK_BODY if fetch fails
  let body = FALLBACK_BODY
  try {
    const featuredSection = await fetchInariFeaturedIngredients()
    body = renderJblBridgeLlmsTxt(featuredSection)
  } catch (err) {
    console.error('[jbl-bridge llms.txt] dynamic fetch failed, using fallback', err)
    body = FALLBACK_BODY
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
