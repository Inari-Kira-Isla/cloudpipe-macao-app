/**
 * Brand RAG Embeddings Helper
 * Uses MiniMax embo-01 for vector embeddings with graceful degradation to FTS
 */

const MINIMAX_EMBED_URL = 'https://api.minimax.io/v1/embeddings'
const EMBED_MODEL = 'embo-01'
const MAX_BATCH_SIZE = 16

/**
 * Embed a single text string.
 * Returns null if MINIMAX_API_KEY is not set or API call fails → caller falls back to FTS.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const results = await embedTexts([text])
  return results[0]
}

/**
 * Batch embed up to MAX_BATCH_SIZE texts per API call.
 * Returns array of same length as input; null entries indicate failed/missing embeddings.
 */
export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    // No API key configured — graceful degradation to FTS
    return texts.map(() => null)
  }

  const results: (number[] | null)[] = new Array(texts.length).fill(null)

  // Process in batches of MAX_BATCH_SIZE
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE)
    const batchResults = await _embedBatch(batch, apiKey)
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j]
    }
  }

  return results
}

async function _embedBatch(texts: string[], apiKey: string): Promise<(number[] | null)[]> {
  // Sanitize: MiniMax embo-01 has token limits; truncate to ~2000 chars to be safe
  const sanitized = texts.map(t => t.slice(0, 2000).replace(/\n+/g, ' ').trim())

  // Try MiniMax embo-01 first
  try {
    const res = await fetch(MINIMAX_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: sanitized,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      // MiniMax response: { data: [{ embedding: number[] }, ...] }
      if (data?.data && Array.isArray(data.data)) {
        return data.data.map((item: { embedding?: number[] }) =>
          Array.isArray(item?.embedding) ? item.embedding : null
        )
      }
    }

    // If embo-01 not available, try OpenAI-compat alias
    if (!res.ok) {
      const fallbackRes = await fetch(MINIMAX_EMBED_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: sanitized,
        }),
      })

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        if (fallbackData?.data && Array.isArray(fallbackData.data)) {
          return fallbackData.data.map((item: { embedding?: number[] }) =>
            Array.isArray(item?.embedding) ? item.embedding : null
          )
        }
      }
    }
  } catch {
    // Network error or parsing failure — fall through to null array
  }

  return texts.map(() => null)
}

/**
 * Cosine similarity between two vectors (for debug / offline use).
 * Supabase uses the <=> operator (cosine distance) in SQL; this is the JS equivalent.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
