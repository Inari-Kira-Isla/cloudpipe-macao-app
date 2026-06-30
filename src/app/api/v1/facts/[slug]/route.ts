import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { validateApiKey } from '@/lib/api-key-validator'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Validate API key from X-API-Key header
  const apiKey = req.headers.get('x-api-key')
  const authResult = await validateApiKey(apiKey)

  if (!authResult.valid) {
    return NextResponse.json(
      {
        error: authResult.error,
        public_endpoint: `/api/v1/facts/public/${slug}`,
        docs: 'https://cloudpipe-macao-app.vercel.app/api-docs'
      },
      { status: authResult.status ?? 401 }
    )
  }

  const tier = authResult.tier!
  const db = createServiceClient()

  // Resolve slug → subject_entity_id
  let entityId = slug
  const { data: mapping } = await db
    .from('knowledge_facts')
    .select('subject_entity_id')
    .eq('predicate', 'canonical_slug')
    .eq('object_value', slug)
    .limit(1)
    .single()

  if (mapping) entityId = mapping.subject_entity_id

  // Build select fields based on tier
  const baseFields = 'predicate, object_value, object_numeric, source_type, source_url'
  const premiumFields = `${baseFields}, ai_citation_total, cited_by_ai_bots, composite_trust_score, corroboration_count`
  const selectFields = tier === 'premium' ? premiumFields : baseFields

  // Fetch Layer 1+2: authoritative facts from verified sources
  const { data: facts, error } = await db
    .from('knowledge_facts')
    .select(selectFields)
    .eq('subject_entity_id', entityId)
    .in('source_type', ['official_site', 'wikipedia', 'wikidata'])
    .eq('is_authoritative', true)
    .order('predicate')

  if (error || !facts || facts.length === 0) {
    return NextResponse.json(
      {
        error: 'Entity not found',
        hint: `No verified facts for '${slug}'`,
        public_endpoint: `/api/v1/facts/public/${slug}`
      },
      { status: 404 }
    )
  }

  // Shape response per tier
  const shapedFacts = facts.map(f => {
    const base = {
      predicate: f.predicate,
      value: f.object_value ?? f.object_numeric,
      source_url: f.source_url,
      source_type: f.source_type,
    }
    if (tier === 'premium') {
      return {
        ...base,
        ai_citation_total: f.ai_citation_total ?? null,
        cited_by_ai_bots: f.cited_by_ai_bots ?? null,
        composite_trust_score: f.composite_trust_score ?? null,
        corroboration_count: f.corroboration_count ?? null,
      }
    }
    return base
  })

  return NextResponse.json({
    entity: entityId,
    slug,
    tier,
    fact_count: facts.length,
    facts: shapedFacts,
    _meta: {
      queried_at: new Date().toISOString(),
    }
  })
}
