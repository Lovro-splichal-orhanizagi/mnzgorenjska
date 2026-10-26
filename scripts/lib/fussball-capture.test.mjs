import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createFussballCaptureClient } from './fussball-capture.mjs'

const base = 'https://www.fussball.de'
const ID = '031EQBPLF4000000VS5489BTVUS470OH'
const staffel = '031EKNM2HG00000LVS5489BUVUR5FS5A-G'
const html = '<!doctype html><title>saved fixture</title>'
const htmlResponse = (body = html, headers = {}) => new Response(body, {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
})
const fakeClock = () => {
  let time = 0
  const sleeps = []
  return {
    sleeps,
    now: () => time,
    sleep: async ms => { sleeps.push(ms); time += ms },
    advance: ms => { time += ms },
  }
}
const client = (fetchFn, options = {}) => {const clock=fakeClock();clock.advance(1_798_000_000_000);return createFussballCaptureClient({
  maxRequests: 4,
  fetchFn,
  now: clock.now,
  sleep: clock.sleep,
  ...options,
})}

test('retained originals preserve timestamps and never count as fresh network reads',async()=>{
 const bytes=Buffer.from(html),url=`${base}/spiel/-/spiel/${ID}`
 const d={url,kind:'report',bytes,status:200,contentType:'text/html',capturedAt:'2026-10-01T00:00:00.000Z',sha256:createHash('sha256').update(bytes).digest('hex')}
 let calls=0,uses=0
 const c=client(async()=>{calls++;throw Error('no network fallback')},{cachedDocuments:[d],onCachedDocument:()=>uses++})
 assert.equal((await c.read(url,'report')).capturedAt,d.capturedAt)
 await c.read(url,'report');assert.equal(calls,0);assert.equal(uses,1);assert.equal(c.snapshot().requests,0)
 assert.throws(()=>client(()=>{}, {cachedDocuments:[{...d,kind:'round',url:`${base}/spieltag/-/staffel/${staffel}`}]}),/schedule/i)
 assert.throws(()=>client(()=>{}, {cachedDocuments:[{...d,sha256:'0'.repeat(64)}]}),/cached/i)
 assert.throws(()=>client(()=>{}, {cachedDocuments:[{...d,contentType:'application/json'}]}),/MIME/i)
})

test('read returns original response bytes, a byte digest and persisted metadata', async () => {
  const body = Buffer.from('<html>Grüße</html>')
  const persisted = []
  const c = client(async (url, options) => {
    assert.equal(url, `${base}/spieltag/-/staffel/${staffel}`)
    assert.equal(options.redirect, 'manual')
    assert.equal(options.method, 'GET')
    assert.equal(options.headers['User-Agent'], 'SLFF fantasy (https://slff.eu)')
    return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  }, {
    onAttempt: async attempt => persisted.push(['attempt', attempt.number]),
    onDocument: async document => persisted.push(['document', document.sha256]),
  })

  const result = await c.read(`${base}/spieltag/-/staffel/${staffel}`, 'round')
  assert.deepEqual(Buffer.from(result.bytes), body)
  assert.equal(result.sha256, createHash('sha256').update(body).digest('hex'))
  assert.equal(result.status, 200)
  assert.equal(result.contentType, 'text/html; charset=utf-8')
  assert.equal(result.kind, 'round')
  assert.equal(result.capturedAt, new Date(1_798_000_000_000).toISOString())
  assert.deepEqual(persisted.map(x => x[0]), ['attempt', 'document'])
  assert.equal(c.snapshot().attempts.length, 1)
})

test('concurrent reads serialize network starts and enforce six seconds between them', async () => {
  const clock = fakeClock()
  let finishFirst
  const starts = []
  const fetchFn = async () => {
    starts.push(clock.now())
    if (starts.length === 1) await new Promise(resolve => { finishFirst = resolve })
    return htmlResponse()
  }
  const c = client(fetchFn, { now: clock.now, sleep: clock.sleep })
  const first = c.read(`${base}/spieltag/-/staffel/${staffel}`, 'round')
  const second = c.read(`${base}/spieltag/-/spieltag/8/staffel/${staffel}`, 'round')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(starts.length, 1)
  finishFirst()
  await Promise.all([first, second])
  assert.equal(starts.length, 2)
  assert.ok(starts[1] - starts[0] >= 6000)
  assert.deepEqual(clock.sleeps, [6000])
})

test('an early timer wake is checked again before the next network start',async()=>{
 let clock=0,wakes=0;const starts=[]
 const c=client(async()=>{starts.push(clock);return htmlResponse()},{now:()=>clock,sleep:async ms=>{clock+=ms-(wakes++===0?1:0)}})
 await c.read(`${base}/spieltag/-/staffel/${staffel}`,'round')
 await c.read(`${base}/spiel/-/spiel/${ID}`,'report')
 assert.deepEqual(starts,[0,6000]);assert.equal(wakes,2)
})
test('a stuck pacing clock stops before a second network request',async()=>{
 let calls=0
 const c=client(async()=>{calls++;return htmlResponse()},{now:()=>0,sleep:async()=>{}})
 await c.read(`${base}/spieltag/-/staffel/${staffel}`,'round')
 await assert.rejects(()=>c.read(`${base}/spiel/-/spiel/${ID}`,'report'),/pacing|clock/)
 assert.equal(calls,1);assert.equal(c.snapshot().stopped,true)
})

