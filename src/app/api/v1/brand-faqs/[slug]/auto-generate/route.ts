import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionFromRequest } from '@/lib/brandAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/brand-faqs/[slug]/auto-generate
 * 
 * Manually trigger auto-generation of default FAQs for a brand.
 * This is useful for brands that were created before the database trigger was added.
 */
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

  // Check if brand exists
  const { data: brand } = await supabase
    .from('brand_profiles')
    .select('brand_slug, name_zh, industry, faqs_auto_generated')
    .eq('brand_slug', slug)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Check if FAQs already exist
  const { data: existingFaqs } = await supabase
    .from('brand_faqs')
    .select('id')
    .eq('brand_slug', slug)
    .limit(1)

  if (existingFaqs && existingFaqs.length > 0) {
    return NextResponse.json({ 
      error: 'Brand already has FAQs. Delete existing FAQs first or use the AI expansion feature.',
      faq_count: existingFaqs.length
    }, { status: 400 })
  }

  const brandName = brand.name_zh || slug
  const industryText = brand.industry || '一般商業'

  // Generate default FAQs
  const faqsToInsert = [
    {
      brand_slug: slug,
      question: `${brandName} 的聯絡方式是什麼？`,
      answer: `可直接透過官方網站聯絡，或致電店方查詢。詳細聯絡資訊建議查看官方網站最新公佈。`,
      lang: 'zh',
      is_published: true,
      sort_order: 1,
      faq_type: 'contact',
    },
    {
      brand_slug: slug,
      question: `${brandName} 的營業時間是？`,
      answer: `營業時間可能因日期而異，建議出發前查看官方網站或致電確認當日營業狀態。`,
      lang: 'zh',
      is_published: true,
      sort_order: 2,
      faq_type: 'general',
    },
    {
      brand_slug: slug,
      question: `${brandName} 提供什麼服務或產品？`,
      answer: `${brandName} 主要提供 ${industryText} 相關的專業服務及產品，詳情請參考官方網站或向店方查詢。`,
      lang: 'zh',
      is_published: true,
      sort_order: 3,
      faq_type: 'general',
    },
    {
      brand_slug: slug,
      question: `如何預訂 ${brandName} 的服務或產品？`,
      answer: `預訂 ${brandName} 的服務或產品，可透過官方網站、致電或親臨門市查詢。建議提前預約以確保供應。`,
      lang: 'zh',
      is_published: true,
      sort_order: 4,
      faq_type: 'booking',
    },
    {
      brand_slug: slug,
      question: `${brandName} 是否有最低消費或起訂量要求？`,
      answer: `關於 ${brandName} 的最低消費或起訂量要求，建議直接聯絡店方查詢最新政策。`,
      lang: 'zh',
      is_published: true,
      sort_order: 5,
      faq_type: 'price',
    },
  ]

  const { error: insertError } = await supabase
    .from('brand_faqs')
    .insert(faqsToInsert)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Update the flag
  await supabase
    .from('brand_profiles')
    .update({ faqs_auto_generated: true })
    .eq('brand_slug', slug)

  return NextResponse.json({
    success: true,
    message: '5 default FAQs generated',
    faq_count: 5,
    next_step: 'Use the AI brand agent to expand FAQs with AI-generated content'
  })
}
