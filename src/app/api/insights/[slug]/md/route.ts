/**
 * GET /api/insights/[slug]/md
 *
 * Returns a `text/markdown` machine-readable version of an insight article.
 * Intended for AI agents / LLMs that need a clean, structured representation.
 *
 * Query params:
 *   lang   – zh | en | pt | ja  (default: zh)
 *   region – MO | HK | TW | JP | GLOBAL (default: inferred from slug prefix,
 *             falls back to MO for unrecognised slugs)
 *
 * Output format:
 *   ---
 *   YAML frontmatter
 *   ---
 *
 *   # title
 *   <body converted to clean markdown>
 *
 *   ## 常見問題 (FAQ) / Frequently Asked Questions
 *   ### Q
 *   A
 *
 * Rules:
 *   - Uses createServiceClient() (service-role) — never anon
 *   - No region filter imposed so a single endpoint serves all regions
 *   - `related` in frontmatter: uses related_industries first; if null/empty,
 *     falls back to top-3 sibling slugs sharing ≥1 tag in the same region+lang
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { InsightArticle } from '@/lib/types'
import { getStaticInsight } from '@/data/static-insights'

// ─── Lang helpers ────────────────────────────────────────────────────────────
const VALID_LANGS = ['zh', 'en', 'pt', 'ja'] as const
type Lang = (typeof VALID_LANGS)[number]

function parseLang(raw?: string | null): Lang {
  if (raw && VALID_LANGS.includes(raw as Lang)) return raw as Lang
  return 'zh'
}

// ─── Region inference ────────────────────────────────────────────────────────
type RegionCode = 'MO' | 'HK' | 'TW' | 'JP' | 'GLOBAL'
const VALID_REGIONS: RegionCode[] = ['MO', 'HK', 'TW', 'JP', 'GLOBAL']

function inferRegion(slug: string): RegionCode {
  if (slug.startsWith('hk-') || slug.startsWith('hongkong-')) return 'HK'
  if (slug.startsWith('tw-') || slug.startsWith('taiwan-')) return 'TW'
  if (slug.startsWith('jp-') || slug.startsWith('japan-')) return 'JP'
  if (slug.startsWith('global-') || slug.startsWith('faq-')) return 'GLOBAL'
  return 'MO'
}

function parseRegion(raw?: string | null, slug?: string): RegionCode {
  if (raw) {
    const upper = raw.toUpperCase() as RegionCode
    if (VALID_REGIONS.includes(upper)) return upper
  }
  return inferRegion(slug || '')
}

// ─── FAQ section heading by lang ─────────────────────────────────────────────
const FAQ_HEADING: Record<Lang, string> = {
  zh: '## 常見問題 (FAQ)',
  en: '## Frequently Asked Questions',
  pt: '## Perguntas Frequentes',
  ja: '## よくある質問 (FAQ)',
}

// ─── HTML → clean Markdown ───────────────────────────────────────────────────
/**
 * Lightweight HTML-to-Markdown converter.
 * No external deps — handles the subset of HTML that body_html actually contains:
 *   headings, paragraphs, ul/ol/li, anchors, bold, italic, code, hr, br.
 * Strips: <script>, <style>, inline style= attrs, data- attrs, JSON-LD blocks,
 *         class= attrs, id= attrs (keeping href for links).
 */
