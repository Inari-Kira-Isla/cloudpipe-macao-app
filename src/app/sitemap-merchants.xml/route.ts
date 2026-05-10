import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const revalidate = 86400 // 24h ISR — merchant sitemap changes slowly

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  // Fetch ALL live merchants (paginated)
  let merchants: Array<{ slug: string; updated_at: string }> = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('merchants')
      .select('slug, updated_at')
      .eq('status', 'live')
      .order('code')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    merchants = merchants.concat(data as typeof merchants)
    if (data.length < 1000) break
    offset += 1000
  }

  const now = new Date().toISOString()

  const urls = merchants
    .map((m) => {
      const lastmod = m.updated_at ? new Date(m.updated_at).toISOString() : now
      return `  <url>
    <loc>${siteUrl}/macao/m/${m.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
