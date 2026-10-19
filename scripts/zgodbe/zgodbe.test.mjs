// node --test scripts/zgodbe/zgodbe.test.mjs — brez omrežja: Discord je podpisan lokalno, Meta je lažna.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtemp, writeFile, chmod, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { velikostJpeg, preveriOkvirje, verzija, kartica, predlozi, obdelaj, Shramba, zakrij, PODPIS_STAROST_S } from './zgodbe.mjs'

const LUKA = '111111111111111111'
const LOVRO = '222222222222222222'
const KAFANA = '333333333333333333'

/** Najmanjši JPEG z glavo SOF0 (dovolj za preverbo velikosti); `seme` da različno vsebino. */
function jpeg(sirina = 1080, visina = 1920, seme = 0) {
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, visina >> 8, visina & 255, sirina >> 8, sirina & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])
  return Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xfe, 0x00, 0x04, seme, 0]), sof, Buffer.from([0xff, 0xd9])])
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519')

function zahtevek(telo, { cas = Math.floor(Date.now() / 1000), kljuc = privateKey } = {}) {
  const t = JSON.stringify(telo)
  return { telo: t, glave: { 'x-signature-ed25519': sign(null, Buffer.from(`${cas}${t}`), kljuc).toString('hex'), 'x-signature-timestamp': String(cas) } }
}

let n = 0
const klik = (z, { uporabnik = LUKA, dejanje = 'odobri', ver = z.verzija, kanal = KAFANA, id = `int${++n}` } = {}) => ({
  id, type: 3, channel_id: kanal, member: { user: { id: uporabnik } },
  data: { custom_id: `zgodba:${dejanje}:${z.id}:${ver}`, component_type: 2 },
  message: { id: 'msg1', embeds: [1, 2, 3].map((i) => ({ image: { url: `https://cdn.discordapp.com/${i}.jpg` } })) },
})

/** Lažni fetch: zapiše klice, odgovarja kot Meta / Discord. */
function lazniFetch({ padeNa } = {}) {
  const klici = []
  const f = async (url, o = {}) => {
    const telo = o.body instanceof URLSearchParams ? Object.fromEntries(o.body) : null
    klici.push({ url: String(url), metoda: o.method ?? 'GET', telo })
    const u = String(url)
    if (padeNa && u.includes(padeNa)) return new Response(JSON.stringify({ error: { message: `boom access_token=SKRIVNO` } }), { status: 400 })
    if (u.includes('discord.com')) return new Response('{}', { status: 200 })
    if (u.includes('fields=status_code')) return Response.json({ status_code: 'FINISHED' })
    if (u.endsWith('/media')) return Response.json({ id: `c${klici.length}` })
    if (u.endsWith('/media_publish')) return Response.json({ id: `m${klici.length}` })
    if (u.endsWith('/photos')) return Response.json({ id: `p${klici.length}` })
    if (u.endsWith('/photo_stories')) return Response.json({ success: true, post_id: `s${klici.length}` })
    return new Response('?', { status: 404 })
  }
  return { f, klici }
}

async function okolje(nacin = 'dry_run') {
  const mapa = await mkdtemp(join(tmpdir(), 'zgodbe-'))
  const poti = []
  for (const i of [1, 2, 3]) { const p = join(mapa, `f${i}.jpg`); await writeFile(p, jpeg(1080, 1920, i)); poti.push(p) }
  const env = {
    ZGODBE_MEDIJI: join(mapa, 'mediji'), ZGODBE_STANJE: join(mapa, 'stanje.json'), ZGODBE_NACIN: nacin,
    ZGODBE_LUKA_ID: LUKA, DISCORD_KAFANA_ID: KAFANA, DISCORD_ZGODBE_BOT_TOKEN: 'BOTZETON',
    ZGODBE_MEDIJI_URL: 'https://slff.eu/objave-mediji/zgodbe', META_PAGE_TOKEN: 'SKRIVNO', META_PAGE_ID: '900', META_IG_USER_ID: '800',
  }
  const shramba = new Shramba(env.ZGODBE_STANJE)
  const { z, sporocilo } = await predlozi({ poti, avtor: 'growth-lead', env, shramba, zdaj: new Date('2026-10-20T06:00:00Z') })
  return { mapa, poti, env, shramba, z, sporocilo }
}

