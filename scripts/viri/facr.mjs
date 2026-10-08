// Vir: Fotbalová asociace České republiky — javni del IS FAČR (is.fotbal.cz/public).
//
// IS FAČR je sistem, v katerem FAČR, krajske in okrajne zveze vodijo vsa
// tekmovanja, od ČFL do IV. třídy. Zapisnik (`zapis-o-utkani-report.aspx`) je
// na vseh ravneh enak: postavi s številko dresa in stalno šifro igralca FAČR
// (osem števk), vratar je označen z `B` (brankář, ostali `N`), pri vsakem
// igralcu minuta menjave, rumena in rdeča z minuto, strelci v svoji tabeli s
// tipom (branka, pokutový kop, vlastní branka).
//
// Šifra lige je UUID tekmovanja (`detail-souteze.aspx?req=<UUID>`, isti kot v
// naslovu na www.fotbal.cz `/souteze/turnaje/hlavni/<UUID>`). Vsaka sezona je
// svoje tekmovanje s svojim UUID-jem; ročník 2026 je sezona 2026/27. Iskalnik
// tekmovanj na IS za nas ne vrne ničesar, zato UUID vpišemo ročno ob vsaki
// novi sezoni (kot `source_league_code` pri drugih virih).
//
// Dostop: IS odgovarja le z omrežij v EU (Hetzner da, GitHubovi tekači v ZDA
// ne). Zato zahtevki tečejo prek posrednika na našem strežniku, kadar je
// nastavljen `FACR_PROXY` (http://uporabnik:geslo@gostitelj:vrata). Vsak
// zahtevek potrebuje sejo (piškotka ASP.NET_SessionId in sport_type) — brez
// nje IS preusmeri na `/public/?redir=v4`. Sejo odpremo z enim obiskom
// naslovnice, kot bi jo brskalnik. Zaščit ne obhajamo: www.fotbal.cz je za
// Cloudflarovim izzivom in ga ne beremo, iskanja tekem (CAPTCHA) ne
// uporabljamo. Beremo odkrito, počasi in le nove tekme, vir navedemo.
import { nastopi as skupniNastopi } from '../zapisnik.mjs'
import { razpakiraj } from '../klubi.mjs'

const OSNOVNI = 'https://is.fotbal.cz/public'
const DOLZINA_TEKME = 90
const GLAVE = { 'User-Agent': 'SLFF fantasy (https://slff.eu)' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function razbijKodo(koda) {
  const id = String(koda ?? '').trim()
  if (!UUID.test(id)) throw new Error(`facr: šifra lige je UUID tekmovanja v IS FAČR, ne "${koda}"`)
  return { id: id.toLowerCase() }
}

const naslovTekmovanja = (koda) => `${OSNOVNI}/souteze/detail-souteze.aspx?req=${razbijKodo(koda).id}&sport=fotbal`
const naslovTekme = (id) => `${OSNOVNI}/zapasy/zapis-o-utkani-report.aspx?zapas=${id}&zapis=1&noprint=1&btnprint=1&.htm`

const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

/** "22.08.2026 10:00" → { datum: '2026-08-22', ura: '10:00' }. */
export function datumUra(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}:\d{2}))?/)
  if (!m) return { datum: null, ura: null }
  const dd = (x) => x.padStart(2, '0')
  return { datum: `${m[3]}-${dd(m[2])}-${dd(m[1])}`, ura: m[4] ? m[4].padStart(5, '0') : null }
}

/** Ročník IS je leto začetka sezone: 2026 → "2026/27". */
export const sezonaIzRocnika = (r) => {
  const leto = Number(r)
  return Number.isInteger(leto) && leto > 2000 ? `${leto}/${String((leto + 1) % 100).padStart(2, '0')}` : null
}

/** Minuta iz celice: "84" → 84, "90+2" → 90, prazno → null. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "TJ Sokol Ostředek <i>(3)</i>" (mesto na lestvici) → "TJ Sokol Ostředek". */
const imeKluba = (html) => besedilo(String(html ?? '').replace(/<i>[\s\S]*?<\/i>/g, ''))

// --- razpored ----------------------------------------------------------------

/**
 * Tekme s strani tekmovanja. Krog je naslov `<h2 class="nadpis">N. kolo`,
 * vsaka tekma vrstica s 7 celicami: datum in ura, domači, gostje, izid,
 * igrišče, opomba, povezave (zapisnik, delegacija).
 */
