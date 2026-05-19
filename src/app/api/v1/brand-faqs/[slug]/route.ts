import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

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
    .from('brand_faqs')
    .select('*')
    .eq('brand_slug', slug)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ faqs: data ?? [], count: data?.length ?? 0 })
}

interface FaqBody {
  question?: unknown
  answer?: unknown
  lang?: unknown
  intent_type?: unknown
  sort_order?: unknown
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

  let body: FaqBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.question !== 'string' || !body.question.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }
  if (typeof body.answer !== 'string' || !body.answer.trim()) {
    return NextResponse.json({ error: 'answer is required' }, { status: 400 })
  }

  const validLangs = ['zh', 'en', 'ja']
  const validIntents = ['general', 'product', 'location', 'price', 'comparison', 'trust']

  const lang = validLangs.includes(body.lang as string) ? (body.lang as string) : 'zh'
  const intent_type = validIntents.includes(body.intent_type as string) ? (body.intent_type as string) : 'general'
  const sort_order = typeof body.sort_order === 'number' ? body.sort_order : 0

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('brand_faqs')
    .insert({
      brand_slug: slug,
      question: body.question.trim(),
      answer: body.answer.trim(),
      lang,
      intent_type,
      sort_order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, faq: data }, { status: 201 })
}
