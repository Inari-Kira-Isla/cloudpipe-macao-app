/**
 * JBL Bridge — public discovery endpoint (Phase 1: hardcoded fallback).
 *
 * 2026-05-29 H9 落地（Phase 1）：先用 hardcoded 8 個 featured ingredient 上線。
 * Phase 2 — 等 CEO-Q1 inari-production service key 解鎖後，改 dynamic fetch
 *           from inari Supabase（3,420 ingredient nodes + 103 book anchors），
 *           保留同樣嘅 public-layer schema（name + origin + season + handling）。
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
  // Phase 1: hardcoded fallback body. Phase 2 will replace this with a
  // try/catch dynamic fetch from inari Supabase once CEO-Q1 unlocks the
  // service key. Keeping the try/catch shell here so the upgrade is a
  // localised edit (swap FALLBACK_BODY for live render, keep fallback on error).
  let body = FALLBACK_BODY
  try {
    // Placeholder for Phase 2 dynamic fetch.
    // Example shape:
    //   const featured = await fetchInariFeaturedIngredients()
    //   body = renderJblBridgeLlmsTxt(featured)
    body = FALLBACK_BODY
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
