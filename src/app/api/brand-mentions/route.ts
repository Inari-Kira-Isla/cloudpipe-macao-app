import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const MENTION_TYPES = ['news', 'social', 'forum', 'general'] as const;
type MentionType = typeof MENTION_TYPES[number];

interface BrandMention {
  brand_slug: string;
  mention_type: MentionType;
  title: string;
  url: string;
  snippet: string;
  source: string;
  detected_at: string;
}

interface MentionsData {
  brand_slug: string;
  mention_type: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  detected_at: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand');
  const type = searchParams.get('type');
  
  // Read from JSON file
  const jsonPath = path.join(process.cwd(), 'scripts', 'brand_mentions.json');
  
  try {
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ mentions: [], message: 'No mentions data found' });
    }
    
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const allMentions: MentionsData[] = JSON.parse(fileContent);
    
    // Filter by brand if specified
    let filteredMentions = allMentions;
    if (brand) {
      filteredMentions = filteredMentions.filter(m => m.brand_slug === brand);
    }
    
    // Filter by type if specified
    if (type && MENTION_TYPES.includes(type as MentionType)) {
      filteredMentions = filteredMentions.filter(m => m.mention_type === type);
    }
    
    // Sort by detected_at descending
    filteredMentions.sort((a, b) => 
      new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
    );
    
    // Limit to 100 most recent
    filteredMentions = filteredMentions.slice(0, 100);
    
    // Group by brand for summary
    const summary = MENTION_TYPES.reduce((acc, t) => {
      acc[t] = allMentions.filter(m => m.mention_type === t).length;
      return acc;
    }, {} as Record<MentionType, number>);
    
    const brands = [...new Set(allMentions.map(m => m.brand_slug))];
    
    return NextResponse.json({
      mentions: filteredMentions,
      summary: {
        total: allMentions.length,
        byType: summary,
        brands: brands
      },
      lastUpdated: allMentions.length > 0 
        ? allMentions.sort((a, b) => 
            new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
          )[0].detected_at 
        : null
    });
  } catch (error) {
    console.error('Error reading mentions:', error);
    return NextResponse.json(
      { error: 'Failed to load mentions data' },
      { status: 500 }
    );
  }
}
