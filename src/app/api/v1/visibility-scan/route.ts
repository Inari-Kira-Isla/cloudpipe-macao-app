import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

/**
 * GET /api/v1/visibility-scan?url=https://example.com
 *
 * Scans a URL for AEO + SEO + GEO visibility score.
 * Returns JSON with three-dimensional scores and fix suggestions.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  // Validate URL
  let targetUrl: string
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    targetUrl = parsed.origin + parsed.pathname
    if (!targetUrl.endsWith('/')) targetUrl += '/'
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const start = Date.now()
    const html = await fetchPage(targetUrl)

    if (!html) {
      return NextResponse.json({
        url: targetUrl, error: 'OFFLINE', score: 0, grade: 'F',
        aeo: { score: 0, max: 40, pct: 0 },
        seo: { score: 0, max: 35, pct: 0 },
        geo: { score: 0, max: 25, pct: 0 },
        checks: [], issues: [], fixes: [],
      })
    }

    const checks = await runAllChecks(targetUrl, html)

    const aeoChecks = checks.filter(c => c.dim === 'AEO')
    const seoChecks = checks.filter(c => c.dim === 'SEO')
    const geoChecks = checks.filter(c => c.dim === 'GEO')

    const aeo = { score: sum(aeoChecks, 'score'), max: sum(aeoChecks, 'max'), pct: 0 }
    const seo = { score: sum(seoChecks, 'score'), max: sum(seoChecks, 'max'), pct: 0 }
    const geo = { score: sum(geoChecks, 'score'), max: sum(geoChecks, 'max'), pct: 0 }
    aeo.pct = aeo.max ? Math.round(aeo.score / aeo.max * 100) : 0
    seo.pct = seo.max ? Math.round(seo.score / seo.max * 100) : 0
    geo.pct = geo.max ? Math.round(geo.score / geo.max * 100) : 0

    const total = aeo.score + seo.score + geo.score
    const grade = total >= 95 ? 'A+' : total >= 85 ? 'A' : total >= 75 ? 'B+' :
                  total >= 65 ? 'B' : total >= 50 ? 'C' : total >= 35 ? 'D' : 'F'

    const issues = checks.filter(c => c.score < c.max * 0.6)
    const fixes = issues.map(suggestFix)

    return NextResponse.json({
      url: targetUrl, score: total, grade, aeo, seo, geo,
      checks, issues, fixes,
      scan_time: Math.round((Date.now() - start) / 100) / 10,
      scanned_at: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      }
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Scan failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function sum(arr: { score: number; max: number }[], key: 'score' | 'max') {
  return arr.reduce((s, c) => s + c[key], 0)
}

async function fetchPage(url: string, timeout = 15000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CloudPipe-Visibility-Engine/1.0 (+https://cloudpipe.ai)' },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

async function fetchText(url: string, timeout = 10000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CloudPipe-Visibility-Engine/1.0' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    return res.ok ? await res.text() : null
  } catch { return null }
}

interface Check {
  id: string; name: string; dim: string; max: number; score: number; detail: string
}

async function runAllChecks(url: string, html: string): Promise<Check[]> {
  const base = url.replace(/\/$/, '')

  // Parallel fetch robots.txt, llms.txt, sitemap.xml
  const [robotsTxt, llmsTxt, sitemapXml] = await Promise.all([
    fetchText(base + '/robots.txt'),
    fetchText(base + '/llms.txt'),
    fetchText(base + '/sitemap.xml'),
  ])

  const checks: Check[] = []

  // ── AEO (40) ──
  checks.push({ id: 'A1', name: 'robots.txt AI 友善', dim: 'AEO', max: 8, ...checkRobotsAI(robotsTxt) })
  checks.push({ id: 'A2', name: 'llms.txt', dim: 'AEO', max: 8, ...checkLlmsTxt(llmsTxt) })
  checks.push({ id: 'A3', name: 'llms-txt link tag', dim: 'AEO', max: 4, ...checkLlmsLink(html) })
  checks.push({ id: 'A4', name: 'Schema.org 標記', dim: 'AEO', max: 8, ...checkSchemaOrg(html) })
  checks.push({ id: 'A5', name: 'FAQPage Schema', dim: 'AEO', max: 6, ...checkFaqSchema(html) })
  checks.push({ id: 'A6', name: 'Sitemap', dim: 'AEO', max: 6, ...checkSitemap(sitemapXml) })

  // ── SEO (35) ──
  checks.push({ id: 'S1', name: 'Meta Tags', dim: 'SEO', max: 7, ...checkMetaTags(html) })
  checks.push({ id: 'S2', name: 'Canonical URL', dim: 'SEO', max: 5, ...checkCanonical(html, url) })
  checks.push({ id: 'S3', name: 'Open Graph', dim: 'SEO', max: 5, ...checkOgTags(html) })
  checks.push({ id: 'S4', name: 'Robots Meta', dim: 'SEO', max: 5, ...checkRobotsMeta(html) })
  checks.push({ id: 'S5', name: '標題結構', dim: 'SEO', max: 5, ...checkHeadings(html) })
  checks.push({ id: 'S6', name: 'Mobile Friendly', dim: 'SEO', max: 4, ...checkMobile(html) })
  checks.push({ id: 'S7', name: 'HTTPS', dim: 'SEO', max: 4, ...checkHttps(url) })

  // ── GEO (25) ──
  checks.push({ id: 'G1', name: 'LocalBusiness Schema', dim: 'GEO', max: 7, ...checkLocalBusiness(html) })
  checks.push({ id: 'G2', name: '地址結構化', dim: 'GEO', max: 5, ...checkAddress(html) })
  checks.push({ id: 'G3', name: '多語言 hreflang', dim: 'GEO', max: 5, ...checkHreflang(html) })
  checks.push({ id: 'G4', name: '地圖連結', dim: 'GEO', max: 4, ...checkMaps(html) })
  checks.push({ id: 'G5', name: '本地化格式', dim: 'GEO', max: 4, ...checkLocalFormat(html) })

  return checks
}

// ── AEO Checks ──

function checkRobotsAI(txt: string | null): { score: number; detail: string } {
  if (!txt) return { score: 0, detail: 'robots.txt 不存在' }
  const lower = txt.toLowerCase()
  const bots = ['gptbot', 'claudebot', 'anthropic', 'perplexitybot', 'google-extended']
  const welcomed = bots.filter(b => lower.includes(b) && !lower.split(b).pop()?.slice(0, 50).includes('disallow: /'))
  if (welcomed.length >= 3) return { score: 8, detail: `歡迎 ${welcomed.length} 個 AI bot` }
  if (welcomed.length >= 1) return { score: 5, detail: `只歡迎 ${welcomed.length} 個 AI bot` }
  if (lower.includes('disallow: /')) return { score: 0, detail: '阻擋所有爬蟲' }
  return { score: 3, detail: '未明確歡迎 AI bot' }
}

function checkLlmsTxt(txt: string | null): { score: number; detail: string } {
  if (!txt) return { score: 0, detail: 'llms.txt 不存在' }
  if (txt.length > 500) return { score: 8, detail: `完整 (${txt.length} 字元)` }
  if (txt.length > 100) return { score: 5, detail: `內容有限 (${txt.length} 字元)` }
  return { score: 3, detail: `太短 (${txt.length} 字元)` }
}

function checkLlmsLink(html: string): { score: number; detail: string } {
  if (/rel=["']llms-txt["']/i.test(html)) return { score: 4, detail: "有 <link rel='llms-txt'>" }
  return { score: 0, detail: "缺少 <link rel='llms-txt'>" }
}

function checkSchemaOrg(html: string): { score: number; detail: string } {
  const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const types = new Set<string>()
  for (const m of schemas) {
    try {
      const d = JSON.parse(m[1])
      const t = d['@type']
      if (Array.isArray(t)) t.forEach((x: string) => types.add(x))
      else if (t) types.add(t)
    } catch {}
  }
  let score = 0
  const details: string[] = []
  const orgTypes = new Set(['Organization', 'LocalBusiness', 'Restaurant', 'CafeOrCoffeeShop', 'Store', 'EducationalOrganization', 'Corporation', 'WebSite'])
  const found = [...types].filter(t => orgTypes.has(t))
  if (found.length) { score += 4; details.push(found.join(', ')) }
  if (types.has('FAQPage')) { score += 2; details.push('FAQPage') }
  if (types.has('BreadcrumbList')) { score += 1; details.push('BreadcrumbList') }
  if (types.has('Article') || types.has('BlogPosting')) { score += 1; details.push('Article') }
  if (!score) return { score: 0, detail: '無 Schema.org JSON-LD' }
  return { score: Math.min(score, 8), detail: details.join(' + ') }
}

function checkFaqSchema(html: string): { score: number; detail: string } {
  const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const m of schemas) {
    try {
      const d = JSON.parse(m[1])
      if (d['@type'] === 'FAQPage') {
        const count = (d.mainEntity || []).length
        if (count >= 5) return { score: 6, detail: `${count} 題` }
        if (count >= 3) return { score: 4, detail: `${count} 題（建議 ≥5）` }
        return { score: 2, detail: `只有 ${count} 題` }
      }
    } catch {}
  }
  return { score: 0, detail: '無 FAQPage' }
}

function checkSitemap(xml: string | null): { score: number; detail: string } {
  if (!xml) return { score: 0, detail: 'sitemap.xml 不存在' }
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1])
  let score = urls.length > 0 ? 3 : 1
  if (urls.some(u => u.toLowerCase().includes('llms'))) score += 3
  return { score: Math.min(score, 6), detail: `${urls.length} URLs` + (score > 3 ? ' + llms.txt' : '') }
}

// ── SEO Checks ──

function checkMetaTags(html: string): { score: number; detail: string } {
  let score = 0; const d: string[] = []
  if (/<title[^>]*>.{10,}/i.test(html)) { score += 3; d.push('title OK') } else d.push('title 缺失')
  if (/name=["']description["'][^>]+content=["'].{50,}/i.test(html)) { score += 4; d.push('desc OK') } else d.push('desc 缺失')
  return { score, detail: d.join(' / ') }
}

function checkCanonical(html: string, url: string): { score: number; detail: string } {
  const m = html.match(/rel=["']canonical["'][^>]+href=["']([^"']+)/i)
  if (!m) return { score: 0, detail: '無 canonical' }
  if (m[1].replace(/\/$/, '') === url.replace(/\/$/, '')) return { score: 5, detail: '正確' }
  return { score: 2, detail: `指向 ${m[1].slice(0, 50)}` }
}

function checkOgTags(html: string): { score: number; detail: string } {
  const tags = ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']
  const found = tags.filter(t => new RegExp(`property=["']${t}["']`, 'i').test(html))
  if (found.length === 5) return { score: 5, detail: '完整' }
  return { score: Math.min(found.length, 5), detail: `缺少: ${tags.filter(t => !found.includes(t)).join(', ')}` }
}

function checkRobotsMeta(html: string): { score: number; detail: string } {
  if (/name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) return { score: 0, detail: 'noindex' }
  if (/name=["']robots["'][^>]+content=["'][^"']*index/i.test(html)) return { score: 5, detail: 'index, follow' }
  return { score: 3, detail: '無明確設定（默認允許）' }
}

function checkHeadings(html: string): { score: number; detail: string } {
  const h1 = (html.match(/<h1/gi) || []).length
  const h2 = (html.match(/<h2/gi) || []).length
  const h3 = (html.match(/<h3/gi) || []).length
  let score = 0
  if (h1 === 1) score += 2
  if (h2 >= 2) score += 2
  if (h3 >= 1) score += 1
  return { score: Math.min(score, 5), detail: `h1:${h1} h2:${h2} h3:${h3}` }
}

function checkMobile(html: string): { score: number; detail: string } {
  if (/name=["']viewport["']/i.test(html)) return { score: 4, detail: '有 viewport' }
  return { score: 0, detail: '缺少 viewport' }
}

function checkHttps(url: string): { score: number; detail: string } {
  if (url.startsWith('https://')) return { score: 4, detail: 'HTTPS ✓' }
  return { score: 0, detail: '未使用 HTTPS' }
}

// ── GEO Checks ──

function checkLocalBusiness(html: string): { score: number; detail: string } {
  const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const localTypes = new Set(['LocalBusiness', 'Restaurant', 'CafeOrCoffeeShop', 'Store', 'FoodEstablishment', 'LodgingBusiness'])
  for (const m of schemas) {
    try {
      const d = JSON.parse(m[1])
      if (localTypes.has(d['@type'])) {
        let score = 3
        if (d.address) score += 2
        if (d.geo) score += 1
        if (d.telephone) score += 1
        return { score: Math.min(score, 7), detail: `${d['@type']}` }
      }
    } catch {}
  }
  return { score: 0, detail: '無 LocalBusiness' }
}

function checkAddress(html: string): { score: number; detail: string } {
  let score = 0; const d: string[] = []
  if (/<address/i.test(html)) { score += 3; d.push('<address>') }
  if (/itemprop=["']address["']/i.test(html)) { score += 2; d.push('itemprop') }
  if (!d.length) return { score: 0, detail: '無結構化地址' }
  return { score: Math.min(score, 5), detail: d.join(' + ') }
}

function checkHreflang(html: string): { score: number; detail: string } {
  const langs = [...html.matchAll(/hreflang=["']([^"']+)["']/gi)].map(m => m[1])
  if (langs.length >= 3) return { score: 5, detail: `${langs.length} 語言` }
  if (langs.length >= 1) return { score: 3, detail: `${langs.length} 語言` }
  return { score: 0, detail: '無 hreflang' }
}

function checkMaps(html: string): { score: number; detail: string } {
  if (/maps\.google\.|google\.com\/maps|goo\.gl\/maps/i.test(html)) return { score: 4, detail: '有 Google Maps' }
  if (/itemprop=["']geo["']|latitude|longitude/i.test(html)) return { score: 2, detail: '有座標無 Maps 連結' }
  return { score: 0, detail: '無地圖' }
}

function checkLocalFormat(html: string): { score: number; detail: string } {
  let score = 0; const d: string[] = []
  if (/MOP\$?\s*\d|HK\$\s*\d|NT\$\s*\d|¥\s*\d|JPY|TWD/i.test(html)) { score += 2; d.push('本地貨幣') }
  if (/\+853|\+852|\+886|\+81/.test(html)) { score += 2; d.push('國際電話') }
  if (!d.length) return { score: 0, detail: '無本地化格式' }
  return { score: Math.min(score, 4), detail: d.join(' + ') }
}

// ── Fix Suggestions ──

function suggestFix(check: Check) {
  const fixes: Record<string, string> = {
    A1: '在 robots.txt 加入 `User-agent: GPTBot\\nAllow: /` 等 AI bot 許可',
    A2: '建立 /llms.txt 描述網站內容和授權（可用 CloudPipe 一鍵生成）',
    A3: '在 <head> 加入 `<link rel="llms-txt" href="/llms.txt">`',
    A4: '加入 Schema.org Organization 或 LocalBusiness JSON-LD',
    A5: '加入 FAQPage Schema ≥5 題（提升 AI 引用率 40%+）',
    A6: '確保 sitemap.xml 存在且包含 llms.txt',
    S1: '補充 <title> 和 <meta description>',
    S2: '加入 canonical URL 避免重複內容',
    S3: '加入 OG tags 提升社群分享效果',
    S4: '加入 robots meta 明確允許收錄',
    S5: '確保唯一 h1 + 至少 2 個 h2',
    S6: '加入 viewport meta 支援行動裝置',
    S7: '升級到 HTTPS',
    G1: '加入 LocalBusiness Schema（地址+電話+營業時間）',
    G2: '使用 <address> 標籤結構化地址',
    G3: '加入 hreflang 支援多語言',
    G4: '嵌入 Google Maps 提升本地搜尋',
    G5: '使用本地貨幣格式和國際電話格式',
  }
  return {
    check_id: check.id, check_name: check.name, dimension: check.dim,
    current_score: check.score, max_score: check.max,
    fix: fixes[check.id] || '聯繫 CloudPipe 團隊',
  }
}
