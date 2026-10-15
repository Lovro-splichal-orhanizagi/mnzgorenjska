// Seznam norveških lig odraslih na fotball.no — za migracijo, ki jih vpiše,
// in preizkus vira `nff`.
//
//   node scripts/norveske-lige.mjs                          # skupine 2026 z arhivom 2025: klubi, krogi, odigrane
//   node scripts/norveske-lige.mjs --preveri 4              # + vzorec 4 zapisnikov na skupino in sezono
//   node scripts/norveske-lige.mjs --nivo 6 --preveri 4     # še 6. divisjon (privzeto do 5.)
//   node scripts/norveske-lige.mjs --krets 4                # le en krets (4 = Oslo, 1 = NFF)
//   node scripts/norveske-lige.mjs --polno 205686           # vsi zapisniki ene skupine
//   node scripts/norveske-lige.mjs --mapa /tmp/no           # predpomnilnik strani (ponoven zagon brez omrežja)
//   node scripts/norveske-lige.mjs --json /tmp/no.json      # rezultat še v JSON
//
// Skupine najde na straneh "Finn kamper" (`/turneringer/?d=<krets>&s=<sezona>`):
// NFF (d=1) vodi 2. in 3. divisjon (PostNord-ligaen / "2 divisjon", Norsk
// Tipping-ligaen), kretsi 4. divisjon in nižje. OBOS-ligaen na seznamu NFF ni,
// zato je id vpisan spodaj (`OBOS`). Izpusti kvalifikacije, KM, sluttspill,
// treningskamper, ženske, mladinske, veterane in 7er.
//
// Pokritost (`--preveri N`): za vsako skupino in sezono N odigranih tekem,
// enakomerno čez sezono (kontumacije ne štejejo). Zapisnik je poln, če imata
// obe ekipi postavo (7–11 začetnikov; več kot 11 pomeni, da je klub vpisal vse
// kot začetnike) in so goli iz dogodkov enaki izidu. Ekipa "z menjavami" ima vsaj
// eno menjavo z minuto.
//
// Vljudno kot vir: User-Agent SLFF, 3 s med zahtevki. Ob 401, 403, 429 ali
// izzivu se ustavi (izhod 4) — ne obhajaj. NFF je zajem pisno dovolil
// (Lovro, oktober 2026), robots.txt pa splošnim robotom prepoveduje vse: skripta
// je za pregled, ne za pometanje — vzorec naj ostane majhen.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import nff, {
  naslovRazporeda, naslovZapisnika, vrsticeRazporeda, glavaTurnirja, vZapisnik, nastopi, jeIzziv, jeZavrnitev,
  jeStranTekme, jeStranTurnirja, kljucKlubaNo,
} from './viri/nff.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const OSNOVNI = nff.osnovniNaslov
// Sezona na fotball.no ni letnica: 110 = 2026, 107 = 2025, 105 = 2024.
const SEZONE = { 2026: 110, 2025: 107, 2024: 105 }
// OBOS-ligaen (2. raven) ni na seznamu NFF "Finn kamper".
const OBOS = { 2026: '206093', 2025: '199422' }
const KRETSER = {
  1: 'NFF', 19: 'Agder', 3: 'Akershus', 6: 'Buskerud', 16: 'Finnmark', 10: 'Hordaland', 18: 'Hålogaland',
  5: 'Indre Østland', 14: 'Nordland', 12: 'Nordmøre og Romsdal', 4: 'Oslo', 9: 'Rogaland', 11: 'Sogn og Fjordane',
  17: 'Sunnmøre', 8: 'Telemark', 15: 'Troms', 13: 'Trøndelag', 7: 'Vestfold', 2: 'Østfold',
}
const IZPUSTI = /kvinne|\bkvi\b|jente|\b[GJ]\d|\bM\d\d|\b\d+er\b|futsal|kval|\bKM\b|sluttsp|trening|vinner|opprykk|pokal|breddepulje|veteran|old ?boys|junior|ungdom|reserve|rekrutt|\bU\d\d/i

const argumenti = process.argv.slice(2)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}
const mapa = vrednost('mapa')
if (mapa && !existsSync(mapa)) mkdirSync(mapa, { recursive: true })
const nivo = Number(vrednost('nivo') ?? 5)
let zahtevkov = 0

async function besedilo(url, preveri = () => true) {
  const pot = mapa && `${mapa}/${url.replace(/^https?:\/\/[^/]+\//, '').replace(/[^\w.-]+/g, '_')}.html`
  if (pot && existsSync(pot)) return readFileSync(pot, 'utf8')
  zahtevkov++
  const o = await prenesiSPonovitvami(url, { glave: nff.glave, premorMs: nff.premorMs, log: () => {} })
  const t = await o.text()
  if (jeZavrnitev(o.status) || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(4)
  }
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  // Napaka s statusom 200 ne gre v predpomnilnik.
  if (pot && preveri(t)) writeFileSync(pot, t)
  return t
}

