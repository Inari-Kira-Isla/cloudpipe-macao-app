import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

interface ProductBody {
  name_zh?: unknown
  name_en?: unknown
  description?: unknown
  price_mop?: unknown
  price_hkd?: unknown
  sku?: unknown
  min_order?: unknown
  delivery_days?: unknown
  image_url?: unknown
  product_url?: unknown
  is_flagship?: unknown
  sort_order?: unknown
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { slug } = await params

  if (session.brand_slug !== slug) {
    return NextResponse.json({ error: 'Forbidden: token does not match slug' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_products')
    .select('*')
    .eq('brand_slug', slug)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [], count: data?.length ?? 0 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { slug } = await params

  if (session.brand_slug !== slug) {
    return NextResponse.json({ error: 'Forbidden: token does not match slug' }, { status: 403 })
  }

  let body: ProductBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // At least one name is required
  if (!body.name_zh && !body.name_en) {
    return NextResponse.json({ error: 'At least one of name_zh or name_en is required' }, { status: 400 })
  }

  const insert: Record<string, unknown> = {
    brand_slug: slug,
    created_at: new Date().toISOString(),
  }

  // Safe field assignment
  const stringFields = ['name_zh', 'name_en', 'description', 'sku', 'image_url', 'product_url'] as const
  for (const f of stringFields) {
    if (typeof body[f] === 'string') insert[f] = body[f]
  }

  const numericFields = ['price_mop', 'price_hkd', 'min_order', 'delivery_days', 'sort_order'] as const
  for (const f of numericFields) {
    if (typeof body[f] === 'number') insert[f] = body[f]
  }

  if (typeof body.is_flagship === 'boolean') insert.is_flagship = body.is_flagship

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_products')
    .insert(insert)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, product: data }, { status: 201 })
}
