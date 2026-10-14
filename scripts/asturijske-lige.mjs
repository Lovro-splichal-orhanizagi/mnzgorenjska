// Asturijske lige (futbolasturiano.es) — bloki objav tekem, za migracijo in preizkus vira `fas`.
//
//   node scripts/asturijske-lige.mjs                        # lige s postavami: sezone, bloki šifer, predlog šifre lige
//   node scripts/asturijske-lige.mjs 3-rfef 2-asturfutbol    # izbrane lige (izraz sp_league)
//   node scripts/asturijske-lige.mjs --polno 3-rfef:14499-14804   # ves blok, kot ga bere uvoz (brez baze)
//   node scripts/asturijske-lige.mjs --vzorec <id> <datoteka>      # obrezana stran tekme za scripts/vzorci/
//
// Stran lige `/competicion/<liga>/` našteje objavljene tekme vseh sezon
// (`sp_season-2026-2027`); blok sezone je od najmanjše do največje šifre.
// Tekme s stanjem "future" (bližnji krog s popravljeno uro) na strani lige
// manjkajo — v bloku jih vir prebere s `/?p=<id>`. Blok mora imeti N×(N−1)
// šifer (dvokrožno), sicer ga preveri ročno.
//
// Vljudno kot vir: User-Agent SLFF, 3 s med zahtevki, predpomnilnik
// `scripts/.predpomnilnik/fas` (isti kot uvoz). Ob 403, 429 ali izzivu se ustavi.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import fas, { naslovLige, naslovTekme, tekmeSeznama, preberiBlok, razporedBloka, razberiKodo, nastopi, jeIzziv, imeSeznama } from './viri/fas.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const MAPA = 'scripts/.predpomnilnik/fas'
const argumenti = process.argv.slice(2)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}
mkdirSync(MAPA, { recursive: true })

