import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, realpathSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'

// Every real network path is denied. Only zajemi's injected native-fetch boundary is allowed.
globalThis.fetch = () => { throw new Error('unexpected real network') }
const helper = await import('./zajemi-fcf-javne-dokaze.mjs').catch(() => ({}))
const IDS = ['4109388', '4109643', '4109649', '4116202', '4116215', '4118352', '4118358']
const MAX = 2 * 1024 * 1024
const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'Lovro-splichal-orhanizagi/mnzgorenjska', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' }
const template = readFileSync(new URL('./vzorci/es-fcf-acta-quarta-4139543.html', import.meta.url), 'utf8')
function body(i = 0) {
  return Buffer.concat([Buffer.from([239,187,191]), Buffer.from(template.replaceAll('QUARTA CATALANA', i < 3 ? 'SEGONA CATALANA' : 'TERCERA CATALANA').replaceAll('GRUP 1', i === 0 ? 'GRUP 1' : i < 5 ? 'GRUP 2' : 'GRUP 9')), Buffer.from('<!-- català '), Buffer.from([255,254]), Buffer.from(' -->')])
}
function setup(t) {
  assert.equal(typeof helper.zajemi, 'function', 'fixed source capture must exist')
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fcf-source-')))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  let time = 0
  t.mock.method(globalThis, 'setTimeout', (cb, ms) => { time += ms; queueMicrotask(cb); return 1 })
  t.mock.method(AbortSignal, 'timeout', ms => { assert.equal(ms, 90000); return new AbortController().signal })
  const calls = []
  const invoke = fetchFn => helper.zajemi({ root, env, fetchFn: async (url, init) => { calls.push({ url, init, time }); return fetchFn(url, init, calls.length - 1) } })
  return { root, calls, invoke, advance: ms => { time += ms }, manifest: () => JSON.parse(readFileSync(join(root, 'fcf-javni-dokazi/manifest.json'))) }
}
const response = (bytes, headers = {}) => new Response(new ReadableStream({ start(c) { for (let i = 0; i < bytes.length; i += 137) c.enqueue(bytes.subarray(i, i + 137)); c.close() } }), { headers })

test('actual shared pacing serializes seven fixed GETs and preserves original entity bytes and hashes', async t => {
  const f = setup(t), originals = IDS.map((_, i) => body(i)); let active = 0
  const result = await f.invoke(async (_url, init, i) => {
    assert.equal(++active, 1); assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual'); assert.ok(init.signal instanceof AbortSignal)
    assert.deepEqual(init.headers, { 'User-Agent': 'SLFF fantasy (slff.eu; splih.94@gmail.com)' })
    let sent = false
    return new Response(new ReadableStream({ async pull(c) {
      await Promise.resolve()
      if (sent) { f.advance(700); active--; c.close() }
      else { sent = true; c.enqueue(originals[i]) }
    } }), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'SECRET', 'Location': 'SECRET', 'X-Token': 'SECRET', 'Date': 'Sun, 18 Oct 2026 12:00:00 GMT' } })
  })
  assert.deepEqual(result, { status: 0, artifactReady: true })
  assert.deepEqual(f.calls.map(x => x.url), IDS.map(id => `https://www.fcf.cat/ca/competicio/acta/${id}`))
  assert.equal(f.calls[0].time, 3000)
  for (let i = 1; i < 7; i++) assert.equal(f.calls[i].time - f.calls[i - 1].time, 3700)
  const m = f.manifest(); assert.equal(m.state, 'complete'); assert.equal(m.attemptedCount, 7)
  assert.doesNotMatch(JSON.stringify(m), /SECRET/)
  for (const [i, row] of m.files.entries()) {
    assert.deepEqual(readFileSync(join(f.root, 'fcf-javni-dokazi', row.artifactFile)), originals[i])
    assert.equal(row.byteCount, originals[i].length); assert.equal(row.sha256, createHash('sha256').update(originals[i]).digest('hex'))
    assert.equal(row.identity, 'fixed-no-redirect-http-receipt'); assert.equal(row.pageHeader.sezona, '2026/27')
  }
  assert.equal(readdirSync(join(f.root, 'fcf-javni-dokazi')).length, 8)
})

