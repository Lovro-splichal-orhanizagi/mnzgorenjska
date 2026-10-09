// Seznam hrvaških lig za odrasle moške na HNS Semaforju — za migracijo, ki jih vpiše.
//
//   node scripts/hrvaske-lige.mjs                 # vse zveze: liga, šifra, arhiv, klubov
//   node scripts/hrvaske-lige.mjs --zveza 40      # ena zveza (oid, npr. 40 = ŽNS međimurski)
//   node scripts/hrvaske-lige.mjs --sql           # vrstice za `insert into competitions`
//
// Na koncu izpiše še trke imen: isto ime (ključ kluba) pri dveh klubih z
// različno šifro na Semaforju. Uvoz bi ju vpisal v isti zapis — enega
// preimenuj v `IME_KLUBA` (viri/hns.mjs), preden ligo uvoziš.
//
// Semafor tekmovanja našteje po sezoni in zvezi (`/handlers/getCompetitions/`,
// isti klic kot izbirnik na strani). Zveze so HNS (1), pet nogometnih središč
// in županijske zveze (ŽNS, NS) — vse v istem COMET-u. Mladinske, ženske,
// futsal, pokalne in kvalifikacije izpustimo. Arhiv (lanska sezona) poiščemo
// po imenu brez letnice, ker ima vsaka sezona svoj id.
import { IME_KLUBA, imeKluba, kljucKlubaHr } from './viri/hns.mjs'

const OSNOVNI = 'https://semafor.hns.family'
const GLAVE = { 'User-Agent': 'SLFF fantasy (https://slff.eu)' }
const SEZONA = '2026/2027'
const ARHIV = '2025/2026'
const IZPUSTI =
  /pionir|kadet|junior|žen|hnlž|nlž|futsal|mal[io]m? nogomet|hmnl|žmnl|veteran|\bw?u\s*-?\s*\d|karlić|limać|^m?žnl? |mžnl|žml|kup\b|cup\b|superkup|limač|početni|prednatjecat|ulaznih|pilot|prstić|zagić|tići|papalin|pilić|picek|pijetl|špiget|mladež|kvalifikac|popun|doigravanj|turnir|\bpio\b|^hnk$|supersport/i

const arg = (ime) => {
  const i = process.argv.indexOf(`--${ime}`)
  return i > 0 ? process.argv[i + 1] : null
}
const pocakaj = () => new Promise((r) => setTimeout(r, 400))
async function besedilo(url) {
  await pocakaj()
  const o = await fetch(url, { headers: GLAVE })
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  return o.text()
}
const razpakiraj = (s) =>
  String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()

/** Ime brez sezone in ločil: "1. ŽNL 26./27." in "1. ŽNL 25/26" sta ista liga. */
export const brezSezone = (ime) =>
  String(ime)
    .toLowerCase()
    .replace(/\b(20)?\d{2}\.?\s*\/\s*(20)?\d{2}\.?/g, ' ')
    .replace(/\b20\d{2}\b/g, ' ')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

async function zveze() {
  const html = await besedilo(`${OSNOVNI}/natjecanja/114560831/x/`)
  const sel = html.slice(html.indexOf('id="oid"'), html.indexOf('</select>', html.indexOf('id="oid"')))
  return [...sel.matchAll(/<option[^>]*value="(\d+)">([^<]+)/g)].map(([, oid, ime]) => ({ oid, ime: razpakiraj(ime) }))
}

async function tekmovanja(sezona, oid) {
  const q = new URLSearchParams({ season: sezona, oid, lang: 'hr', teamch: 'Club', linkType: 'competitions', linkConstructor: 'x' })
  const l = JSON.parse(await besedilo(`${OSNOVNI}/handlers/getCompetitions/?${q}`))
  return l.map((c) => ({ id: String(c.id), ime: razpakiraj(c.value) })).filter((c) => !IZPUSTI.test(c.ime))
}

// ključ kluba -> šifra kluba na Semaforju -> { ime, lige }
const poKljucu = new Map()

/** Klubi in odigrane tekme s strani tekmovanja. */
async function obseg(id) {
  const html = await besedilo(`${OSNOVNI}/natjecanja/${id}/x/`)
  const blok = html.slice(Math.max(0, html.indexOf('current_results')))
  const vrstice = new Map()
  for (const m of blok.matchAll(/data-match="(\d+)">[\s\S]*?<div class="res1">([^<]*)</g)) vrstice.set(m[1], m[2].trim())
  const klubi = new Set()
  for (const [, klub, ime] of blok.matchAll(/<div class="club[12]" data-id="(\d+)"><a[^>]*>([^<]*)/g)) {
    klubi.add(klub)
    const kljuc = kljucKlubaHr(imeKluba(razpakiraj(ime), klub))
    if (!poKljucu.has(kljuc)) poKljucu.set(kljuc, new Map())
    if (!poKljucu.get(kljuc).has(klub)) poKljucu.get(kljuc).set(klub, { ime: razpakiraj(ime), lige: new Set() })
    poKljucu.get(kljuc).get(klub).lige.add(id)
  }
  return { klubov: klubi.size, tekem: vrstice.size, odigranih: [...vrstice.values()].filter((r) => /^\d+$/.test(r)).length }
}

const izbrana = arg('zveza')
const vse = (await zveze()).filter((z) => !izbrana || z.oid === izbrana)
const sql = process.argv.includes('--sql')
for (const z of vse) {
  const lige = await tekmovanja(SEZONA, z.oid)
  if (!lige.length) continue
  const lani = await tekmovanja(ARHIV, z.oid)
  if (!sql) console.log(`\n${z.ime} (oid ${z.oid})`)
  for (const l of lige) {
    const arhiv = lani.find((x) => brezSezone(x.ime) === brezSezone(l.ime))
    const o = await obseg(l.id)
    if (sql) console.log(`    -- ${z.ime}\n    ('${brezSezone(l.ime)}', '${l.ime.replace(/'/g, "''")}', '${z.oid}', '${l.id}', '${arhiv?.id ?? ''}'),`)
    else
      console.log(
        `  ${l.ime.padEnd(42)} ${l.id}  arhiv ${(arhiv?.id ?? '—').padEnd(10)} klubov ${String(o.klubov).padStart(2)}  tekem ${o.odigranih}/${o.tekem}`,
      )
  }
}

const trki = [...poKljucu.values()].filter((k) => k.size > 1)
if (trki.length) {
  console.log(`\nIsto ime, drug klub (${trki.length}) — uvoz bi ju združil; enega dodaj v IME_KLUBA (viri/hns.mjs):`)
  for (const k of trki)
    console.log('  ' + [...k].map(([klub, v]) => `${v.ime} [${klub}${IME_KLUBA[klub] ? ' ✓' : ''}] lige ${[...v.lige].join(',')}`).join('  |  '))
}
