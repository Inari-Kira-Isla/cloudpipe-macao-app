import { supabase } from '@/lib/supabase'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  const { data: insights } = await supabase
    .from('insights')
    .select('slug, title, description, published_at, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const allInsights = insights || []
  const now = new Date().toUTCString()

  const items = allInsights.map((item: { slug: string; title: string; description: string; published_at: string; updated_at: string }) => {
    const pubDate = item.published_at ? new Date(item.published_at).toUTCString() : now
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${siteUrl}/macao/insights/${escapeXml(item.slug)}</link>
      <guid isPermaLink="true">${siteUrl}/macao/insights/${escapeXml(item.slug)}</guid>
      <description>${escapeXml(item.description || '')}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`
  }).join('\n')

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>CloudPipe AI 澳門商戶百科</title>
    <link>${siteUrl}</link>
    <description>讓世界的 AI 看見澳門 — 澳門最完整的 AI 友善商戶資訊平台</description>
    <language>zh-TW</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
