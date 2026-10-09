/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '..', 'generate-sitemap.js'), 'utf8')

function load({ strict = true, pages = [], error = null } = {}) {
  const calls = [], writes = []
  let currentTable, from, to, page = 0
  const query = {
    limit() { return this }, select() { return this }, eq(col, val) { calls.push(['eq', col, val]); return this },
    not(col, op, val) { calls.push(['not', col, op, val]); return this },
    order(col) { calls.push(['order', col]); return this },
    range(a, b) { from = a; to = b; return this },
    async abortSignal() {
      calls.push([currentTable, from, to])
      return { data: pages[page] || [], error: typeof error === "function" ? error(page++) : (page++, error) }
    },
  }
  const fakeFs = { writeFileSync: (...args) => writes.push(args), renameSync: (...args) => writes.push(args) }
  const mod = { exports: {} }
  const sandbox = {
    module: mod, __dirname: '/fixture/scripts', Buffer, AbortSignal,
    process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'test-key', SITEMAP_STRICT: String(strict) } },
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => ({ from(t) { currentTable = t; return query } }) }
      if (name === 'fs') return fakeFs
      return require(name)
    },
  }
  vm.runInNewContext(source, sandbox, { filename: 'generate-sitemap.js' })
  return { ...mod.exports, calls, writes }
}

test('reads beyond PostgREST 1000-row cap with stable ordering', async () => {
  const f = load({ pages: [Array.from({ length: 1000 }, (_, i) => ({ id: i })), [{ id: 1000 }]] })
  assert.equal((await f.supabaseQuery('insights', 'slug', {}, 5000)).length, 1001)
  assert.deepEqual(f.calls.filter(c => c[0] === 'insights'), [['insights', 0, 999], ['insights', 1000, 1999]])
  assert.equal(f.calls.filter(c => c[0] === 'order' && c[1] === 'id').length, 2)
})
test('exact configured limit requires an extra empty page', async () => {
  const f = load({ pages: [Array(1000).fill({}), []] })
  assert.equal((await f.supabaseQuery('insights', 'slug', {}, 1000)).length, 1000)
  assert.deepEqual(f.calls.filter(c => c[0] === 'insights'), [['insights', 0, 999], ['insights', 1000, 1000]])
})
test('over configured limit fails instead of silently truncating', async () => {
  const f = load({ pages: [Array(1000).fill({}), [{}]] })
  await assert.rejects(f.supabaseQuery('insights', 'slug', {}, 1000), /exceeds configured limit/)
})
test('strict query failure preserves existing sitemap (no file writes)', async () => {
  const f = load({ error: { message: 'apikey secret must never be logged' } })
  await assert.rejects(f.main(), /Failed to fetch insights/)
  assert.deepEqual(f.writes, [])
})
test('failure on second query also does not write a static-only sitemap', async () => {
  const f = load({ pages: [[{ slug: 'insight' }]], error: page => page === 1 ? { message: '401' } : null })
  await assert.rejects(f.main())
  assert.deepEqual(f.writes, [])
})
test('legacy non-strict fallback remains available to existing callers', async () => {
  const f = load({ strict: false, error: { message: '401' } })
  assert.equal((await f.supabaseQuery('insights', 'slug')).length, 0)
})
test('successful generation uses atomic replacement', async () => {
  const f = load({ pages: [[{ slug: 'a&b' }], [{ slug: 'merchant', categories: { slug: 'cafe' } }]] })
  await f.main()
  assert.equal(f.writes[0][0], '/fixture/public/sitemap.xml.tmp')
  assert.deepEqual(f.writes[1], ['/fixture/public/sitemap.xml.tmp', '/fixture/public/sitemap.xml'])
  assert.match(f.writes[0][1], /a&amp;b/)
})
test('XML metacharacters are escaped in URL and lastmod', () => {
  assert.match(load().urlEntry('https://example.com/a&b', '<date>', 'daily', '1'), /a&amp;b<\/loc>/)
  assert.match(load().urlEntry('x', '<date>', 'daily', '1'), /&lt;date&gt;/)
})

test('strict Macau snapshot avoids false URLs for other regions/languages', async () => {
  const f = load()
  await f.main()
  assert.ok(f.calls.some(c => c[0] === 'eq' && c[1] === 'region' && c[2] === 'MO'))
  assert.ok(f.calls.some(c => c[0] === 'eq' && c[1] === 'lang' && c[2] === 'zh'))
  assert.deepEqual(f.calls.filter(c => c[0] === 'not').map(c => c[3]), ['hk-%', 'tw-%', 'jp-%'])
})
