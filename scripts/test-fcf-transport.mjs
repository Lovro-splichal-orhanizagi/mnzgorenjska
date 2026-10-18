import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vir, { fcfFetch, FcfZavrnitev, jeIzziv, vrstaStrani } from './viri/fcf.mjs'
import { prenesiSPonovitvami, pozabiPadle, jePrehodnaNapaka } from './prenos.mjs'
import { zajemi } from './zajemi-fcf-javne-dokaze.mjs'

const URL_ACTA = 'https://www.fcf.cat/ca/competicio/acta/4139543'
const html = readFileSync(new URL('./vzorci/es-fcf-acta-quarta-4139543.html', import.meta.url), 'utf8')
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }

// Replace only native fetch and external time; the source and shared transport run unchanged.
function setup(t, nativeFetch, { factor, manualTime = false } = {}) {
  const oldFactor = process.env.SLFF_PREMOR_FAKTOR
  if (factor === undefined) delete process.env.SLFF_PREMOR_FAKTOR
  else process.env.SLFF_PREMOR_FAKTOR = factor
  pozabiPadle()
  t.after(() => {
    t.mock.restoreAll()
    if (manualTime) t.mock.timers.reset()
    if (oldFactor === undefined) delete process.env.SLFF_PREMOR_FAKTOR
    else process.env.SLFF_PREMOR_FAKTOR = oldFactor
    pozabiPadle()
  })
  let time = 0
  const waits = [], calls = [], timeouts = []
  if (manualTime) t.mock.timers.enable({ apis: ['setTimeout'] })
  else t.mock.method(globalThis, 'setTimeout', (cb, ms) => {
    waits.push(ms); time += ms; queueMicrotask(cb); return 1
  })
  t.mock.method(AbortSignal, 'timeout', ms => {
    const controller = new AbortController()
    timeouts.push({ ms, controller })
    return controller.signal
  })
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init, time })
    return nativeFetch(url, init, calls.length - 1)
  })
  return {
    calls, waits, timeouts,
    request: (options = {}, url = URL_ACTA) => prenesiSPonovitvami(url, {
      fetchFn: fcfFetch, premorMs: vir.premorMs, glave: vir.glave, log: () => {}, ...options,
    }),
  }
}

// Catches the original bug: an empty body escaped to the caller instead of recovering.
test('actual shared transport recovers empty200 to a valid report', async t => {
  const f = setup(t, (_url, _init, i) => new Response(i ? html : ''))
  const response = await f.request()
  const text = await response.text()
  assert.equal(text.length, html.length, 'empty200 must recover a nonempty report')
  assert.equal(text, html)
  assert.equal(f.calls.length, 2)
  assert.deepEqual(f.calls.map(x => x.time), [3000, 18000])
  assert.deepEqual(f.waits, [3000, 15000])
})

test('second native fetch waits through the exact 15000ms boundary after shared pacing', async t => {
  const f = setup(t, (_url, _init, i) => new Response(i ? html : ''), { manualTime: true })
  const request = f.request()
  t.mock.timers.tick(2999); await flush(); assert.equal(f.calls.length, 0)
  t.mock.timers.tick(1); await flush(); assert.equal(f.calls.length, 1)
  t.mock.timers.tick(14999); await flush(); assert.equal(f.calls.length, 1)
  t.mock.timers.tick(1); await flush(); assert.equal(f.calls.length, 2)
  assert.equal(await (await request).text(), html)
})

test('nonempty response preserves text, status, statusText, headers, URL and request options', async t => {
  const f = setup(t, () => new Response(html, { status: 201, statusText: 'Created', headers: { 'Content-Type': 'text/html', 'X-Source': 'fixture' } }))
  const incoming = new AbortController(); incoming.abort()
  const options = { signal: incoming.signal, headers: vir.glave, method: 'GET', redirect: 'manual', cache: 'no-store' }
  const response = await fcfFetch(URL_ACTA, options)
  assert.equal(await response.text(), html)
  assert.equal(response.status, 201); assert.equal(response.statusText, 'Created')
  assert.equal(response.headers.get('x-source'), 'fixture'); assert.equal(response.headers.get('content-type'), 'text/html')
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].url, URL_ACTA)
  assert.deepEqual(f.calls[0].init, { ...options, signal: f.timeouts[0].controller.signal })
  assert.equal(options.signal, incoming.signal)
  assert.equal(f.timeouts[0].ms, 90000)
})

test('both attempts retain options and use fresh 90000ms signals overriding incoming timeout', async t => {
  const f = setup(t, (_url, init, i) => {
    assert.equal(init.signal.aborted, false)
    return new Response(i ? html : '')
  })
  const response = await f.request({ zamiki: [] })
  assert.equal(await response.text(), html)
  assert.deepEqual(f.timeouts.map(x => x.ms), [30000, 90000, 90000])
  assert.notEqual(f.calls[0].init.signal, f.calls[1].init.signal)
  for (const call of f.calls) {
    assert.equal(call.url, URL_ACTA)
    assert.deepEqual(call.init.headers, { 'User-Agent': 'SLFF fantasy (slff.eu; splih.94@gmail.com)' })
  }
  assert.equal(f.calls.length, 2, 'zamiki:[] disables outer retries, not source-local empty recovery')
})

