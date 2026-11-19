// Offline regression tests execute the actual workflow sender with mocked I/O.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const workflow = fs.readFileSync(new URL('../.github/workflows/preveri-podatke.yml', import.meta.url), 'utf8')
const sender = workflow.split('      - name: Javi na Discord\n')[1].split('      - name: Zapomni')[0]
const code = sender.match(/node -e '\n([\s\S]*?)\n          '/)[1]
const secret = 'https://example.invalid/secret-webhook'

function run(mode) {
  return spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict')
    require('fs').readFileSync = () => 'x'.repeat(2000)
    global.fetch = async (url, options) => {
      assert.equal(url, ${JSON.stringify(secret)})
      assert.equal(options.method, 'POST')
      assert.equal(JSON.parse(options.body).content.length, 1900)
      assert.ok(options.signal instanceof AbortSignal)
      if (${JSON.stringify(mode)} === 'network') throw new Error(url)
      if (${JSON.stringify(mode)} === 'timeout') throw new DOMException(url, 'TimeoutError')
      return {ok: ${mode === 'success'}, status: ${mode === 'success' ? 204 : 503}}
    }
    ${code}
  `], { encoding: 'utf8', env: { ...process.env, DISCORD_WEBHOOK: mode === 'missing' ? '' : secret } })
}

test('successful delivery exits zero and preserves the existing payload', () => {
  const result = run('success')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Javljeno na Discord/)
})

for (const mode of ['http', 'network', 'timeout', 'missing']) {
  test(`${mode} failure exits nonzero and never prints the webhook`, () => {
    const result = run(mode)
    assert.equal(result.status, 1)
    assert.doesNotMatch(result.stdout, /Javljeno na Discord/)
    assert.ok(!(result.stdout + result.stderr).includes(secret))
    assert.match(result.stderr, mode === 'http' ? /HTTP 503/ : /Discord/)
  })
}

test('only confirmed delivery can save a new reported cache entry', () => {
  assert.match(sender, /id: dostava/)
  const cache = workflow.split('      - name: Zapomni si javljeni seznam\n')[1].split('      #')[0]
  assert.match(cache, /if: success\(\) && steps\.dostava\.outcome == 'success'/)
  assert.match(cache, /steps\.javljeno\.outputs\.cache-hit != 'true'/)
  const keys = [...workflow.matchAll(/key: (preverba-javljeno[^\n]+)/g)].map(m => m[1])
  assert.equal(keys.length, 2)
  assert.equal(keys[0], keys[1])
  assert.match(keys[0], /^preverba-javljeno-v2-/)
  assert.match(code, /AbortSignal\.timeout\(15000\)/)
})
