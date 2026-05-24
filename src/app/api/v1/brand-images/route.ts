import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const brandSlug = req.nextUrl.searchParams.get('brand_slug')?.trim()
  if (!brandSlug) return NextResponse.json({ error: 'brand_slug required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_portal_images')
    .select('id, category, image_url, caption, platform, created_at')
    .eq('brand_slug', brandSlug)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ images: data ?? [] })
}
