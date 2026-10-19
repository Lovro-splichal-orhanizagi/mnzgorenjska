#!/usr/bin/env node
// Dnevne zgodbe (IG + FB Story) s kartico za odobritev na Discordu (SLF-38).
//
// Vsak dan natanko tri zaporedne sličice (1 kavelj, 2 vsebina, 3 poziv), 1080 × 1920 JPEG.
// `predlozi` jih zaklene (sha256, mapa samo za branje) in v #kafana pošlje eno kartico:
// tri slike, platforme, nespremenljiva različica, "Pending approval", gumba Approve / Reject.
// Gumba deluje le Lukov Discord ID; šele njegov klik sproži objavo na Meti.
// Agent ne objavlja: ukazna vrstica nima ukaza za objavo, privzeti način je dry_run.
//
// Ločeno od slff-objave (objave.mjs, objave v vir z vetom): svoje stanje, svoj ukaz.
//
// Okolje (strežnik, /opt/slff-objave/.env):
//   DISCORD_ZGODBE_BOT_TOKEN, DISCORD_ZGODBE_PUBLIC_KEY (hex), DISCORD_KAFANA_ID, ZGODBE_LUKA_ID,
//   ZGODBE_NACIN=dry_run|live (privzeto dry_run), ZGODBE_STANJE (JSON), ZGODBE_MEDIJI (mapa),
//   ZGODBE_MEDIJI_URL (javni naslov mape), za live še META_PAGE_TOKEN, META_PAGE_ID, META_IG_USER_ID.
//
// Uporaba:
//   node scripts/zgodbe/zgodbe.mjs predlozi 1.jpg 2.jpg 3.jpg [--platforme ig,fb] [--avtor growth-lead] [--suho --izhod mapa]
//   node scripts/zgodbe/zgodbe.mjs streznik [--vrata 8787]     (POST /discord/zgodbe)

import { createHash, createPublicKey, verify as preveriPodpis, randomBytes } from 'node:crypto'
import { readFile, writeFile, rename, mkdir, chmod, open, stat, unlink } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, basename } from 'node:path'

export const OKVIRJEV = 3
export const SIRINA = 1080
export const VISINA = 1920
export const NAJVEC_BAJTOV = 8e6 // Instagram Story: JPEG do 8 MB
export const PODPIS_STAROST_S = 300 // starejši podpisan zahtevek je ponovitev
export const PLATFORME = { ig: 'Instagram Story', fb: 'Facebook Story' }
const VLOGE = ['hook', 'context', 'CTA']

// Discord: vrste interakcij in odzivov
const PING = 1
const KOMPONENTA = 3
const ODZIV_PONG = 1
const ODZIV_SPOROCILO = 4
const ODZIV_POSODOBI = 7
const ZASEBNO = 64 // ephemeral

const BARVE = { caka: 0xf1c40f, objavljanje: 0x3498db, objavljeno: 0x2ecc71, suho: 0x95a5a6, delno: 0xe67e22, zavrnjeno: 0xe74c3c, zaklenjeno: 0xe74c3c }

const sha256 = (b) => createHash('sha256').update(b).digest('hex')
const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(new Date().toISOString(), '[zgodbe]', ...a)

/** Žeton nikoli v Discord ali dnevnik. */
export const zakrij = (s) => String(s).replace(/(access_token=)[^&\s"]+/g, '$1***').replace(/(Bot |Bearer )[\w.-]+/g, '$1***')

// --- sličice -----------------------------------------------------------------------

/** Širina in višina JPEG (prvi SOF), sicer null. */
export function velikostJpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null
    const m = b[i + 1]
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
    const dolzina = b.readUInt16BE(i + 2)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { visina: b.readUInt16BE(i + 5), sirina: b.readUInt16BE(i + 7) }
    }
    i += 2 + dolzina
  }
  return null
}

