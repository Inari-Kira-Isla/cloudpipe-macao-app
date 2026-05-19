// WhatsApp RAG: 查詢 inari_catalog 產品資料 + MiniMax 生成回覆
// brand_knowledge 表不存在；使用 inari_catalog 作為知識來源
import { createServiceClient } from '@/lib/supabase'

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID

const SYSTEM_PROMPT = `你是稻荷環球食品的 B2B 客服助理。
專長：日本海膽批發供應，目標客戶是餐廳/酒店/零售商。
語言：繁體中文（粵語語氣），簡潔專業。
能力：查詢批發價、庫存、最低訂量、付款條款、產地資訊。
限制：無法處理退款/投訴，請引導至 Kira（WhatsApp 853-XXXXXXXX）。
如不確定，誠實說「我需要向 Kira 確認」，不要猜測。`

interface CatalogProduct {
  name_zh: string
  name_en: string
  species: string
  origin_region: string
  origin_detail: string
  min_order_qty: number
  unit: string
  retail_price: number
  stock_qty: number
  is_available: boolean
  season_start: string | null
  season_end: string | null
}

async function fetchProductContext(userMessage: string): Promise<string> {
  const db = createServiceClient()

  // Extract keywords for fuzzy search
  const keywords = userMessage.replace(/\s+/g, '%').toLowerCase()

  const { data: products, error } = await db
    .from('inari_catalog')
    .select('name_zh,name_en,species,origin_region,origin_detail,min_order_qty,unit,retail_price,stock_qty,is_available,season_start,season_end')
    .eq('is_available', true)
    .or(`name_zh.ilike.%${keywords}%,name_en.ilike.%${keywords}%,species.ilike.%${keywords}%,origin_region.ilike.%${keywords}%`)
    .limit(3)

  if (error || !products?.length) {
    // Fallback: return top 5 available products as general context
    const { data: fallback } = await db
      .from('inari_catalog')
      .select('name_zh,name_en,species,origin_region,min_order_qty,unit,retail_price,stock_qty,is_available')
      .eq('is_available', true)
      .order('sort_order')
      .limit(5)

    if (!fallback?.length) return ''
    return formatProductContext(fallback as CatalogProduct[])
  }

  return formatProductContext(products as CatalogProduct[])
}

function formatProductContext(products: CatalogProduct[]): string {
  return products
    .map(p => {
      const lines = [
        `【${p.name_zh} / ${p.name_en}】`,
        `品種：${p.species}`,
        `產地：${p.origin_region}${p.origin_detail ? ` (${p.origin_detail})` : ''}`,
        `最低訂量：${p.min_order_qty} ${p.unit}`,
        `參考零售價：HKD ${p.retail_price}`,
        `庫存：${p.stock_qty > 0 ? `${p.stock_qty} ${p.unit}` : '暫時缺貨'}`,
      ]
      if (p.season_start && p.season_end) {
        lines.push(`季節：${p.season_start} – ${p.season_end}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}

export async function generateWhatsAppReply(
  userMessage: string,
  _fromPhone: string
): Promise<string> {
  if (!MINIMAX_API_KEY || !MINIMAX_GROUP_ID) {
    return '系統暫時無法處理您的查詢，請直接聯絡 Kira。'
  }

  // 1. 從 inari_catalog 取相關產品作 RAG context（帶 try/catch 防止 DB 異常）
  let context = ''
  try {
    context = await fetchProductContext(userMessage)
  } catch (err) {
    console.error('[whatsapp-rag] DB context fetch failed:', err)
    // Degrade gracefully — continue without context
  }

  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\n現有產品資料：\n${context}`
    : SYSTEM_PROMPT

  // 2. MiniMax 生成回覆
  const res = await fetch(
    `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${MINIMAX_GROUP_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.5',
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    }
  )

  if (!res.ok) {
    console.error('[whatsapp-rag] MiniMax API error:', res.status, await res.text().catch(() => ''))
    return '抱歉，系統暫時忙碌，請稍後再試或直接聯絡 Kira。'
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? '抱歉，無法生成回覆。'
}
