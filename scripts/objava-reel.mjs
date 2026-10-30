// Ročni reel (SLF-204): en pripravljen video z napisom na Instagram in/ali
// Facebook stran, mimo dnevnih osnutkov delavca slff-objave.
//
//   docker exec -i slff-objave node scripts/objava-reel.mjs <ig|fb|both> [--dry] < reel.tar
//   docker exec slff-objave node scripts/objava-reel.mjs --zapisi
//
// Na VM to kliče `ssh slff-ops post-custom reel [ig|fb|both] [--dry] < reel.tar`.
// Tar ima natanko dve datoteki: en video `*.mp4` in `caption.txt` (UTF-8).
// Pred objavo preveri video (ffprobe: H.264 yuv420p, AAC, 9:16, 3–90 s, ≤ 100 MB),
// napis (≤ 2200 znakov, ≤ 30 ključnikov, ≤ 20 omemb), račune (stran in
// Instagram sta povezana, kvota Instagrama), dnevno mejo ročnih reelov
// (`ROCNI_REEL_NA_DAN`, privzeto 2, 0 ustavi) in da ni osnutka delavca 2 h nazaj
// ali 60 min naprej.
// `--dry` naredi vse preverbe (tudi branje računov), a nič ne objavi in nič ne zapiše.
// Javno (Caddy /objave-mediji/) je le objavljeni video /mediji/rocni/<id>/reel.mp4.
// Zapisi, zaklep in začasna datoteka so v zasebni mapi `ROCNI_MAPA` (/rocni):
// objave.jsonl (vsak poskus pri Meti šteje v mejo; napaka se ne ponovi sama,
// Meta je morda objavila del). Obvestilo na Discord.
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
import { mkdir, readFile, writeFile, appendFile, open, rm, chmod } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { objaviInstagramReel, objaviFacebookReel, javniUrl, metaNastavljena, datumLj, OBJAVA_ZAMUDA } from './objave.mjs'

export const NAJVEC_TAR = 120 * 1024 * 1024
export const NAJVEC_VIDEO = 100 * 1024 * 1024
export const TRAJANJE = [3, 90]
export const NAPIS_ZNAKOV = 2200
export const NAJVEC_KLJUCNIKOV = 30
export const NAJVEC_OMEMB = 20
export const NA_DAN = 2
// Osnutek delavca, ki se objavi bližje od tega, ročni reel ustavi (ne prehiteva in ne podvaja).
export const OKNO_DELAVCA = 60 * 60e3
const ZAKLEP_STAR = 30 * 60e3
const PLATFORME = { ig: ['ig'], fb: ['fb'], both: ['ig', 'fb'] }
// Smeti, ki jih tar na macOS doda sam; ne štejejo kot datoteka.
const SMETI = (ime) => ime === '.DS_Store' || ime.startsWith('._')

class Zavrnjeno extends Error {}
const zavrni = (s) => { throw new Zavrnjeno(s) }

// --- tar ---------------------------------------------------------------------------

const niz = (b, od, dolzina) => {
  const kos = b.subarray(od, od + dolzina)
  const konec = kos.indexOf(0)
  return kos.subarray(0, konec < 0 ? dolzina : konec).toString('utf8')
}
const osmisko = (b, od, dolzina) => {
  const s = niz(b, od, dolzina).trim()
  if (!/^[0-7]+$/.test(s)) zavrni('tar: broken header (size)')
  return parseInt(s, 8)
}

