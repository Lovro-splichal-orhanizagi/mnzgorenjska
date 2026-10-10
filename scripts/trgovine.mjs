// Stanje aplikacije v trgovinah in namestitve po dnevih (delovni tok *Trgovine*).
//
// iOS: App Store Connect API — stanje zadnje različice (v pregledu, zavrnjena,
// v trgovini) in prvi prenosi iz dnevnih prodajnih poročil (SALES/SUMMARY).
// Android: Play bulk poročila v Cloud Storage (installs_<paket>_<mesec>_overview.csv,
// "Total User Installs" in "Daily User Installs").
// Dneve zapiše v `trgovine_dnevno`, stanje iOS v `trgovine_stanje` (admin: Rast).
// Na Discord javi spremembo stanja iOS in vsak nov mejnik po MEJNIK namestitev
// (nad najvišjim že javljenim, `trgovine_stanje.mejnik`).
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, ASC_VENDOR (številka ponudnika, za prodajna poročila)
//   PLAY_SERVICE_ACCOUNT, PLAY_BUCKET (pubsite_prod_…), DISCORD_WEBHOOK
//   node scripts/trgovine.mjs [--suho]   (--suho: nič ne piše in ne javlja)
import { createSign } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

const PAKET = 'eu.slff.app'
const APP_ID = '6818746153'
const MEJNIK = 10
const ZACETEK = '2026-09-01' // prvi dan v trgovinah
const OKNO = 8 // toliko zadnjih dni iOS preberemo znova, ker Apple poročila dopolnjuje
const suho = process.argv.includes('--suho')
const env = process.env

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const b64 = (b) => Buffer.from(b).toString('base64url')
function jwt(glava, telo, kljuc, alg) {
  const vsebina = `${b64(JSON.stringify(glava))}.${b64(JSON.stringify(telo))}`
  const podpis = createSign('SHA256').update(vsebina).sign(alg === 'ES256' ? { key: kljuc, dsaEncoding: 'ieee-p1363' } : kljuc)
  return `${vsebina}.${b64(podpis)}`
}

// Vsako poročilo dobi še vrstico številk (povzetek_rasti v bazi); brez nje gre samo sporočilo.
async function javi(besedilo) {
  const { data: povzetek } = await db.rpc('povzetek_rasti')
  if (povzetek) besedilo += `\n${povzetek}`
  console.log(besedilo)
  if (suho || !env.DISCORD_WEBHOOK) return
  await fetch(env.DISCORD_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: besedilo }) })
}

const dan = (d) => d.toISOString().slice(0, 10)
const plus = (d, n) => dan(new Date(Date.parse(d) + n * 86400e3))
const danes = dan(new Date())

async function preveri({ error }) {
  if (error) throw new Error(error.message)
}

// Shranjene vrstice trgovine po dnevu, naraščajoče.
async function shranjeno(trgovina) {
  const { data, error } = await db.from('trgovine_dnevno').select('dan, skupaj, novi').eq('trgovina', trgovina).order('dan')
  if (error) throw new Error(error.message)
  return data
}

async function zapisi(trgovina, vrstice) {
  console.log(`${trgovina}: ${vrstice.length} dni (${vrstice[0]?.dan ?? '—'} … ${vrstice.at(-1)?.dan ?? '—'})`)
  if (suho || !vrstice.length) return
  await preveri(await db.from('trgovine_dnevno').upsert(vrstice.map((v) => ({ trgovina, ...v }))))
}

// ---------- mejniki ----------
// Primerja z najvišjim že javljenim mejnikom (`trgovine_stanje.mejnik`, null = še nič), zato
// seštevek, ki pade in znova zraste (Play odšteje odstranitve), ne javi dvakrat.
// Prvi zagon javi le zadnji dosežen mejnik, ne vseh zgodovinskih.
async function mejniki(ime, trgovina, zdaj) {
  const { data, error } = await db.from('trgovine_stanje').select('mejnik').eq('trgovina', trgovina).maybeSingle()
  if (error) throw new Error(error.message)
  const dosezen = Math.floor(zdaj / MEJNIK) * MEJNIK
  const javljen = data?.mejnik ?? null
  console.log(`${ime}: skupaj ${zdaj}, javljen mejnik ${javljen ?? '—'}`)
  const prvi = javljen === null ? Math.max(MEJNIK, dosezen) : javljen + MEJNIK
  for (let m = prvi; m <= dosezen; m += MEJNIK) await javi(`📱 ${ime}: ${m} namestitev (skupaj ${zdaj}).`)
  if (!suho && (javljen === null || dosezen > javljen)) {
    await preveri(await db.from('trgovine_stanje').upsert({ trgovina, mejnik: Math.max(dosezen, javljen ?? 0) }))
  }
}

