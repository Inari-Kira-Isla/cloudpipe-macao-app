import { NextRequest, NextResponse } from 'next/server'

interface CitationEvent {
  timestamp: string
  source_type: string // 'llm-txt', 'merchant-page', 'insight-page'
  merchant_id?: string
  merchant_name?: string
  region: string // 'macao', 'hongkong', 'taiwan', 'japan'
  ai_model: string // detected from user agent
  path: string
  referer?: string
  confidence_score?: number
  authority_sources?: string[]
}

/**
 * POST /api/v1/citation-track
 * Track AI crawler citations
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CitationEvent>

    // Detect AI model from user agent
    const userAgent = request.headers.get('user-agent') || ''
    const aiModel = detectAIModel(userAgent)

    const citationEvent: CitationEvent = {
      timestamp: new Date().toISOString(),
      source_type: body.source_type || 'merchant-page',
      merchant_id: body.merchant_id,
      merchant_name: body.merchant_name,
      region: body.region || 'macao',
      ai_model: aiModel,
      path: body.path || request.nextUrl.pathname,
      referer: request.headers.get('referer') || undefined,
      confidence_score: body.confidence_score,
      authority_sources: body.authority_sources,
    }

    // Log to console (in production, would write to database/file)
    console.log(`[CITATION] ${aiModel} accessing ${citationEvent.path}`)

    // Store in environment variable for later aggregation
    // In production, this would be stored in a database
    storeEvent(citationEvent)

    return NextResponse.json({
      success: true,
      timestamp: citationEvent.timestamp,
      ai_model: aiModel,
    })
  } catch (error) {
    console.error('Citation tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track citation' },
      { status: 400 }
    )
  }
}

/**
 * GET /api/v1/citation-track/stats
 * Get current citation statistics
 */
export async function GET(request: NextRequest) {
  const stats = getCitationStats()

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    stats,
  })
}

function detectAIModel(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('claude') || ua.includes('anthropic')) return 'claude'
  if (ua.includes('gpt') || ua.includes('openai')) return 'gpt'
  if (ua.includes('gemini') || ua.includes('google')) return 'gemini'
  if (ua.includes('llama') || ua.includes('meta')) return 'llama'
  if (ua.includes('perplexity')) return 'perplexity'

  // Detect by common crawler patterns
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    if (ua.includes('bing')) return 'bing'
    if (ua.includes('google')) return 'google-crawler'
    return 'crawler'
  }

  return 'other'
}

// In-memory store for this session
const citationEvents: CitationEvent[] = []

function storeEvent(event: CitationEvent) {
  citationEvents.push(event)

  // Keep only last 1000 events
  if (citationEvents.length > 1000) {
    citationEvents.shift()
  }
}

function getCitationStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const todayEvents = citationEvents.filter((e) => new Date(e.timestamp) >= todayStart)

  const aiModels: Record<string, number> = {}
  const regions: Record<string, number> = {}
  const sources: Record<string, number> = {}

  for (const event of todayEvents) {
    aiModels[event.ai_model] = (aiModels[event.ai_model] || 0) + 1
    regions[event.region] = (regions[event.region] || 0) + 1
    if (event.source_type) {
      sources[event.source_type] = (sources[event.source_type] || 0) + 1
    }
  }

  return {
    total_today: todayEvents.length,
    by_ai_model: aiModels,
    by_region: regions,
    by_source_type: sources,
    unique_merchants: new Set(todayEvents.map((e) => e.merchant_id)).size,
    avg_confidence: todayEvents.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / todayEvents.length || 0,
  }
}
