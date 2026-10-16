// Lige odraslih na spletiščih EPS, ki jih gosti Mascotnet (vir `mascot`) — za
// migracijo, ki jih vpiše, in za preizkus pred uvozom (brez baze).
//
//   node scripts/mascot-lige.mjs                         # vse domene: lige iz menija, krogi, tekme, odigrane
//   node scripts/mascot-lige.mjs epsm.gr epspellas.gr    # le nekatere domene
//   node scripts/mascot-lige.mjs --preveri               # še vsi zapisniki odigranih tekem (po poti uvoza)
//   node scripts/mascot-lige.mjs --preveri --najvec 8    # le prvih 8 zapisnikov vsake lige
//   node scripts/mascot-lige.mjs --trki                  # isto ime kluba v dveh zvezah (in pri viru eps)
//   ... --mapa /tmp/gr                                    # predpomnilnik (privzeto scripts/.predpomnilnik/mascot)
//
// Lige so v meniju domene (`table.asp?diorganosi=…`, brez zakomentiranih).
// Odrasle so Α1/Α/Β/Γ Ερασιτεχνική; mladinske (Κ…), ženske, mešane (ΜΙΚΤΩΝ),
// pokal, play-off/out in Γ Εθνική (raven 3, vodi jo EPO) izpustimo.
//
// Vljudno kot vir: User-Agent SLFF, 3 s med zahtevki. Ob 401/403/429 ali
// izzivu se ustavi z izhodom 4 (pisno dovoljenje upravljavca NE pokriva
// tehnične zaščite — ne obhajaj).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import vir, { DOMENE, entitete, kljucKlubaGr, imeKluba, naslovRazporeda, tekmeRazporeda, jeStranLige, imeRazporeda } from './viri/mascot.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const argumenti = process.argv.slice(2)
const zastavica = (ime) => argumenti.includes(`--${ime}`)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}
const MAPA = vrednost('mapa') ?? 'scripts/.predpomnilnik/mascot'
process.env.SLFF_MASCOT_MAPA ??= MAPA
mkdirSync(MAPA, { recursive: true })
const najvec = vrednost('najvec') ? Number(vrednost('najvec')) : Infinity

// Isti prenos kot uvoz zapisnikov: predpomnilnik (le strani, ki jih vir
// sprejme), sveže na zahtevo, vir.fetch ustavi ob zavrnitvi.
let zahtevkov = 0
async function prenesi(url, ime, sveze = false) {
  const pot = `${MAPA}/${ime}`
  if (!sveze && existsSync(pot)) {
    const s = readFileSync(pot, 'utf8')
    if (vir.zaPredpomnilnik(s, ime)) return s
  }
  zahtevkov++
  let o
  try {
    o = await prenesiSPonovitvami(url, { glave: vir.glave, premorMs: vir.premorMs, fetchFn: vir.fetch, log: () => {} })
  } catch (e) {
    if (e.zavrnitev) {
      console.error(`Ustavljeno: ${e.message}`)
      process.exit(4)
    }
    throw e
  }
  if (!o.ok) throw Object.assign(new Error(`${url} -> HTTP ${o.status}`), { status: o.status })
  const t = await o.text()
  if (vir.zaPredpomnilnik(t, ime)) writeFileSync(pot, t)
  return t
}

const ODRASLE = /ΕΡΑΣΙΤΕΧΝΙΚΗ|ΠΡΩΤΑΘΛΗΜΑ Α/
const IZPUSTI = /PLAY|ΚΥΠΕΛΛ|ΓΥΝΑΙΚ|[ΚK]\s?\d|ΜΙΚΤ|ΥΠΟΔΟΜ|ΕΘΝΙΚ|ΒΕΤΕΡΑΝ|ΠΑΛΑΙΜ/