for (const [name, make, reason, status] of [
  ...[301,302,307,308,403,429,404,500,503].map(status => [`HTTP ${status}`, () => new Response('SECRET refusal', { status, headers: { Location: 'https://SECRET.invalid', 'Set-Cookie': 'SECRET' } }), status >= 300 && status < 400 ? 'redirect' : status === 403 || status === 429 ? 'source-refusal' : 'http-status', status]),
  ['challenge', () => response(Buffer.from('<title>Just a moment</title>SECRET')), 'challenge', 200],
  ['missing', () => response(Buffer.from('<title>Acta no trobada</title>')), 'missing-acta', 200],
  ['other page', () => response(Buffer.from('<title>Other</title>SECRET')), 'wrong-page', 200],
  ['bad header', () => response(Buffer.from('<title>Acta: X</title>self.__next_f')), 'invalid-header', 200],
  ['season', () => response(Buffer.from(body(1).toString().replaceAll('2026', '2025'))), 'wrong-season', 200],
  ['group', () => response(body(0)), 'wrong-group', 200],
  ['empty', () => response(Buffer.from(' \n\t')), 'empty-body', 200],
  ['network', () => { throw new TypeError('fetch failed SECRET') }, 'network-error', null],
  ['stream error', () => new Response(new ReadableStream({ pull(c) { c.error(new Error('SECRET')) } })), 'network-error', 200],
  ['oversized', () => response(Buffer.alloc(MAX + 1, 32)), 'body-too-large', 200],
]) test(`stops once on ${name}, retaining only prior valid bytes and sanitized receipt`, async t => {
  const f = setup(t)
  const r = await f.invoke((_url, _init, i) => i === 0 ? response(body()) : make())
  assert.deepEqual(r, { status: 1, artifactReady: true }); assert.equal(f.calls.length, 2)
  const m = f.manifest(); assert.equal(m.reason, reason); assert.equal(m.attemptedCount, 2)
  assert.equal(m.files[1].httpStatus, status); assert.equal(m.files[1].status, 'failed')
  assert.deepEqual(m.files.slice(2).map(x => x.status), Array(5).fill('not-attempted'))
  assert.deepEqual(readdirSync(join(f.root, 'fcf-javni-dokazi')).sort(), ['acta-4109388.html', 'manifest.json'])
  assert.doesNotMatch(JSON.stringify(m), /SECRET|fetch failed/)
})

test('accepts exact 2 MiB split stream; rejects one byte beyond without a body artifact', async t => {
  const f = setup(t), b = body(), padded = Buffer.concat([b, Buffer.alloc(MAX - b.length, 32)])
  const r = await f.invoke((_url, _init, i) => i === 0 ? response(padded) : new Response(null, { status: 403 }))
  assert.equal(r.status, 1); assert.equal(f.manifest().files[0].byteCount, MAX)
  assert.deepEqual(readFileSync(join(f.root, 'fcf-javni-dokazi/acta-4109388.html')), padded)
})

test('keeps 403 status when stream cancellation rejects and bounds malicious allowed headers', async t => {
  const f = setup(t)
  await f.invoke(() => new Response(new ReadableStream({ cancel() { throw new Error('SECRET') } }), { status: 403, headers: { 'Content-Type': 'SECRET'.repeat(5000), 'Content-Encoding': 'SECRET', 'Content-Length': '9999999999999999999999', 'Date': 'SECRET', 'Last-Modified': 'SECRET' } }))
  const m = f.manifest(); assert.equal(m.files[0].httpStatus, 403); assert.equal(m.reason, 'source-refusal')
  assert.ok(JSON.stringify(m).length < 15000); assert.doesNotMatch(JSON.stringify(m), /SECRET/)
})

test('AbortSignal remains live while reading a pending stream', async t => {
  const f = setup(t), controller = new AbortController()
  t.mock.method(AbortSignal, 'timeout', ms => { assert.equal(ms, 90000); return controller.signal })
  await f.invoke((_url, init) => new Response(new ReadableStream({ pull() { controller.abort(new DOMException('SECRET', 'TimeoutError')); assert.equal(init.signal.aborted, true) } })))
  assert.equal(f.calls.length, 1); assert.equal(f.manifest().reason, 'timeout')
})

