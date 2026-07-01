import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { logApiEvent } from '@/lib/routescope'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t0 = Date.now()
  const { slug } = await params
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

  // Fetch Layer 0: google_p0 facts only
  const { data: facts, error } = await db
    .from('knowledge_facts')
    .select('predicate, object_value, object_numeric, source_type, source_url')
    .eq('subject_entity_id', entityId)
    .eq('source_type', 'google_p0')
    .order('predicate')

  if (error || !facts || facts.length === 0) {
    logApiEvent({ req: _req, tier: 'layer0', responseMs: Date.now() - t0, statusCode: 404 })
    return NextResponse.json(
      { error: 'Entity not found', hint: `No public facts for '${slug}'` },
      { status: 404 }
    )
  }

  logApiEvent({ req: _req, tier: 'layer0', responseMs: Date.now() - t0, statusCode: 200 })
  return NextResponse.json({
    entity: entityId,
    slug,
    tier: 'public',
    fact_count: facts.length,
    facts: facts.map(f => ({
      predicate: f.predicate,
      value: f.object_value ?? f.object_numeric,
      source: 'google_maps'
    })),
    _links: {
      standard: `/api/v1/facts/${slug}`,
      docs: 'https://cloudpipe-macao-app.vercel.app/api-docs'
    }
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  })
}
