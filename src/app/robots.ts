import type { MetadataRoute } from 'next'

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
        crawlDelay: 2,
      },
      // International AI crawlers — limit access to sensitive data
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: aiCrawlerDisallows,
        crawlDelay: 2,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: aiCrawlerDisallows,
        crawlDelay: 2,
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
        userAgent: 'Applebot-Extended',
        allow: '/',
        disallow: aiCrawlerDisallows,
      },
      {
        userAgent: 'YouBot',
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
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
// rebuild 1775000447
