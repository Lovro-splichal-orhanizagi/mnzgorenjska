// Seznam lig na hailafotbal.ro (vir `hlf`) s šiframi — za migracijo, ki jih vpiše.
//
//   node scripts/hailafotbal-lige.mjs                    # županije s podatki (zemljevid strani)
//   node scripts/hailafotbal-lige.mjs cluj prahova       # tekmovanja, faze, skupine, šifre, krogi
//   node scripts/hailafotbal-lige.mjs national           # državna tekmovanja FRF (Liga 2, Liga 3)
//   node scripts/hailafotbal-lige.mjs lpf                # SuperLiga (LPF)
//   node scripts/hailafotbal-lige.mjs cluj --preveri     # še zapisniki zadnjega odigranega kroga
//
// Beremo kot obiskovalec (glej glavo viri/hlf.mjs): stran županije odpremo v
// brskalniku in iz odgovorov, ki jih zahteva sama (GetCompetitions,
// GetCompetitionStages, GetCompetitionStageSeries, …TourRounds), sestavimo
// šifre `judetean/<județ>/fotbal/<sezona>/<tekmovanje>/<faza>/<skupina>`.
// Slug je ime brez diakritike z vezaji, kot ga gradi stran; šifro `--preveri`
// odpre in s tem tudi potrdi. API-ja ne kličemo sami in žetona ne beremo.
//
// `--preveri` prebere zadnji odigrani krog vsake lige in pove, koliko
// zapisnikov je polnih (obe ekipi ≥ 7 začetnikov), nepopolnih in praznih.
// Ena seja na ligo (~6 MB), 2 s med nalaganji.
import { OSNOVNI, PREMOR_MS, PRIPONA_UA, Seja, jeIzziv, popolnZapisnik, imaZapisnik, slug, tekmeKroga } from './viri/hlf.mjs'

const argumenti = process.argv.slice(2)
const preveri = argumenti.includes('--preveri')
const zupanije = argumenti.filter((a) => !a.startsWith('--'))
const IZPUSTI = /feminin|futsal|cupa|supercupa|junior|\bu ?-?\d+\b|interliga|tineret|elitelor|baraj|old|veteran|copii|turneu/i

const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

