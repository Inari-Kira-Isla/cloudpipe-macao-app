#!/usr/bin/env node
/**
 * verify-merchant-slug-extraction.mjs — crawler_visits.merchant_slug 接線回歸鎖
 *
 * 點解要咁寫：
 *   `extractMerchantSlug()` 住喺 src/middleware.ts（Next edge runtime，帶住成堆
 *   next/server import），直接 import 入 node 跑唔到。抄一份落測試檔就會漂移
 *   —— 呢個 repo 已經食過幾次「文件/測試講咗但正本改咗」嘅虧。所以呢個 harness
 *   **由 middleware.ts 原文抽返個函數體出嚟** eval，middleware.ts 一改，測試
 *   即刻跟住改，冇得各講各話。
 *
 * Fixture 係真生產資料：scripts/fixtures/crawler-visit-paths.sample.json 由
 * production crawler_visits（site=cloudpipe-macao-app）抽樣，含 percent-encoded
 * CJK slug、字面 "null" terminal segment、spider-web referer 等真形狀，唔係
 * 憑空作嘅樣本（2026-08-15 教訓：自己作嘅 fixture 5/5 PASS 都打唔中真資料）。
 *
 * 用法：node scripts/verify-merchant-slug-extraction.mjs
 * exit 0 = 全過；exit 1 = 有 case 唔對（fail loud）。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const mwPath = join(here, '..', 'src', 'middleware.ts')
const src = readFileSync(mwPath, 'utf8')

/** 由 middleware.ts 原文抽一個 top-level function 出嚟（靠首列 `}` 收口）。 */
function extractFn(name) {
  const startRe = new RegExp(`^function ${name}\\(`, 'm')
  const m = startRe.exec(src)
  if (!m) throw new Error(`FAIL: 喺 middleware.ts 搵唔到 function ${name}() — 佢係咪改咗名/搬咗？`)
  const rest = src.slice(m.index)
  const endRe = /^\}/m
  const e = endRe.exec(rest)
  if (!e) throw new Error(`FAIL: function ${name}() 收唔到口`)
  return rest.slice(0, e.index + 1)
}

// 用真 TypeScript transpiler 剝 type annotation（唔用自己寫嘅 regex —— 手寫
// stripper 一撞到 `referer?: string` 就爆，而且會靜靜哋改變語義）。
/** 抽一句 top-level `const NAME = ...` 出嚟（單行或以首列 `)`/`]`/`}` 收口）。 */
function extractConst(name) {
  const m = new RegExp(`^const ${name}\\b`, 'm').exec(src)
  if (!m) throw new Error(`FAIL: 喺 middleware.ts 搵唔到 const ${name} — 佢係咪改咗名/搬咗？`)
  const rest = src.slice(m.index)
  const e = /^(?:\)|\]|\})/m.exec(rest)
  const line = rest.slice(0, rest.indexOf('\n'))
  // 單行定義（例如 `const X = new Set([...])`）直接攞嗰行
  if (/[)\]}]\s*$/.test(line.trim())) return line
  if (!e) throw new Error(`FAIL: const ${name} 收唔到口`)
  return rest.slice(0, e.index + 1)
}

