import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/macao/*/null',
        crawlDelay: 2,
      },
      // International AI crawlers — explicitly welcome
      {
        userAgent: 'GPTBot',
        allow: '/',
        crawlDelay: 2,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        crawlDelay: 2,
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'cohere-ai',
        allow: '/',
      },
      {
        userAgent: 'Applebot-Extended',
        allow: '/',
      },
      {
        userAgent: 'YouBot',
        allow: '/',
      },
      {
        userAgent: 'Amazonbot',
        allow: '/',
      },
      {
        userAgent: 'meta-externalagent',
        allow: '/',
      },
      {
        userAgent: 'FacebookBot',
        allow: '/',
      },
      // Chinese AI crawlers — 全面歡迎
      {
        userAgent: 'Bytespider',
        allow: '/',
      },
      {
        userAgent: 'TikTokSpider',
        allow: '/',
      },
      {
        userAgent: 'Baiduspider',
        allow: '/',
      },
      {
        userAgent: 'ChatGLM-Spider',
        allow: '/',
      },
      {
        userAgent: '360Spider',
        allow: '/',
      },
      {
        userAgent: 'Sogou',
        allow: '/',
      },
      {
        userAgent: 'PetalBot',
        allow: '/',
      },
      {
        userAgent: 'DeepSeekBot',
        allow: '/',
      },
      {
        userAgent: 'YisouSpider',
        allow: '/',
      },
      {
        userAgent: 'HunyuanBot',
        allow: '/',
      },
      {
        userAgent: 'Kimi-Bot',
        allow: '/',
      },
      {
        userAgent: 'Doubao',
        allow: '/',
      },
      {
        userAgent: 'SparkBot',
        allow: '/',
      },
      {
        userAgent: 'SenseChat',
        allow: '/',
      },
      {
        userAgent: 'XiaoIce',
        allow: '/',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
// rebuild 1775000447
