// Vir: Magyar Labdarúgó Szövetség — MLSZ adatbank (adatbank.mlsz.hu).
//
// Adatbank prikazuje vsa tekmovanja MLSZ in dvajsetih županijskih zvez
// (megyei igazgatóság), od NB I do najnižje vármegyei osztály. Zapisnik je na
// vseh ravneh enak: postavi s številko dresa in stalno šifro igralca
// (`player/<id>.html` → `reg_st`), dogodki so ikone pri igralcu z minuto
// (gol, 11 m, avtogol, rumeni, rdeči, menjava). Menjave so v PARIH: vrstica
// začetnika ima povezavo na igralca, ki je prišel namesto njega, vrstica
// rezerve pa na tistega, ki ga je zamenjal.
//
// VRATAR: adatbank vratarja NE označi in pozicij nima. Začetna enajsterica pa
// je razvrščena tako, da je prvi igralec poseben, ostalih deset pa po
// številki dresa naraščajoče (Zala I 2025/26: v 168 od 358 postav ima prvi
// višjo številko od drugega, ostalih deset je urejenih v vseh). Prvi je v
// praksi vratar. Zato prvemu začetniku vsake ekipe damo `vratar: true` — le
// kot NAMIG — in rezervi, ki je prišla namesto njega (nov vratar); vsi ostali
// imajo pozicijo null in jo določi glasovanje kot v Sloveniji. Napačen namig
// popravi *Uskladi pozicije* po večini tekem (`appearances.is_goalkeeper`).
//
// Šifra lige je `<évad>/<szervezet>/<verseny>` (npr. `67/20/33915`): évad je
// id sezone (67 = 2026/27, 65 = 2025/26, 63 = 2024/25 — ni enakomeren, glej
// `SEZONE`), szervezet zveza (0 = MLSZ, 1–20 županije, 5 = Budapest), verseny
// id tekmovanja, ki se z vsako sezono zamenja. Stran kroga je
// `league/<évad>/<sz>/<verseny>/<krog>.html`, zapisnik
// `match/<évad>/<sz>/<verseny>/<krog>/<id>.html`. Koliko krogov ima liga,
// pove izbirnik `Forduló` na strani kroga.
//
// Brez zaščite pred roboti; robots.txt branje dovoli (ada1bank: Crawl-delay
// 1). Beremo odkrito in počasi (1,5 s med stranmi), končanih zapisnikov ne
// beremo znova. Če se kdaj pojavi izziv ali CAPTCHA, se ustavi — ne obhajaj.
import { nastopi as skupniNastopi } from '../zapisnik.mjs'
import { razpakiraj } from '../klubi.mjs'
import { minuteIzPreklopov } from './facr.mjs'

const OSNOVNI = 'https://adatbank.mlsz.hu'
// Enako kot v zapisnik.mjs: sodniški podaljšek se ne šteje (adatbank piše 91–96).
const DOLZINA_TEKME = 90

// Id sezone (évad) → sezona, prepisano iz izbirnika `Évad` na adatbanku
// (10/2026). Zapisnik in stran kroga sezono povesta sama (izbrana možnost);
// ta slovar je le rezerva.
export const SEZONE = {
  67: '2026/27', 65: '2025/26', 63: '2024/25', 61: '2023/24', 59: '2022/23', 56: '2021/22',
  54: '2020/21', 52: '2019/20', 49: '2018/19', 46: '2017/18', 15: '2016/17', 14: '2015/16',
}

export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)\/(\d+)\/(\d+)$/)
  if (!m) throw new Error(`mlsz: šifra lige je "<évad>/<szervezet>/<verseny>" (npr. 67/20/33915), ne "${koda}"`)
  return { ev: Number(m[1]), sz: Number(m[2]), verseny: Number(m[3]) }
}

