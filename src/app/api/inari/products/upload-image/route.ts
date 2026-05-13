// Image processing API — converts any format/size to Merchant Center spec
// Spec: 1200×1200px, white background, JPEG ≥90 quality
// Accepts: HEIC, WebP, PNG, AVIF, BMP, TIFF, JPG (any size)
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cloudpipe2026'
const TARGET_SIZE = 1200
const OUTPUT_QUALITY = 92
const BUCKET = 'commerce-images'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-admin-secret') || new URL(req.url).searchParams.get('secret')
  if (secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const productSlug = formData.get('slug') as string | null
  const brandSlug = (formData.get('brand') as string) || 'inari-global-foods'
  const imageIndex = parseInt((formData.get('index') as string) || '0')

  if (!file || !productSlug) {
    return NextResponse.json({ error: 'file and slug required' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const processed = await sharp(buffer)
      .rotate()
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255 },
        withoutEnlargement: false,
      })
      .jpeg({ quality: OUTPUT_QUALITY, mozjpeg: true })
      .toBuffer()

    const db = serviceClient()
    const suffix = imageIndex === 0 ? 'main' : `extra-${imageIndex}`
    const fileName = `${brandSlug}/${productSlug}/${suffix}.jpg`

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(fileName, processed, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    const { data: brand } = await db
      .from('commerce_brands')
      .select('id')
      .eq('slug', brandSlug)
      .single()

    if (brand) {
      if (imageIndex === 0) {
        await db
          .from('commerce_products')
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('brand_id', brand.id)
          .eq('slug', productSlug)

        await db.rpc('eval_commerce_product_status', {
          p_brand_id: brand.id,
          p_slug: productSlug,
        })

        const { data: cp } = await db
          .from('commerce_products')
          .select('source_id')
          .eq('brand_id', brand.id)
          .eq('slug', productSlug)
          .single()

        if (cp?.source_id) {
          await db
            .from('inari_catalog')
            .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', cp.source_id)
        }
      } else {
        const { data: existing } = await db
          .from('commerce_products')
          .select('image_urls')
          .eq('brand_id', brand.id)
          .eq('slug', productSlug)
          .single()

        const existingUrls: string[] = existing?.image_urls ?? []
        existingUrls[imageIndex - 1] = publicUrl

        await db
          .from('commerce_products')
          .update({ image_urls: existingUrls, updated_at: new Date().toISOString() })
          .eq('brand_id', brand.id)
          .eq('slug', productSlug)
      }
    }

    const meta = await sharp(processed).metadata()
    return NextResponse.json({
      ok: true,
      url: publicUrl,
      slug: productSlug,
      index: imageIndex,
      processed: {
        width: meta.width,
        height: meta.height,
        format: meta.format,
        size_kb: Math.round(processed.length / 1024),
      },
    })
  } catch (err) {
    console.error('upload-image error:', err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