/** Prenos kot v uvoznih skriptah: (url, ime, sveze) → besedilo; ustavi ob zavrnitvi. */
async function prenesi(url, ime, sveze = false) {
  const pot = `${MAPA}/${ime}`
  if (!sveze && existsSync(pot)) return readFileSync(pot, 'utf8')
  const o = await prenesiSPonovitvami(url, { glave: fas.glave, premorMs: fas.premorMs, fetchFn: fas.fetch, log: () => {} })
  const t = await o.text()
  if (o.status === 403 || o.status === 429 || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  if (!o.ok && o.status !== 404) throw new Error(`${url} -> HTTP ${o.status}`)
  writeFileSync(pot, t)
  return t
}

function prestej(zapisniki) {
  const s = { zapisnikov: 0, polnih: 0, nepopolnih: 0, goliIzidi: 0, golov: 0, golovZap: 0, postav11: 0, postav: 0, vratar: 0, menjav: 0, nastopov: 0, sKlopi: 0, sSifro: 0, opozoril: 0, minute990: 0, minuteNad: 0, minutePod: 0, rdecih: 0, avtogolov: 0, enajstmetrovk: 0 }
  for (const { z } of zapisniki) {
    s.zapisnikov++
    if (z.nepopoln) s.nepopolnih++
    else s.polnih++
    s.golov += z.rezultat.domaci + z.rezultat.gostje
    s.golovZap += z.goli.length
    if (!z.opozorila.some((o) => o.startsWith('goli iz zapisnika'))) s.goliIzidi++
    s.menjav += z.menjave.length
    s.rdecih += z.rdeci.length
    s.avtogolov += z.goli.filter((g) => g.avtogol).length
    s.enajstmetrovk += z.goli.filter((g) => g.enajstmetrovka).length
    const n = nastopi(z)
    for (const [idx, e] of [z.domaci, z.gostje].entries()) {
      if (!e.postava.length) continue
      s.postav++
      if (e.postava.length === 11) s.postav11++
      if (e.postava.filter((i) => i.vratar).length === 1) s.vratar++
      const m = n.filter((x) => x.ekipaIdx === idx).reduce((a, x) => a + x.minute, 0)
      if (m === 990) s.minute990++
      else if (m > 990) s.minuteNad++
      else s.minutePod++
    }
    s.nastopov += n.length
    s.sKlopi += n.filter((x) => !x.zacetnik).length
    s.sSifro += n.filter((x) => x.regSt).length
    s.opozoril += z.opozorila.length
  }
  return s
}

const izpis = (s) =>
  `${s.zapisnikov} zapisnikov (${s.polnih} polnih, ${s.nepopolnih} nepopolnih); goli ${s.golovZap} / izidi ${s.golov}, goli = izid v ${s.goliIzidi}; ` +
  `postav po 11 ${s.postav11}/${s.postav}, vratar ${s.vratar}/${s.postav}; menjav z minuto ${s.menjav}; ` +
  `minute ekipe 990: ${s.minute990}, več: ${s.minuteNad}, manj: ${s.minutePod}; nastopov ${s.nastopov} (s klopi ${s.sKlopi}), s šifro ${s.sSifro}; ` +
  `rdečih ${s.rdecih}, avtogolov ${s.avtogolov}, 11 m ${s.enajstmetrovk}; opozoril ${s.opozoril}`

// --- vzorec: obrezana stran tekme (brez sodnikov, poročila, fotografij, oglasov) ---------
/** Obdrži le glavo, "Detalles", postavi in razdelke dogodkov; repo je javen. */
function obrezi(html) {
  const s = String(html)
  const telo = s.match(/<body[^>]*>/)?.[0] ?? '<body>'
  // Kos od oznake do prve od končnih oznak (ali prazno).
  const KONEC = ['<div class="sportspress"><div class="sp-template sp-template-event-details">', '<div class="fa-convocatoria">', '<div class="sp-res', 'Equipo arbitral', '</main>']
  const kos = (od) => {
    const i = s.indexOf(od)
    if (i < 0) return ''
    const j = Math.min(...KONEC.map((k) => s.indexOf(k, i + od.length)).filter((x) => x > 0))
    return s.slice(i, Number.isFinite(j) ? j : i)
  }
  const logo = kos('<div class="sp-template sp-template-event-logos')
  const det = kos('<div class="sp-template sp-template-event-details">')
  const conv = kos('<div class="fa-convocatoria">')
  const dog = [...s.matchAll(/<div class="sp-res__section">[\s\S]*?(?=<div class="sp-res__section">|Equipo arbitral|<\/main>)/g)].map((m) => m[0]).join('')
  const brezSlik = (x) => x.replace(/<img[^>]*>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<ins[\s\S]*?<\/ins>/g, '').replace(/<p class="fa-partido-estadio">[\s\S]*?<\/p>/g, '')
  return `<!doctype html><html><head><title>vzorec futbolasturiano.es</title></head>${telo}\n${brezSlik(logo)}\n${brezSlik(det)}\n${brezSlik(conv)}\n${brezSlik(dog)}\n</body></html>\n`
}

const vzorec = vrednost('vzorec')
if (vzorec) {
  const izhod = argumenti[argumenti.indexOf('--vzorec') + 2]
  const html = await prenesi(naslovTekme(vzorec), `evento-${vzorec}.html`)
  writeFileSync(izhod, obrezi(html))
  console.log(`${izhod}: ${obrezi(html).length} B`)
  process.exit(0)
}

// --- polno: preizkus enega bloka, kot ga prebere uvoz (brez baze) -------------------
const polno = vrednost('polno')
if (polno) {
  razberiKodo(polno)
  const b = await preberiBlok(polno, prenesi)
  const krogi = razporedBloka(b)
  const tekme = krogi.flatMap((k) => k.tekme)
  const klubi = new Set(tekme.flatMap((t) => [t.domaci, t.gostje]))
  console.log(`${b.skupina}: ${krogi.length} krogov, ${tekme.length} tekem (${tekme.filter((t) => t.ura).length} z uro), ${klubi.size} klubov, ` +
    `${tekme.filter((t) => t.odigrana).length} odigranih, ${tekme.filter((t) => t.kontumacija).length} kontumacij; ` +
    `ni tekma: ${b.ni.length}, tujih: ${b.tujih}`)
  console.log(`klubi: ${[...klubi].sort().join(', ')}`)
  const zapisniki = await fas.zapisniki(polno, prenesi)
  console.log(izpis(prestej(zapisniki)))
  for (const { id, z } of zapisniki) for (const o of z.opozorila) console.log(`  ${id} (J${z.krog} ${z.domaci.ime} – ${z.gostje.ime}): ${o}`)
  process.exit(0)
}

// --- seznam lig --------------------------------------------------------------------
const lige = argumenti.filter((a) => /^[a-z0-9-]+$/.test(a))
console.log('liga | sezona | objavljenih | blok | šifer v bloku | manjka na strani lige')
for (const liga of lige.length ? lige : ['3-rfef', '1-asturfutbol']) {
  const koda = `${liga}:0-0`
  const html = await prenesi(naslovLige(koda), imeSeznama(koda), true)
  const poSezoni = new Map()
  for (const t of tekmeSeznama(html).filter((x) => x.liga === liga)) {
    if (!poSezoni.has(t.sezona)) poSezoni.set(t.sezona, [])
    poSezoni.get(t.sezona).push(t.id)
  }
  for (const [sezona, ids] of poSezoni) {
    const od = Math.min(...ids)
    const do_ = Math.max(...ids)
    const imam = new Set(ids)
    const manjka = []
    for (let i = od; i <= do_; i++) if (!imam.has(i)) manjka.push(i)
    console.log(`${liga} | ${sezona} | ${ids.length} | ${liga}:${od}-${do_} | ${do_ - od + 1} | ${manjka.length}`)
  }
}