/** Preveri tri sličice; vrne [{ ime, sha256, bajti }] ali vrže napako s seznamom težav. */
export function preveriOkvirje(datoteke) {
  const tezave = []
  if (datoteke.length !== OKVIRJEV) tezave.push(`potrebne so natanko ${OKVIRJEV} sličice, ne ${datoteke.length}`)
  const okvirji = datoteke.map(({ ime, bajti }, i) => {
    const v = velikostJpeg(bajti)
    if (!v) tezave.push(`${i + 1}. ${ime}: ni JPEG (Instagram Story sprejme le JPEG)`)
    else if (v.sirina !== SIRINA || v.visina !== VISINA) tezave.push(`${i + 1}. ${ime}: ${v.sirina}×${v.visina}, mora biti ${SIRINA}×${VISINA}`)
    if (bajti.length > NAJVEC_BAJTOV) tezave.push(`${i + 1}. ${ime}: ${(bajti.length / 1e6).toFixed(1)} MB, največ 8 MB`)
    return { ime, sha256: sha256(bajti), bajti }
  })
  if (new Set(okvirji.map((o) => o.sha256)).size !== okvirji.length) tezave.push('dve sličici sta enaki')
  if (tezave.length) throw new Error(tezave.join('\n'))
  return okvirji
}

/** Različica: sha256 vrstnega reda sličic in platform; vsaka sprememba da novo kartico. */
export function verzija(okvirji, platforme) {
  return `v_${sha256(JSON.stringify({ okvirji: okvirji.map((o) => o.sha256), platforme: [...platforme].sort() })).slice(0, 16)}`
}

// --- stanje ------------------------------------------------------------------------

const ZAKLEP_STAR_MS = 30e3 // zaklep, starejši od tega, je ostal po sesutju

/**
 * JSON v eni datoteki; zapis prek začasne datoteke (atomično). Spremembe zaporedno v procesu in
 * pod zaklepom `<pot>.lock` (O_EXCL) med procesi, ker CLI `predlozi` piše med tekom strežnika.
 */
