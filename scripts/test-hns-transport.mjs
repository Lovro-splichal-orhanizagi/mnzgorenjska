import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vir from './viri/hns.mjs'
import { prenesiSPonovitvami, pozabiPadle } from './prenos.mjs'

const URL = vir.naslovRazporeda('12345')

function sharedRead() {
  pozabiPadle()
  return prenesiSPonovitvami(URL, {
    glave: vir.glave,
    premorMs: 0,
    zamiki: [0, 0, 0],
    fetchFn: vir.fetch,
    log: () => {},
  })
}

test('HNS HTTP refusals and failures stop before shared retries', async t => {
  for (const status of [401, 403, 429, 500, 302]) {
    await t.test(`HTTP ${status}`, async t => {
      let calls = 0
      t.mock.method(globalThis, 'fetch', async (_url, init) => {
        calls++
        assert.equal(init.redirect, 'manual')
        return new Response('<html>denied</html>', { status, headers: { 'content-type': 'text/html; charset=utf-8' } })
      })
      await assert.rejects(sharedRead(), error => error.zavrnitev === true && error.status === status)
      assert.equal(calls, 1)
    })
  }
})

test('HNS transport errors stop before shared retries', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })
  })
  await assert.rejects(sharedRead(), error => error.zavrnitev === true && /network|transport/i.test(error.message))
  assert.equal(calls, 1)
})

test('HNS rejects off-scope origins, paths, credentials, and methods before fetch', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return new Response('unexpected')
  })
  for (const url of [
    'http://semafor.hns.family/natjecanja/123/x/',
    'https://semafor.hns.family.evil/natjecanja/123/x/',
    'https://user@semafor.hns.family/natjecanja/123/x/',
    'https://semafor.hns.family/login',
    'https://semafor.hns.family/utakmice/123/slug/',
    'https://semafor.hns.family/natjecanja/123/x/?next=/login',
  ]) {
    await assert.rejects(vir.fetch(url), error => error.zavrnitev === true)
  }
  await assert.rejects(vir.fetch(URL, { method: 'POST' }), /GET/i)
  assert.equal(calls, 0)
})

for (const [name, html] of [
  ['challenge', '<!doctype html><title>Just a moment...</title><div class="cf-turnstile"></div>'],
  ['login page', '<!doctype html><title>Prijava</title><form action="/login"><input type="password"></form>'],
  ['CAPTCHA page title', '<!doctype html><title>CAPTCHA verification</title><p>Please verify.</p>'],
  ['Semafor title with g-recaptcha widget', '<!doctype html><title>Hrvatski nogometni savez - Semafor</title><div class="g-recaptcha" data-sitekey="public-fixture"></div>'],
  ['Semafor title with h-captcha widget', '<!doctype html><title>Hrvatski nogometni savez - Semafor</title><div class="h-captcha" data-sitekey="public-fixture"></div>'],
]) {
  test(`HNS ${name} stops before shared retries`, async t => {
    let calls = 0
    t.mock.method(globalThis, 'fetch', async () => {
      calls++
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    })
    await assert.rejects(sharedRead(), error => error.zavrnitev === true && /challenge|login|izziv|prijav/i.test(error.message))
    assert.equal(calls, 1)
  })
}

for (const [name, headers, body] of [
  ['JSON response', { 'content-type': 'application/json; charset=utf-8' }, '{"error":"temporarily unavailable"}'],
  ['empty HTML response', { 'content-type': 'text/html; charset=utf-8' }, ''],
]) {
  test(`HNS ${name} stops before shared retries`, async t => {
    let calls = 0
    t.mock.method(globalThis, 'fetch', async () => {
      calls++
      return new Response(body, { headers })
    })
    await assert.rejects(sharedRead(), error => error.zavrnitev === true && /content.type|MIME|empty|prazn/i.test(error.message))
    assert.equal(calls, 1)
  })
}

test('retained HNS schedule and report captures pass through the guard unchanged', async t => {
  const fixtures = [
    ['schedule', 'https://semafor.hns.family/natjecanja/114641955/x/', './vzorci/hns-natjecanje.html'],
    ['report', 'https://semafor.hns.family/utakmice/114641955/x/', './vzorci/hns-tekma-11m.html'],
  ]
  let calls = 0
  let request
  const bytesByUrl = new Map(fixtures.map(([, url, path]) => [url, readFileSync(new globalThis.URL(path, import.meta.url))]))
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls++
    request = { url, init }
    return new Response(bytesByUrl.get(String(url)), {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/html; charset=utf-8', 'x-source': 'semafor-fixture' },
    })
  })
  for (const [name, url] of fixtures) {
    const controller = new AbortController()
    const response = await vir.fetch(url, { headers: vir.glave, signal: controller.signal })
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytesByUrl.get(url), `${name} bytes`)
    assert.equal(response.status, 200)
    assert.equal(response.statusText, 'OK')
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8')
    assert.equal(response.headers.get('x-source'), 'semafor-fixture')
    assert.equal(request.url, url)
    assert.equal(request.init.redirect, 'manual')
    assert.equal(request.init.headers['User-Agent'], vir.glave['User-Agent'])
    assert.equal(request.init.signal, controller.signal)
    assert.equal(vir.jeIzziv(bytesByUrl.get(url).toString('utf8')), false, `${name} is not challenged`)
  }
  assert.equal(calls, fixtures.length)
  assert.equal(vir.premorMs, 500)
  pozabiPadle()
})

test('HNS accepts XHTML and does not flag ordinary body text mentioning CAPTCHA', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    return new Response('<html><title>Semafor</title><p>Info o CAPTCHA obrascima.</p></html>', {
      headers: { 'content-type': 'application/xhtml+xml; charset=utf-8' },
    })
  })
  const response = await vir.fetch(URL)
  assert.equal(response.headers.get('content-type'), 'application/xhtml+xml; charset=utf-8')
  assert.match(await response.text(), /Info o CAPTCHA/)
  assert.equal(vir.jeIzziv('<title>Semafor</title><p>Info o CAPTCHA obrascima.</p>'), false)
  assert.equal(calls, 1)
})