for (const position of [1, 2]) test(`source timeout remains active during body reading on native attempt${position}`, async t => {
  const f = setup(t, (_url, init, i) => new Response(new ReadableStream({
    start(controller) {
      if (position === 2 && !i) { controller.close(); return }
      init.signal.addEventListener('abort', () => controller.error(init.signal.reason), { once: true })
      queueMicrotask(() => f.timeouts.at(-1).controller.abort(new DOMException('body timeout', 'TimeoutError')))
    },
  })))
  await assert.rejects(f.request({ zamiki: [] }), { name: 'TimeoutError' })
  assert.equal(f.calls.length, position)
  assert.deepEqual(f.timeouts.map(x => x.ms), position === 1 ? [30000, 90000] : [30000, 90000, 90000])
})

test('persistent empty200 stops nontransiently at two native calls under default outer retries', async t => {
  const f = setup(t, () => new Response(''))
  await assert.rejects(f.request(), e => {
    assert.equal(e.constructor, Error); assert.equal(jePrehodnaNapaka(e), false)
    assert.match(e.message, /fcf:.*(?:praz|empty).*200/i)
    assert.equal(e.status, undefined); assert.equal(e.code, undefined)
    return true
  })
  assert.equal(f.calls.length, 2); assert.deepEqual(f.waits, [3000, 15000])
})

for (const [name, body] of [
  ['whitespace', ' \n\t'], ['missing acta', '<title>Acta no trobada</title>'],
  ['challenge', '<title>Just a moment...</title>cf_chl_opt'], ['other nonempty page', '<title>Other</title>'],
]) test(`${name} passes through to existing validation with no local retry`, async t => {
  const f = setup(t, () => new Response(body))
  assert.equal(await (await f.request()).text(), body)
  assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, [3000])
  if (name === 'challenge') assert.equal(jeIzziv(body), true)
  if (name === 'missing acta') assert.equal(vrstaStrani(body), 'ni')
})

for (const [name, url] of [
  ['foreign host', URL_ACTA.replace('www.fcf.cat', 'example.invalid')],
  ['bare host', URL_ACTA.replace('www.fcf.cat', 'fcf.cat')], ['http', URL_ACTA.replace('https:', 'http:')],
  ['query', URL_ACTA + '?x=1'], ['fragment', URL_ACTA + '#x'], ['credentials', URL_ACTA.replace('https://', 'https://u:p@')],
  ['explicit443', URL_ACTA.replace('www.fcf.cat', 'www.fcf.cat:443')], ['other port', URL_ACTA.replace('www.fcf.cat', 'www.fcf.cat:8443')],
  ['dot segments', URL_ACTA.replace('/acta/', '/x/../acta/')], ['trailing slash', URL_ACTA + '/'],
  ['leading whitespace', ' ' + URL_ACTA], ['final newline', URL_ACTA + '\n'], ['embedded tab', URL_ACTA.replace('/acta/', '/ac\tta/')],
  ['zero ID', URL_ACTA.replace('4139543', '0')], ['negative ID', URL_ACTA.replace('4139543', '-1')],
  ['leading zero ID', URL_ACTA.replace('4139543', '04139543')], ['encoded ID', URL_ACTA.replace('4139543', '%34' + '139543')],
  ['URL object', new URL(URL_ACTA)], ['Request object', new Request(URL_ACTA)],
]) test(`empty response for ${name} receives no extra native fetch`, async t => {
  const f = setup(t, () => new Response(''))
  assert.equal(await (await fcfFetch(url)).text(), '')
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].url, url); assert.deepEqual(f.waits, [])
})

test('redirected second empty200 still stops the already qualifying recovery flow', async t => {
  const f = setup(t, (_url, _init, i) => {
    const response = new Response('')
    if (i) Object.defineProperty(response, 'redirected', { value: true })
    return response
  })
  await assert.rejects(f.request(), e => !jePrehodnaNapaka(e) && /prazno telo HTTP 200/.test(e.message))
  assert.equal(f.calls.length, 2)
})

test('redirected empty response is ineligible and remains pass-through', async t => {
  const response = new Response('')
  Object.defineProperty(response, 'redirected', { value: true })
  const f = setup(t, () => response)
  assert.equal(await (await f.request()).text(), '')
  assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, [3000])
})

for (const status of [202, 301, 404]) test(`empty HTTP${status} never starts local recovery`, async t => {
  const f = setup(t, () => new Response('', { status }))
  const response = await f.request()
  assert.equal(response.status, status); assert.equal(await response.text(), '')
  assert.equal(f.calls.length, 1)
})

