// Seznam latvijskih lig odraslih (moški) in mladinskih U19 na lff.lv — za migracijo, ki jih vpiše,
// in preizkus vira `lff`.
//
//   node scripts/latvijske-lige.mjs                      # lige 2026: šifra, klubi, krogi, tekme, zapisniki
//   node scripts/latvijske-lige.mjs --leto 2025          # ista slika za arhivsko leto (šifre arhiva)
//   node scripts/latvijske-lige.mjs --u19 [--leto 2025]  # mladinske lige U-19 (jauniesi/…)
//   node scripts/latvijske-lige.mjs --preveri            # še zapisniki zadnjega odigranega kroga (do 3 na ligo)
//   node scripts/latvijske-lige.mjs --preveri --najvec 1 # le en zapisnik na ligo
//   node scripts/latvijske-lige.mjs --polno tresa-liga/23836414   # vsi zapisniki ene lige: goli = izidi, 11 + 11, vratar, minute
//   node scripts/latvijske-lige.mjs --polno … --mapa /tmp/lv     # z mapo za predpomnilnik
//
// Lige najde v izbirniku "Izvēlies līgu" strani Virslīge, 1., 2. in 3. lige.
// Finalnih turnirjev (Finālturnīrs) ne našteje. Stran z več skupinami (2. liga)
// da eno ligo na skupino (`<sekcija>/<p>/<tekmovanje>`).
//
// Vljudno kot vir: User-Agent SLFF, 3 s med zahtevki. Ob 403, 429 ali izzivu
// se ustavi (izhod 2) — ne obhajamo.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import lff, {
  naslovLige, naslovZapisnika, blokiStrani, tekmeBloka, tekmeLige, izbirnikStrani, imeStrani, letoTekem, vZapisnik, nastopi, jeIzziv,
} from './viri/lff.mjs'

const SEKCIJE = ['virsliga', 'lvbet-liga', 'otra-liga', 'tresa-liga']
const FINALE = /fināl/i

const argumenti = process.argv.slice(2)
const zastavica = (ime) => argumenti.includes(`--${ime}`)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}
const mapa = vrednost('mapa')
if (mapa && !existsSync(mapa)) mkdirSync(mapa, { recursive: true })

