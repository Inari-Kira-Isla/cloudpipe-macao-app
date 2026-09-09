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
  extractConst('OUR_BRAND_DOMAINS'),
  extractFn('isOwnDomain'),
  extractConst('LANG_PATH_SEGMENTS'),
  extractConst('RESERVED_TERMINAL_SEGMENTS'),
  extractFn('getPageType'),
  extractFn('extractMerchantSlug'),
].join('\n')
const js = ts.transpileModule(tsSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText

// 連 isOwnDomain / OUR_BRAND_DOMAINS 都由 middleware.ts 原文抽 —— 之前用
// `() => false` 做替身，令 fixture 入面所有 spider-web 行喺測試度重算唔返
// spider-web，I1 個回歸鎖直接空轉（本次 Opus 覆檢後改動時被 [3] 反空轉閘捉到）。
const evalFns = new Function(`${js}\nreturn { getPageType, extractMerchantSlug }`)()

const { getPageType, extractMerchantSlug } = evalFns
// 2026-09-09 第二輪：extractMerchantSlug 唔再收 pageType（見 middleware.ts 註解 ——
// 靠 page_type 會被 spider-web 分支吞走約 36% 真 AI bot 商戶頁訪問）。
const slugOf = (path) => extractMerchantSlug(path)

// 語義 case 同對抗 case 提早定義 —— `--emit` 要將佢哋連 TS 正本答案一齊吐出，
// 畀 Python 側做跨語言等價檢查（對抗輸入正正係最容易兩邊實作分歧嘅位）。
const cases = [
  ['/macao/dining/hotpot/cc-qiang-ji-huo-guo-7dac29', 'cc-qiang-ji-huo-guo-7dac29'],
  ['/macao/attractions/landmarks/ruins-of-saint-paul', 'ruins-of-saint-paul'],
  ['/macao/dining/hotpot/cc-foo?utm_source=x', 'cc-foo'],
  // 唔可以對非商戶形狀估 slug —— 呢個正正係 crawler_stats_precompute 嗰個
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

const adversarial = [
  // 路徑穿越
  ['/macao/dining/restaurant/%2e%2e%2f%2e%2e%2fetc%2fpasswd', null],
  ['/macao/dining/restaurant/a%2Fb', null],
  ['/macao/dining/restaurant/a%2fb', null],
  ['/macao/dining/restaurant/%2E%2E', null],
  ['/macao/dining/restaurant/..', null],
  ['/macao/dining/restaurant/.', null],
  ['/macao/dining/restaurant/%2e', null],
  ['/macao/dining/restaurant/%5c', null],            // 反斜線
  ['/macao/dining/restaurant/a%5Cb', null],
  // 控制字元
  ['/macao/dining/restaurant/a-lorcha%00', null],
  ['/macao/dining/restaurant/a%09b', null],          // TAB
  ['/macao/dining/restaurant/a%0Ab', null],          // LF
  ['/macao/dining/restaurant/a%0Db', null],          // CR
  ['/macao/dining/restaurant/a%1Fb', null],          // US
  ['/macao/dining/restaurant/a%7Fb', null],          // DEL
  // 空白 / 空值
  ['/macao/dining/restaurant/%20', null],
  ['/macao/dining/restaurant/%09', null],
  ['/macao/dining/restaurant/', null],
  // 保留段（大小寫）
  ['/macao/dining/restaurant/FAQS', null],
  ['/macao/dining/restaurant/Faq', null],
  ['/macao/dining/restaurant/index', null],
  ['/macao/dining/restaurant/NULL', null],
  ['/macao/dining/restaurant/Undefined', null],
  // 合法但刁鑽 —— 呢啲一定要**抽得到**，否則就係矯枉過正
  ['/macao/dining/restaurant/a%20b', 'a b'],          // 內部空格（唔係控制字元）
  ['/macao/dining/restaurant/caf%C3%A9-lisboa', 'café-lisboa'],
  ['/macao/dining/restaurant/%E5%A4%A7%E4%B8%89%E5%B7%B4', '大三巴'],
  ['/macao/dining/restaurant/a.b.c', 'a.b.c'],       // 有 dot 但唔係 . / ..
  ['/macao/dining/restaurant/' + 'x'.repeat(201), null], // 超長
]

// `--emit`：唔跑斷言，只將 fixture 逐行嘅權威判定（page_type + merchant_slug）
// 以 JSON 吐出 stdout。workspace 側嘅 backfill script 用呢個做**跨語言等價
// 檢查** —— Python 版抽 slug 邏輯必須逐行同呢個 TS 正本一致，唔准各自演化。
if (process.argv.includes('--emit')) {
  const fx = JSON.parse(readFileSync(join(here, 'fixtures', 'crawler-visit-paths.sample.json'), 'utf8'))
  const out = fx.rows.map((r) => ({
    path: r.path,
    referer: r.referer ?? null,
    page_type: getPageType(r.path, r.referer || undefined),
    merchant_slug: extractMerchantSlug(r.path),
  }))
  const named = [...cases, ...adversarial].map(([path, want]) => ({
    path, referer: null, page_type: getPageType(path), merchant_slug: extractMerchantSlug(path), expected: want,
  }))
  process.stdout.write(JSON.stringify({ fixture: out, cases: named }))
  process.exit(0)
}

let failed = 0
const check = (label, got, want) => {
  const ok = got === want
  if (!ok) {
    failed++
    console.error(`  ✗ ${label}\n      got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)
  }
  return ok
}

// ── 1. 語義斷言 ───────────────────────────────────────────────────────
console.log('[1] 語義斷言')
for (const [path, want] of cases) check(path, slugOf(path), want)
check('percent-encoded CJK', slugOf('/macao/dining/hotpot/hk-%E8%B1%90%E5%9F%8E'), 'hk-豐城')
check('malformed %E0', slugOf('/macao/dining/hotpot/bad-%E0%A4%A'), 'bad-%E0%A4%A')

// ── 1b. I1 回歸鎖：spider-web referer 唔可以再吞走商戶 slug ─────────────
// getPageType() 第一句就係 own-domain referer → 'spider-web'，排喺 merchant
// regex 之前。舊版 extractMerchantSlug 硬性 `pageType !== 'merchant' → null`，
// 令 AI bot 由我哋自己 insights 頁跟連結爬過去嘅商戶頁一律冇 slug
// （實測近 3 日約 5,780 次、佔全部商戶頁 AI 訪問約 36%，bot 主要係 ClaudeBot/GPTBot）。
console.log('[1b] spider-web referer 回歸鎖（I1）')
{
  const evalReal = evalFns
  const ref = 'https://cloudpipe-macao-app.vercel.app/macao/insights/macau-mazu-temple-guide-2026'
  const p = '/macao/dining/hotpot/cc-qiang-ji-huo-guo-7dac29'
  check('spider-web 之下 page_type 確實係 spider-web（前提成立）', evalReal.getPageType(p, ref), 'spider-web')
  check('spider-web 商戶頁仍然抽到 slug', evalReal.extractMerchantSlug(p), 'cc-qiang-ji-huo-guo-7dac29')
  check('spider-web insight 頁仍然係 null', evalReal.extractMerchantSlug('/macao/insights/foo'), null)
}

// ── 1c. M1 對抗路徑（Opus5 覆檢 28 條，decode 之後結構重驗）─────────────
// regex 特登用 [^/]+ 排除斜線，但 decodeURIComponent 一步就可以放返入嚟。
console.log('[1c] 對抗路徑（M1：decode 後結構重驗）')
for (const [path, want] of adversarial) check(path, slugOf(path), want)
if (adversarial.length !== 28) {
  failed++
  console.error(`  ✗ 對抗 case 應該有 28 條，實際 ${adversarial.length}`)
}
// 反空轉：對抗組唔可以全部 expect null（否則一個「永遠 return null」嘅實作都會過）
{
  const nonNull = adversarial.filter(([, w]) => w !== null).length
  if (nonNull < 4) {
    failed++
    console.error('  ✗ 對抗組 expect 非 null 嘅 case 太少，測試可以被 always-null 實作騙過')
  } else {
    console.log(`  ✓ 28 條對抗 case（其中 ${nonNull} 條 expect 真值，防 always-null 空轉）`)
  }
}
// 唔准拋錯拖垮請求
for (const [path] of adversarial) {
  try { slugOf(path) } catch (e) {
    failed++
    console.error(`  ✗ 拋錯（會拖垮 middleware）: ${path} → ${e}`)
  }
}
console.log(failed === 0 ? '  ✓ 語義 + spider-web + 對抗 全過' : `  ✗ 累計 ${failed} 個 case 唔過`)

// ── 2. 真生產資料回歸 ──────────────────────────────────────────────────
// 不變式（I1 之後改咗）：slug 非 null ⟺ path 係 4 段 /macao/ 商戶形狀 **而且**
// 過到 sanitise。同 page_type **無關** —— spider-web 商戶頁一樣要抽到。
console.log('[2] 真生產 crawler_visits 路徑')
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures', 'crawler-visit-paths.sample.json'), 'utf8'),
)
const MERCHANT_SHAPE = /^\/macao\/[^/]+\/[^/]+\/[^/]+$/
let merchantHits = 0
let spiderWebHits = 0
let shapeMismatch = 0
for (const row of fixture.rows) {
  const derivedType = getPageType(row.path, row.referer || undefined)
  const slug = extractMerchantSlug(row.path)
  const looksMerchant = MERCHANT_SHAPE.test(row.path.split('?')[0])
  if (slug !== null && !looksMerchant) {
    shapeMismatch++; failed++
    console.error(`  ✗ 非商戶形狀竟然抽到 slug: ${row.path} -> ${slug}`)
  }
  if (slug !== null) {
    merchantHits++
    if (derivedType === 'spider-web') spiderWebHits++
  }
}
console.log(
  `  樣本 ${fixture.rows.length} 行｜抽到 slug ${merchantHits} 個` +
  `（其中 page_type=spider-web ${spiderWebHits} 個 ← I1 之前呢批全部係 null）｜形狀不符洩漏 ${shapeMismatch} 個`,
)

// ── 3. 反空轉閘 ───────────────────────────────────────────────────────
console.log('[3] 反空轉閘')
if (merchantHits === 0) {
  failed++
  console.error('  ✗ fixture 入面一個商戶頁都抽唔到 slug — 測試本身空轉，唔算通過')
} else if (spiderWebHits === 0) {
  failed++
  console.error('  ✗ fixture 冇任何 spider-web 商戶頁樣本 — I1 回歸鎖係空轉，補 fixture')
} else {
  console.log(`  ✓ ${merchantHits} 個真商戶頁（含 ${spiderWebHits} 個 spider-web）被正確抽出`)
}

console.log(failed === 0 ? '\nPASS' : `\nFAIL: ${failed} 項`)
process.exit(failed === 0 ? 0 : 1)
