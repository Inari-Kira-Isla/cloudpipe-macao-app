// Minimal standalone assertion script — repo has no vitest/jest configured
// (package.json has no "test" script and no test runner in devDependencies).
// Run via the project's own `tsc` (already a devDependency), then node, e.g.:
//   npx tsc src/lib/ai-referrers.ts src/lib/ai-referrers.test.ts \
//     --outDir /tmp/ai-ref-test-out --module commonjs --target es2020 \
//     --esModuleInterop --skipLibCheck
//   node /tmp/ai-ref-test-out/src/lib/ai-referrers.test.js
// Zero framework dependencies — plain assertions, exits 1 on any failure.
import { detectAiReferrer } from './ai-referrers'

let failures = 0
function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failures++
    console.error(`FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  } else {
    console.log(`PASS: ${label}`)
  }
}

// --- copilot: only copilot.microsoft.com counts; bing.com must NOT classify as copilot ---
assertEqual(detectAiReferrer('https://copilot.microsoft.com/'), 'copilot', 'copilot.microsoft.com -> copilot')
assertEqual(detectAiReferrer('https://www.bing.com/'), null, 'www.bing.com -> not copilot (organic search excluded)')
assertEqual(detectAiReferrer('https://bing.com/search?q=foo'), null, 'bing.com -> not copilot (organic search excluded)')

// --- grok: only grok.com / grok.x.ai count; x.com / twitter.com must NOT classify as grok ---
assertEqual(detectAiReferrer('https://grok.com/'), 'grok', 'grok.com -> grok')
assertEqual(detectAiReferrer('https://grok.x.ai/'), 'grok', 'grok.x.ai -> grok')
assertEqual(detectAiReferrer('https://x.com/'), null, 'x.com -> not grok (social network excluded)')
assertEqual(detectAiReferrer('https://twitter.com/'), null, 'twitter.com -> not grok (was never matched, still not matched)')

// --- sanity: untouched engines still work ---
assertEqual(detectAiReferrer('https://www.perplexity.ai/search?q=x'), 'perplexity', 'perplexity.ai unaffected')
assertEqual(detectAiReferrer('https://chatgpt.com/'), 'chatgpt', 'chatgpt.com unaffected')
assertEqual(detectAiReferrer('not a url'), null, 'invalid URL -> null (no crash)')

if (failures > 0) {
  console.error(`\n${failures} assertion(s) FAILED`)
  process.exit(1)
} else {
  console.log('\nAll assertions passed')
}