test('rejects preexisting output and symlinked leaf or ancestor before any GET or writes', async t => {
  const f = setup(t), output = join(f.root, 'fcf-javni-dokazi')
  mkdirSync(output); writeFileSync(join(output, 'sentinel'), 'keep')
  assert.deepEqual(await f.invoke(() => assert.fail('no GET')), { status: 1, artifactReady: false })
  assert.equal(readFileSync(join(output, 'sentinel'), 'utf8'), 'keep')
  rmSync(output, { recursive: true }); symlinkSync(f.root, output)
  assert.equal((await f.invoke(() => assert.fail('no GET'))).artifactReady, false)
  rmSync(output); const link = join(f.root, 'link'); symlinkSync(f.root, link)
  assert.equal((await helper.zajemi({ root: link, env, fetchFn: () => assert.fail('no GET') })).artifactReady, false)
  assert.equal(f.calls.length, 0); assert.equal(existsSync(output), false)
})

test('CLI metadata, all arguments, reruns and reducing/invalid pacing refuse before network', async t => {
  const f = setup(t)
  for (const patch of [{ GITHUB_ACTIONS: 'false' }, { GITHUB_REPOSITORY: 'other/repo' }, { GITHUB_REF: 'refs/heads/other' }, { GITHUB_SHA: 'SECRET' }, { GITHUB_SHA: 'a'.repeat(40) + '\n' }, { GITHUB_RUN_ID: '123\n' }, { GITHUB_RUN_ID: '0' }, { GITHUB_RUN_ATTEMPT: '2' }]) {
    assert.equal((await helper.zajemi({ root: f.root, env: { ...env, ...patch }, fetchFn: () => assert.fail('no GET') })).artifactReady, false)
  }
  const previousFactor = process.env.SLFF_PREMOR_FAKTOR
  t.after(() => { if (previousFactor === undefined) delete process.env.SLFF_PREMOR_FAKTOR; else process.env.SLFF_PREMOR_FAKTOR = previousFactor })
  for (const value of ['0', '0.5', '-1', 'invalid', 'Infinity', '', '1e100', '715828']) {
    process.env.SLFF_PREMOR_FAKTOR = value
    assert.equal((await f.invoke(() => assert.fail('no GET'))).artifactReady, false)
  }
  const script = new URL('./zajemi-fcf-javne-dokaze.mjs', import.meta.url).pathname
  const r = spawnSync(process.execPath, ['--import', 'data:text/javascript,globalThis.fetch=()=>{throw new Error("unexpected real network")}', script, '--url', 'https://SECRET.invalid'], { cwd: f.root, env: { ...env, PATH: process.env.PATH }, encoding: 'utf8' })
  assert.equal(r.status, 1); assert.doesNotMatch(r.stdout + r.stderr, /SECRET/); assert.equal(existsSync(join(f.root, 'fcf-javni-dokazi')), false)
})