export function vrsticeRazporeda(html) {
  const s = String(html ?? '')
  const out = []
  const kosi = s.split(/<h2 class="nadpis">\s*/).slice(1)
  for (const kos of kosi) {
    const krog = Number(kos.match(/^(\d+)\.\s*kolo/)?.[1])
    if (!krog) continue
    for (const m of kos.matchAll(/<tr class="type_\w+">([\s\S]*?)<\/tr>/g)) {
      const celice = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1])
      if (celice.length < 4) continue
      const { datum, ura } = datumUra(besedilo(celice[0]))
      const izid = besedilo(celice[3].replace(/<span[\s\S]*$/, '')).match(/^(\d+)\s*:\s*(\d+)$/)
      const id = celice.slice(6).join(' ').match(/zapis-o-utkani-report\.aspx\?zapas=([0-9a-f-]{36})/i)?.[1] ?? null
      out.push({
        id,
        krog,
        datum,
        ura,
        domaci: imeKluba(celice[1]),
        gostje: imeKluba(celice[2]),
        izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
        // "zápis uzavřen" — zapisnik je zaključen in se ne spreminja več.
        zakljucen: /class="[^"]*\buzavren\b/.test(celice.slice(6).join(' ')),
        opomba: besedilo(celice[5] ?? ''),
      })
    }
  }
  return out.filter((t) => t.domaci && t.gostje)
}

// --- zapisnik ----------------------------------------------------------------

/** Vrednost polja glave (Kolo, Ročník, Den). Iščemo v besedilu, ne po oznakah. */
function poljeGlave(tekst, ime) {
  // Oznaka in vrednost sta v ločenih celicah: "Kolo: | 3 |".
  const re = new RegExp(`${ime}\\s*:\\s*\\|?\\s*([^|]+?)\\s*(?=\\||$)`)
  return tekst.match(re)?.[1]?.trim() ?? null
}

/**
 * Igralci ene ekipe iz tabele `Hráči domácí` / `Hráči hosté`.
 *
 * Vrstice `po1`–`po11` so začetna enajsterica, od `po12` naprej klop (glave
 * vmes ni). Stolpci: Č. | Příjmení a jméno (+ `B`/`N`, `(K)`, `(EU)`) | ID |
 * Stř. ×2 | ŽK ×2 | ČK | Br.
 *
 * Menjava ima DVE celici, ker nižje lige dovolijo leteče menjave: igralec gre
 * lahko ven in nazaj. Celice so zaporedne spremembe stanja, začenši z
 * začetnim: začetnik — ven, (nazaj); rezerva — noter, (ven).
 */
function igralciEkipe(blok) {
  const out = []
  for (const m of blok.matchAll(/<tr class="po(\d+) kapitan(True|False)">([\s\S]*?)<\/tr>/g)) {
    const celice = [...m[3].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1])
    if (celice.length < 9) continue
    const vrstni = Number(m[1])
    const imeCelica = besedilo(celice[1])
    const oznaka = imeCelica.match(/\s([BN])$/)?.[1] ?? null
    const ime = imeCelica
      .replace(/\s[BN]$/, '')
      .replace(/\((K|EU|[A-Z]{1,3})\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const id = besedilo(celice[2])
    out.push({
      zacetnik: vrstni <= 11,
      st: Number(besedilo(celice[0])) || null,
      ime,
      regSt: /^\d{6,10}$/.test(id) ? Number(id) : null,
      vratar: oznaka === 'B',
      kapetan: m[2] === 'True',
      preklopi: [minuta(besedilo(celice[3])), minuta(besedilo(celice[4]))].filter((x) => x != null),
      rumeni: [minuta(besedilo(celice[5])), minuta(besedilo(celice[6]))],
      rdeci: besedilo(celice[7]) ? minuta(besedilo(celice[7])) ?? DOLZINA_TEKME : null,
      goli: Number(besedilo(celice[8])) || 0,
    })
  }
  return out
}

/** Vrstice tabele strelcev: { ime, tip, regSt, minuta }. */
function strelci(blok) {
  const out = []
  for (const m of blok.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const celice = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => besedilo(c[1]))
    // P. | Příjmení a jméno | Typ | ID | Minuta
    if (celice.length < 5 || !/^\d+$/.test(celice[0])) continue
    out.push({ ime: celice[1], tip: celice[2], regSt: /^\d+$/.test(celice[3]) ? Number(celice[3]) : null, minuta: minuta(celice[4]) })
  }
  return out
}

/** Odsek HTML od naslova `h2` do naslednjega `h2` (ali konca). */
function odsek(html, naslov) {
  const i = html.indexOf(`<h2>${naslov}`)
  if (i < 0) return ''
  const j = html.indexOf('<h2', i + 4)
  return html.slice(i, j < 0 ? undefined : j)
}

