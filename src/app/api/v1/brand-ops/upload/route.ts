import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'brand-assets'
const MAX_FILE_SIZE = 20 * 1024 * 1024  // 20MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf':  'pdf',
  'image/jpeg':       'image',
  'image/png':        'image',
  'image/webp':       'image',
  'image/gif':        'image',
  'text/plain':       'text',
  'text/csv':         'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
}

const IMAGE_SUBTYPES: Record<string, string> = {
  'product_photo': '產品照',
  'logo':          'Logo',
  'menu_scan':     '菜單/目錄掃描',
  'catalog':       '產品目錄',
  'business_card': '名片',
  'scene_photo':   '場景/環境照',
  'certificate':   '認證/獎狀',
  'other':         '其他',
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const slug = formData.get('slug') as string | null
    const assetSubtype = formData.get('asset_subtype') as string | null
    const sourceUrl = formData.get('source_url') as string | null
    const uploadedBy = formData.get('uploaded_by') as string || 'manual'

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

    // Handle URL-only upload (no file)
    if (!file && sourceUrl) {
      const supabase = createServiceClient()
      const { data, error } = await supabase.from('brand_ops_assets').insert({
        brand_slug: slug,
        asset_type: 'url',
        source_url: sourceUrl,
        parse_status: 'queued',
        uploaded_by: uploadedBy,
      }).select('id').single()
      if (error) throw error
      return NextResponse.json({ success: true, asset_id: data.id, type: 'url' })
    }

    if (!file) return NextResponse.json({ error: 'file or source_url required' }, { status: 400 })

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 })
    }

    // Validate MIME type
    const mimeType = file.type || 'application/octet-stream'
    const assetType = ALLOWED_MIME_TYPES[mimeType]
    if (!assetType) {
      return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 })
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Compute hash for deduplication
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    const supabase = createServiceClient()

    // Check duplicate
    const { data: existing } = await supabase
      .from('brand_ops_assets')
      .select('id, brand_slug, original_filename')
      .eq('file_hash', fileHash)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        asset_id: existing.id,
        duplicate: true,
        message: `已存在相同檔案：${existing.original_filename}`,
      })
    }

    // Generate storage path
    const ext = file.name.split('.').pop() || 'bin'
    const uuid = crypto.randomUUID()
    const storagePath = `brands/${slug}/assets/${uuid}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        await supabase.storage.createBucket(BUCKET, {
          public: false,
          fileSizeLimit: MAX_FILE_SIZE,
        })
        const { error: retryError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType: mimeType })
        if (retryError) throw retryError
      } else {
        throw uploadError
      }
    }

    // Insert asset record
    const { data: asset, error: dbError } = await supabase
      .from('brand_ops_assets')
      .insert({
        brand_slug: slug,
        asset_type: assetType,
        asset_subtype: assetSubtype || (assetType === 'image' ? 'other' : null),
        storage_path: storagePath,
        storage_bucket: BUCKET,
        mime_type: mimeType,
        file_size: file.size,
        file_hash: fileHash,
        original_filename: file.name,
        parse_status: 'queued',
        uploaded_by: uploadedBy,
      })
      .select('id')
      .single()

    if (dbError) throw dbError

    return NextResponse.json({
      success: true,
      asset_id: asset.id,
      storage_path: storagePath,
      type: assetType,
      size: file.size,
      message: `${file.name} 上傳成功，排入 AI 解析佇列`,
    })

  } catch (err) {
    console.error('[brand-ops/upload]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_ops_assets')
    .select('id, asset_type, asset_subtype, original_filename, file_size, parse_status, review_status, created_at, image_metadata')
    .eq('brand_slug', slug)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assets: data || [], subtypes: IMAGE_SUBTYPES })
}
