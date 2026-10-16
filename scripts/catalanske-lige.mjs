// Katalonske lige (fcf.cat) — bloki zapisnikov skupin, za migracijo in preizkus vira `fcf`.
//
//   node scripts/catalanske-lige.mjs 4139543               # blok skupine, ki ima ta zapisnik: šifra, tekmovanje, krogi, klubi
//   node scripts/catalanske-lige.mjs 4139543 --preveri     # še zadnji odigrani krog: polni zapisniki, menjave vpisane ali ne
//   node scripts/catalanske-lige.mjs 4139543 --naprej 3    # in naslednji trije bloki za njim (sosednje skupine)
//   node scripts/catalanske-lige.mjs --polno 4139542-4139779   # vsi zapisniki bloka: goli = izidi, 11 + 11, 990 minut
//
// Strani tekmovanj fcf.cat se izrišejo iz `/api/`, ki ga robots.txt
// prepoveduje — skupin zato ne naštejemo s strani, ampak iz zapisnikov:
// skupina ene sezone je strnjen blok šifer, urejen po krogih, med bloki je
// "Acta no trobada". Seme (en zapisnik skupine) najdeš na strani kluba v
// brskalniku ali v bližini lanskega bloka (glej docs/viri/spanija.md, vir fcf).
// Meji bloka poišče bisekcija (~10 strani na mejo).
//
// Vljudno kot vir: User-Agent SLFF, 3 s med zahtevki, predpomnilnik
// `scripts/.predpomnilnik/fcf` (isti kot uvoz). Ob 403, 429 ali izzivu se ustavi.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import fcf, { naslovZapisnika, glavaStrani, vrstaStrani, jeIzziv, vZapisnik, nastopi, razporedBloka, preberiBlok, razberiKodo } from './viri/fcf.mjs'
import { prenesiSPonovitvami } from './prenos.mjs'

const MAPA = 'scripts/.predpomnilnik/fcf'
const argumenti = process.argv.slice(2)
const zastavica = (ime) => argumenti.includes(`--${ime}`)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}
mkdirSync(MAPA, { recursive: true })

