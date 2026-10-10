// Seznam romunskih lig odraslih na portalu županijskih zvez (www.frf-ajf.ro)
// — za migracijo, ki jih vpiše.
//
//   node scripts/romunske-lige.mjs valcea            # ena županija: liga, šifra 2026/27, arhiv 2025/26
//   node scripts/romunske-lige.mjs valcea sibiu      # več županij
//   node scripts/romunske-lige.mjs --vse             # vse županije (41 + Bukarešta; ~90 strani)
//   node scripts/romunske-lige.mjs valcea --preveri  # še zapisniki zadnjega odigranega kroga
//   node scripts/romunske-lige.mjs --trki            # isto ime kluba v dveh županijah (vpisane lige)
//
// Županija našteje tekmovanja sezone na `/<judet>/competitii-fotbal/<leto>`
// (2026 = 2026/27, 2025 = 2025/26; meni "Arhiva competiții"). Vsaka sezona
// ima svoj id, zato arhiv poiščemo po imenu (slug brez id-ja in letnic).
// Mladinske, ženske, futsal, pokale, turnirje in nadaljevanja (play-off,
// play-out) izpustimo.
//
// `--preveri` za vsako ligo prebere program in zapisnike zadnjega odigranega
// kroga ter pove, koliko jih je polnih (obe postavi), nepopolnih (ena ekipa,
// "le dogodki") in praznih — lige brez postav za fantasy niso uporabne.
//
// Vljudno kot vir: User-Agent z imenom in naslovom, 1,6 s med zahtevki. Ob
// 403, 429 ali izzivu se ustavi.
import frf, { razbijKodo, tekmePrograma, vZapisnik, naslovPrograma, kljucKlubaRo, jeIzziv } from './viri/frf.mjs'

const OSNOVNI = frf.osnovniNaslov
const IZPUSTI = /junior|juniori|interliga|feminin|fete|futsal|cupa|supercupa|copii|\bu-?\d|under|old-?boys|veteran|minifotbal|baraj|turneu|test|play-?off|play-?out|play-?stay|pregatire|amical|scoala|scolar/i

const argumenti = process.argv.slice(2)
const zastavica = (ime) => argumenti.includes(`--${ime}`)
let zadnji = 0
async function besedilo(url) {
  const cakaj = zadnji + frf.premorMs - Date.now()
  if (cakaj > 0) await new Promise((r) => setTimeout(r, cakaj))
  zadnji = Date.now()
  const o = await fetch(url, { headers: frf.glave })
  const t = await o.text()
  if (o.status === 403 || o.status === 429 || o.status === 503 || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  return t
}

/** Slug brez id-ja in letnic: "liga-4-seniori-2026-2027-16502" → "liga-4-seniori". */
export const brezSezone = (slug) =>
  String(slug)
    .replace(/-\d+$/, '')
    .replace(/-?(20\d{2})(-20\d{2})?/g, '')
    .replace(/^-+|-+$/g, '')

/**
 * Tekmovanja županije: [{ slug, ime, koda }]. Arhivska sezona (`leto`) ima na
 * `/<judet>/competitii-fotbal/<leto>` mrežo s `title`; tekoča je le v meniju
 * (povezave brez `title`), ki ga ima vsaka stran županije.
 */
async function tekmovanja(judet, leto, tekoca = false) {
  const html = await besedilo(`${OSNOVNI}/${judet}/competitii-fotbal/${leto}`)
  const vzorec = tekoca
    ? /href="https:\/\/www\.frf-ajf\.ro\/([a-z-]+)\/competitii-fotbal\/([a-z0-9-]+-\d+)">([^<]*)</g
    : /href="(?:https:\/\/www\.frf-ajf\.ro)?\/([a-z-]+)\/competitii-fotbal\/([a-z0-9-]+-\d+)"\s+title="([^"]*)"/g
  const out = new Map()
  for (const m of html.matchAll(vzorec)) {
    if (m[1] !== judet || IZPUSTI.test(m[2])) continue
    out.set(m[2], { slug: m[2], ime: m[3].trim(), koda: `${judet}/${m[2]}` })
  }
  return [...out.values()]
}