async function poslji(o, telo, moznosti = {}) {
  const meta = moznosti.meta ?? lazniFetch()
  const { telo: t, glave } = zahtevek(telo, moznosti)
  const r = await obdelaj({ telo: t, glave, env: o.env, shramba: o.shramba, kljuc: publicKey, f: meta.f, cakajMs: async () => {} })
  if (r.nadaljuj) await r.nadaljuj()
  return { r, meta }
}

const metaKlici = (meta) => meta.klici.filter((k) => k.url.includes('graph.facebook.com'))

test('JPEG: velikost iz glave SOF', () => {
  assert.deepEqual(velikostJpeg(jpeg(1080, 1920)), { sirina: 1080, visina: 1920 })
  assert.equal(velikostJpeg(Buffer.from('\x89PNG\r\n')), null)
})

test('natanko tri sličice, JPEG 1080×1920, različne', () => {
  const ok = [1, 2, 3].map((i) => ({ ime: `${i}.jpg`, bajti: jpeg(1080, 1920, i) }))
  assert.equal(preveriOkvirje(ok).length, 3)
  assert.throws(() => preveriOkvirje(ok.slice(0, 2)), /natanko 3/)
  assert.throws(() => preveriOkvirje([...ok, { ime: '4.jpg', bajti: jpeg(1080, 1920, 4) }]), /natanko 3/)
  assert.throws(() => preveriOkvirje([ok[0], ok[1], { ime: 'x.png', bajti: Buffer.from('\x89PNG') }]), /ni JPEG/)
  assert.throws(() => preveriOkvirje([ok[0], ok[1], { ime: 'k.jpg', bajti: jpeg(1080, 1350, 9) }]), /1080×1350/)
  assert.throws(() => preveriOkvirje([ok[0], ok[1], ok[1]]), /enaki/)
})

test('različica se spremeni z vrstnim redom in platformami', () => {
  const o = [{ sha256: 'a' }, { sha256: 'b' }, { sha256: 'c' }]
  assert.match(verzija(o, ['ig', 'fb']), /^v_[0-9a-f]{16}$/)
  assert.equal(verzija(o, ['ig', 'fb']), verzija(o, ['fb', 'ig']))
  assert.notEqual(verzija(o, ['ig', 'fb']), verzija([o[1], o[0], o[2]], ['ig', 'fb']))
  assert.notEqual(verzija(o, ['ig', 'fb']), verzija(o, ['ig']))
})

test('kartica: tri slike v eni galeriji, platforme, različica, Approve in Reject, brez Schedule', async () => {
  const { z, sporocilo } = await okolje()
  assert.equal(sporocilo.embeds.length, 3)
  assert.equal(new Set(sporocilo.embeds.map((e) => e.url)).size, 1)
  assert.deepEqual(sporocilo.embeds.map((e) => e.image.url), ['attachment://1.jpg', 'attachment://2.jpg', 'attachment://3.jpg'])
  const e = sporocilo.embeds[0]
  assert.match(e.description, /Pending approval/)
  assert.equal(e.fields.find((x) => x.name === 'Platforms').value, 'Instagram Story + Facebook Story')
  assert.equal(e.fields.find((x) => x.name === 'Version').value, `\`${z.verzija}\``)
  assert.match(e.footer.text, /DRY RUN/)
  const gumbi = sporocilo.components[0].components
  assert.deepEqual(gumbi.map((g) => g.label), ['Approve (dry run)', 'Reject'])
  assert.ok(gumbi.every((g) => g.custom_id.endsWith(`:${z.id}:${z.verzija}`) && !g.disabled))
  assert.ok(!JSON.stringify(sporocilo).match(/schedule/i))
  assert.deepEqual(sporocilo.allowed_mentions, { parse: [] })
})

test('predlog: sličice zaklenjene samo za branje; ista različica ne dobi druge kartice', async () => {
  const o = await okolje()
  const pot = join(o.env.ZGODBE_MEDIJI, o.z.verzija, '1.jpg')
  await assert.rejects(writeFile(pot, 'x'), /EACCES|EPERM/)
  await assert.rejects(predlozi({ poti: o.poti, avtor: 'x', env: o.env, shramba: o.shramba }), /že ima kartico/)
})