/** Datoteke iz tar (ustar, GNU, pax), brez razpakiranja na disk. Vrne Map ime → Buffer. */
export function beriTar(b) {
  const datoteke = new Map()
  let i = 0
  let dolgoIme = null
  while (i + 512 <= b.length) {
    const glava = b.subarray(i, i + 512)
    if (glava.every((x) => x === 0)) break
    const vsota = osmisko(glava, 148, 8)
    let izracun = 0
    for (let j = 0; j < 512; j++) izracun += j >= 148 && j < 156 ? 32 : glava[j]
    if (vsota !== izracun) zavrni('tar: broken header (checksum)')
    const velikost = osmisko(glava, 124, 12)
    const vrsta = String.fromCharCode(glava[156] || 48)
    const predpona = niz(glava, 257, 6).startsWith('ustar') ? niz(glava, 345, 155) : ''
    let ime = dolgoIme ?? (predpona ? `${predpona}/${niz(glava, 0, 100)}` : niz(glava, 0, 100))
    dolgoIme = null
    const vsebina = b.subarray(i + 512, i + 512 + velikost)
    if (vsebina.length !== velikost) zavrni('tar: truncated')
    i += 512 + Math.ceil(velikost / 512) * 512
    if (vrsta === 'L') { dolgoIme = vsebina.toString('utf8').replace(/\0+$/, ''); continue }
    if (vrsta === 'x') { dolgoIme = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(vsebina.toString('utf8'))?.[1] ?? null; continue }
    if (vrsta === 'g') continue
    ime = ime.replace(/^(\.\/)+/, '')
    if (vrsta === '5') { if (ime === '' || ime === '.' || ime === './') continue; zavrni(`tar: folders are not allowed (${ime})`) }
    if (vrsta !== '0' && vrsta !== '7') zavrni(`tar: only plain files are allowed (${ime})`)
    if (!ime || ime.includes('/') || ime.includes('\\') || ime === '..') zavrni(`tar: files must be at the top level (${ime})`)
    if (SMETI(ime)) continue
    if (datoteke.has(ime)) zavrni(`tar: ${ime} is in the tar twice`)
    datoteke.set(ime, vsebina)
  }
  return datoteke
}

/** Iz tar vzame en video in napis; karkoli drugega ga zavrne. */
export function vsebinaTar(datoteke) {
  const imena = [...datoteke.keys()]
  const videi = imena.filter((x) => /\.mp4$/i.test(x))
  const tuje = imena.filter((x) => !/\.mp4$/i.test(x) && x !== 'caption.txt')
  if (tuje.length) zavrni(`tar: unexpected files ${tuje.join(', ')} (allowed: one .mp4 and caption.txt)`)
  if (videi.length !== 1) zavrni(`tar: needs exactly one .mp4, found ${videi.length}`)
  if (!datoteke.has('caption.txt')) zavrni('tar: caption.txt is missing')
  return { ime: videi[0], video: datoteke.get(videi[0]), napis: preveriNapis(datoteke.get('caption.txt')) }
}

// --- napis -------------------------------------------------------------------------

/** caption.txt: UTF-8, brez kontrolnih znakov; meje Instagrama. Vrne očiščen napis. */
export function preveriNapis(b) {
  let s
  try { s = new TextDecoder('utf-8', { fatal: true }).decode(b) } catch { zavrni('caption.txt is not UTF-8') }
  s = s.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim()
  if (!s) zavrni('caption.txt is empty')
  if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(s)) zavrni('caption.txt has control characters')
  const znakov = [...s].length
  if (znakov > NAPIS_ZNAKOV) zavrni(`caption has ${znakov} characters (max ${NAPIS_ZNAKOV})`)
  const kljucniki = kljucnikiNapisa(s)
  if (kljucniki.length > NAJVEC_KLJUCNIKOV) zavrni(`caption has ${kljucniki.length} hashtags (max ${NAJVEC_KLJUCNIKOV})`)
  const omembe = s.match(/(?<![\p{L}\p{N}_.])@[\p{L}\p{N}_.]+/gu) ?? []
  if (omembe.length > NAJVEC_OMEMB) zavrni(`caption has ${omembe.length} @mentions (max ${NAJVEC_OMEMB})`)
  return s
}

export const kljucnikiNapisa = (s) => s.match(/(?<![\p{L}\p{N}_&/])#[\p{L}\p{N}_]+/gu) ?? []

// --- video -------------------------------------------------------------------------

/** ffprobe JSON (sistemski ffmpeg v sliki delavca). */
export function ffprobe(pot) {
  return new Promise((ok, ne) => {
    const p = spawn('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', pot], { stdio: ['ignore', 'pipe', 'pipe'] })
    let izhod = ''
    let napaka = ''
    p.stdout.on('data', (d) => { izhod += d })
    p.stderr.on('data', (d) => { napaka += d })
    p.on('error', ne)
    p.on('close', (k) => {
      if (k !== 0) return ne(new Zavrnjeno(`video cannot be read (ffprobe: ${napaka.trim().split('\n').pop() || k})`))
      try { ok(JSON.parse(izhod)) } catch { ne(new Zavrnjeno('ffprobe: unreadable output')) }
    })
  })
}

