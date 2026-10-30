// Ročni reel (scripts/objava-reel.mjs): tar, video, napis, računi, meja, delavec, objava.
// Brez Mete, ffmpeg in baze: vse odvisnosti so ponarejene.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as R from './objava-reel.mjs'

const VIDEO = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(2000, 7)])
const NAPIS = 'Your teammate, 89th minute, still tying his boots. 😅\n\nPick your Sunday XI · slff.eu\n\n#sundayleague #fantasyfootball #slff'

async function tar(datoteke, mozn = []) {
  const d = await mkdtemp(join(tmpdir(), 'reel-tar-'))
  for (const [ime, vsebina] of Object.entries(datoteke)) await writeFile(join(d, ime), vsebina)
  const izhod = join(d, '..', `${d.split('/').pop()}.tar`)
  execFileSync('tar', ['-cf', izhod, ...mozn, '-C', d, ...Object.keys(datoteke)])
  const b = await readFile(izhod)
  await rm(d, { recursive: true, force: true }); await rm(izhod, { force: true })
  return b
}

const sonda = (spremembe = {}) => async () => ({
  format: { duration: '12.000000', ...spremembe.format },
  streams: [
    { codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p', width: 720, height: 1280, avg_frame_rate: '30/1', ...spremembe.video },
    ...(spremembe.brezZvoka ? [] : [{ codec_type: 'audio', codec_name: 'aac', ...spremembe.audio }]),
  ],
})

const ENV = { META_PAGE_TOKEN: 'skrivni-zeton', META_PAGE_ID: '111', META_IG_USER_ID: '222', OBJAVE_MEDIJI_URL: 'https://slff.eu/objave-mediji', DISCORD_OBJAVE_WEBHOOK: 'https://discord.test/hook' }

/** Ponarejen Graph API: računi, kvota, IG reel, FB reel, HEAD javnega videa, Discord. */
function meta({ povezanIg = '222', kvota = 3, igNapaka = null, velikost = VIDEO.length } = {}) {
  const klici = []
  const f = async (url, o = {}) => {
    const u = new URL(url)
    const telo = o.body ? Object.fromEntries(new URLSearchParams(o.body)) : null
    klici.push({ metoda: o.method ?? 'GET', pot: u.pathname, telo, url })
    const j = (x, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => x, headers: new Headers() })
    if (u.host === 'slff.eu') return { ok: true, status: 200, headers: new Headers({ 'content-length': String(velikost) }) }
    if (u.host === 'discord.test') return { ok: true, status: 204 }
    if (u.host === 'rupload.facebook.com') return j({ success: true })
    const p = u.pathname.replace(/^\/v[\d.]+\//, '')
    if (p === '111') return j({ name: 'SLFF', instagram_business_account: povezanIg ? { id: povezanIg } : undefined })
    if (p === '222') return j({ username: 'slff.eu' })
    if (p === '222/content_publishing_limit') return j({ data: [{ quota_usage: kvota, config: { quota_total: 50 } }] })
    if (p === '222/media' && o.method === 'POST') return igNapaka ? j({ error: { message: igNapaka } }, false) : j({ id: 'C1' })
    if (p === 'C1') return j({ status_code: 'FINISHED' })
    if (p === '222/media_publish') return j({ id: 'M1' })
    if (p === 'M1') return j({ permalink: 'https://www.instagram.com/reel/ABC/' })
    if (p === '222/media') return j({ data: [{ permalink: 'https://www.instagram.com/reel/ABC/', media_product_type: 'REELS' }] })
    if (p === '111/video_reels' && telo?.upload_phase === 'start') return j({ video_id: 'V1' })
    if (p === '111/video_reels') return j({ success: true })
    if (p === 'V1' && u.searchParams.get('fields') === 'status') return j({ status: { video_status: 'ready', publishing_phase: { status: 'complete' } } })
    if (p === 'V1') return j({ permalink_url: '/reel/V1/' })
    throw new Error(`nepričakovan klic ${o.method ?? 'GET'} ${p}`)
  }
  return { f, klici }
}

const db = (vrstice = [], meje = {}) => {
  const q = { select: () => q, in: () => q, gte: (_, v) => { meje.od = v; return q }, lte: (_, v) => { meje.do = v; return q }, then: (ok) => ok({ data: vrstice, error: null }) }
  return { from: () => q }
}

async function mapa() { return mkdtemp(join(tmpdir(), 'reel-mediji-')) }
const zas = (m) => join(m, 'zasebno')
const tiho = () => {}
const ZDAJ = new Date('2026-10-30T13:00:00Z')

test('tar: en video in caption.txt (GNU tar, tudi ./ predpona)', async () => {
  const d = R.vsebinaTar(R.beriTar(await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS })))
  assert.equal(d.ime, 'reel.mp4'); assert.ok(d.video.equals(VIDEO)); assert.equal(d.napis, NAPIS)
  const d2 = R.vsebinaTar(R.beriTar(await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS }, ['--transform', 's,^,./,'])))
  assert.equal(d2.ime, 'reel.mp4')
  const pax = R.vsebinaTar(R.beriTar(await tar({ ['a-very-long-name-'.repeat(8) + '.mp4']: VIDEO, 'caption.txt': NAPIS }, ['--format=pax'])))
  assert.ok(pax.ime.endsWith('.mp4') && pax.ime.length > 100)
})

