// Seznam estonskih lig odraslih na jalgpall.ee — za migracijo, ki jih vpiše,
// in preizkus vira `jalgpall`.
//
//   node scripts/eesti-lige.mjs                     # lige 2026: klubi, krogi, zapisniki, sezone za arhiv
//   node scripts/eesti-lige.mjs --leto 2025         # ista slika za arhivsko leto
//   node scripts/eesti-lige.mjs --preveri           # še zapisniki zadnjega odigranega kroga
//   node scripts/eesti-lige.mjs --polno 52/2025     # vsi zapisniki ene lige: goli = izidi, 11 + 11, šifre, pozicije
//   node scripts/eesti-lige.mjs --polno 52/2025 --mapa /tmp/ee   # z mapo za predpomnilnik
//
// Lige najde v meniju strani "Teine liiga ja madalamad liigad"
// (`/voistlused/madalamad-liigad/<id>/<slug>`) in doda Premium liigo,
// Esiliigo in Esiliigo B. Kvalifikacij (üleminekumängud), zaključnih turnirjev
// (võitja) in arhiva starih lig ne našteje.
//
// Vljudno kot vir: User-Agent SLFF, 5 s med zahtevki (robots.txt: Crawl-Delay
// 5). Ob 403, 429 ali izzivu se ustavi.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import jalgpall, {
  naslovRazporeda, naslovZapisnika, vrsticeRazporeda, sezonaStrani, vZapisnik, nastopi, jeIzziv,
} from './viri/jalgpall.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const OSNOVNI = jalgpall.osnovniNaslov
const VRH = ['52', '53', '186'] // Premium liiga, Esiliiga, Esiliiga B
const IZPUSTI = /uleminekumangud|voitja|arhiiv/i

const argumenti = process.argv.slice(2)
const zastavica = (ime) => argumenti.includes(`--${ime}`)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}
const mapa = vrednost('mapa')
if (mapa && !existsSync(mapa)) mkdirSync(mapa, { recursive: true })