test('podpis: brez, ponarejen ali star zahtevek je 401', async () => {
  const o = await okolje()
  const telo = klik(o.z)
  const ponarejen = generateKeyPairSync('ed25519').privateKey
  for (const m of [{ kljuc: ponarejen }, { cas: Math.floor(Date.now() / 1000) - PODPIS_STAROST_S - 5 }]) {
    const { r, meta } = await poslji(o, telo, m)
    assert.equal(r.status, 401)
    assert.equal(meta.klici.length, 0)
  }
  const r = await obdelaj({ telo: JSON.stringify(telo), glave: {}, env: o.env, shramba: o.shramba, kljuc: publicKey })
  assert.equal(r.status, 401)
  assert.equal((await o.shramba.beri(o.z.id)).stanje, 'caka')
})

test('PING dobi PONG', async () => {
  const o = await okolje()
  const { r } = await poslji(o, { id: 'p', type: 1 })
  assert.deepEqual(r.json, { type: 1 })
})

test('kdorkoli razen Luke: zasebno sporočilo, nič se ne spremeni', async () => {
  const o = await okolje()
  for (const d of ['odobri', 'zavrni']) {
    const { r, meta } = await poslji(o, klik(o.z, { uporabnik: LOVRO, dejanje: d }))
    assert.equal(r.json.type, 4)
    assert.equal(r.json.data.flags, 64)
    assert.match(r.json.data.content, /Only Luka/)
    assert.equal(meta.klici.length, 0)
  }
  assert.equal((await o.shramba.beri(o.z.id)).stanje, 'caka')
})

test('brez nastavljenega ZGODBE_LUKA_ID nihče ne odobri', async () => {
  const o = await okolje()
  delete o.env.ZGODBE_LUKA_ID
  const { r } = await poslji(o, klik(o.z))
  assert.match(r.json.data.content, /Only Luka/)
})

