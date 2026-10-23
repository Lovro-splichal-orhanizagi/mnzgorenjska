import test from 'node:test'
import assert from 'node:assert/strict'
import nfsbih from './viri/nfsbih.mjs'
import upl from './viri/upl.mjs'
import { prenesiSPonovitvami, pozabiPadle } from './prenos.mjs'

for (const [provider, code] of [[nfsbih, 'wwin-liga-bih/54152223'], [upl, '432']]) {
  const url = provider.naslovRazporeda(code)
  const read = () => {
    pozabiPadle()
    return prenesiSPonovitvami(url, { fetchFn: provider.fetch, glave: provider.glave, zamiki: [0, 0, 0], log: () => {} })
  }
  test(`${provider.ime}: refusals stop before shared retries or redirects`, async t => {
    for (const status of [401, 403, 429, 302]) await t.test(`HTTP ${status}`, async t => {
      let calls = 0
      t.mock.method(globalThis, 'fetch', async () => {
        calls++
        return new Response('denied', { status, headers: { location: 'https://example.invalid/login' } })
      })
      await assert.rejects(read(), error => error.zavrnitev === true && error.status === status)
      assert.equal(calls, 1)
    })
  })
  test(`${provider.ime}: successful public response retains body and identifying headers`, async t => {
    let calls = 0
    t.mock.method(globalThis, 'fetch', async (actual, init) => {
      calls++
      assert.equal(actual, url)
      assert.equal(init.redirect, 'manual')
      assert.equal(new Headers(init.headers).get('user-agent'), provider.glave['User-Agent'])
      return new Response('<html>fixture</html>', { headers: { 'content-type': 'text/html' } })
    })
    assert.equal(await (await read()).text(), '<html>fixture</html>')
    assert.equal(calls, 1)
  })
}