test('tar: zavrne dodatne datoteke, dva videa, manjkajoč napis, mape, pokvarjen tar', async () => {
  const preveri = async (dat, vzorec, mozn) => {
    const b = await tar(dat, mozn)
    assert.throws(() => R.vsebinaTar(R.beriTar(b)), vzorec)
  }
  await preveri({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS, 'cover.jpg': 'x' }, /unexpected files cover\.jpg/)
  await preveri({ 'a.mp4': VIDEO, 'b.mp4': VIDEO, 'caption.txt': NAPIS }, /exactly one \.mp4, found 2/)
  await preveri({ 'reel.mp4': VIDEO }, /caption\.txt is missing/)
  await preveri({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS }, /top level|folders/, ['--transform', 's,^,sub/,'])
  const b = await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS }); b[150] ^= 1
  assert.throws(() => R.beriTar(b), /checksum|header/)
  const kratek = (await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS })).subarray(0, 1200)
  assert.throws(() => R.beriTar(kratek), /truncated/)
})

test('napis: UTF-8, prazen, predolg, ključniki, omembe, kontrolni znaki', () => {
  assert.equal(R.preveriNapis(Buffer.from(`﻿  ${NAPIS}\r\n`)), NAPIS)
  assert.throws(() => R.preveriNapis(Buffer.from([0xff, 0xfe, 0x41])), /not UTF-8/)
  assert.throws(() => R.preveriNapis(Buffer.from('  \n ')), /empty/)
  assert.throws(() => R.preveriNapis(Buffer.from('x'.repeat(2201))), /2201 characters/)
  assert.ok(R.preveriNapis(Buffer.from('😅'.repeat(2200))))
  assert.throws(() => R.preveriNapis(Buffer.from(Array.from({ length: 31 }, (_, i) => `#t${i}`).join(' '))), /31 hashtags/)
  assert.throws(() => R.preveriNapis(Buffer.from(Array.from({ length: 21 }, (_, i) => `@u${i}`).join(' '))), /21 @mentions/)
  assert.throws(() => R.preveriNapis(Buffer.from('a\u0007b')), /control/)
  assert.deepEqual(R.kljucnikiNapisa('Score #1 at slff.eu/#x &#39; #sundayleague'), ['#1', '#sundayleague'])
})

