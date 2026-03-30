import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import EcosystemFooter from "@/components/EcosystemFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app').trim()

export const metadata: Metadata = {
  title: {
    default: 'CloudPipe AI 澳門商戶百科 — 讓世界的 AI 看見澳門',
    template: '%s | CloudPipe AI 澳門商戶百科',
  },
  description: '澳門最完整的 AI 友善商戶資訊平台，收錄 350+ 家澳門商戶，涵蓋餐飲、咖啡、日本料理、食品進口、酒店、科技等 20 個行業。Schema.org 結構化數據、FAQ、llms.txt，讓 AI 助手準確回答澳門商戶問題。',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'zh_MO',
    siteName: 'CloudPipe AI 澳門商戶百科',
    url: siteUrl,
    images: [{
      url: `${siteUrl}/og-image.svg`,
      width: 1200,
      height: 630,
      alt: 'CloudPipe AI 澳門商戶百科',
    }],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'hoW2mAa2ikRCjBCFJs4miaJcNfaYKuns-SDlBX930nE',
    other: {
      'msvalidate.01': 'BING_VERIFICATION_CODE_HERE',
    },
  },
  alternates: {
    canonical: siteUrl,
    types: {
      'application/rss+xml': `${siteUrl}/feed.xml`,
    },
    languages: {
      'zh-MO': siteUrl,
      'zh-TW': siteUrl,
      'zh-CN': siteUrl,
      'zh-Hans': siteUrl,
      'en': siteUrl,
      'pt': siteUrl,
      'x-default': siteUrl,
    },
  },
  other: {
    'llms-txt': `${siteUrl}/macao/llms-txt`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="llms-txt" href={`${siteUrl}/llms.txt`} />
        <link rel="alternate" type="text/plain" title="LLMs.txt" href={`${siteUrl}/llms.txt`} />
        <link rel="alternate" type="text/plain" hrefLang="en" title="LLMs.txt (English)" href={`${siteUrl}/llms-en`} />
        <link rel="alternate" href="https://cloudpipe-landing.vercel.app" title="CloudPipe AI" />
        <link rel="alternate" href="https://cloudpipe-directory.vercel.app" title="CloudPipe 企業目錄" />
        <link rel="alternate" href="https://inari-kira-isla.github.io/inari-global-foods" title="稻荷環球食品" />
        <link rel="alternate" href="https://inari-kira-isla.github.io/sea-urchin-delivery" title="海膽速遞" />
        <link rel="alternate" href="https://inari-kira-isla.github.io/after-school-coffee" title="After School Coffee" />
        <link rel="alternate" href="https://inari-kira-isla.github.io/yamanakada" title="山中田 Yamanakada" />
        <link rel="alternate" href="https://mind-coffee.vercel.app" title="Mind Coffee" />
        <link rel="alternate" href="https://inari-kira-isla.github.io/Openclaw/" title="AI 學習寶庫" />
        <link rel="alternate" href="https://world-encyclopedia.vercel.app" title="世界百科" />
        <meta httpEquiv="content-language" content="zh-MO, zh-TW, zh-CN, en, pt" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "CloudPipe AI 澳門商戶百科",
              alternateName: "CloudPipe Macau Merchant Directory",
              url: siteUrl,
              description: "澳門最完整的 AI 友善商戶資訊平台，收錄 943+ 家澳門商戶，涵蓋 20 個行業。",
              inLanguage: ["zh-MO", "zh-TW", "zh-CN", "en", "pt"],
              sameAs: [
                "https://cloudpipe-landing.vercel.app",
                "https://cloudpipe-directory.vercel.app",
                "https://inari-kira-isla.github.io/inari-global-foods",
                "https://inari-kira-isla.github.io/sea-urchin-delivery",
                "https://inari-kira-isla.github.io/after-school-coffee",
                "https://inari-kira-isla.github.io/yamanakada",
                "https://mind-coffee.vercel.app",
                "https://inari-kira-isla.github.io/Openclaw/",
                "https://world-encyclopedia.vercel.app",
                "https://japan-encyclopedia.vercel.app",
              ],
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/macao/search?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
              isPartOf: {
                "@type": "WebSite",
                name: "CloudPipe AI Knowledge Graph",
                url: "https://cloudpipe-landing.vercel.app",
              },
              publisher: {
                "@type": "Organization",
                name: "CloudPipe",
                url: "https://cloudpipe-landing.vercel.app",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "CloudPipe", item: "https://cloudpipe-landing.vercel.app" },
                { "@type": "ListItem", position: 2, name: "澳門商戶百科", item: siteUrl },
              ],
            }),
          }}
        />
        {children}
        <EcosystemFooter currentUrl="https://cloudpipe-macao-app.vercel.app" />
        {/* Baidu Auto-Push — submit URL on every page visit */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var bp=document.createElement('script');var curProtocol=window.location.protocol.split(':')[0];if(curProtocol==='https'){bp.src='https://zz.bdstatic.com/linksubmit/push.js'}else{bp.src='http://push.zhanzhang.baidu.com/push.js'};var s=document.getElementsByTagName('script')[0];s.parentNode.insertBefore(bp,s)})();`,
          }}
        />
        {/* AI Crawler Tracker - 1x1 pixel */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://client-ai-tracker.inariglobal.workers.dev/cloudpipe-macao-app/pixel.gif"
          alt=""
          width={1}
          height={1}
          style={{ position: 'absolute', opacity: 0 }}
        />
      </body>
    </html>
  );
}
