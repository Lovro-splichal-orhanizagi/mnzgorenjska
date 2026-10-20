import test from 'node:test'
import assert from 'node:assert/strict'
import fscg from './viri/fscg.mjs'
import { CometZavrnitev } from './viri/comet-auris.mjs'
import mfa, { MfaZavrnitev } from './viri/mfa.mjs'
import { prenesiSPonovitvami, pozabiPadle } from './prenos.mjs'

async function withFetch(fake, fn) {
  const prior = globalThis.fetch
  globalThis.fetch = fake
  pozabiPadle()
  try { return await fn() } finally { globalThis.fetch = prior; pozabiPadle() }
}

for (const [source, vir, ErrorType, url] of [
  ['fscg', fscg, CometZavrnitev, 'https://fscg.me/takmicenja/meridianbet-1-cfl/'],
  ['mfa', mfa, MfaZavrnitev, 'https://api.mfa.com.mt/api/competitions/58539/standings?season=2027'],
]) {
  for (const status of [401, 403, 429]) test(`${source} turns HTTP ${status} into one typed stop before shared retries`, async () => {
    let attempts = 0
    const refused = new Response('refused', { status })
    await withFetch(async () => { attempts++; return refused }, async () => {
      await assert.rejects(
        prenesiSPonovitvami(url, { glave: vir.glave, premorMs: 0, zamiki: [0, 0, 0], fetchFn: vir.fetch }),
        e => e instanceof ErrorType && e.zavrnitev === true && e.status === status,
      )
    })
    assert.equal(attempts, 1)
    assert.equal(refused.bodyUsed, true)
  })

  test(`${source} forwards source headers and returns an ordinary response unchanged`, async () => {
    const response = new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
    let calls = 0
    await withFetch(async (input, init) => { calls++; assert.equal(input, url); assert.deepEqual(init.headers, vir.glave); return response }, async () => {
      const actual = await prenesiSPonovitvami(url, { glave: vir.glave, premorMs: 0, zamiki: [0], fetchFn: vir.fetch })
      assert.equal(actual, response)
    })
    assert.equal(calls, 1)
  })
}

test('MFA challenge HTML stops through its real reader without a second GET', async () => {
  let attempts = 0
  await withFetch(async () => { attempts++; return new Response('<html><title>Just a moment...</title>') }, async () => {
    await assert.rejects(mfa.zapisniki('58539/2027', async (url) => {
      const response = await prenesiSPonovitvami(url, { glave: mfa.glave, premorMs: 0, zamiki: [0, 0], fetchFn: mfa.fetch })
      return response.text()
    }), e => e instanceof MfaZavrnitev && e.zavrnitev)
  })
  assert.equal(attempts, 1)
})

test('MFA clear login HTML is a typed refusal and is not cacheable', async () => {
  let attempts = 0
  const login = '<!doctype html><html><head><title>Sign in</title></head><body><form action="/login"><input name="username"><input type="password"></form></body></html>'
  await withFetch(async () => { attempts++; return new Response(login) }, async () => {
    await assert.rejects(mfa.zapisniki('58539/2027', async (url) => {
      const response = await prenesiSPonovitvami(url, { glave: mfa.glave, premorMs: 0, zamiki: [0, 0], fetchFn: mfa.fetch })
      return response.text()
    }), e => e instanceof MfaZavrnitev && e.zavrnitev)
    assert.equal(mfa.zaPredpomnilnik(login), false)
  })
  assert.equal(attempts, 1)
})

test('MFA explicit JSON authentication error is typed and not cacheable', async () => {
  let attempts = 0
  const body = JSON.stringify({ statusCode: 401, error: 'Unauthorized' })
  await withFetch(async () => { attempts++; return new Response(body, { headers: { 'content-type': 'application/json' } }) }, async () => {
    await assert.rejects(mfa.zapisniki('58539/2027', async url => {
      const response = await prenesiSPonovitvami(url, { glave: mfa.glave, premorMs: 0, zamiki: [0, 0], fetchFn: mfa.fetch })
      return response.text()
    }), e => e instanceof MfaZavrnitev && e.zavrnitev)
    assert.equal(mfa.zaPredpomnilnik(body), false)
  })
  assert.equal(attempts, 1)
})

test('MFA auth-like words in valid football JSON do not trigger refusal', () => {
  const match = JSON.stringify({ status: 'PLAYED', homeScore: 2, awayScore: 1, message: 'Unauthorized goal was disallowed', events: [] })
  assert.equal(mfa.jePrijava(match), false)
  assert.equal(mfa.zaPredpomnilnik(match), true)
})

test('FSCG challenge HTML stops through its existing schedule reader without retry', async () => {
  let attempts = 0
  await withFetch(async () => { attempts++; return new Response('<html><title>Just a moment...</title>') }, async () => {
    await assert.rejects(fscg.razporedVseStrani('fscg/meridianbet-1-cfl/9278739', async url => {
      const response = await prenesiSPonovitvami(url, { glave: fscg.glave, premorMs: 0, zamiki: [0, 0], fetchFn: fscg.fetch })
      return response.text()
    }), e => e instanceof CometZavrnitev && e.zavrnitev)
  })
  assert.equal(attempts, 1)
})

test('FSCG clear login HTML is a typed stop but a fixture page with a login header is accepted', async () => {
  const login = '<!doctype html><html><body><form action="/login"><input name="user"><input type="password"></form></body></html>'
  let attempts = 0
  await withFetch(async () => { attempts++; return new Response(login) }, async () => {
    await assert.rejects(fscg.razporedVseStrani('fscg/meridianbet-1-cfl/9278739', async url => {
      const response = await prenesiSPonovitvami(url, { glave: fscg.glave, premorMs: 0, zamiki: [0, 0], fetchFn: fscg.fetch })
      return response.text()
    }), e => e instanceof CometZavrnitev && e.zavrnitev)
  })
  assert.equal(attempts, 1)

  const fixture = '<!doctype html><html><body><form action="/login"><input type="password"></form><table class="fixtures "><thead><tr><th>Fixtures</th></tr></thead><tbody></tbody></table></body></html>'
  const response = new Response(fixture)
  await withFetch(async () => response, async () => {
    const actual = await prenesiSPonovitvami('https://fscg.me/takmicenja/meridianbet-1-cfl/', { glave: fscg.glave, premorMs: 0, zamiki: [0], fetchFn: fscg.fetch })
    assert.equal(actual, response)
    assert.equal(await actual.text(), fixture)
  })
})