const fps = (r) => { const [a, b] = String(r ?? '0/1').split('/').map(Number); return b ? a / b : a }

/** Preveri video po zahtevah reela (Instagram in Facebook). Vrne povzetek. */
export function preveriVideo(video, sonda) {
  if (video.length > NAJVEC_VIDEO) zavrni(`video is ${(video.length / 1048576).toFixed(1)} MB (max ${NAJVEC_VIDEO / 1048576} MB)`)
  if (video.subarray(4, 8).toString('latin1') !== 'ftyp') zavrni('video is not an MP4 file')
  const tokovi = sonda.streams ?? []
  const v = tokovi.filter((t) => t.codec_type === 'video' && !t.disposition?.attached_pic)
  const a = tokovi.filter((t) => t.codec_type === 'audio')
  if (v.length !== 1) zavrni(`video needs exactly one video track, found ${v.length}`)
  if (a.length > 1) zavrni(`video has ${a.length} audio tracks (max 1)`)
  const [s] = v
  if (s.codec_name !== 'h264') zavrni(`video codec is ${s.codec_name} (needs H.264)`)
  // Reel sprejme le 4:2:0; drugače Meta zavrne šele po nalaganju in poskus šteje v mejo.
  if (!['yuv420p', 'yuvj420p'].includes(s.pix_fmt)) zavrni(`video pixel format is ${s.pix_fmt ?? 'unknown'} (needs yuv420p)`)
  if (a.length && a[0].codec_name !== 'aac') zavrni(`audio codec is ${a[0].codec_name} (needs AAC)`)
  // Zasukan posnetek (telefon): širina in višina, kot ju vidi gledalec.
  const zasuk = Math.abs(Number(s.side_data_list?.find((x) => x.rotation != null)?.rotation ?? s.tags?.rotate ?? 0)) % 180 === 90
  const sirina = zasuk ? s.height : s.width
  const visina = zasuk ? s.width : s.height
  if (!(sirina >= 540 && visina >= 960)) zavrni(`video is ${sirina}x${visina} (needs at least 540x960)`)
  if (Math.abs(sirina / visina - 9 / 16) > 0.01) zavrni(`video is ${sirina}x${visina}, not vertical 9:16`)
  const slicic = fps(s.avg_frame_rate) || fps(s.r_frame_rate)
  if (!(slicic >= 23 && slicic <= 60)) zavrni(`video has ${slicic.toFixed(2)} fps (needs 23–60)`)
  const trajanje = Number(sonda.format?.duration ?? s.duration)
  if (!(trajanje >= TRAJANJE[0] && trajanje <= TRAJANJE[1])) zavrni(`video is ${trajanje} s long (needs ${TRAJANJE[0]}–${TRAJANJE[1]} s)`)
  return { sirina, visina, trajanje: Math.round(trajanje * 10) / 10, slicic: Math.round(slicic * 100) / 100, zvok: a.length === 1, mb: Math.round(video.length / 104857.6) / 10 }
}

// --- računi (Meta) -------------------------------------------------------------------

async function beri(f, env, pot, polja) {
  const r = await f(`https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v26.0'}/${pot}?${new URLSearchParams({ fields: polja, access_token: env.META_PAGE_TOKEN })}`)
  const o = await r.json().catch(() => ({}))
  if (!r.ok || o.error) throw new Error(`Meta ${pot.replace(/^\d+/, '…')}: ${o.error?.message ?? r.status}`)
  return o
}

/**
 * Stran in Instagram iz .env sta isti, povezan par (ne objavimo na tuj račun),
 * ime računa se ujema z `OBJAVE_IG_RACUN`, če je nastavljen, Instagram ima še kvoto.
 */
export async function preveriRacune({ env, platforme, f = fetch }) {
  const stran = await beri(f, env, env.META_PAGE_ID, 'name,instagram_business_account')
  const ig = await beri(f, env, env.META_IG_USER_ID, 'username')
  if (stran.instagram_business_account?.id !== env.META_IG_USER_ID) zavrni(`accounts: Instagram @${ig.username} is not linked to page "${stran.name}"`)
  if (env.OBJAVE_IG_RACUN && ig.username !== env.OBJAVE_IG_RACUN) zavrni(`accounts: Instagram is @${ig.username}, expected @${env.OBJAVE_IG_RACUN}`)
  let kvota = null
  if (platforme.includes('ig')) {
    const { data: [k] = [] } = await beri(f, env, `${env.META_IG_USER_ID}/content_publishing_limit`, 'quota_usage,config')
    if (k) {
      kvota = `${k.quota_usage}/${k.config?.quota_total ?? '?'}`
      if (k.config?.quota_total && k.quota_usage >= k.config.quota_total) zavrni(`accounts: Instagram publishing quota used up (${kvota} in 24 h)`)
    }
  }
  return { ig: ig.username, stran: stran.name, kvota }
}