// ---------- iOS ----------
function ascZeton() {
  const zdaj = Math.floor(Date.now() / 1000)
  return jwt({ alg: 'ES256', kid: env.ASC_KEY_ID, typ: 'JWT' }, { iss: env.ASC_ISSUER_ID, iat: zdaj, exp: zdaj + 1200, aud: 'appstoreconnect-v1' }, env.ASC_KEY_P8, 'ES256')
}
async function asc(pot, surovo = false) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${pot}`, { headers: { authorization: `Bearer ${ascZeton()}` } })
  if (surovo) return r
  if (!r.ok) throw new Error(`ASC ${pot}: ${r.status} ${(await r.text()).slice(0, 300)}`)
  return r.json()
}

async function stanjeIos() {
  const v = await asc(`/v1/apps/${APP_ID}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState,createdDate`)
  return v.data
    .sort((a, b) => (b.attributes.createdDate ?? '').localeCompare(a.attributes.createdDate ?? ''))
    .map((x) => `${x.attributes.versionString}: ${x.attributes.appStoreState}`)
}

// Prvi prenosi (vrste izdelka 1, 1F, 1T …) v enem poročilu.
async function prenosiPorocila(frekvenca, datum) {
  const q = new URLSearchParams({ 'filter[frequency]': frekvenca, 'filter[reportType]': 'SALES', 'filter[reportSubType]': 'SUMMARY', 'filter[vendorNumber]': env.ASC_VENDOR, 'filter[reportDate]': datum, 'filter[version]': '1_1' })
  const r = await asc(`/v1/salesReports?${q}`, true)
  // 404 ali 400 brez podatkov: "no sales" = ta dan nič (tudi pred izidom
  // aplikacije), "not available" = poročilo še ni objavljeno (null, beremo znova).
  // Drugačno sporočilo izpišemo in dan obravnavamo kot neznan — zagon ne pade.
  if (r.status === 404 || r.status === 400) {
    const telo = await r.text()
    if (/no sales/i.test(telo)) return 0
    if (!/not (yet )?available/i.test(telo)) console.log(`ASC poročilo ${frekvenca} ${datum}: ${r.status} ${telo.slice(0, 300)}`)
    return null
  }
  if (!r.ok) throw new Error(`ASC poročilo ${frekvenca} ${datum}: ${r.status} ${(await r.text()).slice(0, 300)}`)
  const vrstice = gunzipSync(Buffer.from(await r.arrayBuffer())).toString('utf8').trim().split('\n')
  const glava = vrstice[0].split('\t')
  const [iTip, iEnote, iId] = ['Product Type Identifier', 'Units', 'Apple Identifier'].map((s) => glava.indexOf(s))
  if (Math.min(iTip, iEnote, iId) < 0) throw new Error(`ASC poročilo ${frekvenca} ${datum}: manjka stolpec (${vrstice[0]})`)
  return vrstice.slice(1).map((v) => v.split('\t'))
    .filter((c) => c[iId] === APP_ID && /^1/.test(c[iTip]))
    .reduce((s, c) => s + Number(c[iEnote] || 0), 0)
}

// Dnevi od zadnjega shranjenega (ali prvega v trgovini) do včeraj; zadnjih OKNO
// dni znova, ker Apple poročilo objavi z zamikom. Seštevek gre od dneva pred oknom.
async function prenosiIos() {
  const prej = await shranjeno('ios')
  const zadnji = prej.at(-1)
  let od = zadnji ? plus(danes, -OKNO) : ZACETEK
  if (zadnji && zadnji.dan < od) od = plus(zadnji.dan, 1)
  if (od < plus(danes, -365)) od = plus(danes, -365) // Apple dnevna poročila hrani leto dni
  let skupaj = prej.filter((v) => v.dan < od).at(-1)?.skupaj ?? 0
  const vrstice = []
  for (let d = od; d < danes; d = plus(d, 1)) {
    let novi = await prenosiPorocila('DAILY', d)
    if (novi === null) {
      if (d >= plus(danes, -2)) break // poročilo še ni objavljeno
      novi = prej.find((v) => v.dan === d)?.novi ?? 0
    }
    skupaj += novi
    vrstice.push({ dan: d, skupaj, novi })
  }
  await zapisi('ios', vrstice)
  await mejniki('App Store', 'ios', vrstice.at(-1)?.skupaj ?? zadnji?.skupaj ?? 0)
}

// ---------- Android ----------
async function googleZeton() {
  const sa = JSON.parse(env.PLAY_SERVICE_ACCOUNT)
  const zdaj = Math.floor(Date.now() / 1000)
  const a = jwt({ alg: 'RS256', typ: 'JWT' }, { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_only', aud: 'https://oauth2.googleapis.com/token', iat: zdaj, exp: zdaj + 3600 }, sa.private_key, 'RS256')
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: a }) })
  if (!r.ok) throw new Error(`Google žeton: ${r.status} ${await r.text()}`)
  return (await r.json()).access_token
}

// Vse mesečne datoteke v vedru: vsak dan z "Total User Installs" in "Daily User Installs".
async function namestitveAndroid() {
  const zeton = await googleZeton()
  const glava = { authorization: `Bearer ${zeton}` }
  const seznam = await fetch(`https://storage.googleapis.com/storage/v1/b/${env.PLAY_BUCKET}/o?prefix=${encodeURIComponent(`stats/installs/installs_${PAKET}_`)}`, { headers: glava })
  if (seznam.status === 404) throw new Error(`vedro ${env.PLAY_BUCKET} ne obstaja (preveri PLAY_BUCKET: Play Console → Download reports → Statistics → Copy Cloud Storage URI)`)
  // Dovoljenje se pri Googlu razširi do 24 ur, zato 403 le opozori in zagona ne podre.
  if (seznam.status === 403 || seznam.status === 401) {
    console.log(`::warning::Google Play: ni dostopa do vedra ${env.PLAY_BUCKET} (${seznam.status}). Servisni račun potrebuje "View app information and download bulk reports" (Play Console → Users and permissions); po dodelitvi lahko traja do 24 ur.`)
    return
  }
  if (!seznam.ok) throw new Error(`seznam vedra: ${seznam.status} ${(await seznam.text()).slice(0, 300)}`)
  const imena = ((await seznam.json()).items ?? []).map((o) => o.name).filter((n) => n.endsWith('_overview.csv')).sort()
  if (!imena.length) {
    console.log(`Google Play: v vedru še ni poročil o namestitvah (Google jih objavi nekaj dni po prvi namestitvi)`)
    return
  }
  const vrstice = []
  for (const ime of imena) {
    const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${env.PLAY_BUCKET}/o/${encodeURIComponent(ime)}?alt=media`, { headers: glava })
    if (r.status === 403 || r.status === 401) {
      console.log(`::warning::Google Play: ni dostopa do ${ime} (${r.status}). Dovoljenje "View app information and download bulk reports" se razširi do 24 ur.`)
      return
    }
    if (!r.ok) throw new Error(`Play ${ime}: ${r.status} ${(await r.text()).slice(0, 300)}`)
    const buf = Buffer.from(await r.arrayBuffer())
    const besedilo = (buf[0] === 0xff && buf[1] === 0xfe ? buf.subarray(2).toString('utf16le') : buf.toString('utf8')).replace(/^\uFEFF/, '')
    const [prva = '', ...ostalo] = besedilo.trim().split(/\r?\n/)
    if (!prva) continue // prazna datoteka
    const st = prva.split(',')
    const [iDan, iSkupaj, iNovi] = ['Date', 'Total User Installs', 'Daily User Installs'].map((s) => st.indexOf(s))
    if (iDan < 0 || iSkupaj < 0) throw new Error(`Play ${ime}: ni stolpcev Date / Total User Installs (${prva})`)
    for (const v of ostalo) {
      const c = v.split(',')
      if (!c[iDan]) continue
      vrstice.push({ dan: c[iDan], skupaj: Number(c[iSkupaj] || 0), novi: iNovi < 0 ? null : Number(c[iNovi] || 0) })
    }
  }
  if (!vrstice.length) {
    console.log('Google Play: datoteke so prazne')
    return
  }
  vrstice.sort((a, b) => a.dan.localeCompare(b.dan))
  await zapisi('android', vrstice)
  await mejniki('Google Play', 'android', vrstice.at(-1).skupaj)
}

let napaka = false
try {
  const stanje = await stanjeIos()
  console.log(`iOS različice: ${stanje.join(', ')}`)
  const zadnja = stanje[0] ?? ''
  const { data: prej, error } = await db.from('trgovine_stanje').select('stanje').eq('trgovina', 'ios').maybeSingle()
  if (error) throw new Error(error.message)
  if (prej?.stanje && prej.stanje !== zadnja) await javi(`🍎 App Store: ${zadnja} (prej ${prej.stanje})`)
  // `posodobljeno` = zadnja preverba, zato pišemo ob vsakem zagonu.
  if (!suho) {
    await preveri(await db.from('trgovine_stanje').upsert({ trgovina: 'ios', stanje: zadnja, posodobljeno: new Date().toISOString() }))
  }
} catch (e) {
  napaka = true
  console.error(`iOS stanje: ${e.message}`)
}
if (env.ASC_VENDOR) {
  try {
    await prenosiIos()
  } catch (e) {
    napaka = true
    console.error(`iOS prenosi: ${e.message}`)
  }
} else console.log('iOS prenosi: ASC_VENDOR ni nastavljen, preskočim')
if (env.PLAY_BUCKET) {
  try {
    await namestitveAndroid()
  } catch (e) {
    napaka = true
    console.error(`Android: ${e.message}`)
  }
} else console.log('Android: PLAY_BUCKET ni nastavljen, preskočim')
process.exit(napaka ? 1 : 0)