test('successful duplicate reads reuse bytes while all actual attempts are counted', async () => {
  let calls = 0
  const c = client(async () => { calls++; return htmlResponse() })
  const url = `${base}/spiel/-/spiel/${ID}`
  const first = await c.read(url, 'report')
  const second = await c.read(url, 'report')
  assert.deepEqual(Buffer.from(second.bytes), Buffer.from(first.bytes))
  assert.equal(calls, 1)
  assert.equal(c.snapshot().attempts.length, 1)
})

test('decompressed response bytes are accepted when Content-Length describes encoded bytes', async () => {
  const body = Buffer.from('<html>decompressed by fetch</html>')
  const c = client(async () => new Response(body, {
    headers: {
      'content-type': 'text/html',
      'content-encoding': 'gzip',
      'content-length': '12',
    },
  }))
  const result = await c.read(`${base}/spiel/-/spiel/${ID}`, 'report')
  assert.deepEqual(Buffer.from(result.bytes), body)
  assert.equal(result.sha256, createHash('sha256').update(body).digest('hex'))
})

test('denial is terminal for queued requests and even previously cached reads', async () => {
  let calls = 0
  const c = client(async url => {
    calls++
    if (url.endsWith('/spieltag/8/staffel/' + staffel)) return new Response('Forbidden', { status: 403 })
    return htmlResponse()
  })
  const cachedUrl = `${base}/spiel/-/spiel/${ID}`
  await c.read(cachedUrl, 'report')
  await assert.rejects(c.read(`${base}/spieltag/-/spieltag/8/staffel/${staffel}`, 'round'), /403|denied|forbidden/i)
  await assert.rejects(c.read(cachedUrl, 'report'), /stopped|terminal|403|denied|forbidden/i)
  await assert.rejects(c.read(`${base}/ajax.match.lineup/-/mode/PAGE/spiel/${ID}`, 'lineup'), /stopped|terminal|403|denied|forbidden/i)
  assert.equal(calls, 2)
  assert.equal(c.snapshot().attempts.length, 2)
})

test('a denial prevents a concurrent queued request from reaching fetch', async () => {
  let finishDenied
  let calls = 0
  const c = client(async url => {
    calls++
    if (url.endsWith('/spieltag/8/staffel/' + staffel)) {
      await new Promise(resolve => { finishDenied = resolve })
      return new Response('Forbidden', { status: 403 })
    }
    return htmlResponse()
  })
  const rejected = c.read(`${base}/spieltag/-/spieltag/8/staffel/${staffel}`, 'round')
  const queued = c.read(`${base}/spiel/-/spiel/${ID}`, 'report')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 1)
  finishDenied()
  await assert.rejects(rejected, /403|denied|forbidden/i)
  await assert.rejects(queued, /stopped|terminal|403|denied|forbidden/i)
  assert.equal(calls, 1)
  assert.equal(c.snapshot().attempts.length, 1)
})

test('request budget is required, bounded, and exhaustion stops cached reads', async () => {
  for (const maxRequests of [undefined, 0, 4001, 1.5]) {
    assert.throws(() => createFussballCaptureClient({ maxRequests }), /budget|request|1.*4000/i)
  }
  let calls = 0
  const c = client(async () => { calls++; return htmlResponse() }, { maxRequests: 1 })
  const cachedUrl = `${base}/spiel/-/spiel/${ID}`
  await c.read(cachedUrl, 'report')
  await assert.rejects(c.read(`${base}/spieltag/-/staffel/${staffel}`, 'round'), /budget|limit/i)
  await assert.rejects(c.read(cachedUrl, 'report'), /stopped|terminal|budget|limit/i)
  assert.equal(calls, 1)
  assert.equal(c.snapshot().attempts.length, 1)
})

