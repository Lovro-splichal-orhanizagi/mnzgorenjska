import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { MAX_BYTES, OWN_URL, fixedRequestOptions, ownFetch, safeError } from './diagnose-g9-served-fetch.mjs'

test('own fetch is fixed to the single no-cache URL with bounded transport options', async () => {
  let call
  const body = '<meta name="slff-commit" content="' + 'a'.repeat(40) + '">'
  const result = await ownFetch(async (...args) => {
    call = args
    return { status: 200, body: Readable.from([Buffer.from(body)]) }
  })
  assert.equal(call[0], OWN_URL)
  assert.deepEqual(call[1].headers, { 'Cache-Control': 'no-cache' })
  assert.equal(call[1].credentials, 'omit')
  assert.equal(call[1].redirect, 'error')
  assert.ok(call[1].signal instanceof AbortSignal)
  assert.equal(result.status, 200)
  assert.equal(result.marker, 'a'.repeat(40))
  assert.equal(result.bytes, Buffer.byteLength(body))
})

test('error projection keeps only bounded allowlisted transport codes', () => {
  const projected = safeError(Object.assign(new TypeError('secret https://example.test/?token=ghp_secret'), {
    code: 'EPIPE', cause: Object.assign(new Error('bearer secret'), { code: 'ECONNRESET' }),
  }))
  assert.deepEqual(projected, { name: 'TypeError', code: 'EPIPE', causeCode: 'ECONNRESET' })
  assert.doesNotMatch(JSON.stringify(projected), /secret|https|token|bearer/)
  assert.deepEqual(safeError(Object.assign(new Error('hidden'), { code: 'PRIVATE_VALUE' })), { name: 'Error', code: null, causeCode: null })
})

test('response body is streamed and hard-limited at 4 MiB', async () => {
  const result = await ownFetch(async () => ({ status: 200, body: Readable.from([Buffer.alloc(MAX_BYTES + 1)]) }))
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'BODY_LIMIT')
  assert.equal(result.bytes, null)
})

test('marker uniqueness is checked across the full streamed body and chunk boundaries', async () => {
  const marker = '<meta name="slff-commit" content="' + 'b'.repeat(40) + '">'
  const result = await ownFetch(async () => ({ status: 200, body: Readable.from([Buffer.from('x'.repeat(5000) + marker.slice(0, 25)), Buffer.from(marker.slice(25) + 'y'.repeat(5000) + marker)]) }))
  assert.equal(result.markerCount, 2)
  assert.equal(result.marker, null)
})

test('30-second deadline errors retain TimeoutError without raw exception text', () => {
  const projected = safeError(new DOMException('sensitive deadline detail', 'TimeoutError'))
  assert.equal(projected.name, 'TimeoutError')
  assert.doesNotMatch(JSON.stringify(projected), /sensitive|deadline detail/)
})

test('successful timing includes streamed body completion', async () => {
  const started = Date.now()
  const result = await ownFetch(async () => ({ status: 200, body: Readable.from((async function* () { await new Promise(resolve => setTimeout(resolve, 30)); yield Buffer.from('ok') })()) }))
  assert.ok(result.elapsedMs >= 25)
  assert.ok(result.elapsedMs <= Date.now() - started)
})