function htmlToMarkdown(html: string): string {
  if (!html) return ''

  let md = html

  // 1. Remove script / style / noscript blocks (including JSON-LD)
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '')
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '')
  md = md.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')

  // 2. Decode common HTML entities
  md = md
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')

  // 3. Strip inline style / data-* / class / id attributes (keep href, src, alt)
  md = md.replace(/\s+style="[^"]*"/gi, '')
  md = md.replace(/\s+data-[a-z-]+=(?:"[^"]*"|'[^']*')/gi, '')
  md = md.replace(/\s+class="[^"]*"/gi, '')
  md = md.replace(/\s+id="[^"]*"/gi, '')

  // 4. Block-level tags → Markdown equivalents
  // h1-h6
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n')
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n')

  // hr
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n')

  // blockquote
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    return inner.split('\n').map((l: string) => `> ${l.trim()}`).join('\n') + '\n'
  })

  // li items (before ul/ol)
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')

  // ul / ol wrappers — just ensure newlines
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n')

  // paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')

  // div / section / article / aside → paragraph break
  md = md.replace(/<\/?(?:div|section|article|aside|header|footer|main|nav)[^>]*>/gi, '\n')

  // 5. Inline tags
  // bold
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
  // italic
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '_$1_')
  // code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
  // pre / code block
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n')
  // anchors: keep href
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
  // br → newline
  md = md.replace(/<br\s*\/?>/gi, '\n')
  // span — just strip the tags
  md = md.replace(/<\/?span[^>]*>/gi, '')
  // sup / sub
  md = md.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '^$1^')
  md = md.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '~$1~')

  // 6. Strip any remaining HTML tags
  md = md.replace(/<[^>]+>/g, '')

  // 7. Clean up whitespace: collapse 3+ blank lines → 2
  md = md.replace(/\n{3,}/g, '\n\n')

  // 8. Trim leading/trailing whitespace from each line (preserve meaningful indentation)
  md = md.split('\n').map(l => l.trimEnd()).join('\n')

  return md.trim()
}

