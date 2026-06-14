import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, category:categories(slug), district')
    .or(`name_zh.ilike.%${q}%,name_en.ilike.%${q}%,slug.ilike.%${q}%`)
    .eq('status', 'live')
    .limit(10)

  if (error) {
    return NextResponse.json({ results: [], error: error.message }, { status: 500 })
  }

  type RawRow = {
    slug: string
    name_zh: string | null
    name_en: string | null
    category: { slug: string } | { slug: string }[] | null
    district: string | null
  }

  const results = ((data || []) as RawRow[]).map(row => ({
    slug: row.slug,
    name_zh: row.name_zh,
    name_en: row.name_en,
    category: Array.isArray(row.category)
      ? (row.category[0]?.slug ?? null)
      : (row.category?.slug ?? null),
    district: row.district,
  }))

  return NextResponse.json({ results })
}