test('actual manual workflow scopes credentials to successful source coordination and gates owned artifacts', t => {
  const path = new URL('../.github/workflows/fcf-javni-dokazi.yml', import.meta.url)
  assert.ok(existsSync(path), 'manual source workflow must exist')
  const text = readFileSync(path, 'utf8'), steps = text.split(/^      - /m).slice(1)
  assert.match(text, /workflow_dispatch:\s*\n/); assert.doesNotMatch(text, /schedule:|inputs:|workflow_run:|matrix:|continue-on-error|cache@|cache\/|pull_request:|push:/)
  assert.match(text, /timeout-minutes: 360/); assert.match(text, /if: github.ref == 'refs\/heads\/main'/)
  assert.match(text, /contents: read/); assert.match(text, /actions: read/)
  const wait = steps.find(s => s.includes('id: wait')), capture = steps.find(s => s.includes('id: capture')), upload = steps.find(s => s.includes('actions/upload-artifact'))
  assert.ok(wait && capture && upload)
  for (const secret of ['GH_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    assert.ok(wait.includes(secret)); assert.equal(steps.filter(s => s.includes(secret)).length, 1)
    assert.doesNotMatch(text.split('    steps:')[0], new RegExp(secret))
  }
  assert.doesNotMatch(capture, /always\(|env:|continue-on-error/)
  assert.match(upload, /if: always\(\) && steps.capture.outputs.evidence_ready == 'true'/)
  assert.match(upload, /path: fcf-javni-dokazi\n/); assert.match(upload, /retention-days: 90/)
  assert.match(text, /npm ci --ignore-scripts/)
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'fcf-workflow-'))); t.after(() => rmSync(dir, { recursive: true, force: true }))
  writeFileSync(join(dir, 'node'), `#!${process.execPath}\nconst fs=require('node:fs');fs.appendFileSync(process.env.LOG,JSON.stringify({args:process.argv.slice(2),key:process.env.SUPABASE_SERVICE_ROLE_KEY,gh:process.env.GH_TOKEN})+'\\n');if(process.argv[2]==='scripts/cakaj-na-uvoze.mjs')process.exit(Number(process.env.BLOCK));\n`, { mode: 0o755 })
  const command = s => s.match(/^        run: (.+)$/m)[1]
  for (const block of [0,79]) {
    const log = join(dir, `calls-${block}`)
    // Execute the checked-in run bodies and Actions success gating with step-local env.
    const result = spawnSync('bash', ['-euo', 'pipefail', '-c', `(export GH_TOKEN=fixture SUPABASE_URL=fixture SUPABASE_SERVICE_ROLE_KEY=fixture; ${command(wait)})\n${command(capture)}`], { encoding: 'utf8', env: { PATH: `${dir}:${process.env.PATH}`, BLOCK: String(block), LOG: log } })
    const calls = readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse)
    assert.deepEqual(calls[0].args, ['scripts/cakaj-na-uvoze.mjs', '--drzava', 'ES', '--najvec', '300']); assert.equal(calls[0].key, 'fixture')
    assert.equal(result.status, block)
    if (block) assert.equal(calls.length, 1)
    else { assert.equal(calls.length, 2); assert.deepEqual(calls[1], { args: ['scripts/zajemi-fcf-javne-dokaze.mjs'] }) }
  }
})


test('partial body write plus failed cleanup never grants artifact upload eligibility', async t => {
  const f = setup(t), write = fs.writeFileSync
  t.mock.method(fs, 'writeFileSync', (fd, data, ...options) => {
    if (typeof fd === 'number' && Buffer.isBuffer(data)) {
      write(fd, data.subarray(0, 12), ...options)
      throw new Error('SECRET disk failure')
    }
    return write(fd, data, ...options)
  })
  t.mock.method(fs, 'unlinkSync', () => { throw new Error('SECRET unlink failure') })
  syncBuiltinESMExports()
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports() })
  const result = await f.invoke(() => response(body()))
  assert.equal(result.status, 1); assert.equal(result.artifactReady, false)
  assert.equal(f.calls.length, 1)
})

test('replaced prior output bytes cannot become an invocation-owned artifact', async t => {
  const f = setup(t)
  const result = await f.invoke((_url, _init, i) => {
    if (i === 1) writeFileSync(join(f.root, 'fcf-javni-dokazi/acta-4109388.html'), 'SECRET foreign replacement')
    return response(body(i))
  })
  assert.equal(result.artifactReady, false); assert.equal(f.calls.length, 2)
})

test('failed partial write preserves a foreign pathname replacement and refuses upload', async t => {
  const f = setup(t), write = fs.writeFileSync, unlink = fs.unlinkSync
  const path = join(f.root, 'fcf-javni-dokazi/acta-4109388.html')
  t.mock.method(fs, 'writeFileSync', (fd, data, ...options) => {
    if (typeof fd === 'number' && Buffer.isBuffer(data)) {
      write(fd, data.subarray(0, 12), ...options)
      unlink(path)
      write(path, 'foreign replacement', { flag: 'wx' })
      throw new Error('SECRET interrupted write')
    }
    return write(fd, data, ...options)
  })
  syncBuiltinESMExports()
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports() })
  const result = await f.invoke(() => response(body()))
  assert.equal(result.status, 1); assert.equal(result.artifactReady, false)
  assert.equal(f.calls.length, 1)
  assert.equal(readFileSync(path, 'utf8'), 'foreign replacement')
  assert.deepEqual(readdirSync(join(f.root, 'fcf-javni-dokazi')), ['acta-4109388.html'])
})
