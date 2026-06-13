import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'asc-uploads'
const STORAGE_PREFIX = 'product-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function checkAdminKey(req: NextRequest): boolean {
  const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key') || ''
  return key === (process.env.BRAND_ADMIN_KEY || 'cp-admin-2026')
}

export interface ProductItem {
  id: string
  product_key: string
  name_zh: string
  keywords: string[]
  url: string
  filename: string
  style: 'lifestyle' | 'poster' | 'other'
  uploaded_at: string
}

async function getProductCatalog(slug: string): Promise<ProductItem[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('brand_configs')
    .select('key_facts')
    .eq('slug', slug)
    .single()
  if (!data) return []
  const kf = data.key_facts || {}
  return (kf.product_catalog as ProductItem[]) || []
}

async function saveProductCatalog(slug: string, catalog: ProductItem[]) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('brand_configs')
    .select('key_facts')
    .eq('slug', slug)
    .single()
  const kf = (data?.key_facts as Record<string, unknown>) || {}

  // 同步更新 product_images keyword→url mapping (for brand_daily_fb_post.py)
  const imageMap: Record<string, string> = {}
  for (const item of catalog) {
    if (item.product_key && item.url) {
      // 同一 product_key 有多張圖，lifestyle 優先
      const existing = imageMap[item.product_key]
      if (!existing || item.style === 'lifestyle') {
        imageMap[item.product_key] = item.url
      }
    }
  }
  // 飲品 fallback
  const drinkDefault = catalog.find(i => ['iced_latte', 'iced_black', 'lemon_tea', 'lime_soda'].includes(i.product_key))
  const foodDefault = catalog.find(i => ['cheese_ham_egg', 'crab_stick'].includes(i.product_key))
  imageMap['default'] = drinkDefault?.url || foodDefault?.url || Object.values(imageMap)[0] || ''

  const existingPi = (kf.product_images as Record<string, unknown>) || {}
  kf.product_catalog = catalog
  kf.product_images = { ...existingPi, ...imageMap }

  await supabase
    .from('brand_configs')
    .update({ key_facts: kf })
    .eq('slug', slug)
}

// GET — list products
export async function GET(req: NextRequest) {
  if (!checkAdminKey(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const slug = new URL(req.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const catalog = await getProductCatalog(slug)
  return NextResponse.json({ products: catalog, count: catalog.length })
}

// POST — upload new product image
export async function POST(req: NextRequest) {
  if (!checkAdminKey(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const slug = formData.get('slug') as string
  const productKey = formData.get('product_key') as string
  const nameZh = formData.get('name_zh') as string
  const keywordsRaw = formData.get('keywords') as string
  const style = (formData.get('style') as ProductItem['style']) || 'other'

  if (!file || !slug || !productKey || !nameZh) {
    return NextResponse.json({ error: 'file, slug, product_key, name_zh required' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: '圖片不可超過10MB' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: '只接受 JPEG / PNG / WebP' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filename = `${productKey}_${crypto.randomBytes(4).toString('hex')}.${ext}`
  const storagePath = `${STORAGE_PREFIX}/${filename}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = createServiceClient()
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
  const keywords = keywordsRaw ? keywordsRaw.split(/[,，\s]+/).map(k => k.trim()).filter(Boolean) : []

  const newItem: ProductItem = {
    id: crypto.randomUUID(),
    product_key: productKey,
    name_zh: nameZh,
    keywords,
    url,
    filename,
    style,
    uploaded_at: new Date().toISOString(),
  }

  const catalog = await getProductCatalog(slug)
  catalog.push(newItem)
  await saveProductCatalog(slug, catalog)

  return NextResponse.json({ success: true, product: newItem })
}

// DELETE — remove product image from catalog (keep storage file)
export async function DELETE(req: NextRequest) {
  if (!checkAdminKey(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug, id } = await req.json()
  if (!slug || !id) return NextResponse.json({ error: 'slug and id required' }, { status: 400 })

  const catalog = await getProductCatalog(slug)
  const updated = catalog.filter(p => p.id !== id)
  if (updated.length === catalog.length) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  await saveProductCatalog(slug, updated)
  return NextResponse.json({ success: true, removed: catalog.length - updated.length })
}