export class Shramba {
  constructor(pot) { this.pot = pot; this.vrsta = Promise.resolve() }
  async #zakleni() {
    const zaklep = `${this.pot}.lock`
    for (let i = 0; ; i++) {
      try { await (await open(zaklep, 'wx', 0o600)).close(); return () => unlink(zaklep).catch(() => {}) } catch (e) { if (e.code !== 'EEXIST') throw e }
      const st = await stat(zaklep).catch(() => null)
      if (st && Date.now() - st.mtimeMs > ZAKLEP_STAR_MS) { await unlink(zaklep).catch(() => {}); continue }
      if (i > 500) throw new Error(`stanje zaklenjeno: ${zaklep}`)
      await cakaj(20)
    }
  }
  async #beri() {
    try { return JSON.parse(await readFile(this.pot, 'utf8')) } catch (e) { if (e.code === 'ENOENT') return { zgodbe: {}, interakcije: [] }; throw e }
  }
  async #pisi(s) {
    const zacasna = `${this.pot}.${randomBytes(4).toString('hex')}`
    await writeFile(zacasna, JSON.stringify(s, null, 2), { mode: 0o600 })
    await rename(zacasna, this.pot)
  }
  /** fn(stanje) spremeni stanje in vrne rezultat; zaporedno, zato je to compare-and-set. */
  spremeni(fn) {
    const p = this.vrsta.then(async () => {
      const odkleni = await this.#zakleni()
      try { const s = await this.#beri(); const r = await fn(s); await this.#pisi(s); return r } finally { await odkleni() }
    })
    this.vrsta = p.catch(() => {})
    return p
  }
  async beri(id) { return (await this.#beri()).zgodbe[id] ?? null }
}

// --- kartica -----------------------------------------------------------------------

const STATUS = {
  caka: '🟡 **Pending approval**: only Luka can approve',
  objavljanje: '🔵 **Approved, publishing…**',
  objavljeno: '🟢 **Published**',
  suho: '⚪ **Approved (dry run)**: nothing was sent to Meta',
  delno: '🟠 **Finished with problems**: see the platforms below',
  zavrnjeno: '🔴 **Rejected**',
  zaklenjeno: '🔒 **Blocked**: the frames changed after the card was posted, nothing was published',
}

const PLATFORMA_STANJE = {
  caka: '…',
  ok: '✅ published',
  suho: '⏭️ dry run, nothing sent',
  napaka: '❌ failed before publishing (not retried)',
  neznano: '⚠️ unknown, check the account before retrying',
}

const casLj = (iso) => new Date(iso).toLocaleString('sl-SI', { timeZone: 'Europe/Ljubljana', dateStyle: 'short', timeStyle: 'short' })

/** Discord sporočilo kartice. `slike` so URL-ji sličic (attachment://n.jpg ob pošiljanju). */
export function kartica(z, slike = z.okvirji.map((_, i) => `attachment://${i + 1}.jpg`)) {
  const polja = [
    { name: 'Platforms', value: z.platforme.map((p) => PLATFORME[p]).join(' + '), inline: true },
    { name: 'Version', value: `\`${z.verzija}\``, inline: true },
    { name: 'Submitted by', value: z.avtor, inline: true },
    { name: 'Frames (in order)', value: z.okvirji.map((o, i) => `${i + 1}/3 ${VLOGE[i]} · \`${o.sha256.slice(0, 10)}\``).join('\n') },
  ]
  if (z.prejsnja) {
    const neznano = Object.entries(z.prejsnja.objava ?? {}).filter(([, r]) => r.stanje === 'neznano').map(([p]) => PLATFORME[p])
    polja.push({ name: 'Earlier card for these frames', value: `${z.prejsnja.stanje}${neznano.length ? ` · ⚠️ unknown on ${neznano.join(' + ')}: check the account before approving` : ''}` })
  }
  if (z.odlocil) polja.push({ name: z.stanje === 'zavrnjeno' ? 'Rejected by' : 'Approved by', value: `<@${z.odlocil}> · ${casLj(z.odloceno_ob)}` })
  if (z.objava) {
    polja.push({
      name: 'Result',
      value: z.platforme.map((p) => {
        const r = z.objava[p] ?? { stanje: 'caka' }
        return `${PLATFORME[p]}: ${PLATFORMA_STANJE[r.stanje]}${r.povezava ? ` · ${r.povezava}` : ''}${r.opomba ? ` (${r.opomba})` : ''}`
      }).join('\n'),
    })
  }
  // Vložki z istim url so v Discordu ena galerija: tri sličice skupaj, po vrsti.
  const skupen = `https://slff.eu/#zgodba-${z.verzija}`
  const embeds = slike.map((url, i) => ({ url: skupen, image: { url } }))
  Object.assign(embeds[0], {
    title: `SLFF Story · ${z.dan} · 3 frames`,
    description: STATUS[z.stanje],
    color: BARVE[z.stanje],
    fields: polja,
    footer: { text: z.nacin === 'live' ? 'Approve publishes to Meta right away.' : 'DRY RUN: Approve does not send anything to Meta.' },
  })
  const odprto = z.stanje === 'caka'
  return {
    content: odprto ? '**New Story for review** (3 frames, in order)' : '',
    embeds,
    components: [{
      type: 1,
      components: [
        { type: 2, style: 3, label: z.nacin === 'live' ? 'Approve & publish' : 'Approve (dry run)', emoji: { name: '✅' }, custom_id: `zgodba:odobri:${z.id}:${z.verzija}`, disabled: !odprto },
        { type: 2, style: 4, label: 'Reject', emoji: { name: '❌' }, custom_id: `zgodba:zavrni:${z.id}:${z.verzija}`, disabled: !odprto },
      ],
    }],
    allowed_mentions: { parse: [] },
  }
}

// --- podpis Discorda ----------------------------------------------------------------

export function javniKljuc(hex) {
  return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(hex, 'hex').toString('base64url') }, format: 'jwk' })
}

/** Ed25519 podpis Discorda in svežina časa (ponovitev starega zahtevka ne gre skozi). */
export function podpisVelja({ kljuc, podpis, cas, telo, zdaj = Date.now() }) {
  if (!podpis || !cas || !/^[0-9a-f]{128}$/i.test(podpis) || !/^\d+$/.test(cas)) return false
  if (Math.abs(zdaj / 1000 - Number(cas)) > PODPIS_STAROST_S) return false
  try { return preveriPodpis(null, Buffer.concat([Buffer.from(cas), Buffer.from(telo)]), kljuc, Buffer.from(podpis, 'hex')) } catch { return false }
}

// --- objava ------------------------------------------------------------------------

const grafOsnova = (env) => `https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v26.0'}`