async function brskalnik() {
  const { chromium } = await import('playwright')
  const b = await chromium.launch({ headless: true })
  const ua = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${b.version()} Safari/537.36 ${PRIPONA_UA}`
  const k = await b.newContext({ userAgent: ua, locale: 'ro-RO', timezoneId: 'Europe/Bucharest' })
  const stran = await k.newPage()
  await stran.route('**/*', (r) => {
    const req = r.request()
    const host = new URL(req.url()).host
    if (['image', 'font', 'media'].includes(req.resourceType())) return r.abort()
    if (!/(^|\.)hailafotbal\.ro$|(^|\.)frf\.ro$/.test(host)) return r.abort()
    return r.continue()
  })
  return { b, stran }
}

// Vsi odgovori seje (odgovori ene strani lahko pridejo še med naslednjo).
const odgovori = []
function poslusaj(stran) {
  stran.on('response', async (res) => {
    const u = res.url()
    if (!u.includes('api.datalake.frf.ro') || /\/Auth\//i.test(u)) return
    if ([401, 403, 429].includes(res.status())) {
      console.error(`Ustavljeno: ${u.split('/').pop()} -> ${res.status()} (ne obhajamo)`)
      process.exit(2)
    }
    let telo = null
    let zahteva = null
    try {
      telo = await res.json()
    } catch {}
    try {
      zahteva = JSON.parse(res.request().postData() ?? 'null')
    } catch {}
    odgovori.push({ ime: u.split('/').pop(), zahteva, telo })
  })
}

/** Odpre naslov in počaka, da pridejo krogi zveze, katere ime ustreza `pogoj`. */
async function odpri(stran, url, pogoj = null) {
  await cakaj(PREMOR_MS)
  await stran.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(async () => {
    await cakaj(15000)
    await stran.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  })
  if (jeIzziv(await stran.content())) {
    console.error(`Ustavljeno: ${url} vrne izziv (ne obhajamo)`)
    process.exit(2)
  }
  if (!pogoj) return cakaj(3000)
  for (let i = 0; i < 60; i++) {
    const org = organizacija(pogoj)
    if (org && odgovori.some((o) => o.ime === 'GetCompetitionStageSeriesTourRounds' && o.zahteva?.OrganizationId === org)) return org
    await cakaj(500)
  }
  throw new Error(`${url}: podatki zveze niso prišli v 30 s`)
}

/** Id zveze po imenu (iz odgovorov GetCompetitions). */
function organizacija(pogoj) {
  for (const o of odgovori)
    for (const t of (o.ime === 'GetCompetitions' && Array.isArray(o.telo?.responseData) ? o.telo.responseData : []))
      if (pogoj(t)) return t.organizationId
  return null
}

/** Županije s podatki z zemljevida na /rezultate/judetean. */
async function zupanijeSPodatki(stran) {
  await odpri(stran, `${OSNOVNI}/rezultate/judetean`)
  return stran.$$eval('path.county-shape', (ps) =>
    ps.map((p) => ({ ime: p.getAttribute('aria-label'), ima: /available/.test(p.getAttribute('class') ?? '') })),
  )
}

/** Lige (tekmovanje × faza × skupina) iz odgovorov strani zveze. */
function lige(odg, osnova, org) {
  const zadnji = (ime, pogoj = () => true) => odg.filter((o) => o.ime === ime && pogoj(o)).at(-1)?.telo?.responseData ?? []
  const tekmovanja = zadnji('GetCompetitions', (o) => o.zahteva?.OrganizationId === org)
  const sezone = zadnji('GetSeasons')
  const faze = zadnji('GetCompetitionStages', (o) => o.zahteva?.OrganizationId === org)
  const skupine = zadnji('GetCompetitionStageSeries', (o) => o.zahteva?.OrganizationId === org)
  const krogi = zadnji('GetCompetitionStageSeriesTourRounds', (o) => o.zahteva?.OrganizationId === org)
  const out = []
  // Tekoča sezona (isCurrent pri tekmovanju ni zanesljiv: Prahova Liga 4 ga nima).
  const tekoca = sezone.find((x) => x.isCurrent)?.seasonFrfId ?? Math.max(...tekmovanja.map((t) => t.seasonFrfId))
  for (const t of tekmovanja) {
    if (t.seasonFrfId !== tekoca) continue
    const s = sezone.find((x) => x.seasonFrfId === t.seasonFrfId)
    const sezona = s ? `20${s.startYear}-20${s.endYear}` : '?'
    for (const f of faze.filter((x) => x.competitionId === t.competitionId)) {
      for (const g of skupine.filter((x) => x.stageId === f.stageId)) {
        const k = krogi.filter((x) => x.seriesId === g.seriesId)
        const datumi = k.map((x) => String(x.startDate ?? '').slice(0, 10)).filter(Boolean).sort()
        out.push({
          tekmovanje: t.name.trim(),
          faza: f.name.trim(),
          skupina: g.name.trim(),
          koda: `${osnova}/${sezona}/${slug(t.name)}/${slug(f.name)}/${slug(g.name)}`,
          krogov: new Set(k.map((x) => x.orderdisplay)).size,
          od: datumi[0] ?? '',
          do: datumi.at(-1) ?? '',
          izpusti: IZPUSTI.test(t.name),
        })
      }
    }
  }
  return out
}

/** Zadnji odigrani krog lige: polni / nepopolni / prazni zapisniki. */
async function preveriLigo(koda) {
  const seja = new Seja(koda, { log: () => {} })
  try {
    await seja.odpri()
    const danes = new Date().toISOString().slice(0, 10)
    const odigrani = seja.krogi.filter((k) => k.zacetek && k.zacetek < danes)
    for (const k of odigrani.reverse()) {
      const krog = await seja.krog(k.stevilka)
      const tekme = tekmeKroga(krog).filter((t) => t.homeGoals != null)
      if (!tekme.length) continue
      let polni = 0
      let nepopolni = 0
      let prazni = 0
      for (const t of tekme) {
        const list = await seja.zapisnik(k.stevilka, t)
        if (popolnZapisnik(list)) polni++
        else if (imaZapisnik(list)) nepopolni++
        else prazni++
      }
      return `krog ${k.stevilka}: ${tekme.length} tekem — polnih ${polni}, nepopolnih ${nepopolni}, praznih ${prazni}`
    }
    return 'ni odigranega kroga'
  } catch (e) {
    return `napaka: ${e.message}`
  } finally {
    await seja.zapri()
  }
}

const { b, stran } = await brskalnik()
poslusaj(stran)
try {
  if (!zupanije.length) {
    for (const z of await zupanijeSPodatki(stran)) if (z.ima) console.log(`${slug(z.ime.replace(/^Asocia.ia Jude.ean. de Fotbal /i, ''))}\t${z.ime}`)
  }
  const ravni = []
  for (const z of zupanije) {
    if (z === 'lpf') {
      // SuperLiga vodi LPF (Liga Profesionistă de Fotbal), ne FRF.
      const org = await odpri(stran, `${OSNOVNI}/rezultate`, (t) => t.organizationAbbreviation === 'LPF')
      ravni.push(['lpf', lige(odgovori, 'national/fotbal', org)])
    } else if (z === 'national') {
      // Državna tekmovanja so pod FRF (LPF ima le SuperLigo).
      const org = await odpri(stran, `${OSNOVNI}/rezultate`, (t) => t.organizationAbbreviation === 'FRF')
      ravni.push(['national', lige(odgovori, 'national/fotbal', org)])
    } else {
      const org = await odpri(stran, `${OSNOVNI}/rezultate/judetean/${z}`, (t) => slug(t.organizationName).endsWith(`-${z}`))
      ravni.push([z, lige(odgovori, `judetean/${z}/fotbal`, org)])
    }
  }
  for (const [ime, seznam] of ravni) {
    console.log(`\n== ${ime} (${seznam.length} skupin)`)
    for (const l of seznam) {
      if (l.izpusti && !argumenti.includes('--vse')) continue
      console.log(`${l.tekmovanje} · ${l.faza} · ${l.skupina}\t${l.koda}\t${l.krogov} krogov ${l.od}–${l.do}`)
      if (preveri && !l.izpusti) console.log(`    ${await preveriLigo(l.koda)}`)
    }
  }
} finally {
  await b.close()
}