test('video: Pivkov 720x1280 H.264/AAC 12 s gre, ostalo pade', async () => {
  assert.deepEqual(R.preveriVideo(VIDEO, await sonda()()), { sirina: 720, visina: 1280, trajanje: 12, slicic: 30, zvok: true, mb: 0 })
  assert.equal(R.preveriVideo(VIDEO, await sonda({ brezZvoka: true })()).zvok, false)
  const pade = async (sp, vzorec, v = VIDEO) => assert.throws(() => R.preveriVideo(v, sp), vzorec)
  await pade(await sonda({ video: { codec_name: 'hevc' } })(), /needs H\.264/)
  await pade(await sonda({ audio: { codec_name: 'opus' } })(), /needs AAC/)
  await pade(await sonda({ video: { pix_fmt: 'yuv444p' } })(), /needs yuv420p/)
  assert.equal(R.preveriVideo(VIDEO, await sonda({ video: { pix_fmt: 'yuvj420p' } })()).sirina, 720)
  await pade(await sonda({ video: { width: 1080, height: 1350 } })(), /not vertical 9:16/)
  await pade(await sonda({ video: { width: 360, height: 640 } })(), /at least 540x960/)
  await pade(await sonda({ format: { duration: '2.5' } })(), /needs 3–90 s/)
  await pade(await sonda({ format: { duration: '91' } })(), /needs 3–90 s/)
  await pade(await sonda({ video: { avg_frame_rate: '120/1' } })(), /fps/)
  await pade(await sonda()(), /not an MP4/, Buffer.from('not a video at all'))
  await pade(await sonda()(), /max 100 MB/, Buffer.alloc(R.NAJVEC_VIDEO + 1))
  // Telefon: 1280x720 z zasukom 90° je pokončen.
  assert.equal(R.preveriVideo(VIDEO, await sonda({ video: { width: 1280, height: 720, side_data_list: [{ rotation: -90 }] } })()).sirina, 720)
})

test('dry: vse preverbe, nič objavljeno, nič zapisano, žeton ne v izpisu', async () => {
  const m = await mapa(); const { f, klici } = meta(); const izpis = []
  const r = await R.rocniReel({ tar: await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS }), platforme: ['ig', 'fb'], suho: true, env: ENV, mapa: m, zasebno: zas(m), db: db(), f, sonda: sonda(), zdaj: ZDAJ, log: (s) => izpis.push(s) })
  assert.equal(r.suho, true); assert.equal(r.racuni.ig, 'slff.eu')
  assert.ok(klici.every((k) => k.metoda === 'GET' && k.pot !== '/objave-mediji'), 'dry ne kliče POST in ne HEAD')
  assert.deepEqual(await readdir(zas(m)), [])
  assert.deepEqual(await readdir(m), ['zasebno'], 'dry ne piše v javno mapo')
  const besedilo = izpis.join('\n')
  assert.match(besedilo, /720x1280, 12 s, 30 fps, AAC/); assert.match(besedilo, /3 hashtags/); assert.match(besedilo, /@slff\.eu/); assert.match(besedilo, /nothing published/)
  assert.ok(!besedilo.includes('skrivni-zeton'))
})

test('računi: nepovezan Instagram, napačno ime, polna kvota, brez ključev', async () => {
  const t = await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS })
  const teci = (o, env = ENV) => R.rocniReel({ tar: t, platforme: ['ig', 'fb'], suho: true, env, mapa: o.m, zasebno: zas(o.m), db: db(), f: o.f, sonda: sonda(), zdaj: ZDAJ, log: tiho })
  const m = await mapa()
  await assert.rejects(teci({ m, f: meta({ povezanIg: '999' }).f }), /not linked/)
  await assert.rejects(teci({ m, f: meta().f }, { ...ENV, OBJAVE_IG_RACUN: 'drug' }), /expected @drug/)
  await assert.rejects(teci({ m, f: meta({ kvota: 50 }).f }), /quota used up/)
  await assert.rejects(teci({ m, f: meta().f }, { ...ENV, META_PAGE_TOKEN: '' }), /Meta keys/)
})