// --- zapisi in meje ------------------------------------------------------------------

/** Zapisi ročnih reelov: zadnje stanje vsakega id (jsonl, vrstica na spremembo). */
export function zadnjaStanja(besedilo) {
  const po = new Map()
  for (const v of besedilo.split('\n')) {
    if (!v.trim()) continue
    try { const z = JSON.parse(v); po.set(z.id, { ...po.get(z.id), ...z }) } catch { /* pokvarjena vrstica ne ustavi štetja */ }
  }
  return [...po.values()]
}

/** Koliko poskusov pri Meti je bilo danes (ljubljanski dan); vsak šteje, tudi neuspel. */
export const danesPoskusov = (zapisi, zdaj) => zapisi.filter((z) => z.meta && datumLj(new Date(z.zacetek)) === datumLj(zdaj)).length

/** Osnutek delavca, ki se objavlja ali se bo v OKNO_DELAVCA, ali null. Nazaj gleda vsaj
 * OBJAVA_ZAMUDA, ker delavec zamujen osnutek objavi še toliko pozneje (npr. po izpadu). */
export async function blizuDelavca(db, zdaj) {
  const { data, error } = await db.from('objave').select('id, slot, vrsta, stanje, objava_ob')
    .in('stanje', ['osnutek', 'objavljanje'])
    .gte('objava_ob', new Date(+zdaj - Math.max(OKNO_DELAVCA, OBJAVA_ZAMUDA)).toISOString())
    .lte('objava_ob', new Date(+zdaj + OKNO_DELAVCA).toISOString())
  if (error) throw new Error(`objave: ${error.message}`)
  return data?.[0] ?? null
}

async function zaklepni(mapa) {
  const pot = join(mapa, '.zaklep')
  for (let i = 0; i < 2; i++) {
    try {
      const h = await open(pot, 'wx')
      await h.writeFile(String(Date.now()))
      await h.close()
      return () => rm(pot, { force: true })
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      const cas = Number(await readFile(pot, 'utf8').catch(() => '0'))
      if (Date.now() - cas < ZAKLEP_STAR) zavrni('another custom reel is being published right now')
      await rm(pot, { force: true })
    }
  }
  zavrni('another custom reel is being published right now')
}

// --- objava ------------------------------------------------------------------------

/** Obvestilo na Discord (kanal osnutkov); napaka obvestila ne ustavi objave. */
async function vDiscord(f, webhook, content) {
  if (!webhook) return
  await f(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
  }).catch(() => {})
}

/** Ali je objavljen reel res na Instagramu (zadnjih 10 objav, vrsta REELS, ista povezava). */
export async function preveriInstagram({ env, povezava, f = fetch }) {
  const { data = [] } = await beri(f, env, `${env.META_IG_USER_ID}/media`, 'permalink,media_product_type')
  return data.slice(0, 10).some((m) => m.permalink === povezava && m.media_product_type === 'REELS')
}

/**
 * Celoten ročni reel. `odvisnosti` (f, ffprobe, db, zdaj, cakajMs) so za preizkus.
 * Vrne { suho, video, napis, racuni, ig, fb } ali vrže Zavrnjeno/Error.
 */
