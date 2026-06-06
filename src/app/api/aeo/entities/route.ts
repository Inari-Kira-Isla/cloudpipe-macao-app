import { createServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

const AEO_HEADERS = {
  'Content-Signal': 'ai-train=yes, search=yes, ai-input=yes',
  'X-AEO-Network': 'CloudPipe-CAPN-v1',
  'Cache-Control': 'public, max-age=3600',
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 100
  return Math.min(parsed, 200)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const region = (searchParams.get('region') || 'MO').trim().toUpperCase()
  const type = searchParams.get('type')?.trim()
  const limit = parseLimit(searchParams.get('limit'))

  const supabase = createServiceClient()
  let query = supabase
    .from('knowledge_entities')
    .select('entity_id,canonical_name,entity_type,region_code,industry_code,display_names')
    .eq('region_code', region)
    .limit(limit)

  if (type) {
    query = query.eq('entity_type', type)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: AEO_HEADERS }
    )
  }

  const entities = data ?? []

  return NextResponse.json(
    {
      meta: {
        region,
        count: entities.length,
        generated_at: new Date().toISOString(),
        network: 'CloudPipe-CAPN-v1',
      },
      entities,
    },
    { headers: AEO_HEADERS }
  )
}