async function graf(f, pot, parametri, env, metoda = 'POST') {
  const telo = new URLSearchParams({ ...parametri, access_token: env.META_PAGE_TOKEN })
  const url = `${grafOsnova(env)}/${pot}`
  const signal = AbortSignal.timeout(Number(env.META_CAS_MS) || 60e3) // obešena Meta → napaka/neznano, ne večno "publishing…"
  const r = metoda === 'GET' ? await f(`${url}?${telo}`, { signal }) : await f(url, { method: 'POST', body: telo, signal })
  const o = await r.json().catch(() => ({}))
  if (!r.ok || o.error) throw new Error(zakrij(`Meta ${pot}: ${o.error?.message ?? r.status}`))
  return o
}

async function pripravljen(f, id, env, cakajMs, krat = 30) {
  for (let i = 0; i < krat; i++) {
    const { status_code: s } = await graf(f, id, { fields: 'status_code' }, env, 'GET')
    if (s === 'FINISHED') return
    if (s === 'ERROR' || s === 'EXPIRED') throw new Error(`Meta ${id}: ${s}`)
    await cakajMs(10e3)
  }
  throw new Error(`Meta ${id}: ni pripravljen`)
}

/**
 * Ena platforma, tri sličice po vrsti. Napaka pred prvim klicem objave → `napaka` (varno ponoviti);
 * napaka med ali po klicu objave → `neznano` (Meta je morda objavila del), nikoli samodejno ponovljeno.
 */
async function objaviPlatformo(p, urlji, env, f, cakajMs) {
  let objavljenih = 0
  let vKlicu = false
  try {
    const povezave = []
    for (const url of urlji) {
      if (p === 'ig') {
        const { id: vsebnik } = await graf(f, `${env.META_IG_USER_ID}/media`, { media_type: 'STORIES', image_url: url }, env)
        await pripravljen(f, vsebnik, env, cakajMs)
        vKlicu = true
        const { id } = await graf(f, `${env.META_IG_USER_ID}/media_publish`, { creation_id: vsebnik }, env)
        vKlicu = false
        objavljenih++
        povezave.push(id)
      } else {
        const { id: foto } = await graf(f, `${env.META_PAGE_ID}/photos`, { url, published: 'false' }, env)
        vKlicu = true
        const { post_id: id } = await graf(f, `${env.META_PAGE_ID}/photo_stories`, { photo_id: foto }, env)
        vKlicu = false
        objavljenih++
        povezave.push(id)
      }
    }
    return { stanje: 'ok', povezava: p === 'ig' ? 'https://www.instagram.com/stories/slff.eu/' : `https://www.facebook.com/${env.META_PAGE_ID}`, opomba: `3/3 · ids ${povezave.join(', ')}` }
  } catch (e) {
    const stanje = objavljenih === 0 && !vKlicu ? 'napaka' : 'neznano'
    return { stanje, opomba: `${objavljenih}/3 published · ${zakrij(e.message).slice(0, 180)}` }
  }
}

/**
 * Objavi vse platforme zgodbe. Le če sta v live strežnik (ZGODBE_NACIN) in kartica (z.nacin);
 * sicer ne pokliče ničesar (kartica iz live CLI na dry_run strežniku ne objavi).
 */
export async function objavi(z, { env, f = fetch, cakajMs = cakaj }) {
  const rezultat = {}
  const neskladje = z.nacin === 'live' && env.ZGODBE_NACIN !== 'live'
  for (const p of z.platforme) {
    if (z.nacin !== 'live' || env.ZGODBE_NACIN !== 'live') {
      rezultat[p] = neskladje ? { stanje: 'suho', opomba: 'card was made for live, server is in dry run' } : { stanje: 'suho' }
      continue
    }
    const urlji = z.okvirji.map((_, i) => `${env.ZGODBE_MEDIJI_URL.replace(/\/$/, '')}/${z.verzija}/${i + 1}.jpg`)
    rezultat[p] = await objaviPlatformo(p, urlji, env, f, cakajMs)
  }
  return rezultat
}

// --- klik ----------------------------------------------------------------------------

const zasebno = (content) => ({ status: 200, json: { type: ODZIV_SPOROCILO, data: { content, flags: ZASEBNO, allowed_mentions: { parse: [] } } } })

/** Ali so zaklenjene sličice še enake (sha256) kot ob kartici. */
async function nespremenjene(z, env) {
  for (const [i, o] of z.okvirji.entries()) {
    const b = await readFile(join(env.ZGODBE_MEDIJI, z.verzija, `${i + 1}.jpg`)).catch(() => null)
    if (!b || sha256(b) !== o.sha256) return false
  }
  return true
}