const razpakiraj = (s) => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

/** Raven: 2 = OBOS, 3 = 2. divisjon, 4 = 3. divisjon (Norsk Tipping-ligaen), 5 = 4. div … */
function raven(ime) {
  ime = ime.replace(/^.*?\s-\s(?=\d)/, '') // "Mii-Met-Vi - 4. div Menn"
  if (/OBOS/i.test(ime)) return 2
  // 4. divisjon s sponzorskim imenom (Østfold: "Amedialigaen").
  if (/^Amedialigaen$/i.test(ime)) return 5
  if (/PostNord|^\s*2\.?\s*div/i.test(ime)) return 3
  if (/Norsk Tipping-ligaen|^\s*3\.?\s*div/i.test(ime)) return 4
  const d = ime.match(/^\s*(\d)\.?\s*div/i)?.[1]
  return d ? Number(d) + 1 : null
}

async function skupine(leto) {
  const out = []
  const kretsi = vrednost('krets') ? [vrednost('krets')] : Object.keys(KRETSER)
  for (const d of kretsi) {
    const html = await besedilo(`${OSNOVNI}/turneringer/?d=${d}&s=${SEZONE[leto]}`, (t) => /id="s"/.test(t))
    for (const m of html.matchAll(/href="\/fotballdata\/turnering\/hjem\/\?fiksId=(\d+)"[^>]*aria-label="([^"]*)"/g)) {
      const ime = razpakiraj(m[2]).replace(/\s+/g, ' ').trim()
      const r = raven(ime)
      if (!r || r > nivo + 1 || IZPUSTI.test(ime)) continue
      if (d !== '1' && r < 5) continue // 2. in 3. divisjon sta pri NFF
      if (d === '1' && r >= 5) continue
      out.push({ krets: KRETSER[d], d, id: m[1], ime, raven: r })
    }
    if (d === '1' && OBOS[leto]) out.unshift({ krets: 'NFF', d, id: OBOS[leto], ime: 'OBOS-ligaen', raven: 2 })
  }
  return out
}

function povzetek(html) {
  const v = vrsticeRazporeda(html)
  const klubi = new Set(v.flatMap((t) => [kljucKlubaNo(t.domaci), kljucKlubaNo(t.gostje)]))
  const { ime, leto } = glavaTurnirja(html)
  return { ime, leto, vrstice: v, klubi, krogov: new Set(v.map((t) => t.krog)).size, odigranih: v.filter((t) => t.izid).length }
}

/** N tekem, enakomerno čez odigrane. */
const vzorec = (xs, n) => (xs.length <= n ? xs : Array.from({ length: n }, (_, i) => xs[Math.floor(((i + 0.5) * xs.length) / n)]))

async function prestej(tekme) {
  const s = { postavNad11: 0, kontumacij: 0, zapisnikov: 0, polnih: 0, goliIzid: 0, nepopolnih: 0, brezStrani: 0, ekip: 0, zMenjavami: 0, postav11: 0, nastopov: 0, sKlopi: 0, opozoril: 0, minute990: 0, primeri: [] }
  for (const t of tekme) {
    const html = await besedilo(naslovZapisnika(t.id), jeStranTekme)
    const z = jeStranTekme(html) ? vZapisnik(html, { id: t.id }) : null
    if (z?.kontumacija) { s.kontumacij++; continue } // "møtte ikke": ni tekme, ne šteje
    s.zapisnikov++
    if (!z) { s.brezStrani++; s.primeri.push(`${t.id}: ni zapisnika`); continue }
    const goliOk = !z.opozorila.some((o) => o.startsWith('goli iz dogodkov'))
    // Več kot 11 "začetnikov": klub je vpisal vse igralce kot začetnike (leteče
    // menjave brez minut) — kdo je začel, ne vemo, zato zapisnik ni poln.
    const nad11 = [z.domaci, z.gostje].filter((e) => e.postava.length > 11).length
    s.postavNad11 += nad11
    if (z.nepopoln) { s.nepopolnih++; s.primeri.push(`${t.id}: ${z.opozorila[0]}`) }
    else if (goliOk) s.goliIzid++
    if (!z.nepopoln && goliOk && !nad11) s.polnih++
    else if (!z.nepopoln) s.primeri.push(`${t.id}: ${nad11 ? `postava z več kot 11 začetniki (${nad11})` : z.opozorila.find((o) => o.startsWith('goli iz dogodkov'))}`)
    const n = nastopi(z)
    for (const [idx, e] of [z.domaci, z.gostje].entries()) {
      if (!e.postava.length) continue
      s.ekip++
      if (e.postava.length === 11) s.postav11++
      if (!z.brezMenjav[idx] && z.menjave.some((m) => m.ekipaIdx === idx)) s.zMenjavami++
      if (n.filter((x) => x.ekipaIdx === idx).reduce((a, x) => a + x.minute, 0) === 990) s.minute990++
    }
    s.nastopov += n.length
    s.sKlopi += n.filter((x) => !x.zacetnik).length
    s.opozoril += z.opozorila.length
  }
  return s
}