let zahtevkov = 0
async function besedilo(url) {
  const pot = mapa && `${mapa}/${url.replace(/^https?:\/\/[^/]+\//, '').replace(/[^\w.-]+/g, '_')}.html`
  if (pot && existsSync(pot)) return readFileSync(pot, 'utf8')
  if (zahtevkov++) await new Promise((r) => setTimeout(r, lff.premorMs))
  const o = await fetch(url, { headers: lff.glave })
  const t = await o.text()
  if (o.status === 403 || o.status === 429 || jeIzziv(t)) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (izziv ali zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  if (pot) writeFileSync(pot, t)
  return t
}

/** Preštej zapisnike: [{ z }] → številke za izpis. */
function prestej(zapisniki) {
  const s = { zapisnikov: 0, golov: 0, golovSeUjema: 0, postav: 0, postav11: 0, vratarjev1: 0, minut990: 0, zRdecim: 0, nastopov: 0, sKlopi: 0, opozoril: 0 }
  for (const { z } of zapisniki) {
    s.zapisnikov++
    s.golov += z.rezultat.domaci + z.rezultat.gostje
    if (!z.opozorila.some((o) => o.startsWith('goli iz dogodkov'))) s.golovSeUjema++
    const n = nastopi(z)
    for (const [idx, e] of [z.domaci, z.gostje].entries()) {
      s.postav++
      if (e.postava.length === 11) s.postav11++
      if (e.postava.filter((i) => i.vratar).length === 1) s.vratarjev1++
      const minute = n.filter((x) => x.ekipaIdx === idx).reduce((a, x) => a + x.minute, 0)
      if (minute === 990) s.minut990++
      else if (z.rdeci.some((r) => r.ekipaIdx === idx)) s.zRdecim++
      else z.opozorila.push(`${e.ime}: ${minute} minut brez rdečega kartona`)
    }
    s.nastopov += n.length
    s.sKlopi += n.filter((x) => !x.zacetnik).length
    s.opozoril += z.opozorila.length
  }
  return s
}

async function zapisnikiTekem(tekme) {
  const out = []
  for (const t of tekme) {
    const z = vZapisnik(await besedilo(naslovZapisnika(t.id, t.pot)), { id: t.id })
    if (z) out.push({ id: t.id, z, t })
    else console.log(`    ${t.id} ${t.domaci} : ${t.gostje} ${t.izid?.domaci}:${t.izid?.gostje}: zapisnik brez postave (kontumacija?)`)
  }
  return out
}

const izpisStevil = (s) =>
  `zapisnikov ${s.zapisnikov}, goli = izid ${s.golovSeUjema}/${s.zapisnikov}, postav po 11 ${s.postav11}/${s.postav}, ` +
  `en vratar (G) ${s.vratarjev1}/${s.postav}, 990 minut ${s.minut990}/${s.postav} (z rdečim ${s.zRdecim}), nastopov ${s.nastopov} (s klopi ${s.sKlopi}), opozoril ${s.opozoril}`

const polno = vrednost('polno')
if (polno) {
  const html = await besedilo(naslovLige(polno))
  const tekme = tekmeLige(polno, html)
  const odigrane = tekme.filter((t) => t.izid)
  const klubi = new Set(tekme.flatMap((t) => [t.domaci, t.gostje]))
  console.log(`${imeStrani(html)} ${letoTekem(tekme)} (${polno}): ${new Set(tekme.map((t) => t.krog)).size} krogov, ${tekme.length} tekem, ` +
    `${odigrane.length} odigranih, ${klubi.size} klubov, ${tekme.filter((t) => t.ura).length} z uro`)
  const zapisniki = await zapisnikiTekem(odigrane)
  const s = prestej(zapisniki)
  const izidi = odigrane.reduce((a, t) => a + t.izid.domaci + t.izid.gostje, 0)
  console.log(`Goli: izidi razporeda ${izidi}, izidi zapisnikov ${s.golov}, iz dogodkov ${zapisniki.reduce((a, { z }) => a + z.goli.length, 0)}`)
  console.log(izpisStevil(s))
  const neujemanje = zapisniki.filter(({ z, t }) => z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
  if (neujemanje.length) console.log(`Izid zapisnika ni izid razporeda: ${neujemanje.map((x) => x.id).join(', ')}`)
  const vrste = {}
  for (const { z } of zapisniki) {
    vrste.avtogol = (vrste.avtogol ?? 0) + z.goli.filter((g) => g.avtogol).length
    vrste['11 m'] = (vrste['11 m'] ?? 0) + z.goli.filter((g) => g.enajstmetrovka).length
    vrste['zgrešena 11 m'] = (vrste['zgrešena 11 m'] ?? 0) + z.zgresene.length
    vrste.rumeni = (vrste.rumeni ?? 0) + z.rumeni.length
    vrste.rdeci = (vrste.rdeci ?? 0) + z.rdeci.length
    vrste.menjav = (vrste.menjav ?? 0) + z.menjave.length
  }
  console.log(`Dogodki: ${Object.entries(vrste).map(([k, v]) => `${k} ${v}`).join(', ')}`)
  for (const { id, z } of zapisniki) for (const o of z.opozorila) console.log(`  ${id}: ${o}`)
  console.log(`(${zahtevkov} zahtevkov)`)
  process.exit(0)
}

const leto = vrednost('leto') ?? String(new Date().getFullYear())

// Mladinske (U19): Jaunatnes čempionāts, stran /sacensibas/jauniesi/<grupa>/ za
// tekoče leto, `<grupa>-<leto>` za pretekla. Najstarejša starost je U-19.
if (zastavica('u19')) {
  const tekoce = leto === String(new Date().getFullYear())
  console.log('šifra | ime | klubov | krogov | tekem | odigranih | z uro')
  for (const grupa of ['elites-grupa', 'meistaribas-grupa', 'attistibas-grupa']) {
    const sekcija = tekoce ? grupa : `${grupa}-${leto}`
    const prva = await besedilo(`${lff.osnovniNaslov}/sacensibas/jauniesi/${sekcija}/`)
    for (const o of izbirnikStrani(prva).filter((x) => /U-?19/i.test(x.ime))) {
      const html = o.p == null ? prva : await besedilo(`${lff.osnovniNaslov}/sacensibas/jauniesi/${sekcija}/?p=${o.p}`)
      for (const b of blokiStrani(html).filter((x) => !FINALE.test(x.zavihek))) {
        const tekme = tekmeBloka(b.html)
        const klubi = new Set(tekme.flatMap((t) => [t.domaci, t.gostje]))
        console.log(`jauniesi/${sekcija}/${b.tekmovanje} | ${imeStrani(html)} (${o.ime}) | ${klubi.size} | ${new Set(tekme.map((t) => t.krog)).size} | ` +
          `${tekme.length} | ${tekme.filter((t) => t.izid).length} | ${tekme.filter((t) => t.ura).length}`)
      }
    }
  }
  console.log(`(${zahtevkov} zahtevkov)`)
  process.exit(0)
}

console.log('šifra | ime | klubov | krogov | tekem | odigranih | z uro')
for (const sekcija of SEKCIJE) {
  const prva = await besedilo(`${lff.osnovniNaslov}/sacensibas/viriesi/${sekcija}/`)
  // Strani lige tega leta: izbirnik "Centra zona 2026" (p = id) ali "2026" (p = leto).
  const strani = izbirnikStrani(prva)
    .filter((o) => new RegExp(`(^|\\s)${leto}$`).test(o.ime) && !FINALE.test(o.ime))
  for (const o of strani) {
    // Privzeta stran (brez `p`) je tekoče leto; `?p=<leto>` da isto.
    const p = o.p ?? leto
    const ime = o.ime
    const html = o.p == null ? prva : await besedilo(`${lff.osnovniNaslov}/sacensibas/viriesi/${sekcija}/?p=${p}`)
    const vsi = blokiStrani(html)
    const bloki = vsi.filter((b) => !FINALE.test(b.zavihek))
    for (const b of bloki) {
      // Več blokov na strani (skupine, finale): šifra navede tekmovanje.
      const koda = vsi.length > 1 ? `${sekcija}/${p}/${b.tekmovanje}` : `${sekcija}/${p}`
      const tekme = tekmeBloka(b.html)
      const odigrane = tekme.filter((t) => t.izid)
      const klubi = new Set(tekme.flatMap((t) => [t.domaci, t.gostje]))
      const naziv = `${imeStrani(html)}${bloki.length > 1 ? ` ${b.zavihek.replace(/^Visas spēles\s*/, '')}` : ''} (${ime})`
      console.log(`${koda} | ${naziv} | ${klubi.size} | ${new Set(tekme.map((t) => t.krog)).size} | ${tekme.length} | ` +
        `${odigrane.length} | ${tekme.filter((t) => t.ura).length}`)
      if (!zastavica('preveri') || !odigrane.length) continue
      const zadnji = Math.max(...odigrane.map((t) => t.krog))
      const s = prestej(await zapisnikiTekem(odigrane.filter((t) => t.krog === zadnji).slice(0, Number(vrednost('najvec') ?? 3))))
      console.log(`    krog ${zadnji}: ${izpisStevil(s)}`)
    }
  }
}
console.log(`(${zahtevkov} zahtevkov)`)