/**
 * Stran zapisnika v obliko, kot jo dajo drugi viri.
 * Vrne null, če zapisnik še nima izida ali postav.
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = String(html ?? '')
  const iHraci = s.indexOf('Hráči domácí')
  if (iHraci < 0) return null
  const glava = besedilo(s.slice(0, iHraci).replace(/<\/t[dh]>/g, ' | ').replace(/<\/tr>/g, ' | '))

  const izid = glava.match(/Výsledek utkání:\s*\|?\s*(\d+)\s*:\s*(\d+)/)
  if (!izid) return null
  const polcas = glava.match(/Poločas utkání:\s*\|?\s*(\d+)\s*:\s*(\d+)/)
  const domaciIme = glava.match(/Domácí\s*\|?\s*\d*\s*-\s*([^|]+?)\s*\|/)?.[1]?.trim()
  const gostjeIme = glava.match(/Hosté\s*\|?\s*\d*\s*-\s*([^|]+?)\s*\|/)?.[1]?.trim()
  const { datum } = datumUra(poljeGlave(glava, 'Den'))
  const krog = Number(poljeGlave(glava, 'Kolo')?.match(/^\d+/)?.[0]) || null
  const rocnik = poljeGlave(glava, 'Ročník')?.match(/^\d{4}/)?.[0]

  const doma = igralciEkipe(odsek(s, 'Hráči domácí'))
  const gost = igralciEkipe(odsek(s, 'Hráči hosté'))
  if (!doma.some((i) => i.zacetnik) || !gost.some((i) => i.zacetnik) || !domaciIme || !gostjeIme) return null
  const ekipe = [doma, gost]

  // Ekipa igralca po šifri; strelci in kazni nosijo šifro, ne strani.
  const ekipaPoReg = new Map()
  ekipe.forEach((e, idx) => e.forEach((i) => i.regSt != null && ekipaPoReg.set(i.regSt, { idx, i })))

  const goli = []
  const opozorila = []
  for (const [stran, naslov] of [[0, 'Střelci domácí'], [1, 'Střelci hosté']]) {
    for (const g of strelci(odsek(s, naslov))) {
      const kdo = g.regSt != null ? ekipaPoReg.get(g.regSt) : null
      const vlastni = /vlastní/i.test(g.tip)
      // Avtogol je vpisan pri ekipi, ki ji šteje; strelec je iz nasprotne.
      const ekipaIdx = kdo?.idx ?? (vlastni ? 1 - stran : stran)
      if (!kdo) opozorila.push(`strelec ${g.ime} (${g.regSt ?? 'brez šifre'}) ni v nobeni postavi`)
      goli.push({
        ekipaIdx,
        st: kdo?.i.st ?? null,
        ime: kdo?.i.ime ?? g.ime,
        minuta: g.minuta,
        avtogol: vlastni || (kdo != null && kdo.idx !== stran),
        enajstmetrovka: /pokutov/i.test(g.tip),
      })
    }
  }

  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    for (const i of e) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime }
      const [r1, r2] = i.rumeni
      if (r1 != null) rumeni.push({ ...kdo, minuta: r1 })
      // Drugi rumeni je izključitev.
      if (r2 != null) rdeci.push({ ...kdo, minuta: r2 })
      else if (i.rdeci != null) rdeci.push({ ...kdo, minuta: i.rdeci })
      // Menjave brez para (kot Semafor): kdo je kdaj šel ven ali prišel noter.
      i.preklopi.forEach((min, k) => {
        const noter = i.zacetnik ? k % 2 === 1 : k % 2 === 0
        menjave.push({
          ekipaIdx,
          minuta: min,
          noter: noter ? { st: i.st, ime: i.ime } : { st: null, ime: null },
          ven: noter ? { st: null, ime: null } : { st: i.st, ime: i.ime },
        })
      })
    }
  })

  const rezultat = { domaci: Number(izid[1]), gostje: Number(izid[2]) }
  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz strelcev (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const vObliko = ({ zacetnik, rumeni: _r, rdeci: _c, goli: _g, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzRocnika(rocnik),
    krog,
    datum,
    domaci: { ime: domaciIme, postava: doma.filter((i) => i.zacetnik).map(vObliko), rezerve: doma.filter((i) => !i.zacetnik).map(vObliko) },
    gostje: { ime: gostjeIme, postava: gost.filter((i) => i.zacetnik).map(vObliko), rezerve: gost.filter((i) => !i.zacetnik).map(vObliko) },
    rezultat,
    polcas: polcas ? { domaci: Number(polcas[1]), gostje: Number(polcas[2]) } : null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Minute na igrišču iz zaporednih sprememb stanja (leteče menjave). */