test('drug kanal: nič', async () => {
  const o = await okolje()
  const { r } = await poslji(o, klik(o.z, { kanal: '444' }))
  assert.match(r.json.data.content, /#kafana/)
  assert.equal((await o.shramba.beri(o.z.id)).stanje, 'caka')
})

test('Luka odobri v dry_run: kartica posodobljena, Mete ni klical nihče', async () => {
  const o = await okolje()
  const { r, meta } = await poslji(o, klik(o.z))
  assert.equal(r.json.type, 7)
  assert.match(r.json.data.embeds[0].description, /publishing/)
  assert.ok(r.json.data.components[0].components.every((g) => g.disabled))
  assert.deepEqual(r.json.data.embeds.map((e) => e.image.url), [1, 2, 3].map((i) => `https://cdn.discordapp.com/${i}.jpg`))
  assert.equal(metaKlici(meta).length, 0)
  const z = await o.shramba.beri(o.z.id)
  assert.equal(z.stanje, 'suho')
  assert.equal(z.odlocil, LUKA)
  assert.deepEqual(z.objava, { ig: { stanje: 'suho' }, fb: { stanje: 'suho' } })
  // Končna kartica gre z botom na isto sporočilo, s stanjem po platformah.
  const urejanje = meta.klici.find((k) => k.url.includes('/channels/'))
  assert.equal(urejanje.metoda, 'PATCH')
  assert.match(urejanje.url, new RegExp(`/channels/${KAFANA}/messages/msg1$`))
})

test('dvojni klik in ponovljen zahtevek: objava le enkrat', async () => {
  const o = await okolje('live')
  const meta = lazniFetch()
  const prvi = klik(o.z, { id: 'enak' })
  const [a, b] = await Promise.all([poslji(o, prvi, { meta }), poslji(o, klik(o.z), { meta })])
  assert.equal([a, b].filter((x) => x.r.json.type === 7).length, 1)
  assert.match([a, b].find((x) => x.r.json.type === 4).r.json.data.content, /Already decided/)
  const { r } = await poslji(o, prvi, { meta })
  assert.match(r.json.data.content, /already handled/)
  assert.equal(metaKlici(meta).filter((k) => k.url.endsWith('/media_publish')).length, 3)
  assert.equal(metaKlici(meta).filter((k) => k.url.endsWith('/photo_stories')).length, 3)
})

test('gumb stare različice ne naredi ničesar', async () => {
  const o = await okolje()
  const { r } = await poslji(o, klik(o.z, { ver: 'v_0000000000000000' }))
  assert.match(r.json.data.content, /version/)
  assert.equal((await o.shramba.beri(o.z.id)).stanje, 'caka')
})

test('sličica spremenjena po kartici: zaklenjeno, nič objavljeno', async () => {
  const o = await okolje('live')
  const pot = join(o.env.ZGODBE_MEDIJI, o.z.verzija, '2.jpg')
  await chmod(pot, 0o644)
  await writeFile(pot, jpeg(1080, 1920, 77))
  const { r, meta } = await poslji(o, klik(o.z))
  assert.match(r.json.data.embeds[0].description, /Blocked/)
  assert.equal(metaKlici(meta).length, 0)
  assert.equal((await o.shramba.beri(o.z.id)).stanje, 'zaklenjeno')
})

test('Reject: zavrnjeno, brez objave, gumbi onemogočeni', async () => {
  const o = await okolje('live')
  const { r, meta } = await poslji(o, klik(o.z, { dejanje: 'zavrni' }))
  assert.match(r.json.data.embeds[0].description, /Rejected/)
  assert.ok(r.json.data.components[0].components.every((g) => g.disabled))
  assert.equal(meta.klici.length, 0)
  const { r: r2 } = await poslji(o, klik(o.z))
  assert.match(r2.json.data.content, /Already decided/)
})

test('live: IG STORIES in FB photo_stories, tri sličice po vrsti', async () => {
  const o = await okolje('live')
  const { meta } = await poslji(o, klik(o.z))
  const ig = metaKlici(meta).filter((k) => k.url.endsWith('/800/media'))
  assert.deepEqual(ig.map((k) => k.telo.media_type), ['STORIES', 'STORIES', 'STORIES'])
  assert.deepEqual(ig.map((k) => k.telo.image_url), [1, 2, 3].map((i) => `https://slff.eu/objave-mediji/zgodbe/${o.z.verzija}/${i}.jpg`))
  const fb = metaKlici(meta).filter((k) => k.url.endsWith('/900/photos'))
  assert.ok(fb.every((k) => k.telo.published === 'false'))
  assert.equal(metaKlici(meta).filter((k) => k.url.endsWith('/900/photo_stories')).length, 3)
  const z = await o.shramba.beri(o.z.id)
  assert.equal(z.stanje, 'objavljeno')
  assert.equal(z.objava.ig.stanje, 'ok')
  assert.equal(z.objava.fb.stanje, 'ok')
})

test('live: napaka pred objavo je "napaka", med objavo "neznano"; brez ponovitve, brez žetona', async () => {
  const o = await okolje('live')
  const { meta } = await poslji(o, klik(o.z), { meta: lazniFetch({ padeNa: '/photo_stories' }) })
  const z = await o.shramba.beri(o.z.id)
  assert.equal(z.stanje, 'delno')
  assert.equal(z.objava.ig.stanje, 'ok')
  assert.equal(z.objava.fb.stanje, 'neznano')
  assert.equal(metaKlici(meta).filter((k) => k.url.endsWith('/photo_stories')).length, 1)
  const urejanje = meta.klici.find((k) => k.url.includes('/channels/'))
  assert.ok(urejanje)
  const stanje = await readFile(o.env.ZGODBE_STANJE, 'utf8')
  assert.ok(!stanje.includes('SKRIVNO'))

  const o2 = await okolje('live')
  await poslji(o2, klik(o2.z), { meta: lazniFetch({ padeNa: '/800/media' }) })
  const z2 = await o2.shramba.beri(o2.z.id)
  assert.equal(z2.objava.ig.stanje, 'napaka')
  assert.match(z2.objava.ig.opomba, /^0\/3/)
})

test('zakrij odstrani žetone', () => {
  assert.equal(zakrij('x?access_token=ABC&y=1 Bot abc.def'), 'x?access_token=***&y=1 Bot ***')
})

test('končna kartica pokaže stanje po platformah', () => {
  const k = kartica({
    id: 'z1', dan: '2026-10-20', verzija: 'v_1', platforme: ['ig', 'fb'], avtor: 'growth-lead', nacin: 'live', stanje: 'delno',
    okvirji: [{ sha256: 'a'.repeat(64) }, { sha256: 'b'.repeat(64) }, { sha256: 'c'.repeat(64) }],
    odlocil: LUKA, odloceno_ob: '2026-10-20T08:00:00Z',
    objava: { ig: { stanje: 'ok', povezava: 'https://www.instagram.com/stories/slff.eu/' }, fb: { stanje: 'neznano', opomba: '1/3 published' } },
  })
  const rez = k.embeds[0].fields.find((f) => f.name === 'Result').value
  assert.match(rez, /Instagram Story: ✅ published/)
  assert.match(rez, /Facebook Story: ⚠️ unknown.*1\/3/)
})
