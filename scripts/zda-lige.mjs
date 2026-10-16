// Divizije USL League Two (ZDA) na Modular11 — za migracijo, ki jih vpiše,
// preizkus vira `modular11` in prehod na novo sezono.
//
//   node scripts/zda-lige.mjs [--leto 2027]                 # divizije: id, klubov, tekem lige, odigranih, končnica
//   node scripts/zda-lige.mjs --vse [--leto 2026] --mapa /tmp/usl   # + vsi zapisniki: popolni / nepopolni po diviziji
//   node scripts/zda-lige.mjs --polno 24/52/2026 --mapa /tmp/usl    # ena divizija, vsak nepopoln zapisnik z razlogom
//   node scripts/zda-lige.mjs --vse --pasovi --mapa /tmp/usl        # + predlog PAS_DIVIZIJE in PAS_KLUBA za vir
//
// Divizije prebere iz izbirnika "Division" strani modular11.com/league-schedule/
// league-two (isti seznam vsebuje tudi končnico: Central, Eastern, Southern,
// Western, National Semi Final, National Final — te nimajo tekem "League").
//
// Vljudno kot vir: User-Agent SLFF, 3 s med zahtevki. Ob 401, 403, 429 ali
// izzivu se ustavi (izhod 2) — ne obhajamo. Brez --mapa se nič ne shrani.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import m11, { naslovStrani, naslovZapisnika, steviloStrani, vrsticeStrani, tekmeLige, vZapisnik, nastopi, jeIzziv, PAS_DIVIZIJE } from './viri/modular11.mjs'

const TURNIR = '24'
const argumenti = process.argv.slice(2)
const zastavica = (ime) => argumenti.includes(`--${ime}`)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}
const mapa = vrednost('mapa')
if (mapa && !existsSync(mapa)) mkdirSync(mapa, { recursive: true })
const leto = vrednost('leto') ?? String(new Date().getFullYear())