test('osnutek delavca v ±60 min in brez baze ustavi', async () => {
  const t = await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS })
  const m = await mapa()
  // Nazaj 2 h: delavec zamujen osnutek objavi še do OBJAVA_ZAMUDA pozneje.
  const meje = {}
  await R.blizuDelavca(db([], meje), ZDAJ)
  assert.equal(+ZDAJ - Date.parse(meje.od), 2 * 3600e3)
  assert.equal(Date.parse(meje.do) - +ZDAJ, 3600e3)
  await assert.rejects(R.rocniReel({ tar: t, platforme: ['ig'], suho: true, env: ENV, mapa: m, zasebno: zas(m), db: db([{ id: 19, vrsta: 'pravila', objava_ob: '2026-10-30T13:40:00Z' }]), f: meta().f, sonda: sonda(), zdaj: ZDAJ, log: tiho }), /worker post #19 \(pravila\) is due at 14:40/)
  await assert.rejects(R.rocniReel({ tar: t, platforme: ['ig'], suho: true, env: ENV, mapa: m, zasebno: zas(m), db: null, f: meta().f, sonda: sonda(), zdaj: ZDAJ, log: tiho }), /no database/)
})

test('objava both: IG nato FB, javni URL, zapis z overjenima povezavama, Discord, meja na dan', async () => {
  const m = await mapa(); const { f, klici } = meta(); const izpis = []
  const t = await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS })
  const teci = () => R.rocniReel({ tar: t, platforme: ['ig', 'fb'], suho: false, env: ENV, mapa: m, zasebno: zas(m), db: db(), f, sonda: sonda(), zdaj: ZDAJ, cakajMs: async () => {}, log: (s) => izpis.push(s) })
  const r = await teci()
  assert.equal(r.ig, 'https://www.instagram.com/reel/ABC/'); assert.equal(r.fb, 'https://www.facebook.com/reel/V1/'); assert.equal(r.ig_preverjeno, true)
  const ig = klici.find((k) => k.pot.endsWith('/222/media') && k.metoda === 'POST')
  assert.equal(ig.telo.media_type, 'REELS'); assert.equal(ig.telo.caption, NAPIS)
  assert.match(ig.telo.video_url, /^https:\/\/slff\.eu\/objave-mediji\/rocni\/20261030-[0-9a-f]{16}\/reel\.mp4$/)
  assert.ok(klici.findIndex((k) => k.metoda === 'HEAD') < klici.indexOf(ig), 'javni URL preverjen pred Meto')
  assert.equal(klici.find((k) => k.telo?.upload_phase === 'finish').telo.description, NAPIS)
  const zapisi = R.zadnjaStanja(await readFile(join(zas(m), 'objave.jsonl'), 'utf8'))
  assert.equal(zapisi.length, 1)
  assert.equal(zapisi[0].stanje, 'objavljeno'); assert.equal(zapisi[0].ig_povezava, r.ig); assert.equal(zapisi[0].fb_povezava, r.fb)
  assert.equal(zapisi[0].ig_racun, 'slff.eu'); assert.equal(zapisi[0].video_sha256.length, 64)
  assert.ok(!(await readFile(join(zas(m), 'objave.jsonl'), 'utf8')).includes('skrivni-zeton'))
  assert.ok(klici.some((k) => k.url.startsWith('https://discord.test')))
  assert.match(izpis.join('\n'), /ig: https:\/\/www\.instagram\.com\/reel\/ABC\/\nfb: https:\/\/www\.facebook\.com\/reel\/V1\//)
  assert.ok(!(await readdir(zas(m))).includes('.zaklep'))
  // Javno je le video; zapisi in zaklep niso pod /objave-mediji/.
  const javno = await readdir(join(m, 'rocni'), { recursive: true })
  assert.ok(javno.every((x) => /^\d{8}-[0-9a-f]{16}(\/reel\.mp4)?$/.test(x)), javno.join())
  await teci()
  await assert.rejects(teci(), /daily limit: 2 of 2/)
  // Naslednji ljubljanski dan znova sme.
  await R.rocniReel({ tar: t, platforme: ['fb'], suho: true, env: ENV, mapa: m, zasebno: zas(m), db: db(), f, sonda: sonda(), zdaj: new Date('2026-10-30T23:30:00Z'), log: tiho })
  assert.match(R.izpisZapisov(R.zadnjaStanja(await readFile(join(zas(m), 'objave.jsonl'), 'utf8'))), /objavljeno {2}ig\+fb[\s\S]*ig: https:\/\/www\.instagram\.com\/reel\/ABC\//)
})