export async function rocniReel({ tar, platforme, suho, env, mapa, zasebno, db, f = fetch, sonda = ffprobe, zdaj = new Date(), cakajMs, log = console.log }) {
  const { ime, video, napis } = vsebinaTar(beriTar(tar))
  const rocni = join(mapa, 'rocni')
  await mkdir(zasebno, { recursive: true })
  // ffprobe bere z diska: začasno v zasebni mapi (ni javna).
  const zacasno = join(zasebno, `.preverba-${randomBytes(8).toString('hex')}.mp4`)
  let podatki
  try {
    await writeFile(zacasno, video)
    podatki = preveriVideo(video, await sonda(zacasno))
  } finally {
    await rm(zacasno, { force: true })
  }
  const kljucniki = kljucnikiNapisa(napis)
  log(`video ${ime}: ${podatki.sirina}x${podatki.visina}, ${podatki.trajanje} s, ${podatki.slicic} fps, ${podatki.zvok ? 'AAC' : 'no audio'}, ${podatki.mb} MB`)
  log(`caption: ${[...napis].length} characters, ${kljucniki.length} hashtags${kljucniki.length ? ` (${kljucniki.join(' ')})` : ''}`)
  if (!metaNastavljena(env)) zavrni('Meta keys are not set on the server (META_*)')
  const racuni = await preveriRacune({ env, platforme, f })
  log(`accounts: Instagram @${racuni.ig}, Facebook page "${racuni.stran}"${racuni.kvota ? `, IG quota ${racuni.kvota} in 24 h` : ''}`)
  const zapisiPot = join(zasebno, 'objave.jsonl')
  const zapisi = zadnjaStanja(await readFile(zapisiPot, 'utf8').catch(() => ''))
  // 0 ustavi ročne reele; prazno ali manjkajoče je privzeto.
  const meja = (env.ROCNI_REEL_NA_DAN ?? '') === '' ? NA_DAN : Number(env.ROCNI_REEL_NA_DAN)
  if (!Number.isInteger(meja) || meja < 0) zavrni(`ROCNI_REEL_NA_DAN must be a whole number ≥ 0`)
  const danes = danesPoskusov(zapisi, zdaj)
  if (danes >= meja) zavrni(`daily limit: ${danes} of ${meja} custom reels already today`)
  log(`daily limit: ${danes} of ${meja} custom reels used today`)
  if (!db) zavrni('cannot check worker drafts (no database)')
  const delavec = await blizuDelavca(db, zdaj)
  if (delavec) zavrni(`worker post #${delavec.id} (${delavec.vrsta}) is due at ${new Date(delavec.objava_ob).toLocaleTimeString('en-GB', { timeZone: 'Europe/Ljubljana', hour: '2-digit', minute: '2-digit' })}; try more than 60 min away from it`)
  if (suho) {
    log(`dry run: would publish to ${platforme.join(' + ')}; nothing published, nothing recorded`)
    return { suho: true, video: podatki, napis, racuni }
  }

  const sprosti = await zaklepni(zasebno)
  try {
    // Znova pod zaklepom: dva hkratna klica ne prekoračita meje.
    if (danesPoskusov(zadnjaStanja(await readFile(zapisiPot, 'utf8').catch(() => '')), zdaj) >= meja) zavrni(`daily limit: ${meja} custom reels already today`)
    const id = `${datumLj(zdaj).replaceAll('-', '')}-${randomBytes(8).toString('hex')}`
    const mapaReela = join(rocni, id)
    await mkdir(mapaReela, { recursive: true })
    const pot = join(mapaReela, 'reel.mp4')
    await writeFile(pot, video)
    await chmod(mapaReela, 0o755)
    await chmod(pot, 0o644)
    const url = javniUrl(pot, mapa, env.OBJAVE_MEDIJI_URL || 'https://slff.eu/objave-mediji')
    // Meta video prenese z javnega naslova; brez njega bi padla šele po minutah.
    const h = await f(url, { method: 'HEAD' })
    if (!h.ok || Number(h.headers.get('content-length')) !== video.length) {
      await rm(mapaReela, { recursive: true, force: true })
      throw new Error(`public video URL does not serve the file (${h.status})`)
    }
    const zapis = {
      id, zacetek: zdaj.toISOString(), meta: true, platforme, stanje: 'objavljanje',
      video_sha256: createHash('sha256').update(video).digest('hex'), video: podatki,
      napis_sha256: createHash('sha256').update(napis).digest('hex'), napis: napis.slice(0, 120),
      ig_racun: racuni.ig, fb_stran: racuni.stran,
    }
    await appendFile(zapisiPot, `${JSON.stringify(zapis)}\n`)
    const izid = { ig: null, fb: null, ig_preverjeno: null }
    try {
      if (platforme.includes('ig')) {
        izid.ig = await objaviInstagramReel({ video: url, napis, env, f, ...(cakajMs ? { cakajMs } : {}) })
        log(`ig: ${izid.ig}`)
        izid.ig_preverjeno = await preveriInstagram({ env, povezava: izid.ig, f }).catch(() => false)
        if (!izid.ig_preverjeno) log('ig: published, but not yet visible as a reel in the account list; check the link')
      }
      if (platforme.includes('fb')) {
        izid.fb = await objaviFacebookReel({ video: url, napis, env, f, ...(cakajMs ? { cakajMs } : {}) })
        log(`fb: ${izid.fb}`)
      }
    } catch (e) {
      await appendFile(zapisiPot, `${JSON.stringify({ id, stanje: 'napaka', konec: new Date().toISOString(), napaka: e.message, ig_povezava: izid.ig, fb_povezava: izid.fb })}\n`)
      await vDiscord(f, env.DISCORD_OBJAVE_WEBHOOK, `⚠️ Ročni reel ni uspel (${platforme.join(' + ')}): ${e.message}${izid.ig ? `\nInstagram je objavljen: ${izid.ig}` : ''}\nNi samodejne ponovitve.`)
      throw e
    }
    await appendFile(zapisiPot, `${JSON.stringify({ id, stanje: 'objavljeno', konec: new Date().toISOString(), ig_povezava: izid.ig, fb_povezava: izid.fb, ig_preverjeno: izid.ig_preverjeno })}\n`)
    await vDiscord(f, env.DISCORD_OBJAVE_WEBHOOK, `🎬 Ročni reel objavljen:${izid.ig ? `\nInstagram: ${izid.ig}` : ''}${izid.fb ? `\nFacebook: ${izid.fb}` : ''}`)
    return { suho: false, id, video: podatki, napis, racuni, ...izid }
  } finally {
    await sprosti()
  }
}