export function minuteIzPreklopov(zacetnik, preklopi, konec = DOLZINA_TEKME) {
  let na = zacetnik
  let od = 0
  let skupaj = 0
  let prvic = zacetnik ? 0 : null
  for (const t of [...preklopi].sort((a, b) => a - b)) {
    if (na) skupaj += Math.max(0, Math.min(t, konec) - od)
    else { od = t; prvic ??= t }
    na = !na
  }
  if (na) skupaj += Math.max(0, konec - od)
  return { minute: skupaj, prvic }
}

/**
 * Nastopi s šifro igralca. Skupna funkcija pozna eno menjavo na igralca;
 * igralec, ki je šel ven in nazaj (leteče menjave), dobi minute iz vseh.
 */
export function nastopi(z) {
  return skupniNastopi(z).map((n) => {
    const e = n.ekipaIdx === 0 ? z.domaci : z.gostje
    const i = [...e.postava, ...e.rezerve].find((x) => x.st === n.st && x.ime === n.ime)
    const out = { ...n, regSt: i?.regSt ?? null, pozicija: i?.pozicija ?? null }
    if (i && i.preklopi.length > 1) {
      const rdec = z.rdeci.find((k) => k.ekipaIdx === n.ekipaIdx && k.st === n.st)
      const { minute } = minuteIzPreklopov(n.zacetnik, i.preklopi, rdec?.minuta ?? DOLZINA_TEKME)
      out.minute = minute
      out.minutaDo = rdec?.minuta ?? DOLZINA_TEKME
    }
    return out
  })
}

// --- seja in prenos ----------------------------------------------------------

let piskotki = null
let posrednik

async function dispecer() {
  if (posrednik !== undefined) return posrednik
  const naslov = process.env.FACR_PROXY
  if (!naslov) return (posrednik = null)
  const { ProxyAgent } = await import('undici')
  return (posrednik = new ProxyAgent(naslov))
}

async function osnovniFetch(url, init = {}) {
  const d = await dispecer()
  if (!d) return fetch(url, init)
  const { fetch: f } = await import('undici')
  return f(url, { ...init, dispatcher: d })
}

/** Odpri sejo: obisk naslovnice nastavi ASP.NET_SessionId in sport_type. */
async function odpriSejo(signal) {
  const o = await osnovniFetch(`${OSNOVNI}/?sport=fotbal`, { headers: GLAVE, redirect: 'manual', signal })
  const set = typeof o.headers.getSetCookie === 'function' ? o.headers.getSetCookie() : [o.headers.get('set-cookie') ?? '']
  await o.body?.cancel().catch(() => {})
  piskotki = set.map((c) => c.split(';')[0]).filter(Boolean).join('; ')
  if (!/ASP\.NET_SessionId=/.test(piskotki)) throw new Error(`facr: IS ni odprl seje (HTTP ${o.status})`)
}

const jePreusmeritevNaZacetek = (o) => o.status >= 300 && o.status < 400 && /redir=v4/.test(o.headers.get('location') ?? '')

/**
 * IS FAČR postavi zapisnike za CAPTCHO (`security-valid.aspx`, "ověřte že
 * nejste robot"), ko bere kdo prehitro: 8. 10. 2026 ob 23:03 je to sprožil
 * prvi uvoz s premorom 1 s, naslednji dan je izginila. Tu se uvoz USTAVI —
 * zaščite ne obhajamo (ne nove seje, ne reševanje, ne drug IP).
 */
export class FacrPreverba extends Error {}
const jePreverba = (o) => o.status >= 300 && o.status < 400 && /security-valid\.aspx/i.test(o.headers.get('location') ?? '')

/**
 * `fetch` za IS FAČR: prek posrednika (če je nastavljen) in s sejo. Ko seja
 * poteče, IS preusmeri na naslovnico; takrat odpremo novo in poskusimo enkrat.
 */
export async function facrFetch(url, init = {}) {
  for (let poskus = 0; poskus < 2; poskus++) {
    if (!piskotki) await odpriSejo(init.signal)
    const o = await osnovniFetch(url, { ...init, headers: { ...GLAVE, ...(init.headers ?? {}), Cookie: piskotki }, redirect: 'manual' })
    if (jePreverba(o)) {
      await o.body?.cancel().catch(() => {})
      throw new FacrPreverba(`facr: IS FAČR zahteva preverbo, da nismo robot (CAPTCHA) — uvoz ustavljen, ne obhajaj: ${url}`)
    }
    if (!jePreusmeritevNaZacetek(o)) return o
    await o.body?.cancel().catch(() => {})
    piskotki = null
  }
  throw new Error(`facr: IS vrača na naslovnico tudi z novo sejo: ${url}`)
}

