import { createServiceClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brand = searchParams.get('brand')
  const limit = parseInt(searchParams.get('limit') || '50')
  const type = searchParams.get('type')
  
  const supabase = createServiceClient()
  
  // Try database first
  try {
    let query = supabase
      .from('brand_mentions')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit)
    
    if (brand) {
      query = query.eq('brand_slug', brand)
    }
    
    if (type) {
      query = query.eq('mention_type', type)
    }
    
    const { data, error } = await query
    
    if (!error && data) {
      return NextResponse.json({ mentions: data, source: 'database' })
    }
  } catch (e) {
    // Table doesn't exist, fall back to JSON file
  }
  
  // Fallback: read from JSON file
  try {
    const jsonPath = join(process.cwd(), 'scripts', 'brand_mentions.json')
    const content = await readFile(jsonPath, 'utf-8')
    let mentions = JSON.parse(content)
    
    // Apply filters
    if (brand) {
      mentions = mentions.filter(m => m.brand_slug === brand)
    }
    if (type) {
      mentions = mentions.filter(m => m.mention_type === type)
    }
    
    // Sort by detected_at and limit
    mentions = mentions
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
      .slice(0, limit)
    
    return NextResponse.json({ mentions, source: 'json' })
  } catch (e) {
    return NextResponse.json({ mentions: [], error: 'No data available' })
  }
}
