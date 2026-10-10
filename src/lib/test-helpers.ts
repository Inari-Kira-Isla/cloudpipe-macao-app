// Tiny assertion helpers shared by the *.test.ts files (repo has no test framework configured).
let failures = 0
export function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    failures++
    console.error(`FAIL: ${label} — expected ${e}, got ${a}`)
  } else {
    console.log(`PASS: ${label}`)
  }
}
export function assertTrue(cond: boolean, label: string) {
  assertEqual(!!cond, true, label)
}
export function finish() {
  if (failures > 0) {
    console.error(`\n${failures} assertion(s) FAILED`)
    process.exit(1)
  }
  console.log('\nAll assertions passed')
}