// ─── YAML frontmatter helpers ─────────────────────────────────────────────────
function yamlString(value: string): string {
  // Escape double-quotes; wrap in double-quotes
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function yamlList(items: string[]): string {
  if (!items.length) return '[]'
  return `[${items.map(i => yamlString(i)).join(', ')}]`
}

// ─── Related fallback ─────────────────────────────────────────────────────────
async function getRelatedFallback(
  slug: string,
  tags: string[],
  region: RegionCode,
  lang: Lang,
  limit = 5
): Promise<string[]> {
  const sb = createServiceClient()
  if (!tags.length) return []

  // Find published siblings in same region+lang sharing ≥1 tag
  const { data } = await sb
    .from('insights')
    .select('slug, tags')
    .eq('status', 'published')
    .eq('region', region)
    .eq('lang', lang)
    .neq('slug', slug)
    .contains('tags', tags.slice(0, 1))   // contains at least the first tag
    .order('published_at', { ascending: false })
    .limit(50)

  if (!data?.length) return []

  // Score by tag overlap
  const myTags = new Set(tags)
  const scored = data
    .map((r: { slug: string; tags: string[] | null }) => ({
      slug: r.slug,
      overlap: (r.tags || []).filter((t: string) => myTags.has(t)).length,
    }))
    .filter(r => r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)

  return scored.map(r => r.slug)
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const sp = request.nextUrl.searchParams

  const lang = parseLang(sp.get('lang'))
  const region = parseRegion(sp.get('region'), slug)

  const sb = createServiceClient()

  const { data, error } = await sb
    .from('insights')
    .select('*')
    .eq('slug', slug)
    .eq('lang', lang)
    .eq('status', 'published')
    .eq('region', region)
    .maybeSingle()

  if (error) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }

  // Normalize double-encoded faqs (same pattern as macao insight page)
  let article = (data as InsightArticle | null) || getStaticInsight(slug, lang)
  if (!article) {
    // Try without region filter (region mismatch fallback)
    const { data: anyRegion } = await sb
      .from('insights')
      .select('*')
      .eq('slug', slug)
      .eq('lang', lang)
      .eq('status', 'published')
      .maybeSingle()
    article = (anyRegion as InsightArticle | null) || null
  }
  if (!article) {
    return new NextResponse(`# Not Found\n\nNo published insight found for slug: ${slug}`, {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  // Normalize faqs
  let faqs = (article as { faqs?: unknown }).faqs as { question?: string; answer?: string; q?: string; a?: string }[]
  if (typeof faqs === 'string') {
    try { faqs = JSON.parse(faqs) } catch { faqs = [] }
  }
  if (!Array.isArray(faqs)) faqs = []

  // ── Build related list ──────────────────────────────────────────────────
  let related: string[] = []

  // Primary: related_industries (slugs)
  if (Array.isArray(article.related_industries) && article.related_industries.length > 0) {
    related = article.related_industries.slice(0, 5)
  }

  // v2 Fallback: if no related_industries, use tag-based sibling slugs
  if (related.length === 0) {
    const rawTagsForRelated = (article as unknown as Record<string, unknown>).tags
    let tagsForRelated: string[] = []
    if (Array.isArray(rawTagsForRelated)) {
      tagsForRelated = rawTagsForRelated as string[]
    } else if (typeof rawTagsForRelated === 'string' && rawTagsForRelated.trim().startsWith('[')) {
      try { tagsForRelated = JSON.parse(rawTagsForRelated) } catch { tagsForRelated = [] }
    }
    related = await getRelatedFallback(slug, tagsForRelated, region, lang)
  }

  // ── Frontmatter ─────────────────────────────────────────────────────────
  const sourcesUrls = (article.authority_sources || []).map(s => s.url)
  // tags may be a JSON array string from the DB — parse it; never split by space
  const rawTags = (article as unknown as Record<string, unknown>).tags
  let tags: string[] = []
  if (Array.isArray(rawTags)) {
    tags = rawTags as string[]
  } else if (typeof rawTags === 'string' && rawTags.trim().startsWith('[')) {
    try { tags = JSON.parse(rawTags) } catch { tags = [] }
  }

  const frontmatter = [
    '---',
    `title: ${yamlString(article.title)}`,
    `slug: ${yamlString(article.slug)}`,
    `type: encyclopedia-insight`,
    `region: ${yamlString(region)}`,
    `lang: ${yamlString(lang)}`,
    `entity: ${yamlString((article as unknown as Record<string, unknown>).entity_id as string || (article as unknown as Record<string, unknown>).kg_entity as string || article.slug || '')}`,
    `tags: ${yamlList(tags)}`,
    `trust_score: ${typeof (article as unknown as Record<string, unknown>).trust_score === 'number' ? (article as unknown as Record<string, unknown>).trust_score : 'null'}`,
    `source_urls: ${yamlList(sourcesUrls)}`,
    `related: ${yamlList(related)}`,
    `published_at: ${yamlString(article.published_at || article.created_at || '')}`,
    `updated_at: ${yamlString(article.updated_at || '')}`,
    '---',
  ].join('\n')

  // ── Body ────────────────────────────────────────────────────────────────
  const bodyMd = htmlToMarkdown(article.body_html || '')

  // ── FAQ section ─────────────────────────────────────────────────────────
  // Guard: if body_html already contains a FAQ heading (any of the 5 supported
  // languages), skip appending the JSONB-derived faqSection to avoid duplicates.
  const bodyAlreadyHasFaq = /常見問題|FAQ|Frequently Asked|よくある質問|Perguntas/i.test(bodyMd)
  let faqSection = ''
  if (faqs.length > 0 && !bodyAlreadyHasFaq) {
    const faqHeading = FAQ_HEADING[lang]
    const faqItems = faqs
      .filter(f => (f.question || f.q) && (f.answer || f.a))
      .map(f => `### ${f.question || f.q}\n${f.answer || f.a}`)
      .join('\n\n')
    faqSection = `\n\n${faqHeading}\n\n${faqItems}`
  }

  // ── Final output ────────────────────────────────────────────────────────
  const output = `${frontmatter}\n\n# ${article.title}\n\n${bodyMd}${faqSection}\n`

  return new NextResponse(output, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Cache 1h at edge, stale-while-revalidate 24h — same as JSON sibling
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
