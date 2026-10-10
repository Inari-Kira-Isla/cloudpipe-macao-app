#!/usr/bin/env node
// Zero-framework test runner for src/lib/*.test.ts: compile with the project's tsc, run with node.
// Usage: node scripts/run-lib-tests.mjs [srcRoot]   (srcRoot defaults to ./src/lib; used by the mutation check)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const libDir = resolve(process.argv[2] || 'src/lib')
const tests = readdirSync(libDir).filter(f => f.endsWith('.test.ts'))
const out = mkdtempSync(join(tmpdir(), 'lib-tests-'))
const tsc = resolve('node_modules/.bin/tsc')
let failed = 0
for (const t of tests) {
  const src = join(libDir, t)
  execFileSync(tsc, [src, '--outDir', join(out, t), '--module', 'commonjs', '--target', 'es2022', '--esModuleInterop', '--skipLibCheck', '--rootDir', libDir], { stdio: 'inherit' })
  try {
    execFileSync('node', [join(out, t, t.replace(/\.ts$/, '.js'))], { stdio: 'inherit' })
  } catch { failed++; console.error(`>>> ${t} FAILED`) }
}
console.log(failed ? `\n${failed} test file(s) failed` : `\nall ${tests.length} test file(s) passed`)
process.exit(failed ? 1 : 0)