const ts = (await import('typescript')).default
const tsSource = [
  extractConst('RESERVED_TERMINAL_SEGMENTS'),
  extractFn('getPageType'),
  extractFn('extractMerchantSlug'),
].join('\n')
const js = ts.transpileModule(tsSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText

const isOwnDomain = () => false // getPageType 只喺有 referer 時用，測試 case 明確標明
const evalFns = new Function('isOwnDomain', `${js}\nreturn { getPageType, extractMerchantSlug }`)(
  isOwnDomain,
)

const { getPageType, extractMerchantSlug } = evalFns
const slugOf = (path, referer) => extractMerchantSlug(path, getPageType(path, referer))

let failed = 0
const check = (label, got, want) => {
  const ok = got === want
  if (!ok) {
    failed++
    console.error(`  ✗ ${label}\n      got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)
  }
  return ok
}

// ── 1. 語義斷言（手寫，覆蓋 fixture 未必抽到嘅邊界） ──────────────────────
console.log('[1] 語義斷言')
const cases = [
  ['/macao/dining/hotpot/cc-qiang-ji-huo-guo-7dac29', 'cc-qiang-ji-huo-guo-7dac29'],
  ['/macao/attractions/landmarks/ruins-of-saint-paul', 'ruins-of-saint-paul'],
  ['/macao/dining/hotpot/cc-foo?utm_source=x', 'cc-foo'],
  // 唔可以對非商戶頁估 slug —— 呢個正正係 crawler_stats_precompute 嗰個
  // segments[-1] 寫法嘅陷阱
  ['/macao/insights/macau-mazu-temple-guide-2026', null],
  ['/macao/en/insights/comparison-japan-vs-31', null],
  ['/taiwan/insights/tw-scooter-rental', null],
  ['/macao/dining/hotpot', null],
  ['/macao/dining', null],
  ['/macao', null],
  ['/macao/dining/hotpot/faqs', null],
  ['/macao/dining/hotpot/cc-foo/extra', null],
  // 合成/污染 terminal segment 唔算商戶節點
  ['/macao/dining/hotpot/null', null],
  ['/macao/dining/hotpot/undefined', null],
  // 非澳門地區冇 /{industry}/{category}/{slug} 商戶路由
  ['/hongkong/dining/hotpot/hk-foo', null],
]
for (const [path, want] of cases) check(path, slugOf(path), want)
// percent-encoded CJK 要 decode 返
check('percent-encoded CJK', slugOf('/macao/dining/hotpot/hk-%E8%B1%90%E5%9F%8E'), 'hk-豐城')
// 壞 percent-encoding 唔准拋，保留原文
check('malformed %E0', slugOf('/macao/dining/hotpot/bad-%E0%A4%A'), 'bad-%E0%A4%A')
console.log(failed === 0 ? '  ✓ 全部語義 case 過' : `  ✗ ${failed} 個 case 唔過`)

// ── 2. 真生產資料回歸 ──────────────────────────────────────────────────
console.log('[2] 真生產 crawler_visits 路徑')
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures', 'crawler-visit-paths.sample.json'), 'utf8'),
)
let merchantHits = 0
let nonMerchantLeaks = 0
for (const row of fixture.rows) {
  // fixture 記低咗生產真實 page_type；用返生產嗰個 referer 重算，要對得返。
  const derivedType = getPageType(row.path, row.referer || undefined)
  const slug = extractMerchantSlug(row.path, derivedType)
  if (derivedType === 'merchant') {
    if (slug) merchantHits++
    else {
      failed++
      console.error(`  ✗ merchant 頁抽唔到 slug: ${row.path}`)
    }
  } else if (slug !== null) {
    nonMerchantLeaks++
    failed++
    console.error(`  ✗ 非 merchant 頁（${derivedType}）竟然抽到 slug: ${row.path} -> ${slug}`)
  }
}
console.log(`  樣本 ${fixture.rows.length} 行｜merchant 頁抽到 slug ${merchantHits} 個｜非 merchant 洩漏 ${nonMerchantLeaks} 個`)

// ── 3. 反空轉閘：測試自己唔可以係 no-op ───────────────────────────────
console.log('[3] 反空轉閘')
if (merchantHits === 0) {
  failed++
  console.error('  ✗ fixture 入面一個 merchant 頁都抽唔到 slug — 測試本身空轉，唔算通過')
} else {
  console.log(`  ✓ 有 ${merchantHits} 個真實 merchant 頁被正確抽出`)
}

console.log(failed === 0 ? '\nPASS' : `\nFAIL: ${failed} 項`)
process.exit(failed === 0 ? 0 : 1)
