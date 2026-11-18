import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const load = kind => gunzipSync(readFileSync(new URL(`./vzorci/es-fcf-current-4107024-${kind}.html.gz`, import.meta.url))).toString()
const html = load('report'), redirectHtml = load('redirect')
const url = 'https://www.fcf.cat/ca/competicio/acta/4107024'
const canonical = 'https://www.fcf.cat/ca/partit/2026-2027/lliga-elit/grup-1/jornada-8/vic-unio-esportiva-club-a-elit-vs-atletic-sant-just-f-c-a-elit'
const proofFile = 'scripts/.predpomnilnik/fcf/acta-4107024.redirect.json'
const proof = { sha256:createHash('sha256').update(html).digest('hex'), id:'es4107024', url, redirectHtml }
let serial = 0
async function setup(t, cached = true) {
  const before = process.cwd(), dir = mkdtempSync(join(tmpdir(), 'fcf-calendar-'))
  process.chdir(dir)
  t.after(() => { process.chdir(before); rmSync(dir, { recursive:true, force:true }) })
  t.mock.method(Date, 'now', () => Date.parse('2026-11-18T12:00:00Z'))
  t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected source request'))
  mkdirSync('scripts/.predpomnilnik/fcf', { recursive:true })
  if (cached) {
    writeFileSync('scripts/.predpomnilnik/fcf/acta-4107024.html', html)
    writeFileSync(proofFile, JSON.stringify(proof))
  }
  // Each case starts without an in-memory redirect proof, like a new Actions job.
  return import(`./viri/fcf.mjs?calendar=${++serial}`)
}
const expected = [{stevilka:8,tekme:[{
  domaci:'VIC UNIÓ ESPORTIVA CLUB',gostje:'ATLETIC SANT JUST . F. C.',
  datum:'2026-11-08',ura:'18:30',odigrana:true,kontumacija:false,
}]}]

test('full schedule reader keeps numeric identity during older current-report walkover check', async t => {
  const fcf = await setup(t)
  assert.deepEqual(await fcf.default.razporedVseStrani('4107024-4107024', () => assert.fail('valid cache should be reused')), expected)
})

test('full schedule reader retains identity after fetching the validated public redirect', async t => {
  const fcf = await setup(t, false), calls = []
  t.mock.method(globalThis, 'setTimeout', cb => { queueMicrotask(cb); return 1 })
  t.mock.method(globalThis, 'fetch', async address => {
    calls.push(address)
    assert.ok([url,canonical].includes(address))
    return new Response(address === url ? redirectHtml : html)
  })
  const schedule = await fcf.default.razporedVseStrani('4107024-4107024', async address => (await fcf.fcfFetch(address)).text())
  assert.deepEqual(schedule, expected)
  assert.deepEqual(calls, [url,canonical])
})

for (const mutation of ['report ID', 'stored proof']) test(`calendar walkover check rejects a changed ${mutation}`, async t => {
  const fcf = await setup(t)
  const block = await fcf.preberiBlok('4107024-4107024', () => assert.fail('valid cache should be reused'))
  if (mutation === 'report ID') block.tekme[0].id = 4107032
  else writeFileSync(proofFile, JSON.stringify({...proof,redirectHtml:redirectHtml.replaceAll('4107024','4107032')}))
  assert.throws(() => fcf.razporedBloka(block), /current report identity/)
})