for (const status of [403, 429]) for (const position of [1, 2]) for (const mode of ['pending', 'sync throw', 'reject']) {
  test(`HTTP${status} on attempt${position} stops immediately despite ${mode} body cancellation`, async t => {
    let canceled = 0
    const refusal = new Response(new ReadableStream({ pull() {} }), { status })
    Object.defineProperty(refusal.body, 'cancel', { value: () => {
      canceled++
      if (mode === 'sync throw') throw new Error('cancellation failure')
      return mode === 'reject' ? Promise.reject(new Error('cancellation failure')) : new Promise(() => {})
    } })
    const f = setup(t, (_url, _init, i) => position === 2 && !i ? new Response('') : refusal)
    // A bounded microtask race also proves a pending cancel cannot hang the refusal.
    const outcome = await Promise.race([
      f.request().then(() => ({ resolved: true }), error => ({ error })),
      flush().then(() => ({ hung: true })),
    ])
    assert.ok(outcome.error instanceof FcfZavrnitev, `refusal must settle before cancellation: ${JSON.stringify(outcome)}`)
    assert.equal(outcome.error.status, status); assert.equal(outcome.error.zavrnitev, true)
    assert.equal(canceled, 1); assert.equal(refusal.bodyUsed, false)
    assert.equal(f.calls.length, position)
    assert.deepEqual(f.waits, position === 1 ? [3000] : [3000, 15000])
  })
}

for (const [factor, delay] of [[undefined, 15000], ['1', 15000], ['1.00001', 15001], ['1.5', 22500], ['2', 30000], ['143165.5764', 2147483646], ['143165.57646666664', 2147483647]]) {
  test(`pacing factor ${factor ?? 'absent'} gives a finite rounded delay ${delay}`, async t => {
    const f = setup(t, (_url, _init, i) => new Response(i ? html : ''), { factor })
    assert.equal(await (await fcfFetch(URL_ACTA)).text(), html)
    assert.deepEqual(f.waits, [delay]); assert.equal(f.calls.length, 2)
  })
}

for (const factor of ['', ' ', 'invalid', '0', '-1', '0.5', 'NaN', 'Infinity', '-Infinity', '1e309', '143165.57646666667', '143165.5765']) {
  test(`invalid pacing factor ${JSON.stringify(factor)} rejects before any native fetch`, async t => {
    const f = setup(t, () => new Response(html), { factor })
    await assert.rejects(fcfFetch(URL_ACTA), /SLFF_PREMOR_FAKTOR/)
    assert.equal(f.calls.length, 0); assert.deepEqual(f.waits, []); assert.deepEqual(f.timeouts, [])
  })
}

test('factor validation is lazy at invocation, never an import side effect', async t => {
  const f = setup(t, () => new Response(html), { factor: 'invalid' })
  const imported = await import('./viri/fcf.mjs?lazy-factor-test')
  assert.equal(typeof imported.fcfFetch, 'function'); assert.equal(f.calls.length, 0)
  await assert.rejects(imported.fcfFetch(URL_ACTA), /SLFF_PREMOR_FAKTOR/)
  process.env.SLFF_PREMOR_FAKTOR = '1'
  assert.equal(await (await imported.fcfFetch(URL_ACTA)).text(), html)
  assert.equal(f.calls.length, 1)
})

test('ordinary HTTP500 retains the existing four-wrapper retry budget and backoff', async t => {
  const f = setup(t, () => new Response('', { status: 500 }))
  assert.equal((await f.request()).status, 500)
  assert.equal(f.calls.length, 4)
  assert.deepEqual(f.waits, [3000, 2000, 3000, 6000, 3000, 15000, 3000])
})

test('ordinary native network failure retains its identity and four-wrapper retry budget', async t => {
  const networkError = new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })
  const f = setup(t, () => { throw networkError })
  await assert.rejects(f.request(), e => e === networkError)
  assert.equal(f.calls.length, 4)
  assert.deepEqual(f.waits, [3000, 2000, 3000, 6000, 3000, 15000, 3000])
})

for (const terminal of ['network', 'HTTP500']) test(`mixed empty200/${terminal} exhausts at eight native attempts, not more`, async t => {
  const networkError = new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } })
  const f = setup(t, (_url, _init, i) => {
    if (i % 2 === 0) return new Response('')
    if (terminal === 'network') throw networkError
    return new Response('unavailable', { status: 500 })
  })
  if (terminal === 'network') await assert.rejects(f.request(), e => e === networkError)
  else assert.equal((await f.request()).status, 500)
  assert.equal(f.calls.length, 8)
  assert.deepEqual(f.calls.map(x => x.time), [3000, 18000, 23000, 38000, 47000, 62000, 80000, 95000])
  assert.deepEqual(f.timeouts.map(x => x.ms), Array(4).fill([30000, 90000, 90000]).flat())
})

test('independent strict audit has one native attempt for empty200 and no source-local retry', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fcf-native-guard-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const f = setup(t, () => new Response(''))
  const result = await zajemi({ root, env: {
    GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska', GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1',
  } })
  assert.deepEqual(result, { status: 1, artifactReady: true })
  assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, [3000]); assert.deepEqual(f.timeouts.map(x => x.ms), [90000])
  assert.equal(f.calls[0].init.method, 'GET'); assert.equal(f.calls[0].init.redirect, 'manual')
  const manifest = JSON.parse(readFileSync(join(root, 'fcf-javni-dokazi/manifest.json'), 'utf8'))
  assert.equal(manifest.attemptedCount, 1); assert.equal(manifest.reason, 'empty-body')
})