async function zupanije() {
  const html = await besedilo(OSNOVNI)
  return [...new Set([...html.matchAll(/href="https:\/\/www\.frf-ajf\.ro\/([a-z-]+)"/g)].map((m) => m[1]))].filter((j) => j !== 'test')
}

async function preveri(koda) {
  const { judet } = razbijKodo(koda)
  const tekme = tekmePrograma(await besedilo(naslovPrograma(koda)), judet)
  const odigrane = tekme.filter((t) => t.izid && t.url)
  if (!odigrane.length) return 'ni odigranih tekem'
  const krog = Math.max(...odigrane.map((t) => t.krog))
  const s = { polni: 0, nepopolni: 0, prazni: 0 }
  for (const t of odigrane.filter((x) => x.krog === krog)) {
    const z = vZapisnik(await besedilo(t.url), { judet })
    if (!z) continue
    if (z.prazen) s.prazni++
    else if (z.nepopoln) s.nepopolni++
    else s.polni++
  }
  const klubov = new Set(tekme.flatMap((t) => [t.domaci, t.gostje])).size
  return `${klubov} klubov, ${krog}. krog: ${s.polni} polnih, ${s.nepopolni} nepopolnih, ${s.prazni} praznih`
}

// --- trki imen klubov med županijami (vpisane lige, obe sezoni) ------------
if (zastavica('trki')) {
  const { readFileSync, readdirSync } = await import('node:fs')
  const kode = new Set()
  for (const f of readdirSync('supabase/migrations').filter((x) => /romunija.*lige|frf/.test(x)))
    for (const m of readFileSync(`supabase/migrations/${f}`, 'utf8').matchAll(/'([a-z-]+\/[a-z0-9-]+-\d+)'/g)) kode.add(m[1])
  const arhivi = argumenti.filter((a) => /^[a-z-]+\/[a-z0-9-]+-\d+$/.test(a))
  for (const a of arhivi) kode.add(a)
  const kje = new Map() // ključ kluba → Set(judet)
  for (const koda of kode) {
    const { judet } = razbijKodo(koda)
    for (const t of tekmePrograma(await besedilo(naslovPrograma(koda)), judet))
      for (const ime of [t.domaci, t.gostje]) {
        const k = kljucKlubaRo(ime)
        if (!kje.has(k)) kje.set(k, { ime, judeti: new Set() })
        kje.get(k).judeti.add(judet)
      }
  }
  const trki = [...kje.values()].filter((x) => x.judeti.size > 1)
  console.log(`${kode.size} strani, ${kje.size} klubov, trkov: ${trki.length}`)
  for (const t of trki) console.log(`  ${t.ime}: ${[...t.judeti].join(', ')}`)
  process.exit(0)
}

const izbrane = zastavica('vse') ? await zupanije() : argumenti.filter((a) => !a.startsWith('--') && !a.includes('/'))
if (!izbrane.length) {
  console.error('Uporaba: node scripts/romunske-lige.mjs <judet> [<judet> …] [--preveri] | --vse | --trki')
  process.exit(1)
}

for (const judet of izbrane) {
  const tekoce = await tekmovanja(judet, 2026, true)
  const arhiv = await tekmovanja(judet, 2025)
  console.log(`\n== ${judet} (${tekoce.length} lig)`)
  for (const t of tekoce) {
    const lani = arhiv.filter((a) => brezSezone(a.slug) === brezSezone(t.slug))
    const vrstica = `  ${t.ime.padEnd(44)} ${t.koda.padEnd(52)} arhiv: ${lani.map((a) => a.koda).join(', ') || '—'}`
    console.log(zastavica('preveri') ? `${vrstica}\n      ${await preveri(t.koda)}` : vrstica)
  }
}
