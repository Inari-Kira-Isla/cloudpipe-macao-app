// Product management API — update details + mc_status actions
// GET  /api/inari/products/manage?secret=xxx        → all products with mc_status
// POST /api/inari/products/manage                   → update product / change status
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cloudpipe2026'
const BRAND_SLUG = 'inari-global-foods'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkAuth(req: Request) {
  const token = req.headers.get('x-admin-secret') || new URL(req.url).searchParams.get('secret')
  return token === ADMIN_SECRET
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = serviceClient()
  const { data: brand } = await db
    .from('commerce_brands')
    .select('id')
    .eq('slug', BRAND_SLUG)
    .single()

  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const { data: products } = await db
    .from('commerce_products')
    .select('*')
    .eq('brand_id', brand.id)
    .order('sort_order')

  return NextResponse.json({ products: products ?? [] })
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = serviceClient()
  const body = await req.json()
  const { action, slug, data } = body as {
    action: 'approve' | 'exclude' | 'pause' | 'draft' | 'update'
    slug: string
    data?: Record<string, unknown>
  }

  const { data: brand } = await db
    .from('commerce_brands')
    .select('id')
    .eq('slug', BRAND_SLUG)
    .single()

  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  if (action === 'update' && data) {
    // Update product fields (name, desc, price, etc.)
    const allowed = ['name_zh','name_en','description_zh','description_en',
      'retail_price','wholesale_price','stock_qty','min_order_qty',
      'unit','unit_weight_g','origin_region','origin_detail','certifications',
      'attributes','season_start','season_end','is_featured','sort_order']

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in data) patch[key] = data[key]
    }

    const { error } = await db
      .from('commerce_products')
      .update(patch)
      .eq('brand_id', brand.id)
      .eq('slug', slug)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: 'updated', slug })
  }

  // Status change actions
  const statusMap: Record<string, string> = {
    approve: 'approved',
    exclude: 'excluded',
    pause: 'paused',
    draft: 'draft',
  }
  const newStatus = statusMap[action]
  if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const patch: Record<string, unknown> = {
    mc_status: newStatus,
    mc_exclude_reason: data?.reason as string ?? null,
    updated_at: new Date().toISOString(),
  }
  if (action === 'approve') {
    patch.mc_approved_at = new Date().toISOString()
    patch.mc_approved_by = 'cloudpipe-admin'
    patch.mc_exclude_reason = null
  }

  // Guard: cannot approve without image
  if (action === 'approve') {
    const { data: product } = await db
      .from('commerce_products')
      .select('image_url')
      .eq('brand_id', brand.id)
      .eq('slug', slug)
      .single()

    if (!product?.image_url) {
      return NextResponse.json({ error: '無法核准：缺少商品主圖' }, { status: 400 })
    }
  }

  const { error } = await db
    .from('commerce_products')
    .update(patch)
    .eq('brand_id', brand.id)
    .eq('slug', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, action, slug, mc_status: newStatus })
}