const pot = (koda) => {
  const { ev, sz, verseny } = razbijKodo(koda)
  return `${ev}/${sz}/${verseny}`
}
export const naslovKroga = (koda, krog) => `${OSNOVNI}/league/${pot(koda)}/${krog}.html`
export const naslovTekme = (koda, krog, id) => `${OSNOVNI}/match/${pot(koda)}/${krog}/${id}.html`
const imeKroga = (koda, krog) => `krog-${pot(koda).replace(/\//g, '-')}-${krog}.html`
const imeTekme = (koda, id) => `tekma-${pot(koda).replace(/\//g, '-')}-${id}.html`

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

/**
 * "2026. 10. 03. 15:00" (stran kroga) ali "2025.10.04 - 15:00" (zapisnik)
 * → { datum: '2026-10-03', ura: '15:00' }.
 */
export function datumUra(s) {
  const m = besedilo(s).match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*-?\s*(\d{1,2}:\d{2}))?/)
  if (!m) return { datum: null, ura: null }
  const dd = (x) => x.padStart(2, '0')
  return { datum: `${m[1]}-${dd(m[2])}-${dd(m[3])}`, ura: m[4] ? m[4].padStart(5, '0') : null }
}

/** Sezona iz datuma tekme: od julija naprej je nova ("2026-10-03" → "2026/27"). */
export function sezonaIzDatuma(datum) {
  const m = String(datum ?? '').match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const leto = Number(m[2]) >= 7 ? Number(m[1]) : Number(m[1]) - 1
  return `${leto}/${String((leto + 1) % 100).padStart(2, '0')}`
}

/** Sezona iz izbirnika na strani: `<option selected value=65>2025/2026` → "2025/26". */
export function sezonaStrani(html) {
  const m = String(html ?? '').match(/<option\s+selected\s+value=(\d+)>(\d{4})\/(\d{4})</)
  if (m) return `${m[2]}/${m[3].slice(2)}`
  return null
}

/** Sezona iz šifre lige (évad); null, če id ni znan. */
export const sezonaIzKode = (koda) => SEZONE[razbijKodo(koda).ev] ?? null

/** "75'" → 75, "93'" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "GERENCSÉR  DÁNIEL" → "Gerencsér Dániel". Ime z malimi črkami ostane. */
export function lepoIme(ime) {
  return razpakiraj(ime)
    .split(' ')
    .filter(Boolean)
    .map((b) =>
      b === b.toLocaleUpperCase('hu') && /\p{L}{2}/u.test(b)
        ? b.toLocaleLowerCase('hu').replace(/(^|[-'])(\p{L})/gu, (_, a, c) => a + c.toLocaleUpperCase('hu'))
        : b,
    )
    .join(' ')
}

// --- stran kroga -------------------------------------------------------------

/** Številke krogov iz izbirnika `Forduló` (`<option value=7>7. forduló`). */
export function krogiStrani(html) {
  const s = String(html ?? '')
  const i = s.indexOf('id="turnsTitle"')
  if (i < 0) return []
  const blok = s.slice(i, s.indexOf('</select>', i))
  return [...new Set([...blok.matchAll(/value=(\d+)>\s*\d+\.\s*fordul/g)].map((m) => Number(m[1])))].sort((a, b) => a - b)
}

/**
 * Tekme kroga s strani kroga. Stran pod razporedom kroga našteje še ves
 * razpored ENE ekipe (tekme drugih krogov), zato beremo samo `#match_panel`
 * in le tekme, katerih povezava nosi ta krog. Prost krog ("szabadnap") ni
 * tekma.
 */
export function vrsticeKroga(html, krog) {
  const s = String(html ?? '')
  const i = s.indexOf('id="match_panel"')
  if (i < 0) return []
  const konec = s.indexOf('team_lapbar', i)
  const panel = s.slice(i, konec < 0 ? undefined : konec)
  const out = []
  const videne = new Set()
  for (const blok of panel.split(/<div class="schedule[ "]/).slice(1)) {
    const ime = (k) => besedilo(blok.match(new RegExp(`<div class="${k}">[\\s\\S]*?<span>([^<]*)</span>`))?.[1])
    const domaci = ime('home_team')
    const gostje = ime('away_team')
    if (!domaci || !gostje || /^szabadnap$/i.test(domaci) || /^szabadnap$/i.test(gostje)) continue
    const povezava = blok.match(/\/match\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.html/)
    if (povezava && Number(povezava[4]) !== krog) continue
    const id = povezava?.[5] ?? null
    if (id && videne.has(id)) continue
    if (id) videne.add(id)
    const r = blok.match(/class="schedule-points"[^>]*>\s*(\d+)\s*-\s*(\d+)\s*</)
    const { datum, ura } = datumUra(blok.match(/<div class="team_sorsolas_date">([\s\S]*?)<\/div>/)?.[1])
    out.push({
      id,
      krog,
      datum,
      ura,
      domaci,
      gostje,
      izid: r ? { domaci: Number(r[1]), gostje: Number(r[2]) } : null,
    })
  }
  return out
}

// --- zapisnik ----------------------------------------------------------------

/** Ikone dogodkov v celici `match_players_cards`: [{ vrsta, minuta }]. */
function dogodki(celica) {
  return [...String(celica ?? '').matchAll(/timeline\/event_([a-z_]+)\.png\)">\s*([^<]*)</g)].map(([, vrsta, cas]) => ({
    vrsta,
    minuta: minuta(razpakiraj(cas)),
  }))
}

