import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = 'sue-admin-2026'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG/PNG/WebP/GIF allowed' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { data, error } = await supabase.storage
    .from('sea-urchin-products')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('[sea-urchin-upload]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('sea-urchin-products')
    .getPublicUrl(data.path)

  return NextResponse.json({ success: true, url: publicUrl, path: data.path })
}