test('napaka Instagrama: zapis napaka, FB se ne kliče, šteje v mejo, brez ponovitve', async () => {
  const m = await mapa(); const { f, klici } = meta({ igNapaka: 'Video format not supported' })
  const t = await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS })
  await assert.rejects(R.rocniReel({ tar: t, platforme: ['ig', 'fb'], suho: false, env: { ...ENV, ROCNI_REEL_NA_DAN: '1' }, mapa: m, zasebno: zas(m), db: db(), f, sonda: sonda(), zdaj: ZDAJ, cakajMs: async () => {}, log: tiho }), /Video format not supported/)
  assert.ok(!klici.some((k) => k.pot.includes('video_reels')))
  const [z] = R.zadnjaStanja(await readFile(join(zas(m), 'objave.jsonl'), 'utf8'))
  assert.equal(z.stanje, 'napaka'); assert.match(z.napaka, /Video format/)
  await assert.rejects(R.rocniReel({ tar: t, platforme: ['fb'], suho: true, env: { ...ENV, ROCNI_REEL_NA_DAN: '1' }, mapa: m, zasebno: zas(m), db: db(), f, sonda: sonda(), zdaj: ZDAJ, log: tiho }), /daily limit: 1 of 1/)
})

test('javni URL ne vrne videa: nič k Meti', async () => {
  const m = await mapa(); const { f, klici } = meta({ velikost: 5 })
  await assert.rejects(R.rocniReel({ tar: await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS }), platforme: ['ig'], suho: false, env: ENV, mapa: m, zasebno: zas(m), db: db(), f, sonda: sonda(), zdaj: ZDAJ, log: tiho }), /public video URL/)
  assert.ok(!klici.some((k) => k.metoda === 'POST'))
  assert.deepEqual(await readdir(join(m, 'rocni')).catch(() => []), [])
})

test('meja 0 ustavi, neveljavna meja pade', async () => {
  const t = await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS })
  const m = await mapa()
  const teci = (meja) => R.rocniReel({ tar: t, platforme: ['ig'], suho: true, env: { ...ENV, ROCNI_REEL_NA_DAN: meja }, mapa: m, zasebno: zas(m), db: db(), f: meta().f, sonda: sonda(), zdaj: ZDAJ, log: tiho })
  await assert.rejects(teci('0'), /daily limit: 0 of 0/)
  await assert.rejects(teci('-1'), /whole number/)
  await assert.rejects(teci('dva'), /whole number/)
  assert.equal((await teci('')).suho, true)
})

test('hkratna objava: zaklep zavrne drugo', async () => {
  const m = await mapa(); await mkdir(zas(m), { recursive: true })
  await writeFile(join(zas(m), '.zaklep'), String(Date.now()))
  await assert.rejects(R.rocniReel({ tar: await tar({ 'reel.mp4': VIDEO, 'caption.txt': NAPIS }), platforme: ['ig'], suho: false, env: ENV, mapa: m, zasebno: zas(m), db: db(), f: meta().f, sonda: sonda(), zdaj: ZDAJ, log: tiho }), /being published right now/)
})
