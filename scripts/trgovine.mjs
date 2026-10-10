// Stanje aplikacije v trgovinah in mejniki namestitev (delovni tok *Trgovine*).
//
// iOS: App Store Connect API — stanje zadnje različice (v pregledu, zavrnjena,
// v trgovini) in prenosi iz prodajnega poročila (SALES/SUMMARY, prvi prenosi).
// Android: Play bulk poročila v Cloud Storage (installs_<paket>_<mesec>_overview.csv,
// stolpec "Total User Installs" je seštevek, zato stanja ne hranimo).
// Na Discord javi spremembo stanja iOS in vsak nov mejnik po MEJNIK namestitev.
// Brez stanja: mejnik je prestopljen, če je včerajšnji seštevek pod njim, današnji pa ne.
//
//   ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8, ASC_VENDOR (številka ponudnika, za prodajna poročila)
//   PLAY_SERVICE_ACCOUNT, PLAY_BUCKET (pubsite_prod_…), DISCORD_WEBHOOK
//   node scripts/trgovine.mjs [--suho]
import { createSign } from 'node:crypto'
import { gunzipSync } from 'node:zlib'

const PAKET = 'eu.slff.app'
const APP_ID = '6818746153'
const MEJNIK = 10
const ZACETEK = '2026-09' // prvi mesec v trgovinah
const suho = process.argv.includes('--suho')
const env = process.env

const b64 = (b) => Buffer.from(b).toString('base64url')
function jwt(glava, telo, kljuc, alg) {
  const vsebina = `${b64(JSON.stringify(glava))}.${b64(JSON.stringify(telo))}`
  const podpis = createSign('SHA256').update(vsebina).sign(alg === 'ES256' ? { key: kljuc, dsaEncoding: 'ieee-p1363' } : kljuc)
  return `${vsebina}.${b64(podpis)}`
}

async function javi(besedilo) {
  console.log(besedilo)
  if (suho || !env.DISCORD_WEBHOOK) return
  await fetch(env.DISCORD_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: besedilo }) })
}

const dan = (d) => d.toISOString().slice(0, 10)
const vceraj = new Date(Date.now() - 86400e3)

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
  return v.data.map((x) => `${x.attributes.versionString}: ${x.attributes.appStoreState}`)
}

// Prvi prenosi (vrste izdelka 1, 1F, 1T …) v enem poročilu.
async function prenosiPorocila(frekvenca, datum) {
  const q = new URLSearchParams({ 'filter[frequency]': frekvenca, 'filter[reportType]': 'SALES', 'filter[reportSubType]': 'SUMMARY', 'filter[vendorNumber]': env.ASC_VENDOR, 'filter[reportDate]': datum, 'filter[version]': '1_1' })
  const r = await asc(`/v1/salesReports?${q}`, true)
  if (r.status === 404) return 0 // ni prodaje ta dan / mesec
  if (!r.ok) throw new Error(`ASC poročilo ${frekvenca} ${datum}: ${r.status} ${(await r.text()).slice(0, 300)}`)
  const vrstice = gunzipSync(Buffer.from(await r.arrayBuffer())).toString('utf8').trim().split('\n')
  const glava = vrstice[0].split('\t')
  const [iTip, iEnote, iId] = ['Product Type Identifier', 'Units', 'Apple Identifier'].map((s) => glava.indexOf(s))
  return vrstice.slice(1).map((v) => v.split('\t'))
    .filter((c) => c[iId] === APP_ID && /^1/.test(c[iTip]))
    .reduce((s, c) => s + Number(c[iEnote] || 0), 0)
}

