import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

interface FaqRow {
  id: string
  question: string
  answer: string
  lang: string
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

  const supabase = createServiceClient()

  // Fetch all published FAQs for this brand
  const { data, error } = await supabase
    .from('brand_faqs')
    .select('id, question, answer, lang')
    .eq('brand_slug', slug)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const faqs: FaqRow[] = data ?? []

  if (faqs.length === 0) {
    return NextResponse.json({
      error: 'No published FAQs found. Set is_published=true on FAQs first.',
      faq_count: 0,
    }, { status: 400 })
  }

  // Generate FAQPage Schema JSON-LD
  const schemaObj = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  const schemaJson = JSON.stringify(schemaObj, null, 2)

  // Optionally store as a content draft for review
  const { error: draftError } = await supabase
    .from('brand_content_drafts')
    .insert({
      brand_slug: slug,
      content_type: 'schema',
      title: `FAQPage Schema — ${slug} (${faqs.length} FAQs)`,
      content: `<script type="application/ld+json">\n${schemaJson}\n</script>`,
      ai_model: 'system',
      status: 'pending',
      created_at: new Date().toISOString(),
    })

  // Non-fatal if draft insert fails
  if (draftError) {
    console.error('[brand-faqs/inject] draft insert error:', draftError.message)
  }

  // Mark FAQs as schema_injected
  await supabase
    .from('brand_faqs')
    .update({ schema_injected: true })
    .eq('brand_slug', slug)
    .eq('is_published', true)

  return NextResponse.json({
    schema_json: schemaJson,
    faq_count: faqs.length,
    script_tag: `<script type="application/ld+json">\n${schemaJson}\n</script>`,
    saved_to_drafts: !draftError,
  })
}
