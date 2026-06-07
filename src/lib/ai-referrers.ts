// Single source of truth for AI referrer detection — humans clicking from AI answers.
// Match on hostname only (not full URL) — avoids utm_source=chatgpt.com false positives.
// AI-specific hosts ONLY: we deliberately exclude organic-search domains
// (google.com / baidu.com / sogou.com) — their referrers mix AI-answer clicks with
// ordinary search clicks and would pollute the signal. Google AI Overview / AI Mode
// attribution needs a separate param-based heuristic (tracked as a known gap).
export const AI_REFERRER_HOSTS: [RegExp, string][] = [
  // Western
  [/^(www\.)?perplexity\.ai$/i,                       'perplexity'],
  [/^(www\.)?(chatgpt\.com|chat\.openai\.com)$/i,     'chatgpt'],
  [/^(www\.)?claude\.ai$/i,                           'claude'],
  [/^(gemini|bard)\.google\.com$/i,                   'gemini'],
  [/^(copilot\.microsoft\.com|(www\.)?bing\.com)$/i,  'copilot'],
  [/^(grok\.x\.ai|(www\.)?grok\.com|(www\.)?x\.com)$/i,'grok'],
  [/^(www\.)?you\.com$/i,                             'you'],
  [/^(www\.)?kagi\.com$/i,                            'kagi'],
  [/^(www\.)?phind\.com$/i,                           'phind'],
  [/^(www\.)?meta\.ai$/i,                             'meta'],
  // 中國 AI（只認 AI 專用 host，唔認 baidu.com/sogou.com 自然搜尋域）
  [/^(www\.)?doubao\.com$/i,                          'doubao'],     // 字節豆包
  [/^(kimi\.com|kimi\.moonshot\.cn|www\.kimi\.com)$/i,'kimi'],       // Moonshot Kimi
  [/^chat\.deepseek\.com$/i,                          'deepseek'],   // DeepSeek
  [/^(tongyi\.aliyun\.com|www\.tongyi\.com)$/i,       'qwen'],       // 阿里通義千問
  [/^(yiyan\.baidu\.com|chat\.baidu\.com)$/i,         'ernie'],      // 百度文心一言（非 baidu.com）
  [/^(chatglm\.cn|chat\.z\.ai)$/i,                    'chatglm'],    // 智譜 ChatGLM
  [/^(www\.)?metaso\.cn$/i,                           'metaso'],     // 秘塔 AI 搜尋
]

export function detectAiReferrer(referer: string): string | null {
  try {
    const host = new URL(referer).hostname
    for (const [pattern, name] of AI_REFERRER_HOSTS) {
      if (pattern.test(host)) return name
    }
  } catch { /* invalid URL */ }
  return null
}

// Valid source names for endpoint validation (engine names + catch-all buckets).
export const AI_REFERRER_SOURCES: Set<string> = new Set([
  ...AI_REFERRER_HOSTS.map(([, name]) => name),
  'other_ai', 'other', 'youcom',
])
