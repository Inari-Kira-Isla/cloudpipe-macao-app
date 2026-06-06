import type { MetadataRoute } from 'next'

export const revalidate = 0  // always regenerate; prevents Vercel Edge caching stale robots.txt

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  // Commercial secret paths blocked from AI crawlers
  const aiCrawlerDisallows = [
    '/api/',
    '/macao/crawler-dashboard',
    '/macao/citation-stats',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/macao/*/null',
      },
      // International AI crawlers — limit access to sensitive data
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'cohere-ai',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Applebot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Applebot-Extended',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'YouBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'ia_archiver',
        allow: '/',
        disallow: ['/api/', '/macao/crawler-dashboard', '/macao/citation-stats'],
      },
      {
        userAgent: 'Diffbot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'omgili',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Amazonbot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'meta-externalagent',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'FacebookBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      // Chinese AI crawlers — limit access to sensitive data
      {
        userAgent: 'Bytespider',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'TikTokSpider',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'ChatGLM-Spider',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: '360Spider',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Sogou',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'PetalBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'DeepSeekBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'YisouSpider',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'HunyuanBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Kimi-Bot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'Doubao',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'SparkBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'SenseChat',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'XiaoIce',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'QwenBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'MoonshotBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
    ],
    sitemap: [
      // 2026-05-13: added sitemap_index.xml + 6 region sub-sitemaps after
      // commit 9c438c3 split /macao/insights/ into 5 region routes.
      // 2026-05-26: added sitemap-insights-en.xml and sitemap-insights-ja.xml
      // for language-specific insight discovery.
      // 2026-06-05: insights-first reorder; dead-link xml removed;
      // llms-txt moved to comments (plain text, not XML sitemaps).
      `${siteUrl}/sitemap-insights.xml`,
      `${siteUrl}/sitemap-insights-en.xml`,
      `${siteUrl}/sitemap-insights-ja.xml`,
      `${siteUrl}/sitemap-merchants.xml`,
      `${siteUrl}/sitemap-mo.xml`,
      `${siteUrl}/sitemap-hk.xml`,
      `${siteUrl}/sitemap-tw.xml`,
      `${siteUrl}/sitemap-jp.xml`,
      `${siteUrl}/sitemap-world.xml`,
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/sitemap_index.xml`,
      // AI Context Documents (plain text, not XML sitemaps):
      // ${siteUrl}/macao/llms-txt
      // ${siteUrl}/japan/llms-txt
      // ${siteUrl}/hongkong/llms-txt
      // ${siteUrl}/taiwan/llms-txt
      // ${siteUrl}/llms-en
      // ${siteUrl}/llms-ja
    ],
  }
}
// rebuild 1775000447