const odstotek = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : '—')
const vrstica = (s) =>
  `${s.polnih}/${s.zapisnikov} polnih (${odstotek(s.polnih, s.zapisnikov)}), nepopolnih ${s.nepopolnih}, kontumacij ${s.kontumacij}, ` +
  `ekip z menjavami ${s.zMenjavami}/${s.ekip}, postav po 11 ${s.postav11}/${s.ekip} (nad 11: ${s.postavNad11}), 990 minut ${s.minute990}/${s.ekip}`

const polno = vrednost('polno')
if (polno) {
  const p = povzetek(await besedilo(naslovRazporeda(polno), jeStranTurnirja))
  const tekme = p.vrstice.filter((t) => t.id && t.izid)
  console.log(`${p.ime} ${p.leto}: ${p.krogov} krogov, ${p.vrstice.length} tekem, ${tekme.length} odigranih, ${p.klubi.size} klubov`)
  const s = await prestej(tekme)
  console.log(vrstica(s))
  console.log(`Nastopov ${s.nastopov} (s klopi ${s.sKlopi}); opozoril ${s.opozoril}; zahtevkov ${zahtevkov}`)
  for (const x of s.primeri) console.log(`  ${x}`)
  process.exit(0)
}

const preveri = Number(vrednost('preveri') ?? 0)
const tekoce = await skupine(2026)
const arhivske = await skupine(2025)
// Arhiv: skupina 2025 istega kretsa in ravni z največ skupnimi klubi; vsak
// arhiv ima ena sama liga (`matches.zapisnik_id` je enoličen).
for (const g of [...tekoce, ...arhivske]) g.p = povzetek(await besedilo(naslovRazporeda(g.id), jeStranTurnirja))
const pari = []
for (const g of tekoce)
  for (const a of arhivske.filter((x) => x.d === g.d && x.raven === g.raven))
    pari.push({ g, a, skupnih: [...g.p.klubi].filter((k) => a.p.klubi.has(k)).length })
pari.sort((x, y) => y.skupnih - x.skupnih)
const arhivZa = new Map()
const porabljen = new Set()
for (const { g, a, skupnih } of pari) {
  if (skupnih < 2 || arhivZa.has(g.id) || porabljen.has(a.id)) continue
  arhivZa.set(g.id, { a, skupnih })
  porabljen.add(a.id)
}
const izid = []
console.log('raven | krets | skupina | 2026 | klubov | krogov | odigranih | arhiv 2025 | klubov | skupnih | odigranih')
for (const g of tekoce) {
  const { p } = g
  const { a = null, skupnih = 0 } = arhivZa.get(g.id) ?? {}
  const pa = a?.p ?? null
  const r = { krets: g.krets, d: g.d, id: g.id, ime: g.ime, raven: g.raven, klubov: p.klubi.size, krogov: p.krogov, odigranih: p.odigranih, arhiv: a?.id ?? null, arhivIme: a?.ime ?? null, arhivKlubov: pa?.klubi.size ?? 0, skupnih, arhivOdigranih: pa?.odigranih ?? 0, klubi: [...p.klubi] }
  console.log(`${g.raven} | ${g.krets} | ${g.ime} | ${g.id} | ${r.klubov} | ${r.krogov} | ${r.odigranih} | ${a ? `${a.id} ${a.ime}` : '—'} | ${r.arhivKlubov} | ${skupnih} | ${r.arhivOdigranih}`)
  if (preveri) {
    r.vzorec2026 = await prestej(vzorec(p.vrstice.filter((t) => t.id && t.izid), preveri))
    console.log(`    2026: ${vrstica(r.vzorec2026)}`)
    if (pa) {
      r.vzorec2025 = await prestej(vzorec(pa.vrstice.filter((t) => t.id && t.izid), preveri))
      console.log(`    2025: ${vrstica(r.vzorec2025)}`)
    }
    for (const x of [...(r.vzorec2026?.primeri ?? []), ...(r.vzorec2025?.primeri ?? [])]) console.log(`      ${x}`)
  }
  izid.push(r)
}
// Isto ime kluba v dveh skupinah iste sezone: lahko je isti klub (druga ekipa)
// ali dva kluba — preveri pred uvozom.
const kje = new Map()
for (const r of izid) for (const k of r.klubi) kje.set(k, [...(kje.get(k) ?? []), r.ime + ' (' + r.krets + ')'])
const trki = [...kje.entries()].filter(([, v]) => v.length > 1)
if (trki.length) {
  console.log('Isto ime v več skupinah 2026:')
  for (const [k, v] of trki) console.log(`  ${k}: ${v.join(', ')}`)
}
console.log(`Zahtevkov: ${zahtevkov}`)
if (vrednost('json')) writeFileSync(vrednost('json'), JSON.stringify(izid, null, 1))