let zahtevkov = 0
let zadnji = 0
async function besedilo(url) {
  const pot = mapa && `${mapa}/${url.replace(/^https?:\/\/[^/]+\//, '').replace(/[^\w.-]+/g, '_')}.html`
  if (pot && existsSync(pot)) return readFileSync(pot, 'utf8')
  const cakaj = zadnji + m11.premorMs - Date.now()
  if (cakaj > 0) await new Promise((r) => setTimeout(r, cakaj))
  zadnji = Date.now()
  zahtevkov++
  const o = await fetch(url, { headers: m11.glave })
  const t = await o.text()
  if ([401, 403, 429].includes(o.status) || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  if (pot) writeFileSync(pot, t)
  return t
}

/** Izbirnik "Division": [{ id, ime }]. */
async function divizije() {
  const html = await besedilo(`${m11.osnovniNaslov}/league-schedule/league-two`)
  const sel = html.match(/<select[^>]*js-groups[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? ''
  return [...sel.matchAll(/<option value="(\d+)">([^<]*)<\/option>/g)].map((m) => ({ id: m[1], ime: m[2].trim() }))
}

async function straniDivizije(koda) {
  const strani = []
  let skupaj = 1
  for (let s = 1; s <= skupaj && s <= 20; s++) {
    const html = await besedilo(naslovStrani(koda, s))
    skupaj = steviloStrani(html)
    strani.push(html)
  }
  return strani
}

/** Preštej zapisnike ene divizije. */
async function prestej(koda) {
  const tekme = tekmeLige(koda, await straniDivizije(koda))
  const odigrane = tekme.filter((t) => t.izid)
  const s = { tekem: tekme.length, odigranih: odigrane.length, zapisnikov: 0, popolnih: 0, postav11: 0, goliIzid: 0, menjave: 0, minute990: 0, nepopolni: [], pasovi: new Map(), klubi: new Set() }
  for (const t of tekme) { s.klubi.add(t.domaci); s.klubi.add(t.gostje) }
  for (const t of odigrane) {
    const z = vZapisnik(await besedilo(naslovZapisnika(t.id)), { id: t.id, pas: t.pas })
    if (!z) { s.nepopolni.push(`${t.id} ${t.domaci} : ${t.gostje}: stran brez zapisnika`); continue }
    s.zapisnikov++
    if (z.pasPrizorisca) {
      if (!s.pasovi.has(t.domaciId)) s.pasovi.set(t.domaciId, { ime: t.domaci, pasovi: {} })
      const p = s.pasovi.get(t.domaciId).pasovi
      p[z.pasPrizorisca] = (p[z.pasPrizorisca] ?? 0) + 1
    }
    if (z.domaci.postava.length === 11 && z.gostje.postava.length === 11) s.postav11++
    if (!z.opozorila.some((o) => /goli iz dogodkov/.test(o))) s.goliIzid++
    if ([0, 1].every((i) => z.menjave.some((x) => x.ekipaIdx === i && x.minuta != null))) s.menjave++
    const n = nastopi(z)
    if ([0, 1].every((i) => n.filter((x) => x.ekipaIdx === i).reduce((a, x) => a + x.minute, 0) === 990)) s.minute990++
    if (z.nepopoln) s.nepopolni.push(`${t.id} ${t.domaci} : ${t.gostje} ${z.rezultat.domaci}:${z.rezultat.gostje}: ${z.opozorila[0]}`)
    else s.popolnih++
  }
  return s
}

const odstotek = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : '—')

const polno = vrednost('polno')
if (polno) {
  const s = await prestej(polno)
  console.log(`${polno}: ${s.klubi.size} klubov, ${s.tekem} tekem lige, ${s.odigranih} odigranih, ${s.zapisnikov} zapisnikov, ` +
    `popolnih ${s.popolnih} (${odstotek(s.popolnih, s.odigranih)}), 11 + 11 ${s.postav11}, goli = izid ${s.goliIzid}, ` +
    `menjave z minuto pri obeh ${s.menjave}, 990 minut pri obeh ${s.minute990}`)
  for (const x of s.nepopolni) console.log(`  ${x}`)
  console.log(`(${zahtevkov} zahtevkov)`)
  process.exit(0)
}

const seznam = await divizije()
const vse = zastavica('vse')
console.log(vse
  ? 'id | divizija | klubov | tekem lige | odigranih | zapisnikov | popolnih | % | 11+11 | goli=izid | menjave | 990 min'
  : 'id | divizija | klubov | tekem lige | odigranih | končnica')
const pasovi = {}
for (const d of seznam) {
  const koda = `${TURNIR}/${d.id}/${leto}`
  const strani = await straniDivizije(koda)
  const vrstice = strani.flatMap(vrsticeStrani)
  const liga = vrstice.filter((v) => /^league$/i.test(v.del))
  if (!vse || !liga.length) {
    const klubi = new Set(liga.flatMap((v) => [v.domaci, v.gostje]))
    console.log(`${d.id} | ${d.ime} | ${klubi.size} | ${liga.length} | ${liga.filter((v) => v.izid).length} | ${vrstice.length - liga.length}`)
    continue
  }
  const s = await prestej(koda)
  console.log(`${d.id} | ${d.ime} | ${s.klubi.size} | ${s.tekem} | ${s.odigranih} | ${s.zapisnikov} | ${s.popolnih} | ${odstotek(s.popolnih, s.odigranih)} | ` +
    `${s.postav11} | ${s.goliIzid} | ${s.menjave} | ${s.minute990}`)
  if (zastavica('podrobno')) for (const x of s.nepopolni) console.log(`    ${x}`)
  pasovi[d.id] = { ime: d.ime, klubi: [...s.pasovi.entries()] }
}

if (zastavica('pasovi')) {
  // Pas divizije = najpogostejši pas domačih prizorišč; klub z drugim pasom gre v PAS_KLUBA.
  const div = {}
  const klubi = {}
  for (const [id, { ime, klubi: k }] of Object.entries(pasovi)) {
    const st = {}
    for (const [, { pasovi: p }] of k) for (const [pas, n] of Object.entries(p)) st[pas] = (st[pas] ?? 0) + n
    const glavni = Object.entries(st).sort((a, b) => b[1] - a[1])[0]?.[0]
    div[id] = glavni
    if (PAS_DIVIZIJE[id] && PAS_DIVIZIJE[id] !== glavni) console.log(`  ${ime}: v viru ${PAS_DIVIZIJE[id]}, iz zapisnikov ${glavni}`)
    for (const [klub, { ime: imeKluba, pasovi: p }] of k) {
      const svoj = Object.entries(p).sort((a, b) => b[1] - a[1])[0][0]
      if (svoj !== glavni) klubi[klub] = `${svoj}', // ${imeKluba} (${ime})`
    }
  }
  console.log('\nexport const PAS_DIVIZIJE = {')
  for (const [id, pas] of Object.entries(div)) console.log(`  ${id}: '${pas}', // ${pasovi[id].ime}`)
  console.log('}\nexport const PAS_KLUBA = {')
  for (const [id, v] of Object.entries(klubi)) console.log(`  ${id}: '${v}`)
  console.log('}')
}
console.log(`(${zahtevkov} zahtevkov)`)
