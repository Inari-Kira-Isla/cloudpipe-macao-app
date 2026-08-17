import { NextRequest, NextResponse } from 'next/server'
import { scoreInsightOriginality } from '@/lib/originality-scorer'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    const result = await scoreInsightOriginality(slug)

    if (!result) {
      return NextResponse.json(
        { error: 'Insight not found', slug },
        { status: 404 }
      )
    }

    return NextResponse.json({
      slug,
      ...result
    })
  } catch (error) {
    console.error('Originality API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
