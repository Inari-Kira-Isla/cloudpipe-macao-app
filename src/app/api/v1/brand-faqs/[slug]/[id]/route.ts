import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { slug, id } = await params

  if (session.brand_slug !== slug) {
    return NextResponse.json({ error: 'Forbidden: token does not match slug' }, { status: 403 })
  }

  const supabase = createServiceClient()

  // Verify the FAQ belongs to this brand before deleting
  const { data: existing, error: fetchError } = await supabase
    .from('brand_faqs')
    .select('id, brand_slug')
    .eq('id', id)
    .eq('brand_slug', slug)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('brand_faqs')
    .delete()
    .eq('id', id)
    .eq('brand_slug', slug)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted_id: id })
}