// Seštevek do vključno `do` (dan): pretekli meseci mesečno, tekoči mesec po dnevih.
async function prenosiIosDo(doDne) {
  const mesec = doDne.slice(0, 7)
  let vsota = 0
  for (let m = ZACETEK; m < mesec; m = naslednjiMesec(m)) vsota += await prenosiPorocila('MONTHLY', m)
  for (let d = `${mesec}-01`; d <= doDne; d = dan(new Date(Date.parse(d) + 86400e3))) vsota += await prenosiPorocila('DAILY', d)
  return vsota
}
function naslednjiMesec(m) {
  const [l, n] = m.split('-').map(Number)
  return n === 12 ? `${l + 1}-01` : `${l}-${String(n + 1).padStart(2, '0')}`
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

// Zadnji dan s podatki in dan pred njim: { [datum]: Total User Installs }.
async function namestitveAndroid() {
  const zeton = await googleZeton()
  const vrstice = {}
  const meseci = [...new Set([dan(new Date(Date.now() - 3 * 86400e3)), dan(vceraj)].map((d) => d.slice(0, 7)))]
  for (const m of meseci) {
    const ime = `stats/installs/installs_${PAKET}_${m.replace('-', '')}_overview.csv`
    const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${env.PLAY_BUCKET}/o/${encodeURIComponent(ime)}?alt=media`, { headers: { authorization: `Bearer ${zeton}` } })
    if (r.status === 404) continue
    if (!r.ok) throw new Error(`Play ${ime}: ${r.status} ${(await r.text()).slice(0, 300)}`)
    const buf = Buffer.from(await r.arrayBuffer())
    const besedilo = (buf[0] === 0xff && buf[1] === 0xfe ? buf.subarray(2).toString('utf16le') : buf.toString('utf8')).replace(/^﻿/, '')
    const [glava, ...ostalo] = besedilo.trim().split(/\r?\n/)
    const st = glava.split(',')
    const [iDan, iSkupaj] = ['Date', 'Total User Installs'].map((s) => st.indexOf(s))
    for (const v of ostalo) {
      const c = v.split(',')
      vrstice[c[iDan]] = Number(c[iSkupaj])
    }
  }
  return vrstice
}

// ---------- mejniki ----------
const mejnik = (n) => Math.floor(n / MEJNIK) * MEJNIK
async function preveriMejnik(trgovina, prej, zdaj) {
  console.log(`${trgovina}: ${prej} → ${zdaj}`)
  if (mejnik(zdaj) > mejnik(prej) && zdaj >= MEJNIK) await javi(`📱 ${trgovina}: ${mejnik(zdaj)} namestitev (skupaj ${zdaj}).`)
}

let napaka = false
try {
  const stanje = await stanjeIos()
  console.log(`iOS različice: ${stanje.join(', ')}`)
  const zadnja = stanje[0] ?? ''
  if (env.IOS_PREJ && env.IOS_PREJ !== zadnja) await javi(`🍎 App Store: ${zadnja}`)
  if (env.GITHUB_OUTPUT) (await import('node:fs')).appendFileSync(env.GITHUB_OUTPUT, `ios=${zadnja}\n`)
} catch (e) {
  napaka = true
  console.error(`iOS stanje: ${e.message}`)
}
if (env.ASC_VENDOR) {
  try {
    // Apple objavi dnevno poročilo naslednji dan: včeraj proti predvčerajšnjim.
    const d1 = dan(vceraj)
    const zdaj = await prenosiIosDo(d1)
    await preveriMejnik('App Store', zdaj - (await prenosiPorocila('DAILY', d1)), zdaj)
  } catch (e) {
    napaka = true
    console.error(`iOS prenosi: ${e.message}`)
  }
} else console.log('iOS prenosi: ASC_VENDOR ni nastavljen, preskočim')
if (env.PLAY_BUCKET) {
  try {
    const v = await namestitveAndroid()
    const dnevi = Object.keys(v).sort()
    if (dnevi.length >= 2) await preveriMejnik('Google Play', v[dnevi.at(-2)], v[dnevi.at(-1)])
    else console.log(`Google Play: premalo dni (${dnevi.join(', ')})`)
  } catch (e) {
    napaka = true
    console.error(`Android: ${e.message}`)
  }
} else console.log('Android: PLAY_BUCKET ni nastavljen, preskočim')
process.exit(napaka ? 1 : 0)