/**
 * Obdela en zahtevek na /discord/zgodbe. Vrne { status, json, nadaljuj? }; `nadaljuj` (objava in
 * posodobitev kartice) teče po odzivu, ker mora Discord dobiti odgovor v 3 s.
 */
export async function obdelaj({ telo, glave, env, shramba, kljuc, zdaj = Date.now(), f = fetch, cakajMs = cakaj }) {
  if (!podpisVelja({ kljuc, podpis: glave['x-signature-ed25519'], cas: glave['x-signature-timestamp'], telo, zdaj })) {
    return { status: 401, json: { napaka: 'neveljaven podpis' } }
  }
  const i = JSON.parse(telo)
  if (i.type === PING) return { status: 200, json: { type: ODZIV_PONG } }
  if (i.type !== KOMPONENTA) return zasebno('Not supported.')

  const [ns, dejanje, id, ver] = String(i.data?.custom_id ?? '').split(':')
  if (ns !== 'zgodba' || !['odobri', 'zavrni'].includes(dejanje)) return zasebno('Unknown button.')
  const uporabnik = i.member?.user?.id ?? i.user?.id
  if (i.channel_id !== env.DISCORD_KAFANA_ID) return zasebno('This card only works in #kafana.')
  if (!env.ZGODBE_LUKA_ID || uporabnik !== env.ZGODBE_LUKA_ID) {
    log(`klik zavrnjen: uporabnik ${uporabnik} ni Luka (${dejanje} ${id})`)
    return zasebno('Only Luka can approve or reject this Story. Nothing changed.')
  }

  // Ena sprememba stanja: ponovljen id interakcije, napačna različica, že odločeno → nič.
  const izid = await shramba.spremeni(async (s) => {
    if (s.interakcije.includes(i.id)) return { odgovor: 'This click was already handled.' }
    s.interakcije = [...s.interakcije.slice(-499), i.id]
    const z = s.zgodbe[id]
    if (!z) return { odgovor: 'Unknown Story.' }
    if (z.verzija !== ver) return { odgovor: `This button is for version \`${ver}\`, the Story is \`${z.verzija}\`. Nothing changed.` }
    if (z.stanje !== 'caka') return { odgovor: `Already decided (${z.stanje}). Nothing changed.` }
    z.odlocil = uporabnik
    z.odloceno_ob = new Date(zdaj).toISOString()
    if (dejanje === 'zavrni') { z.stanje = 'zavrnjeno'; return { z: { ...z } } }
    if (!(await nespremenjene(z, env))) { z.stanje = 'zaklenjeno'; return { z: { ...z } } }
    z.stanje = 'objavljanje'
    z.objava = Object.fromEntries(z.platforme.map((p) => [p, { stanje: 'caka' }]))
    return { z: { ...z }, objavi: true }
  })
  if (izid.odgovor) return zasebno(izid.odgovor)

  const slike = (i.message?.embeds ?? []).map((e) => e.image?.url).filter(Boolean)
  const sporocilo = (z) => kartica(z, slike.length === OKVIRJEV ? slike : undefined)
  const odziv = { status: 200, json: { type: ODZIV_POSODOBI, data: sporocilo(izid.z) } }
  if (!izid.objavi) { log(`${id} ${izid.z.stanje} (${uporabnik})`); return odziv }

  odziv.nadaljuj = async () => {
    log(`${id} ${izid.z.verzija} odobril ${uporabnik}, način ${izid.z.nacin}`)
    const rezultat = await objavi(izid.z, { env, f, cakajMs })
    const koncna = await shramba.spremeni((s) => {
      const z = s.zgodbe[id]
      z.objava = rezultat
      const stanja = Object.values(rezultat).map((r) => r.stanje)
      z.stanje = stanja.every((x) => x === 'suho') ? 'suho' : stanja.every((x) => x === 'ok') ? 'objavljeno' : 'delno'
      z.koncano_ob = new Date().toISOString()
      return { ...z }
    })
    log(`${id} ${koncna.stanje} ${JSON.stringify(rezultat)}`)
    await uredi(env, i.channel_id, i.message?.id, sporocilo(koncna), f)
  }
  return odziv
}