/** Zadnji zapisi (najnovejši zgoraj), berljivo. */
export function izpisZapisov(zapisi, n = 10) {
  return zapisi.slice(-n).reverse().map((z) =>
    `${z.id}  ${z.stanje}  ${z.platforme?.join('+') ?? ''}  ${new Date(z.zacetek).toLocaleString('en-GB', { timeZone: 'Europe/Ljubljana' })}` +
    `${z.ig_povezava ? `\n  ig: ${z.ig_povezava}${z.ig_preverjeno === false ? ' (not verified)' : ''}` : ''}${z.fb_povezava ? `\n  fb: ${z.fb_povezava}` : ''}${z.napaka ? `\n  error: ${z.napaka}` : ''}`,
  ).join('\n') || 'no custom reels yet'
}

async function beriStdin(meja) {
  const kosi = []
  let skupaj = 0
  for await (const k of process.stdin) {
    skupaj += k.length
    if (skupaj > meja) zavrni(`tar is larger than ${meja / 1048576} MB`)
    kosi.push(k)
  }
  return Buffer.concat(kosi)
}

async function main() {
  const env = process.env
  const mapa = resolve(env.OBJAVE_MAPA || './objave-mediji')
  const zasebno = resolve(env.ROCNI_MAPA || './objave-rocni')
  const args = process.argv.slice(2)
  if (args[0] === '--zapisi') {
    console.log(izpisZapisov(zadnjaStanja(await readFile(join(zasebno, 'objave.jsonl'), 'utf8').catch(() => '')), Number(args[1]) || 10))
    return
  }
  const suho = args.includes('--dry')
  const ostali = args.filter((x) => x !== '--dry')
  const platforme = PLATFORME[ostali[0] ?? 'both']
  if (!platforme || ostali.length > 1) {
    console.error('usage: post-custom reel [ig|fb|both] [--dry] < reel.tar   (tar: one .mp4 + caption.txt)')
    process.exit(2)
  }
  if (process.stdin.isTTY) zavrni('send the tar on stdin')
  const tar = await beriStdin(NAJVEC_TAR)
  if (!tar.length) zavrni('send the tar on stdin')
  let db = null
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import('@supabase/supabase-js')
    db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  }
  await rocniReel({ tar, platforme, suho, env, mapa, zasebno, db })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Zavrnjeno ? `refused: ${e.message}` : `error: ${e.message}`)
    process.exit(e instanceof Zavrnjeno ? 2 : 1)
  })
}

export { Zavrnjeno }
