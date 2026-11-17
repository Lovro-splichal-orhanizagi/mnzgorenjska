import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vir from './viri/hns.mjs'

function setEnv(t, key, value) {
  const before = process.env[key]
  process.env[key] = value
  t.after(() => { if (before === undefined) delete process.env[key]; else process.env[key] = before })
}

const url = 'https://semafor.hns.family/utakmice/123/x/'
function fixture(t, status = 200, body = '<html><title>Semafor</title>Ž</html>', headers = { 'content-type': 'text/html; charset=utf-8' }, delay = 0) {
  const dir = mkdtempSync(join(tmpdir(), 'hns-http-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  // Fake only the external HTTP boundary; exercise the real Python process,
  // protocol conversion and Node response guard without hitting HNS.
  writeFileSync(join(dir, 'curl_cffi.py'), `
import time
class Response:
    status_code = ${status}
    headers = ${JSON.stringify(headers)}
    content = ${JSON.stringify(body)}.encode('utf-8')
class Requests:
    def get(self, url, **kwargs):
        assert url == 'https://semafor.hns.family/utakmice/123/x/'
        assert kwargs == dict(impersonate='chrome', timeout=25, allow_redirects=False, trust_env=False)
        time.sleep(${delay})
        return Response()
requests = Requests()
`)
  setEnv(t, 'PYTHONPATH', dir)
  setEnv(t, 'SLFF_HNS_TRANSPORT', 'curl_cffi')
  setEnv(t, 'SLFF_HNS_PYTHON', 'python3')
  t.mock.method(globalThis, 'fetch', () => { throw new Error('native fetch must not be used') })
}

test('curl transport preserves UTF-8 HTML and headers through the existing guard', async t => {
  fixture(t)
  const r = await vir.fetch(url, { headers: vir.glave })
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-type'), /text\/html/)
  assert.equal(await r.text(), '<html><title>Semafor</title>Ž</html>')
})
for (const [name, status, body, headers] of [
  ['403', 403, 'denied', { 'content-type': 'text/html' }],
  ['redirect', 302, 'moved', { 'content-type': 'text/html' }],
  ['JSON', 200, '{}', { 'content-type': 'application/json' }],
  ['challenge', 200, '<title>Just a moment</title>', { 'content-type': 'text/html' }],
  ['challenge header', 200, '<title>Semafor</title>', { 'content-type': 'text/html', 'cf-mitigated': 'challenge' }],
]) test(`curl ${name} never reaches the importer`, async t => {
  fixture(t, status, body, headers)
  await assert.rejects(vir.fetch(url), e => e.zavrnitev === true && e.status === status)
})
test('missing Python runtime stops the source without native fallback', async t => {
  fixture(t)
  setEnv(t, 'SLFF_HNS_PYTHON', '/does-not-exist/hns-python')
  await assert.rejects(vir.fetch(url), e => e.zavrnitev === true && /transport/.test(e.message))
})
test('abort terminates the Python request instead of leaving a reader running', async t => {
  fixture(t, 200, '<html>Semafor</html>', { 'content-type': 'text/html' }, 30)
  const start = Date.now()
  await assert.rejects(vir.fetch(url, { signal: AbortSignal.timeout(100) }), e => e.zavrnitev === true)
  assert.ok(Date.now() - start < 3000)
})
test('unknown transport fails closed', async t => {
  setEnv(t, 'SLFF_HNS_TRANSPORT', 'typo')
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Semafor</html>', { headers: { 'content-type': 'text/html' } }))
  await assert.rejects(vir.fetch(url), e => e.zavrnitev === true)
})
