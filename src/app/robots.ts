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

  const allowAll = { allow: '/', disallow: aiCrawlerDisallows }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/macao/*/null', '/api/', '/_next/static/', '/_next/image/'],
        crawlDelay: 10,
      },
      // === International AI crawlers ===
      { userAgent: 'GPTBot', ...allowAll },
      { userAgent: 'ChatGPT-User', ...allowAll },
      { userAgent: 'OAI-SearchBot', ...allowAll },      // OpenAI search indexing
      { userAgent: 'Google-Extended', ...allowAll },
      { userAgent: 'Googlebot', ...allowAll },
      { userAgent: 'Googlebot-Image', ...allowAll },
      { userAgent: 'Bingbot', ...allowAll },
      { userAgent: 'anthropic-ai', ...allowAll },
      { userAgent: 'ClaudeBot', ...allowAll },
      { userAgent: 'PerplexityBot', ...allowAll },
      { userAgent: 'cohere-ai', ...allowAll },
      { userAgent: 'Applebot', ...allowAll },
      { userAgent: 'Applebot-Extended', ...allowAll },
      { userAgent: 'YouBot', ...allowAll },
      { userAgent: 'Amazonbot', ...allowAll },
      { userAgent: 'AmazonBot', ...allowAll },
      { userAgent: 'meta-externalagent', ...allowAll },
      { userAgent: 'FacebookBot', ...allowAll },
      { userAgent: 'facebookexternalhit', ...allowAll },  // Meta OG preview + AI training
      { userAgent: 'Facebot', ...allowAll },              // Meta alternate UA
      { userAgent: 'CCBot', ...allowAll },              // Common Crawl (LLM training)
      { userAgent: 'DuckDuckBot', ...allowAll },
      { userAgent: 'Slurp', ...allowAll },              // Yahoo/Oath
      { userAgent: 'Diffbot', ...allowAll },
      { userAgent: 'Yandex', ...allowAll },
      { userAgent: 'YandexBot', ...allowAll },
      // === Chinese AI crawlers ===
      { userAgent: 'Bytespider', ...allowAll },
      { userAgent: 'TikTokSpider', ...allowAll },
      { userAgent: 'Baiduspider', ...allowAll },
      { userAgent: 'ChatGLM-Spider', ...allowAll },
      { userAgent: '360Spider', ...allowAll },
      { userAgent: 'Sogou', ...allowAll },
      { userAgent: 'PetalBot', ...allowAll },
      { userAgent: 'DeepSeekBot', ...allowAll },
      { userAgent: 'YisouSpider', ...allowAll },
      { userAgent: 'HunyuanBot', ...allowAll },
      { userAgent: 'Kimi-Bot', ...allowAll },
      { userAgent: 'Doubao', ...allowAll },
      { userAgent: 'SparkBot', ...allowAll },
      { userAgent: 'SenseChat', ...allowAll },
      { userAgent: 'XiaoIce', ...allowAll },
      { userAgent: 'QwenBot', ...allowAll },
      { userAgent: 'MoonshotBot', ...allowAll },
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