/** Posodobi kartico z botom (žeton interakcije velja le 15 minut, objava je lahko daljša). */
async function uredi(env, kanal, sporocilo, vsebina, f = fetch) {
  if (!kanal || !sporocilo) return
  const r = await f(`https://discord.com/api/v10/channels/${kanal}/messages/${sporocilo}`, {
    method: 'PATCH',
    headers: { authorization: `Bot ${env.DISCORD_ZGODBE_BOT_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(vsebina),
  })
  if (!r.ok) log(`Discord urejanje ${r.status}`)
}

// --- predlog -------------------------------------------------------------------------

/**
 * Zaklene tri sličice v ZGODBE_MEDIJI/<verzija>/ (samo za branje), zapiše zgodbo in vrne
 * { z, sporocilo, datoteke }. Ista različica drugič ne nastane (ena kartica na različico).
 */
export async function predlozi({ poti, platforme = ['ig', 'fb'], avtor, env, shramba, zdaj = new Date() }) {
  if (!platforme.length || platforme.some((p) => !PLATFORME[p])) throw new Error(`platforme: ${Object.keys(PLATFORME).join(',')}`)
  const okvirji = preveriOkvirje(await Promise.all(poti.map(async (p) => ({ ime: basename(p), bajti: await readFile(p) }))))
  const ver = verzija(okvirji, platforme)
  const mapa = join(env.ZGODBE_MEDIJI, ver)
  await mkdir(mapa, { recursive: true })
  for (const [i, o] of okvirji.entries()) {
    const cilj = join(mapa, `${i + 1}.jpg`)
    const obstaja = await readFile(cilj).catch(() => null)
    if (obstaja && sha256(obstaja) !== o.sha256) throw new Error(`${cilj} obstaja z drugo vsebino`)
    if (!obstaja) { await writeFile(cilj, o.bajti); await chmod(cilj, 0o444) }
  }
  const z = await shramba.spremeni((s) => {
    // Nova kartica za iste sličice le, ko prejšnja ni odprta in ni nič objavila (ponovitev je nov Lukov klik).
    const prejsnje = Object.values(s.zgodbe).filter((x) => x.verzija === ver)
    const ovira = prejsnje.find((x) => ['caka', 'objavljanje', 'objavljeno'].includes(x.stanje) || Object.values(x.objava ?? {}).some((r) => r.stanje === 'ok'))
    if (ovira) throw new Error(`različica ${ver} že ima kartico ${ovira.id} (${ovira.stanje})`)
    const prejsnja = prejsnje.at(-1)
    const z = {
      id: `z${zdaj.toISOString().slice(0, 10).replaceAll('-', '')}${randomBytes(3).toString('hex')}`,
      dan: zdaj.toLocaleDateString('sv-SE', { timeZone: 'Europe/Ljubljana' }),
      verzija: ver,
      platforme,
      avtor,
      nacin: env.ZGODBE_NACIN === 'live' ? 'live' : 'dry_run',
      okvirji: okvirji.map(({ ime, sha256: h }) => ({ ime, sha256: h })),
      stanje: 'caka',
      ustvarjeno_ob: zdaj.toISOString(),
      ...(prejsnja && { prejsnja: { id: prejsnja.id, stanje: prejsnja.stanje, objava: prejsnja.objava } }),
    }
    s.zgodbe[z.id] = z
    return z
  })
  return { z, sporocilo: kartica(z), datoteke: okvirji.map((_, i) => join(mapa, `${i + 1}.jpg`)) }
}

/** Pošlje kartico v #kafana kot bot (gumbi delujejo le na sporočilih aplikacije). */
export async function poslji({ sporocilo, datoteke, env, f = fetch }) {
  const obrazec = new FormData()
  for (const [i, pot] of datoteke.entries()) obrazec.append(`files[${i}]`, new Blob([await readFile(pot)], { type: 'image/jpeg' }), `${i + 1}.jpg`)
  obrazec.append('payload_json', JSON.stringify(sporocilo))
  const r = await f(`https://discord.com/api/v10/channels/${env.DISCORD_KAFANA_ID}/messages`, {
    method: 'POST', headers: { authorization: `Bot ${env.DISCORD_ZGODBE_BOT_TOKEN}` }, body: obrazec,
  })
  if (!r.ok) throw new Error(`Discord ${r.status}`)
  return (await r.json()).id
}

// --- ukazna vrstica -------------------------------------------------------------------

function streznik(env, vrata) {
  for (const k of ['DISCORD_ZGODBE_PUBLIC_KEY', 'DISCORD_ZGODBE_BOT_TOKEN', 'DISCORD_KAFANA_ID', 'ZGODBE_LUKA_ID', 'ZGODBE_STANJE', 'ZGODBE_MEDIJI']) {
    if (!env[k]) throw new Error(`manjka ${k}`)
  }
  if (env.ZGODBE_NACIN === 'live' && !(env.META_PAGE_TOKEN && env.META_PAGE_ID && env.META_IG_USER_ID && env.ZGODBE_MEDIJI_URL)) throw new Error('live brez META_* ali ZGODBE_MEDIJI_URL')
  const kljuc = javniKljuc(env.DISCORD_ZGODBE_PUBLIC_KEY)
  const shramba = new Shramba(env.ZGODBE_STANJE)
  createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/discord/zgodbe') { res.writeHead(404).end(); return }
    const kosi = []
    let velikost = 0
    for await (const k of req) { velikost += k.length; if (velikost > 1e6) { res.writeHead(413).end(); return } kosi.push(k) }
    try {
      const r = await obdelaj({ telo: Buffer.concat(kosi).toString('utf8'), glave: req.headers, env, shramba, kljuc })
      res.writeHead(r.status, { 'content-type': 'application/json' }).end(JSON.stringify(r.json))
      if (r.nadaljuj) r.nadaljuj().catch((e) => log(`objava: ${zakrij(e.message)}`))
    } catch (e) {
      log(`napaka: ${zakrij(e.message)}`)
      res.writeHead(500).end()
    }
  }).listen(vrata, () => log(`posluša :${vrata}, način ${env.ZGODBE_NACIN === 'live' ? 'live' : 'dry_run'}`))
}

