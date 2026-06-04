import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const WIDGET_ORIGIN = 'https://cloudpipe-macao-app.vercel.app'

/** Known brand slugs that may not yet have a brand_profiles row */
const KNOWN_BRAND_SLUGS: Record<string, { brandName: string; primaryColor?: string; greeting?: string }> = {
  'inari-global-foods': {
    brandName: '稻荷環球食品',
    primaryColor: '#F5C842',
    greeting: '你好！我是稻荷環球食品的 AI 策略顧問，專注 B2B 海膽供應商的 AEO 能見度。有什麼可以幫你？',
  },
  'cloudpipe': {
    brandName: 'CloudPipe',
    primaryColor: '#F5C842',
    greeting: 'Hi！我是 CloudPipe 的 AI 策略顧問。有任何 AEO / AI 搜索能見度問題都可以問我。',
  },
  'mind-cafe': {
    brandName: 'Mind Cafe',
    primaryColor: '#F5C842',
    greeting: '你好！我是 Mind Cafe 的 AI 顧問，有關品牌 AEO 優化歡迎發問！',
  },
  'afterschool-coffee': {
    brandName: '課後咖啡',
    primaryColor: '#F5C842',
    greeting: '你好！我是課後咖啡的 AI 策略顧問，有什麼可以幫你？',
  },
}

interface BrandMeta {
  brandName: string
  primaryColor: string
  greeting: string
}

async function resolveBrandMeta(slug: string): Promise<BrandMeta | null> {
  // 1. Check Supabase brand_profiles first
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('brand_profiles')
      .select('name_zh, name_en, primary_color')
      .eq('brand_slug', slug)
      .single()

    if (data) {
      const brandName = (data.name_zh || data.name_en || slug) as string
      return {
        brandName,
        primaryColor: (data.primary_color as string | null) || '#F5C842',
        greeting: `你好！我是 ${brandName} 的 AI 策略顧問，有什麼可以幫你？`,
      }
    }
  } catch {
    // Table may not have those columns — fall through to known slugs
  }

  // 2. Fall back to known slug list
  const known = KNOWN_BRAND_SLUGS[slug]
  if (known) {
    return {
      brandName: known.brandName,
      primaryColor: known.primaryColor || '#F5C842',
      greeting: known.greeting || `你好！我是 ${known.brandName} 的 AI 策略顧問，有什麼可以幫你？`,
    }
  }

  return null
}

/**
 * GET /api/v1/brand-widget/[slug]
 *
 * Returns a ready-to-copy embed HTML snippet for the given brand slug.
 *
 * Response: { embed_html: string, brand_slug: string, brand_name: string }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const meta = await resolveBrandMeta(slug)
  if (!meta) {
    return NextResponse.json(
      { error: `Brand not found: ${slug}` },
      { status: 404 }
    )
  }

  const { brandName, primaryColor, greeting } = meta

  const configJson = JSON.stringify({
    brandSlug: slug,
    brandName,
    primaryColor,
    greeting,
    position: 'bottom-right',
  }, null, 2)

  const embedHtml = `<!-- CloudPipe Brand Chat Widget — ${brandName} -->
<script>
  window.CloudPipeWidget = ${configJson};
</script>
<script
  src="${WIDGET_ORIGIN}/widget/brand-chat.js"
  async
  defer
></script>`

  return NextResponse.json(
    {
      embed_html: embedHtml,
      brand_slug: slug,
      brand_name: brandName,
      widget_url: `${WIDGET_ORIGIN}/widget/brand-chat.js`,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300',
      },
    }
  )
}
