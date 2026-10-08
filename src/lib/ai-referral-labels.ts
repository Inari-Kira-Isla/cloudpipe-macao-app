import type { SourceMeta } from './ai-referrals-aggregate'

// Display labels for AI referral sources. The offline precompute (scripts/precompute_ai_referrals_v2.py)
// embeds a copy of this table in the cache JSON; ai-referrals-aggregate.test.ts asserts the two stay equal.
export const SOURCE_LABELS: Record<string, SourceMeta> = {
  perplexity: { label: 'Perplexity',  color: '#20b2aa', icon: '🔍' },
  chatgpt:    { label: 'ChatGPT',     color: '#10a37f', icon: '🤖' },
  claude:     { label: 'Claude',      color: '#c5a572', icon: '🧠' },
  gemini:     { label: 'Gemini',      color: '#4285f4', icon: '✨' },
  // copilot/grok rows are re-verified against referrer_url during precompute, so what remains in these
  // buckets is genuinely copilot.microsoft.com / grok.com traffic.
  copilot:    { label: 'Copilot',     color: '#0078d4', icon: '🪟' },
  grok:       { label: 'Grok',        color: '#1da1f2', icon: '𝕏' },
  you:        { label: 'You.com',     color: '#6366f1', icon: '🔎' },
  kagi:       { label: 'Kagi',        color: '#f59e0b', icon: '🔱' },
  phind:      { label: 'Phind',       color: '#7c3aed', icon: '💡' },
  other_ai:   { label: 'Other AI',    color: '#6b7280', icon: '🤖' },
}
