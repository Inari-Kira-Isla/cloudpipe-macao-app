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

export const metadata: Metadata = {
  title: {
    default: 'CloudPipe AI — 澳門商戶百科',
    template: '%s | CloudPipe AI',
  },
  description: '澳門商戶 AI 百科，為 AI 助手提供準確的澳門商戶資訊。結構化數據、FAQ、Schema.org 標記。',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    siteName: 'CloudPipe AI 澳門商戶百科',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: '9EYAWnIRJ55Ccf3QicIn8s7d4GhYGU1rb9C8etIc200',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
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