async function main() {
  const [ukaz, ...arg] = process.argv.slice(2)
  const moznost = (ime, privzeto) => { const i = arg.indexOf(`--${ime}`); return i >= 0 ? arg[i + 1] : privzeto }
  const env = { ...process.env }
  if (ukaz === 'streznik') return streznik(env, Number(moznost('vrata', 8787)))
  if (ukaz === 'predlozi') {
    const suho = arg.includes('--suho')
    const poti = arg.filter((a, i) => !a.startsWith('--') && !arg[i - 1]?.match(/^--(platforme|avtor|izhod)$/))
    if (suho) {
      const izhod = moznost('izhod', '/tmp/zgodbe-suho')
      Object.assign(env, { ZGODBE_MEDIJI: join(izhod, 'mediji'), ZGODBE_STANJE: join(izhod, 'stanje.json') })
      await mkdir(izhod, { recursive: true })
    }
    if (!env.ZGODBE_MEDIJI || !env.ZGODBE_STANJE) throw new Error('manjka ZGODBE_MEDIJI ali ZGODBE_STANJE')
    const { z, sporocilo, datoteke } = await predlozi({
      poti, platforme: moznost('platforme', 'ig,fb').split(','), avtor: moznost('avtor', 'growth-lead'), env, shramba: new Shramba(env.ZGODBE_STANJE),
    })
    if (suho) {
      await writeFile(join(moznost('izhod', '/tmp/zgodbe-suho'), 'kartica.json'), JSON.stringify(sporocilo, null, 2))
      console.log(`suho: ${z.id} ${z.verzija}; kartica.json in mediji/ v ${moznost('izhod', '/tmp/zgodbe-suho')} (nič poslano)`)
      return
    }
    const id = await poslji({ sporocilo, datoteke, env })
    await new Shramba(env.ZGODBE_STANJE).spremeni((s) => { s.zgodbe[z.id].sporocilo_id = id })
    console.log(`kartica ${z.id} ${z.verzija} v #kafana (sporočilo ${id})`)
    return
  }
  console.error('Uporaba: zgodbe.mjs predlozi 1.jpg 2.jpg 3.jpg [--platforme ig,fb] [--avtor ime] [--suho --izhod mapa] | streznik [--vrata 8787]')
  process.exit(2)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(zakrij(e.message)); process.exit(1) })