/** Lige domene iz menija naslovnice (zakomentirane izpadejo). */
async function ligeDomene(domena) {
  const html = (await prenesi(`https://www.${domena}/`, `mascot-naslovnica-${DOMENE[domena].zveza}.html`, true)).replace(/<!--[\s\S]*?-->/g, '')
  const vse = [...new Set([...html.matchAll(/href="table\.asp\?diorganosi=([^"]*)"/g)].map((m) => entitete(m[1]).trim()))]
  return { odrasle: vse.filter((l) => ODRASLE.test(l) && !IZPUSTI.test(l)), izpuscene: vse.filter((l) => !ODRASLE.test(l) || IZPUSTI.test(l)) }
}

const domene = argumenti.filter((a) => DOMENE[a])
const izbrane = domene.length ? domene : Object.keys(DOMENE)

/** Preizkus lige po poti uvoza: razpored, zapisniki, nastopi. */
async function preveri(koda, html) {
  // Razpored je že prebran (spodaj); vir ga dobi iz pomnilnika, ne še enkrat z vira.
  const zPomnilnika = (url, ime, sveze) => (ime === imeRazporeda(koda) ? html : prenesi(url, ime, sveze))
  const zs = (await vir.zapisniki(koda, zPomnilnika)).slice(0, najvec)
  const s = { zapisnikov: zs.length, nepopolnih: 0, goliOk: 0, goliNe: 0, postav11: 0, postav: 0, menjav: 0, sKlopi: 0, ekip990: 0, ekip: 0, brezDresa: 0, opozoril: 0 }
  const primeri = []
  for (const { id, z } of zs) {
    if (z.nepopoln) s.nepopolnih++
    const n = vir.nastopi(z)
    s.menjav += z.menjave.length
    s.sKlopi += n.filter((x) => !x.zacetnik).length
    s.brezDresa += n.filter((x) => x.st == null).length
    for (const [idx, e] of [z.domaci, z.gostje].entries()) {
      if (!e.postava.length) continue
      s.postav++
      if (e.postava.length === 11) s.postav11++
      s.ekip++
      if (n.filter((x) => x.ekipaIdx === idx).reduce((v, x) => v + x.minute, 0) === 990) s.ekip990++
    }
    const zaEkipo = (idx) => z.goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
    if (!z.nepopoln) (zaEkipo(0) === z.rezultat.domaci && zaEkipo(1) === z.rezultat.gostje ? s.goliOk++ : s.goliNe++)
    s.opozoril += z.opozorila.length
    for (const o of z.opozorila) if (primeri.length < 6) primeri.push(`${id}: ${o}`)
  }
  return { s, primeri }
}

const vrstice = []
const klubi = new Map() // ključ → Set(domena)
const imenaKlubov = new Map()
for (const domena of izbrane) {
  let lige
  try {
    lige = await ligeDomene(domena)
  } catch (e) {
    console.log(`== ${domena}: ${e.message}`)
    continue
  }
  console.log(`\n== ${domena} (${DOMENE[domena].ime}): ${lige.odrasle.length} lig odraslih; izpuščene: ${lige.izpuscene.join(' | ') || '—'}`)
  for (const l of lige.odrasle) {
    const koda = `${domena}:${l}`
    let html
    try {
      html = await prenesi(naslovRazporeda(koda), imeRazporeda(koda), true)
    } catch (e) {
      console.log(`   ${l}: ${e.message}`)
      continue
    }
    let tekme = []
    try {
      tekme = tekmeRazporeda(html)
    } catch (e) {
      console.log(`   ${l}: ${e.message}`)
      continue
    }
    // Imena po `IME_V_ZVEZI` (kot jih vpiše uvoz), da --trki pokaže le še nerazrešene.
    const kl = new Set(tekme.flatMap((t) => [imeKluba(t.domaci, domena), imeKluba(t.gostje, domena)]))
    for (const k of kl) {
      const kk = kljucKlubaGr(k)
      if (!klubi.has(kk)) klubi.set(kk, new Set())
      klubi.get(kk).add(domena)
      imenaKlubov.set(`${domena}|${kk}`, k)
    }
    const krogov = new Set(tekme.map((t) => t.krog)).size
    const odigranih = tekme.filter((t) => t.izid).length
    const datumi = tekme.map((t) => t.datum).filter(Boolean).sort()
    const vrsta = `   ${l}: ${jeStranLige(html, l) ? '' : '(NASLOV SE NE UJEMA) '}krogov ${krogov}, tekem ${tekme.length}, klubov ${kl.size}, odigranih ${odigranih} (s stranjo ${tekme.filter((t) => t.izid && t.igra).length}, brez borbe ${tekme.filter((t) => t.brezBorbe).length}), z datumom ${datumi.length} (${datumi[0] ?? '—'} … ${datumi.at(-1) ?? '—'})`
    console.log(vrsta)
    if (zastavica('preveri') && odigranih) {
      try {
        const { s, primeri } = await preveri(koda, html)
        console.log(`      zapisnikov ${s.zapisnikov} (nepopolnih ${s.nepopolnih}), goli = izid ${s.goliOk}/${s.goliOk + s.goliNe}, postav po 11 ${s.postav11}/${s.postav}, menjav ${s.menjav} (nastopov s klopi ${s.sKlopi}, brez dresa ${s.brezDresa}), 990 minut ${s.ekip990}/${s.ekip}, opozoril ${s.opozoril}`)
        for (const p of primeri) console.log(`        ${p}`)
        vrstice.push({ koda, krogov, tekem: tekme.length, klubov: kl.size, odigranih, ...s })
      } catch (e) {
        console.log(`      PREIZKUS PADEL: ${e.message}`)
      }
    } else vrstice.push({ koda, krogov, tekem: tekme.length, klubov: kl.size, odigranih })
  }
}

if (zastavica('trki')) {
  console.log('\nIsto ime kluba v več zvezah Mascotneta:')
  for (const [k, d] of klubi) if (d.size > 1) console.log(`   ${[...d].map((x) => `${x}: ${imenaKlubov.get(`${x}|${k}`)}`).join('  ·  ')}`)
  const eps = vrednost('eps')
  if (eps) {
    // Seznam imen klubov vira eps (ena vrstica na klub, `<domena>\t<ime>`).
    console.log('\nIsto ime kluba pri viru eps:')
    for (const v of readFileSync(eps, 'utf8').split('\n').filter(Boolean)) {
      const [d, ime] = v.split('\t')
      const kk = kljucKlubaGr(ime)
      if (klubi.has(kk)) console.log(`   eps ${d}: ${ime}  ·  ${[...klubi.get(kk)].map((x) => `${x}: ${imenaKlubov.get(`${x}|${kk}`)}`).join('  ·  ')}`)
    }
  }
}
if (vrednost('json')) writeFileSync(vrednost('json'), JSON.stringify(vrstice, null, 1))
console.log(`\nZahtevkov: ${zahtevkov}`)