test('only observed exact routes match their document kind', async () => {
  const cases = [
    [`${base}/spieltag/-/staffel/${staffel}`, 'round'],
    [`${base}/spieltag/kreisliga-mannheim/-/staffel/${staffel}`, 'round'],
    [`${base}/spieltag/-/spieltag/8/staffel/${staffel}`, 'round'],
    [`${base}/spieltag/kreisliga-mannheim/-/spieltag/8/staffel/${staffel}`, 'round'],
    [`${base}/spiel/-/spiel/${ID}`, 'report'],
    [`${base}/spiel/kreisliga-mannheim/-/spiel/${ID}`, 'report'],
    [`${base}/ajax.match.lineup/-/mode/PAGE/spiel/${ID}`, 'lineup'],
    [`${base}/ajax.match.lineup/-/mode/PAGE/spiel/${ID}/ticker-id/selectedTickerId`, 'lineup'],
    [`${base}/export.fontface/-/id/q73uvs1t/type/css`, 'css'],
    [`${base}/export.fontface/-/format/woff/id/q73uvs1t/type/font`, 'font'],
  ]
  for (const [url, kind] of cases) {
    let calls = 0
    const c = client(async () => { calls++; return kind === 'css'
      ? new Response('@font-face{}', { headers: { 'content-type': 'text/css' } })
      : kind === 'font'
        ? new Response(new Uint8Array([0, 1, 2]), { headers: { 'content-type': 'font/woff' } })
        : htmlResponse() })
    assert.equal((await c.read(url, kind)).kind, kind)
    assert.equal(calls, 1)
  }
  const bad = [
    [`http://www.fussball.de/spiel/-/spiel/${ID}`, 'report'],
    [`https://evil.example/spiel/-/spiel/${ID}`, 'report'],
    [`https://user@www.fussball.de/spiel/-/spiel/${ID}`, 'report'],
    [`https://www.fussball.de:443/spiel/-/spiel/${ID}`, 'report'],
    [`${base}/spiel/-/spiel/${ID}?x=1`, 'report'],
    [`${base}/spiel/-/spiel/${ID}#section/course`, 'report'],
    [`${base}/spiel/-/spiel/${ID}/extra`, 'report'],
    [`${base}/news/spiel/${ID}`, 'report'],
    [`${base}/export.fontface/-/format/woff/id/q73uvs1t/type/font`, 'css'],
  ]
  for (const [url, kind] of bad) {
    let calls = 0
    const c = client(async () => { calls++; return htmlResponse() })
    await assert.rejects(c.read(url, kind))
    assert.equal(calls, 0, url)
    await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'))
  }
})

test('redirects, wrong MIME, challenges, oversized and truncated bodies stop capture', async t => {
  const badResponses = [
    ['redirect', () => new Response(null, { status: 302, headers: { location: `${base}/spiel/-/spiel/${ID}` } })],
    ['wrong MIME', () => new Response('{}', { headers: { 'content-type': 'application/json' } })],
    ['challenge', () => htmlResponse('<title>Just a moment...</title>')],
    ['oversized body', () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { 'content-type': 'text/html' } })],
    ['oversized decompressed body', () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip', 'content-length': '12' } })],
    ['oversized CSS', () => new Response(new Uint8Array(64 * 1024 + 1), { headers: { 'content-type': 'text/css' } })],
    ['truncated body', () => htmlResponse('short', { 'content-length': '99' })],
  ]
  for (const [name, response] of badResponses) await t.test(name, async () => {
    let calls = 0
    const c = client(async (_url, options) => { calls++; assert.equal(options.redirect, 'manual'); return response() })
    await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'))
    await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'))
    assert.equal(calls, 1)
    assert.equal(c.snapshot().attempts.length, 1)
  })
})

test('early HTTP, MIME and declared-size refusals cancel unread response bodies', async t => {
  const cases = [
    ['HTTP refusal', { status: 403, headers: { 'content-type': 'text/html' } }],
    ['MIME refusal', { status: 200, headers: { 'content-type': 'application/json' } }],
    ['declared-size refusal', { status: 200, headers: { 'content-type': 'text/html', 'content-length': String(8 * 1024 * 1024 + 1) } }],
  ]
  for (const [name, init] of cases) await t.test(name, async () => {
    let cancelled = false
    const body = new ReadableStream({
      pull() {},
      cancel() { cancelled = true },
    })
    const c = client(async () => new Response(body, init))
    await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'))
    assert.equal(cancelled, true)
  })
})

test('callback failures are awaited, terminal, and never return an unpersisted document', async () => {
  const c = client(async () => htmlResponse(), {
    onDocument: async () => { await Promise.resolve(); throw new Error('disk full') },
  })
  const url = `${base}/spiel/-/spiel/${ID}`
  await assert.rejects(c.read(url, 'report'), /disk full/)
  await assert.rejects(c.read(url, 'report'), /stopped|terminal|disk full/i)
  assert.equal(c.snapshot().attempts.length, 1)
})

test('an attempt-journal failure is awaited before any network request', async () => {
  let calls = 0
  let callbackFinished = false
  const c = client(async () => { calls++; return htmlResponse() }, {
    onAttempt: async () => {
      await Promise.resolve()
      callbackFinished = true
      throw new Error('journal unavailable')
    },
  })
  await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'), /journal unavailable/)
  await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'), /stopped|terminal|journal unavailable/i)
  assert.equal(callbackFinished, true)
  assert.equal(calls, 0)
  assert.equal(c.snapshot().requests, 0)
  assert.equal(c.snapshot().attempts.length, 1)
})

test('a network exception is counted and prevents all later source calls', async () => {
  let calls = 0
  const c = client(async () => { calls++; throw new Error('socket reset') })
  await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'), /socket reset/)
  await assert.rejects(c.read(`${base}/spiel/-/spiel/${ID}`, 'report'), /stopped|terminal|socket reset/i)
  assert.equal(calls, 1)
  assert.equal(c.snapshot().requests, 1)
  assert.equal(c.snapshot().attempts[0].status, 'failed')
})