/** Vrstice igralcev v eni tabeli (začetna enajsterica ali klop). */
function vrsticeIgralcev(tabela, rezerva) {
  const out = []
  for (const m of String(tabela).matchAll(/<tr class="template-tr-selectable">([\s\S]*?)<\/tr>/g)) {
    const v = m[1]
    const stevilka = v.match(/<td class="match_players_num">([\s\S]*?)<\/td>/)?.[1] ?? ''
    const imeCelica = v.match(/<td class="match_players_name">([\s\S]*?)<\/td>/)?.[1] ?? ''
    const id = stevilka.match(/player\/(\d+)\.html/)?.[1]
    const ime = imeCelica.match(/<a [^>]*>([^<]*)<\/a>/)?.[1]
    if (!id || !ime) continue
    // Par menjave: povezava `match_players_changeup` (prišel namesto njega
    // oziroma zamenjal ga je).
    const par = stevilka.match(/player\/(\d+)\.html'\s+class='match_players_changeup'[^>]*title='([^']*)'>\s*<span class='playerNum'>\s*(\d+)/)
    const ev = dogodki(v.match(/<td class="match_players_cards">([\s\S]*?)<\/td>/)?.[1])
    out.push({
      st: Number(stevilka.match(/class="playerNum">\s*(\d+)/)?.[1]) || null,
      ime: lepoIme(ime),
      regSt: Number(id),
      rezerva,
      par: par ? { regSt: Number(par[1]), st: Number(par[3]) || null, ime: lepoIme(par[2]) } : null,
      // Ikone v celici niso po vrsti; menjave uredimo po minuti.
      preklopi: ev.filter((d) => d.vrsta === 'swap' && d.minuta != null).map((d) => d.minuta).sort((a, b) => a - b),
      dogodki: ev,
    })
  }
  return out
}

/**
 * Igralci ene ekipe (`#left_team` ali `#right_team`). Pred `CSERÉK` je
 * začetna enajsterica, za njim klop; pri `VEZETŐEDZŐ` se začne vodstvo
 * ekipe, katerega kartoni NE štejejo.
 */
function igralciEkipe(blok) {
  const brezVodstva = blok.split(/class="replacement coach"|match_table_subhead"[^>]*>\s*VEZETŐEDZŐ/)[0]
  const [zacetni, klop = ''] = brezVodstva.split(/match_table_subhead"[^>]*>\s*CSERÉK/)
  const ime = besedilo(blok.match(/<h2 class="pointer">([\s\S]*?)<\/h2>/)?.[1])
  return { ime, postava: vrsticeIgralcev(zacetni, false), rezerve: vrsticeIgralcev(klop, true) }
}

/** Bloka obeh ekip; null, če jih stran nima. */
function blokaEkip(s) {
  const iDoma = s.indexOf('id="left_team"')
  const iGost = s.indexOf('id="right_team"')
  if (iDoma < 0 || iGost < 0) return null
  const konec = s.indexOf('class="team_tabella"', iGost)
  return [s.slice(iDoma, iGost), s.slice(iGost, konec < 0 ? undefined : konec)]
}

/** Izid z glave zapisnika (`.match-result` "3 - 4" in polčas "(1 - 1)"). */
function izidZapisnika(s) {
  const m = s.match(/<div class="match-result">\s*<span>\s*(\d+)\s*-\s*(\d+)\s*<\/span>(?:\s*<p>\s*\(\s*(\d+)\s*-\s*(\d+)\s*\)\s*<\/p>)?/)
  if (!m) return null
  return {
    rezultat: { domaci: Number(m[1]), gostje: Number(m[2]) },
    polcas: m[3] != null ? { domaci: Number(m[3]), gostje: Number(m[4]) } : null,
  }
}

const mozna3do0 = (izid) => !!izid && Math.min(izid.domaci, izid.gostje) === 0 && Math.max(izid.domaci, izid.gostje) === 3

/** Koliko začetnikov ima vsaka ekipa na strani tekme ([domači, gostje]). */
function steviloZacetnikov(html) {
  const bloka = blokaEkip(String(html ?? ''))
  if (!bloka) return null
  return bloka.map((b) => igralciEkipe(b).postava.length)
}

/**
 * Kontumacija: dodeljen izid 3:0 in vsaj ena ekipa brez postave
 * (ZTE FC II. : Zalakomár, Zala I 2025/26, 13. krog — obe postavi prazni).
 * Pri obeh praznih je to lahko tudi zapisnik, ki še ni vnesen, zato razpored
 * tako tekmo za kontumacijo šteje šele teden dni po tekmi (kot hns).
 */
export function jeKontumacija(html, izid = izidZapisnika(String(html ?? ''))?.rezultat) {
  if (!mozna3do0(izid)) return false
  const n = steviloZacetnikov(html)
  return !!n && n.some((x) => x === 0)
}

/** Obe postavi prazni (pri 3:0) — glej `jeKontumacija`. */
export function brezPostav(html, izid = izidZapisnika(String(html ?? ''))?.rezultat) {
  if (!mozna3do0(izid)) return false
  const n = steviloZacetnikov(html)
  return !!n && n.every((x) => x === 0)
}

/**
 * Stran tekme v obliko zapisnika, kot jo dajo drugi viri.
 * Vrne null, če tekma nima izida ali ena od ekip nima postave (zapisnik še ni
 * vnesen ali kontumacija).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = String(html ?? '')
  const izid = izidZapisnika(s)
  if (!izid) return null
  const bloka = blokaEkip(s)
  if (!bloka) return null
  const ekipe = bloka.map(igralciEkipe)
  if (ekipe.some((e) => !e.postava.length || !e.ime)) return null

  // Namig za vratarja (glej glavo datoteke): prvi začetnik in kdor je prišel
  // namesto njega.
  for (const e of ekipe) {
    const prvi = e.postava[0]
    prvi.vratar = true
    for (const i of [...e.postava.slice(1), ...e.rezerve]) i.vratar = false
    const namesto = e.rezerve.find((r) => r.par?.regSt === prvi.regSt && r.preklopi.length)
    if (namesto) namesto.vratar = true
  }

  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    const vsi = [...e.postava, ...e.rezerve]
    for (const i of vsi) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime }
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'goal') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'penalty_goal') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        // Avtogol je pri igralcu, ki ga je dal, torej pri njegovi ekipi.
        else if (d.vrsta === 'own_goal') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (d.vrsta === 'yellowcard') rumeni.push(z)
        // Drugi rumeni se pokaže le kot rdeči.
        else if (d.vrsta === 'redcard') rdeci.push(z)
      }
    }

    // Menjave v parih. Vsaka vrstica s povezavo `changeup` pove PRVO
    // spremembo svojega igralca: začetnik je šel ven, rezerva prišla noter.
    // Vstop rezerve (njena prva sprememba) je zato natanko ena menjava;
    // začetnik, ki ga nihče ni nadomestil s klopi, dobi menjavo brez para.
    const poReg = new Map(vsi.map((i) => [i.regSt, i]))
    const pokrite = new Set() // `${regSt}|${minuta}`
    const dodaj = (minutaM, noter, ven) => {
      menjave.push({
        ekipaIdx,
        minuta: minutaM,
        noter: noter ? { st: noter.st, ime: noter.ime } : { st: null, ime: null },
        ven: ven ? { st: ven.st, ime: ven.ime } : { st: null, ime: null },
      })
      if (noter) pokrite.add(`${noter.regSt}|${minutaM}`)
      if (ven) pokrite.add(`${ven.regSt}|${minutaM}`)
    }
    for (const r of e.rezerve) {
      if (!r.preklopi.length) continue
      const ven = r.par ? poReg.get(r.par.regSt) ?? null : null
      dodaj(r.preklopi[0], r, ven)
    }
    // Ostale spremembe (začetnik brez para, drugi izhod rezerve, vrnitev pri
    // letečih menjavah) brez para: minutam zadošča, kdaj je kdo šel in prišel.
    for (const i of vsi) {
      i.preklopi.forEach((min, k) => {
        if (pokrite.has(`${i.regSt}|${min}`)) return
        const noter = i.rezerva ? k % 2 === 0 : k % 2 === 1
        if (noter) dodaj(min, i, null)
        else dodaj(min, null, i)
      })
    }
  })

  const { rezultat, polcas } = izid
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  const opozorila = []
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  for (const e of ekipe)
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)

  const { datum } = datumUra(s.match(/<p class="match_data_date">([\s\S]*?)<\/p>/)?.[1])
  const naslov = besedilo(s.match(/<h1 id="headerText"[^>]*>([\s\S]*?)<\/h1>/)?.[1])
  const krog =
    Number(naslov.match(/(\d+)\.\s*forduló/)?.[1]) ||
    Number(s.match(/<option\s+selected\s+value=(\d+)>\s*\d+\.\s*forduló/)?.[1]) ||
    null

  const vObliko = ({ dogodki: _d, par: _p, rezerva: _r, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaStrani(s) ?? sezonaIzDatuma(datum),
    krog,
    datum,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/**
 * Nastopi s šifro igralca. Skupna funkcija pozna en vstop in en izstop na
 * igralca; kdor je šel ven in nazaj (leteče menjave), dobi minute iz vseh.
 */
export function nastopi(z) {
  return skupniNastopi(z).map((n) => {
    const e = n.ekipaIdx === 0 ? z.domaci : z.gostje
    const i = [...e.postava, ...e.rezerve].find((x) => x.st === n.st && x.ime === n.ime)
    const out = { ...n, regSt: i?.regSt ?? null, pozicija: i?.pozicija ?? null }
    // Začetnik z več kot enim preklopom ali rezerva z več kot dvema.
    if (i && i.preklopi.length > (n.zacetnik ? 1 : 2)) {
      const rdec = z.rdeci.find((k) => k.ekipaIdx === n.ekipaIdx && k.st === n.st)
      const konec = rdec?.minuta ?? DOLZINA_TEKME
      const { minute, prvic } = minuteIzPreklopov(n.zacetnik, i.preklopi, konec)
      out.minute = minute
      out.minutaOd = prvic ?? out.minutaOd
      out.minutaDo = i.preklopi.length % 2 === (n.zacetnik ? 1 : 0) ? Math.min(i.preklopi.at(-1), konec) : konec
    }
    return out
  })
}

// --- klubi -------------------------------------------------------------------

// Vzdevki: levo ključ, kot ga piše vir, desno ključ, pod katerim klub že
// poznamo. Dodaj le videne: "ZVFC" (2025/26) je "Zalaszentgróti VFC" (2026/27),
// isti grb (EgyesuletLogo 6/5490).
const ISTI_KLUB_HU = {
  zvfc: 'zalaszentgróti vfc',
}

const kljucBrezVzdevka = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('hu')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Ključ kluba: male črke z madžarskimi naglasi (ő, ű …), ki jih slovenski
// `poenostavi` zavrže. Adatbank isti klub piše enako v razporedu in zapisniku,
// med sezonami pa se spremeni velikost črk ("KISKANIZSAI SÁSKÁK" →
// "Kiskanizsai Sáskák") ali ime (vzdevki zgoraj).
export const kljucKlubaHu = (ime) => {
  const k = kljucBrezVzdevka(ime)
  return ISTI_KLUB_HU[k] ?? k
}

// Oblike društva (SE = sportegyesület, TE = torna egylet, KSE = községi SE …),
// ki jih v kratkem imenu ne potrebujemo.
const OBLIKE_HU = new Set(['se', 'fc', 'kse', 'sc', 'tc', 'lse', 'te', 'sk', 'tk', 'ese', 'ste', 'vse', 'vfc', 'fk',
  'ksk', 'mte', 'tse', 'ase', 'kfc', 'lc', 'egyesület', 'sportegyesület', 'sportkör', 'egylet'])
// Gospodarska družba sponzorja ("OWI ZALA Bt. LETENYE SE"): vse do nje je sponzor.
const DRUZBA = /^(kft|bt|zrt|nyrt|kkt|rt)\.?$/i
// Dodatek za ekipo (rezerve, mladinci): ostane pri imenu.
const DODATEK = /^(i{1,3}|iv|u\d{1,2})\.?$/i

/**
 * Kratko ime: brez sponzorske družbe in oblike društva. Ostaneta največ dve
 * besedi; pri treh ali več je kraj zadnja ("ZNET TELEKOM BECSEHELY SE" →
 * "Becsehely"), dodatek (II., U19) ostane. "CSESZTREGI KSE" → "Csesztregi",
 * "ZTE FC II." → "ZTE II.", "Tarr Andráshida SC" → "Tarr Andráshida".
 */
export function kratkoImeHu(polno) {
  let besede = razpakiraj(polno).split(' ').filter(Boolean)
  const iDruzba = besede.findIndex((b) => DRUZBA.test(b))
  if (iDruzba >= 0 && iDruzba < besede.length - 1) besede = besede.slice(iDruzba + 1)
  besede = besede.filter((b) => !OBLIKE_HU.has(b.toLocaleLowerCase('hu').replace(/\.$/, '')))
  const dodatek = besede.filter((b) => DODATEK.test(b))
  const jedro = besede.filter((b) => !DODATEK.test(b))
  if (!jedro.length) return razpakiraj(polno)
  const izbrane = jedro.length > 2 ? jedro.slice(-1) : jedro
  // Kratica ostane kratica: "ZTE", "ZVFC" (brez samoglasnika).
  const kratica = (b) => b.length <= 3 || !/[aeiouáéíóöőúüű]/i.test(b)
  const lepo = [...izbrane.map((b) => (kratica(b) ? b : lepoIme(b))), ...dodatek].join(' ')
  return lepo.charAt(0).toLocaleUpperCase('hu') + lepo.slice(1)
}

// --- prenos ------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/**
 * Strani vseh krogov lige: [{ krog, html }]. Prva stran pove, koliko krogov
 * je. `sveze` = vsako stran preberi znova (razpored); sicer stran kroga iz
 * predpomnilnika velja, dokler nima tekme brez izida, ki je že na vrsti.
 */
async function straniKrogov(koda, prenesi, sveze) {
  const prva = await prenesi(naslovKroga(koda, 1), imeKroga(koda, 1), true)
  const krogi = krogiStrani(prva)
  const out = [{ krog: 1, html: prva }]
  const danes = new Date().toISOString().slice(0, 10)
  for (const krog of krogi.filter((k) => k !== 1)) {
    let html = await prenesi(naslovKroga(koda, krog), imeKroga(koda, krog), sveze)
    const zastarela = vrsticeKroga(html, krog).some((t) => !t.izid && (!t.datum || t.datum <= danes))
    if (!sveze && zastarela) html = await prenesi(naslovKroga(koda, krog), imeKroga(koda, krog), true)
    out.push({ krog, html })
  }
  return out
}

const vir = {
  ime: 'mlsz',
  polnoIme: 'Magyar Labdarúgó Szövetség (adatbank.mlsz.hu)',
  drzava: 'HU',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  // ada1bank ima v robots.txt Crawl-delay: 1; mi čakamo 1,5 s.
  premorMs: 1500,
  imaRegistracije: false,

  naslovRazporeda: (koda) => naslovKroga(koda, 1),
  // Zapisnik potrebuje krog; brez njega adatbank vrne tekmo po kratkem naslovu.
  naslovZapisnika: (koda, sifra, krog) => (krog ? naslovTekme(koda, krog, sifra) : `${OSNOVNI}/match/${sifra}`),

  async razporedVseStrani(koda, prenesi) {
    const krogi = []
    for (const { krog, html } of await straniKrogov(koda, prenesi, true)) {
      const tekme = []
      for (const t of vrsticeKroga(html, krog)) {
        // Le 3:0 / 0:3 je lahko kontumacija; zapisnik prebere tudi uvoz
        // zapisnikov, zato to ne pomeni veliko novih zahtevkov.
        let kontumacija = false
        if (mozna3do0(t.izid) && t.id) {
          const stran = await prenesi(naslovTekme(koda, krog, t.id), imeTekme(koda, t.id), true)
          kontumacija = jeKontumacija(stran, t.izid) && (!brezPostav(stran, t.izid) || starostDni(t.datum) > 7)
        }
        tekme.push({
          domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija,
          ...(kontumacija ? { izid: t.izid } : {}),
        })
      }
      if (tekme.length) krogi.push({ stevilka: krog, tekme })
    }
    return krogi
  },

  async zapisniki(koda, prenesi) {
    const out = []
    for (const { krog, html } of await straniKrogov(koda, prenesi, false)) {
      for (const t of vrsticeKroga(html, krog).filter((x) => x.izid && x.id)) {
        const url = naslovTekme(koda, krog, t.id)
        const ime = imeTekme(koda, t.id)
        let z = vZapisnik(await prenesi(url, ime), { id: t.id, url })
        // Znova le tekmo zadnjih 45 dni: starejša brez postav je kontumacija.
        if (!z && starostDni(t.datum) <= 45) z = vZapisnik(await prenesi(url, ime, true), { id: t.id, url })
        if (!z) continue
        // Ime kluba in krog iz razporeda, da se tekma ujame z vrstico razporeda.
        z.domaci.ime = t.domaci
        z.gostje.ime = t.gostje
        z.krog ??= krog
        z.sezona ??= sezonaIzKode(koda)
        out.push({ id: z.zapisnikId, z, url })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaHu,
  kratkoIme: kratkoImeHu,
  poenostavi: kljucBrezVzdevka,
}

export default vir
