// Meta WhatsApp Cloud API helper
// Env vars required:
//   WHATSAPP_PHONE_NUMBER_ID  — Meta 後台的 Phone Number ID
//   WHATSAPP_ACCESS_TOKEN     — Meta Graph API Token
//   WHATSAPP_VERIFY_TOKEN     — 自定義的 webhook 驗證 token（任意字串）

const BASE_URL = `https://graph.facebook.com/v19.0`

export async function sendTextMessage(to: string, text: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) return false

  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  return res.ok
}

export async function markAsRead(messageId: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) return

  await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  })
}

export interface WhatsAppMessage {
  from: string      // phone number with country code, e.g. "85312345678"
  id: string        // message ID
  text?: string     // text body (if type === 'text')
  type: string      // 'text' | 'image' | 'audio' | etc
  timestamp: string
}

export function parseWebhookPayload(body: unknown): WhatsAppMessage | null {
  try {
    const b = body as Record<string, unknown>
    const entry = (b?.entry as unknown[])?.[0] as Record<string, unknown> | undefined
    const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown> | undefined
    const value = changes?.value as Record<string, unknown> | undefined
    const messages = value?.messages as unknown[] | undefined
    if (!messages?.length) return null

    const msg = messages[0] as Record<string, unknown>
    const textObj = msg.text as Record<string, string> | undefined
    return {
      from: msg.from as string,
      id: msg.id as string,
      text: textObj?.body,
      type: msg.type as string,
      timestamp: msg.timestamp as string,
    }
  } catch {
    return null
  }
}