/** Prenos kot v uvoznih skriptah: (url, ime, sveze) → besedilo; ustavi ob zavrnitvi. */
async function prenesi(url, ime, sveze = false) {
  const pot = `${MAPA}/${ime}`
  if (!sveze && existsSync(pot)) return readFileSync(pot, 'utf8')
  const o = await prenesiSPonovitvami(url, { glave: fcf.glave, premorMs: fcf.premorMs, fetchFn: fcf.fetch, log: () => {} })
  const t = await o.text()
  if (o.status === 403 || o.status === 429 || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  writeFileSync(pot, t)
  return t
}

const stran = (id) => prenesi(naslovZapisnika(id), `acta-${id}.html`)
const kljuc = (g) => (g ? `${g.tekmovanje}|${g.skupina}|${g.sezona}` : null)
async function glava(id) {
  return glavaStrani(await stran(id))
}

/**
 * Meja bloka v smeri `smer` (+1 / −1) od `id` (ki je v bloku `k`): zadnja
 * šifra bloka. Bisekcija; meja velja, če dve šifri za njo nista iz bloka.
 */
async function meja(id, k, smer) {
  let notri = id
  let korak = 16
  let zunaj = null
  while (zunaj == null) {
    const x = notri + smer * korak
    if ((kljuc(await glava(x))) === k) { notri = x; korak = Math.min(korak * 2, 256) } else zunaj = x
  }
  while (Math.abs(zunaj - notri) > 1) {
    const sredina = Math.floor((notri + zunaj) / 2)
    if (kljuc(await glava(sredina)) === k) notri = sredina
    else zunaj = sredina
  }
  // Izbrisan zapisnik sredi bloka: preveri še dve šifri naprej.
  for (const d of [2, 3]) {
    if (kljuc(await glava(notri + smer * d)) === k) return meja(notri + smer * d, k, smer)
  }
  return notri
}

async function blok(seme) {
  const g = await glava(seme)
  if (!g) throw new Error(`${seme}: ni zapisnik (Acta no trobada)`)
  const k = kljuc(g)
  const od = await meja(seme, k, -1)
  const do_ = await meja(seme, k, +1)
  const zadnja = await glava(do_)
  const krogov = zadnja.krog
  const tekem = do_ - od + 1
  return { od, do: do_, koda: `${od}-${do_}`, g, krogov, tekem, klubov: krogov ? Math.round((2 * tekem) / krogov) : null }
}

/** Zadnji odigrani krog: bisekcija po bloku (krogi so urejeni). */
async function zadnjiOdigran(b) {
  if (!(await glava(b.od))?.izid) return null
  let lo = b.od
  let hi = b.do + 1
  while (hi - lo > 1) {
    const s = Math.floor((lo + hi) / 2)
    if ((await glava(s))?.izid) lo = s
    else hi = s
  }
  return (await glava(lo)).krog
}

function prestej(zapisniki) {
  const s = { zapisnikov: 0, polnih: 0, nepopolnih: 0, prazen: 0, goliIzidi: 0, golov: 0, golovZap: 0, postav11: 0, postav: 0, vratar: 0, brezMenjav: 0, ekip: 0, nastopov: 0, sKlopi: 0, sSifro: 0, opozoril: 0, minute990: 0, minuteNad: 0, minutePod: 0 }
  for (const { z } of zapisniki) {
    s.zapisnikov++
    if (z.prazen) s.prazen++
    else if (z.nepopoln) s.nepopolnih++
    else s.polnih++
    s.golov += z.rezultat.domaci + z.rezultat.gostje
    s.golovZap += z.goli.length
    if (!z.opozorila.some((o) => o.startsWith('goli iz zapisnika'))) s.goliIzidi++
    const n = nastopi(z)
    for (const [idx, e] of [z.domaci, z.gostje].entries()) {
      if (!e.postava.length) continue
      s.ekip++
      s.postav++
      if (e.postava.length === 11) s.postav11++
      if (e.postava.filter((i) => i.vratar).length === 1) s.vratar++
      if (z.brezMenjav[idx]) s.brezMenjav++
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
  `${s.zapisnikov} zapisnikov (${s.polnih} polnih, ${s.nepopolnih} nepopolnih, ${s.prazen} praznih); goli ${s.golovZap} / izidi ${s.golov}, goli = izid v ${s.goliIzidi}; ` +
  `postav po 11 ${s.postav11}/${s.postav}, vratar ${s.vratar}/${s.postav}; ekip brez vpisanih menjav ${s.brezMenjav}/${s.ekip}; ` +
  `minute ekipe 990: ${s.minute990}, več: ${s.minuteNad}, manj: ${s.minutePod}; nastopov ${s.nastopov} (s klopi ${s.sKlopi}), s šifro ${s.sSifro}; opozoril ${s.opozoril}`

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
    `"no trobada" v bloku: ${b.ni.length}, tujih: ${b.tujih}`)
  const zapisniki = await fcf.zapisniki(polno, prenesi)
  console.log(izpis(prestej(zapisniki)))
  for (const { id, z } of zapisniki) for (const o of z.opozorila) console.log(`  ${id}: ${o}`)
  process.exit(0)
}

// --- bloki iz semen --------------------------------------------------------------
const semena = argumenti.filter((a) => /^\d+$/.test(a)).map(Number)
const naprej = Number(vrednost('naprej') ?? 0)
if (!semena.length) {
  console.error('Uporaba: node scripts/catalanske-lige.mjs <šifra zapisnika> [--preveri] [--naprej N] | --polno <od>-<do>')
  process.exit(1)
}
console.log('šifra | tekmovanje | skupina | sezona | krogov | tekem | klubov | zadnji odigran')
for (let seme of semena) {
  for (let i = 0; i <= naprej; i++) {
    const b = await blok(seme)
    const zadnji = await zadnjiOdigran(b)
    console.log(`${b.koda} | ${b.g.tekmovanje} | ${b.g.skupina} | ${b.g.sezona} | ${b.krogov} | ${b.tekem} | ${b.klubov} | ${zadnji ?? '—'}`)
    if (zastavica('preveri') && zadnji) {
      // Tekme zadnjega odigranega kroga (po mestu v bloku), največ štiri.
      const naKrog = Math.round(b.tekem / b.krogov)
      const zapisniki = []
      for (let id = b.od + (zadnji - 1) * naKrog - 2; id <= b.od + zadnji * naKrog + 2 && zapisniki.length < 4; id++) {
        if (id < b.od || id > b.do) continue
        const g = await glava(id)
        if (g?.krog !== zadnji || !g.izid) continue
        const z = vZapisnik(await stran(id), { id })
        if (z) zapisniki.push({ id, z })
      }
      console.log(`    krog ${zadnji}: ${izpis(prestej(zapisniki))}`)
    }
    if (i === naprej) break
    // Naslednji blok: prva šifra za mejo, ki je zapisnik druge skupine.
    let x = b.do + 1
    while (vrstaStrani(await stran(x)) !== 'zapisnik' && x < b.do + 20) x++
    seme = x
  }
}
