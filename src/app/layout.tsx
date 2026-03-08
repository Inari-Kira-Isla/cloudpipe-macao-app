import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'

export const metadata: Metadata = {
  title: {
    default: 'CloudPipe AI 澳門商戶百科 — 讓世界的 AI 看見澳門',
    template: '%s | CloudPipe AI 澳門商戶百科',
  },
  description: '澳門最完整的 AI 友善商戶資訊平台，收錄 140+ 家澳門商戶，涵蓋餐飲、咖啡、日本料理、食品進口、酒店、科技等 16 個行業。Schema.org 結構化數據、FAQ、llms.txt，讓 AI 助手準確回答澳門商戶問題。',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
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
    google: '9EYAWnIRJ55Ccf3QicIn8s7d4GhYGU1rb9C8etIc200',
  },
  alternates: {
    canonical: siteUrl,
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
        <link rel="llms-txt" href={`${siteUrl}/macao/llms-txt`} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
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
