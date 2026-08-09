import type { Metadata } from 'next'
import { buildMetadata, renderInsightPage } from '@/components/insight-region/InsightPageView'

// FIX 2026-06-04: 明示 dynamicParams=true 防 force-static desync regression
export const revalidate = 86400
export const dynamicParams = true
// 2026-08-09 CACHE FIX: 舊註解（2026-07-06「呢條 route 讀 searchParams(lang 切換) → 永久
// dynamic」）已過時。?lang= 切換自 2026-05-27 起已改由 next.config.ts 嘅 308 permanent
// redirect 導去 path-based /global/{lang}/insights/{slug}；UI 語言掣同 sitemap 亦全部
// path-based。即係話呢度讀 searchParams 已經係 vestigial（殘留、冇 caller 靠佢），淨係
// 白白令 route 永久 dynamic（真 curl 實測 cache-control:private,no-store）。移除後
// ISR (revalidate=86400) 重新生效。
// maxDuration 保留：取代 createServiceClient 移除的 AbortSignal 8s，界定 ISR regen 上限
// (否則暴露 Vercel 預設 300s)。
export const maxDuration = 30
// 2026-08-09: 空 generateStaticParams + dynamicParams=true = ISR on-demand cache
// (● SSG)，同 macao/en/insights/[slug] 一致。冇呢個 export，Next 會當 route 永久 dynamic。
export async function generateStaticParams() {
  return [] // ISR on-demand only
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return buildMetadata('GLOBAL', props)
}

export default async function GlobalInsightDetailPage(props: PageProps) {
  return renderInsightPage('GLOBAL', props)
}
