// Execute only the real sender, never the database or federation scan.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const source = fs.readFileSync(new URL('./nova-faza-oefb.mjs', import.meta.url), 'utf8')
const sender = source.slice(source.indexOf('if (process.env.DISCORD_WEBHOOK) {'))
const secret = 'https://example.invalid/secret-webhook'

function run(mode, required = true) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict'
    const besedilo = 'x'.repeat(2000)
    ${required ? "process.argv.push('--require-discord')" : ''}
    global.fetch = async (url, options) => {
      assert.equal(url, ${JSON.stringify(secret)})
      assert.equal(options.method, 'POST')
      assert.equal(JSON.parse(options.body).content, besedilo.slice(0, 1900))
      assert.ok(options.signal instanceof AbortSignal)
      if (${JSON.stringify(mode)} === 'network') throw new Error(url)
      if (${JSON.stringify(mode)} === 'timeout') throw new DOMException(url, 'TimeoutError')
      return { ok: ${mode === 'success'}, status: ${mode === 'success' ? 204 : 503} }
    }
    ${sender}
  `], { encoding: 'utf8', timeout: 5000,
    env: { ...process.env, DISCORD_WEBHOOK: mode === 'missing' ? '' : secret } })
}

test('OEFB successful delivery preserves payload and exits zero', () => {
  const result = run('success')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Javljeno na Discord/)
})

for (const mode of ['http', 'network', 'timeout', 'missing']) {
  test(`OEFB ${mode} failure is visible without leaking the webhook`, () => {
    const result = run(mode)
    assert.equal(result.status, 1, result.stderr)
    assert.doesNotMatch(result.stdout, /Javljeno na Discord/)
    assert.ok(!(result.stdout + result.stderr).includes(secret))
    assert.match(result.stderr, mode === 'http' ? /HTTP 503/ : /Discord/)
  })
}

test('OEFB local print-only mode still works without a webhook', () => {
  const result = run('missing', false)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
})

test('OEFB no-news scan stays quiet even when CI requires Discord', () => {
  const tail = source.slice(source.indexOf('if (!novice.length) {'))
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const novice = []
    process.argv.push('--require-discord')
    global.fetch = () => { throw new Error('unexpected delivery') }
    ${tail}
  `], { encoding: 'utf8', timeout: 5000, env: { ...process.env, DISCORD_WEBHOOK: '' } })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Nobene nove faze/)
  assert.equal(result.stderr, '')
})

test('scheduled phase alerts expose failures and both sender tests run in CI', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/preveri-podatke.yml', import.meta.url), 'utf8')
  const step = workflow.split('      - name: Nove faze avstrijskih lig\n')[1].split('      - name:')[0]
  assert.match(step, /!cancelled\(\) && github.event_name != 'workflow_run'/)
  assert.doesNotMatch(step, /continue-on-error:/)
  assert.match(step, /node scripts\/nova-faza-oefb.mjs --require-discord/)
  assert.match(sender, /AbortSignal\.timeout\(15000\)/)
  const tests = fs.readFileSync(new URL('./test-dodatni.txt', import.meta.url), 'utf8').split('\n')
  assert.ok(tests.includes('scripts/test-preveri-notification.mjs'))
  assert.ok(tests.includes('scripts/test-oefb-notification.mjs'))
})
