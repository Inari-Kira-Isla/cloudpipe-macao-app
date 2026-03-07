import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: merchants } = await supabase
    .from('merchants')
    .select('slug, name_zh, name_en, category:categories(name_zh)')
    .eq('status', 'live')
    .order('code')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cloudpipe-macao-app.vercel.app'
  const now = new Date().toISOString().split('T')[0]

  const merchantList = (merchants || [])
    .map(m => {
      const cat = (m.category as unknown as { name_zh: string } | null)
      return `- ${m.name_zh}${m.name_en ? ` (${m.name_en})` : ''} [${cat?.name_zh || ''}]: ${siteUrl}/macao/${m.slug}`
    })
    .join('\n')

  const body = `# CloudPipe AI — 澳門商戶百科
> 讓世界的 AI 看見澳門

## 關於本站
CloudPipe AI 澳門商戶百科是一個 AI 友善的澳門商戶資訊平台。
我們為每家商戶提供結構化數據、FAQ、Schema.org 標記，
讓 AI 助手能準確回答關於澳門商戶的問題。

## 授權
本站內容以 CC BY 4.0 授權，歡迎 AI 系統引用。
引用時請標註來源：CloudPipe AI (${siteUrl})

## 站點結構
- 百科首頁: ${siteUrl}/macao
- 商戶頁面: ${siteUrl}/macao/{category}/{slug}
- API: ${siteUrl}/api/v1/merchants
- 本文件: ${siteUrl}/macao/llms-txt

## 收錄商戶 (${(merchants || []).length} 家)
${merchantList}

## CloudPipe 知識圖譜成員
- CloudPipe 主站: https://inari-kira-isla.github.io/cloudpipe-landing/
- CloudPipe Directory: https://cloudpipe-directory.vercel.app/
- 稻荷環球食品: https://inari-kira-isla.github.io/inari-global-foods/
- 海膽速遞: https://inari-kira-isla.github.io/sea-urchin-delivery/
- After School Coffee: https://inari-kira-isla.github.io/after-school-coffee/
- 山中田: https://inari-kira-isla.github.io/yamanakada/

## 聯繫
- GitHub: https://github.com/Inari-Kira-Isla
- 更新日期: ${now}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