// --- klubi -------------------------------------------------------------------

// Ključ kluba: male črke s šumniki. IS piše isti klub enako v razporedu in
// zapisniku (oboje iz registra klubov).
export const kljucKlubaCz = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Kratko ime: brez oblike društva (TJ, SK, FK, Sokol …), največ dve besedi.
// "TJ Sokol Ostředek" → "Ostředek", "SK POLABAN Nymburk" → "Polaban Nymburk",
// 'FK ČÁSLAV "B"' → 'Čáslav B'.
const OBLIKE_CZ = new Set(['tj', 'sk', 'fk', 'fc', 'sokol', 'sk.', 'tělovýchovná', 'jednota', 'sportovní', 'klub',
  'z.s.', 'zs', 'z.s', 'o.s.', 'spolek', 'afk', 'sfk', 'ofk', 'mfk', 'tsk', 'tk', 'ttj', 'sv', 'svaz', 't.j.', 'a.s.', 's.r.o.'])
const velikaZacetnica = (b) =>
  b === b.toUpperCase() && b.length > 2 && /\p{L}/u.test(b) ? b.charAt(0) + b.slice(1).toLowerCase() : b
export function kratkoImeCz(polno) {
  const besede = razpakiraj(polno)
    .replace(/[()"",]/g, ' ')
    .split(/\s+/)
    .filter((b) => b && !/^\d{2,4}\.?$/.test(b) && !OBLIKE_CZ.has(b.toLowerCase()))
    .map(velikaZacetnica)
  const ime = besede.slice(0, 2).join(' ')
  return ime.length >= 2 ? ime : razpakiraj(polno)
}

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

const imeTekmovanja = (koda) => `soutez-${razbijKodo(koda).id}.html`

const vir = {
  ime: 'facr',
  polnoIme: 'Fotbalová asociace České republiky (is.fotbal.cz)',
  drzava: 'CZ',
  osnovniNaslov: OSNOVNI,
  glave: GLAVE,
  fetch: facrFetch,
  // Osem sekund med stranmi. Pri eni sekundi je IS po nekaj sto straneh
  // postavil CAPTCHO (8. 10. 2026); arhiv lige (~180 zapisnikov) zdaj traja
  // ~25 minut, kar je za nočni uvoz sprejemljivo.
  premorMs: 8000,
  imaRegistracije: false,

  naslovRazporeda: naslovTekmovanja,
  naslovZapisnika: (_koda, sifra) => naslovTekme(sifra),

  async razporedVseStrani(koda, prenesi) {
    const html = await prenesi(naslovTekmovanja(koda), imeTekmovanja(koda), true)
    const krogi = new Map()
    for (const t of vrsticeRazporeda(html)) {
      if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
      // Kontumacijo IS zapiše v opombo ("kontumace"); izid takrat velja brez zapisnika.
      const kontumacija = /kontum/i.test(t.opomba)
      krogi.get(t.krog).tekme.push({
        domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija,
        ...(kontumacija && t.izid ? { izid: t.izid } : {}),
      })
    }
    return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
  },

  async zapisniki(koda, prenesi) {
    const html = await prenesi(naslovTekmovanja(koda), imeTekmovanja(koda), true)
    const out = []
    for (const t of vrsticeRazporeda(html).filter((x) => x.izid && x.id)) {
      const url = naslovTekme(t.id)
      const ime = `zapas-${t.id}.html`
      let z = vZapisnik(await prenesi(url, ime), { id: t.id, url })
      // Znova le tekmo zadnjih deset dni, ki še nima zaključenega zapisnika.
      if (!z && !t.zakljucen && starostDni(t.datum) <= 10) z = vZapisnik(await prenesi(url, ime, true), { id: t.id, url })
      if (!z) continue
      // Ime kluba vzamemo iz razporeda, ne iz zapisnika: razpored lahko piše
      // kratko ("Vyškov"), zapisnik polno ("MFK Vyškov"). Z dvema imenoma bi
      // isti klub v bazi nastal dvakrat.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaCz,
  kratkoIme: kratkoImeCz,
  poenostavi: kljucKlubaCz,
}

export default vir
