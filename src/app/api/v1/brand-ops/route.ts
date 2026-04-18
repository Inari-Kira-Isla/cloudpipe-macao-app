import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET ?slug=inari-global-foods&action=knowledge|posts|plan
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const action = searchParams.get('action') || 'knowledge'

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const supabase = createServiceClient()

  try {
    if (action === 'knowledge') {
      const { data, error } = await supabase
        .from('brand_ops_knowledge')
        .select('*')
        .eq('brand_slug', slug)
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json({ items: data || [] })
    }

    if (action === 'posts') {
      const { data, error } = await supabase
        .from('brand_ops_posts_cache')
        .select('*')
        .eq('brand_slug', slug)
        .order('published_at', { ascending: false })
        .limit(14)
      if (error) throw error
      return NextResponse.json({ posts: data || [] })
    }

    if (action === 'plan') {
      const { data, error } = await supabase
        .from('brand_ops_content_plan')
        .select('*')
        .eq('brand_slug', slug)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return NextResponse.json({ plan: data || null })
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — upload / approve / reject / save-plan
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body
  const supabase = createServiceClient()

  try {
    if (action === 'upload') {
      const { slug, category, title, content, source_type = 'manual' } = body
      if (!slug || !category || !title || !content) {
        return NextResponse.json({ error: '必填欄位缺失' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('brand_ops_knowledge')
        .insert({ brand_slug: slug, category, title, content, source_type, status: 'pending' })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ ok: true, item: data })
    }

    if (action === 'approve') {
      const { id } = body
      const { error } = await supabase
        .from('brand_ops_knowledge')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'reject') {
      const { id } = body
      const { error } = await supabase
        .from('brand_ops_knowledge')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (action === 'save-plan') {
      const { slug, commercial_goal, content_pillars, avoid_topics, next_focus } = body
      const { error } = await supabase
        .from('brand_ops_content_plan')
        .upsert({
          brand_slug: slug,
          commercial_goal,
          content_pillars: content_pillars || [],
          avoid_topics: avoid_topics || [],
          next_focus,
          updated_at: new Date().toISOString(),
        })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