async function besedilo(url) {
  const pot = mapa && `${mapa}/${url.replace(/^https?:\/\/[^/]+\//, '').replace(/[^\w.-]+/g, '_')}.html`
  if (pot && existsSync(pot)) return readFileSync(pot, 'utf8')
  const o = await prenesiSPonovitvami(url, { glave: jalgpall.glave, premorMs: jalgpall.premorMs, log: () => {} })
  const t = await o.text()
  if (o.status === 403 || o.status === 429 || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  if (pot) writeFileSync(pot, t)
  return t
}

/** Id-ji lig: vrh in spodnje lige iz menija. */
async function lige() {
  const html = await besedilo(`${OSNOVNI}/voistlused/536/madalamad-liigad`)
  const spodnje = [...html.matchAll(/href="\/voistlused\/madalamad-liigad\/(\d+)\/([^"]+)"/g)]
    .filter((m) => !IZPUSTI.test(m[2]))
    .map((m) => m[1])
  return [...new Set([...VRH, ...spodnje])]
}

/** Povzetek strani razporeda ene lige in leta. */
function povzetek(html) {
  const vrstice = vrsticeRazporeda(html)
  const klubi = new Set(vrstice.flatMap((t) => [t.domaci, t.gostje]))
  return {
    ime: html.match(/<h1>([^<]*)<\/h1>/)?.[1].trim() ?? '?',
    leto: sezonaStrani(html),
    sezone: [...html.matchAll(/<option\s+(?:selected\s+)?value="(\d{4})"/g)].map((m) => m[1]),
    vrstice,
    klubi,
    krogov: new Set(vrstice.map((t) => t.krog)).size,
  }
}

/** Preštej zapisnike: [{ id, z }] → številke za izpis. */
function prestej(zapisniki) {
  const s = { zapisnikov: 0, golovSeUjema: 0, golov: 0, postav11: 0, postav: 0, nastopov: 0, sSifro: 0, sKlopi: 0, zacetnikov: 0, sPozicijo: 0, vratarjev1: 0, opozoril: 0 }
  for (const { z } of zapisniki) {
    s.zapisnikov++
    s.golov += z.rezultat.domaci + z.rezultat.gostje
    if (!z.opozorila.some((o) => o.startsWith('goli iz dogodkov'))) s.golovSeUjema++
    for (const e of [z.domaci, z.gostje]) {
      s.postav++
      if (e.postava.length === 11) s.postav11++
      if (e.postava.filter((i) => i.vratar).length === 1) s.vratarjev1++
      s.zacetnikov += e.postava.length
      s.sPozicijo += e.postava.filter((i) => i.pozicija).length
    }
    const n = nastopi(z)
    s.nastopov += n.length
    s.sSifro += n.filter((x) => x.regSt).length
    s.sKlopi += n.filter((x) => !x.zacetnik).length
    s.opozoril += z.opozorila.length
  }
  return s
}

async function zapisnikiTekem(tekme) {
  const out = []
  for (const t of tekme) {
    const z = vZapisnik(await besedilo(naslovZapisnika(t.id)), { id: t.id })
    if (z) out.push({ id: t.id, z, t })
    else console.log(`    ${t.id} ${t.domaci} : ${t.gostje}: zapisnik brez izida ali postave`)
  }
  return out
}

const polno = vrednost('polno')
if (polno) {
  const html = await besedilo(naslovRazporeda(polno))
  const p = povzetek(html)
  const odigrane = p.vrstice.filter((t) => t.odigrana)
  const kontumacije = p.vrstice.filter((t) => t.kontumacija)
  const zZapisnikom = p.vrstice.filter((t) => t.id && t.izid && !t.kontumacija)
  console.log(`${p.ime} ${p.leto}: ${p.krogov} krogov, ${p.vrstice.length} tekem, ${odigrane.length} odigranih, ` +
    `${kontumacije.length} kontumacij, ${zZapisnikom.length} z zapisnikom, ${p.klubi.size} klubov`)
  const zapisniki = await zapisnikiTekem(zZapisnikom)
  const s = prestej(zapisniki)
  const izidi = zapisniki.reduce((a, { t }) => a + t.izid.domaci + t.izid.gostje, 0)
  console.log(`Zapisnikov ${s.zapisnikov}; goli (izidi zapisnikov) ${s.golov}, izidi razporeda ${izidi}; goli = izid v ${s.golovSeUjema}`)
  console.log(`Postav po 11: ${s.postav11}/${s.postav}; en vratar (VV): ${s.vratarjev1}/${s.postav}; ` +
    `začetnikov s pozicijo ${s.sPozicijo}/${s.zacetnikov}`)
  console.log(`Nastopov ${s.nastopov} (s klopi ${s.sKlopi}), s šifro ${s.sSifro}; opozoril ${s.opozoril}`)
  for (const { id, z } of zapisniki) for (const o of z.opozorila) console.log(`  ${id}: ${o}`)
  process.exit(0)
}

const leto = vrednost('leto') ?? String(new Date().getFullYear())
console.log(`liga | ime | klubov | krogov | tekem | odigranih | kontumacij | zapisnikov | sezone`)
for (const id of await lige()) {
  const koda = `${id}/${leto}`
  const html = await besedilo(naslovRazporeda(koda))
  const p = povzetek(html)
  if (/üleminekum|võitja/i.test(p.ime)) continue // kvalifikacije in zaključni turnirji (id 560 ima slug brez oznake)
  if (p.leto !== leto) {
    console.log(`${koda} | ${p.ime} | sezone ${leto} ni (stran kaže ${p.leto})`)
    continue
  }
  const odigrane = p.vrstice.filter((t) => t.odigrana)
  console.log(
    `${koda} | ${p.ime} | ${p.klubi.size} | ${p.krogov} | ${p.vrstice.length} | ${odigrane.length} | ` +
      `${p.vrstice.filter((t) => t.kontumacija).length} | ${p.vrstice.filter((t) => t.id).length} | ${p.sezone.join(',')}`,
  )
  if (!zastavica('preveri')) continue
  const zadnji = Math.max(0, ...p.vrstice.filter((t) => t.id && t.izid && !t.kontumacija).map((t) => t.krog))
  const tekme = p.vrstice.filter((t) => t.krog === zadnji && t.id && t.izid && !t.kontumacija).slice(0, 2)
  const s = prestej(await zapisnikiTekem(tekme))
  console.log(`    krog ${zadnji}: ${s.zapisnikov} zapisnikov, goli = izid ${s.golovSeUjema}, postav po 11 ${s.postav11}/${s.postav}, ` +
    `pozicij ${s.sPozicijo}/${s.zacetnikov}, nastopov s šifro ${s.sSifro}/${s.nastopov}`)
}
