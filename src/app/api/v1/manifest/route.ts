import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 3600 // 1 hour ISR

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()
  const db = createServiceClient()

  // Get live stats for the manifest
  const [
    { count: totalFacts },
    { count: verifiedFacts },
    { count: publishedInsights },
  ] = await Promise.all([
    db.from('knowledge_facts').select('*', { count: 'exact', head: true }),
    db.from('knowledge_facts').select('*', { count: 'exact', head: true })
      .in('source_type', ['official_site', 'wikipedia', 'wikidata'])
      .eq('is_authoritative', true),
    db.from('insights').select('*', { count: 'exact', head: true })
      .eq('status', 'published').gte('trust_score', 70),
  ])

  const manifest = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    'name': 'CloudPipe Knowledge Graph API',
    'description': 'Tiered access to verified entity facts for Macau, Hong Kong, Taiwan, Japan and Asia Pacific. Powers AI grounding with official-source provenance.',
    'url': `${siteUrl}/api/v1/manifest`,
    'documentation': `${siteUrl}/api/v1/manifest`,
    'provider': {
      '@type': 'Organization',
      'name': 'CloudPipe',
      'url': siteUrl,
    },
    'version': '1.0',
    'coverage': {
      'regions': ['MO', 'HK', 'TW', 'JP', 'GLOBAL'],
      'languages': ['zh', 'en', 'ja'],
      'totalFacts': totalFacts ?? 0,
      'verifiedFacts': verifiedFacts ?? 0,
      'publishedInsights': publishedInsights ?? 0,
      'lastUpdated': new Date().toISOString(),
    },
    'accessTiers': [
      {
        'tier': 'public',
        'name': 'Public Facts — Layer 0',
        'description': 'Basic entity information sourced from Google Maps. No authentication required.',
        'endpoint': `${siteUrl}/api/v1/facts/public/{slug}`,
        'method': 'GET',
        'authentication': 'none',
        'rateLimit': 'unlimited',
        'contentTypes': ['name_zh', 'name_en', 'location_address', 'google_rating', 'operating_hours'],
        'useCases': ['basic grounding', 'entity lookup', 'public data enrichment'],
        'example': `${siteUrl}/api/v1/facts/public/mind-cafe`,
      },
      {
        'tier': 'standard',
        'name': 'Verified Facts — Layer 1',
        'description': 'Official-source verified facts with full provenance (source_url). Includes certifications, menus, MOQ, and contact details verified against official websites.',
        'endpoint': `${siteUrl}/api/v1/facts/{slug}`,
        'method': 'GET',
        'authentication': 'X-API-Key header (standard key)',
        'rateLimit': '1000 requests/day',
        'contentTypes': ['official_hours', 'menu_items', 'certifications', 'moq', 'official_contact', 'source_url', 'provenance'],
        'useCases': ['AI grounding with provenance', 'RAG pipeline enrichment', 'entity verification', 'business intelligence'],
        'keyRequest': `${siteUrl}/api-key`,
        'pricing': 'Free during beta — registration required',
        'pricingNote': 'API keys are free. The gate exists to classify use cases and establish identity.',
      },
      {
        'tier': 'premium',
        'name': 'Intelligence Layer — Layer 2',
        'description': 'Full observability data: AI citation history, composite trust scores, corroboration count. Same endpoint as Layer 1 — premium key automatically unlocks additional fields.',
        'endpoint': `${siteUrl}/api/v1/facts/{slug}`,
        'method': 'GET',
        'authentication': 'X-API-Key header (premium key)',
        'rateLimit': '10,000 requests/day',
        'contentTypes': ['all_layer1_fields', 'ai_citation_total', 'cited_by_ai_bots', 'composite_trust_score', 'corroboration_count'],
        'useCases': ['AI training data licensing', 'market intelligence', 'competitive analysis', 'AI citation attribution'],
        'keyRequest': 'mailto:hello@cloudpipe.ai',
        'pricing': 'Free with approval — licensing conversation available',
        'pricingNote': 'Contact us to discuss use cases. No cost during beta.',
      },
    ],
    'discovery': {
      'llmsTxt': `${siteUrl}/llms.txt`,
      'sitemapIndex': `${siteUrl}/sitemap_index.xml`,
      'prioritySitemap': `${siteUrl}/sitemap-priority.xml`,
      'robotsTxt': `${siteUrl}/robots.txt`,
    },
    'contact': {
      '@type': 'ContactPoint',
      'email': 'hello@cloudpipe.ai',
      'contactType': 'API Access',
    },
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*', // AI agents need cross-origin access
    },
  })
}
