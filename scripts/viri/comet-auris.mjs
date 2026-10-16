// Skupni razčlenjevalnik spletišč COMET podjetja Auris (auris.hr): strani
// zvez, ki podatke COMET izrišejo s strežnika v isti predlogi kot lff.lv.
// Uporabljata ga vira `ltfutbolas` (Litva, lietuvosfutbolas.lt) in `fscg`
// (Črna gora, regijske strani centar/sjever/jug.fscg.me). Glej docs/viri/litva-crna-gora.md
// (Litva — vir ltfutbolas, Črna gora — vir fscg).
//
// STRAN TEKMOVANJA ima zavihek z VSEMI tekmami (`table.fixtures style2`):
// krogi so vrstice `tr.th1` ("14. turas", "5. kolo"), tekma je vrstica z
// `data-id` (id tekme COMET). Spletišči jo pišeta različno:
// - Litva: datum `YYYY-MM-DD` in ura v svojih celicah, klub kot povezava
//   `/klubai/<slug>-<id>/?cid=<tekmovanje>` s `title`, izid `res1`/`res2`
//   ("-" = neodigrana) v povezavi `/rungtynes/<slug>-<id>/`;
// - Črna gora: `div.date` "05.09.2026." in `div.time`, klub v `<span>` ob
//   izidu (`res1 > res`), povezava `/utakmice/<slug>-<id>/` (sicer "-").
//
// ZAPISNIK (`table.teams`, kot lff): vrstica `tr.firstteam` (začetnika obeh
// ekip) in `tr.bench` (klop) ima pet celic: igralec domačih, dres domačih,
// prazno, dres gostov, igralec gostov. "(G)" = vratar, "(C)" = kapetan,
// prazno mesto je "-". Dogodki igralca so `ul.events li.<vrsta>` z minuto —
// Litva jo piše kot besedilo ("46'"), Črna gora v `div.minute` ("46"):
// goal, penalty (gol z 11 m — razred NI goal), own_goal, penalty_failed,
// yellow, second_yellow, red, substitutionIn, substitutionOut.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'

const DOLZINA_TEKME = 90

export const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class CometZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'CometZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/** "64'" ali "64" → 64, "90'+3'" → 90, "PP" (polčas) → 45. */
export function minuta(s) {
  if (/^\s*PP\s*$/i.test(String(s ?? ''))) return 45
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "2026-10-07", "07-10-2026" ali "04.10.2026." → "2026-10-07". */
export function datumIz(s) {
  const t = String(s ?? '')
  let m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/\b(\d{1,2})[.-](\d{1,2})[.-](\d{4})\b/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}
export const uraIz = (s) => {
  const m = String(s ?? '').match(/\b(\d{1,2}):(\d{2})\b/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

/**
 * Sezona iz naslova tekmovanja: "Regionalna liga Centar 26/27" → "2026/27",
 * "KAFF-MAFF III lyga 2026" → "2026" (koledarska). Brez nje null.
 */
export function sezonaIzNaslova(s) {
  const t = String(s ?? '')
  const m = t.match(/\b(\d{2}|\d{4})\/(\d{2})\b/)
  if (m) return `${m[1].length === 2 ? `20${m[1]}` : m[1]}/${m[2]}`
  const l = t.match(/\b(20\d{2})\b/)
  return l ? l[1] : null
}

// --- stran tekmovanja ------------------------------------------------------------

/** Tabela vseh tekem (zavihek "Visos rungtynės" / "Sve utakmice") ali null. */
export function tabelaVsehTekem(html) {
  const s = cisto(html)
  const i = s.indexOf('<table class="fixtures style2"')
  if (i < 0) return null
  const konec = s.indexOf('</table>', i)
  return s.slice(i, konec < 0 ? undefined : konec)
}

/** Id tekmovanja COMET, ki ga stran kaže (genid pri fscg, `?cid=` pri Litvi), ali null. */
export function tekmovanjeStrani(tabela) {
  const g = String(tabela ?? '').match(/data-genid="stats_competition_(?:new_live\d+_)?(\d+)_/)
  if (g) return g[1]
  const c = [...String(tabela ?? '').matchAll(/\?cid=(\d+)/g)].map((m) => m[1])
  return c.length && c.every((x) => x === c[0]) ? c[0] : null
}

/** Naslov strani tekmovanja ("II lyga A divizionas 2026"); skriti h1 izpusti. */
export const imeStrani = (html) =>
  besedilo([...String(html ?? '').matchAll(/<h1(?![^>]*display:\s*none)[^>]*>([\s\S]*?)<\/h1>/g)][0]?.[1] ?? '')

const izidCelice = (t, kateri) => {
  const m = t.match(new RegExp(`class="${kateri}">\\s*(?:<span class="res">)?\\s*([^<\\s]*)`))
  return m?.[1] ?? null
}

/** Ime kluba v vrstici: [domači, gostje]. */
function imenaVrstice(t) {
  const povezave = [...t.matchAll(/<a href="\/(?:klubai|klubovi)\/[^"]*"(?: title="([^"]*)")?>([\s\S]*?)<\/a>/g)].map((m) =>
    razpakiraj(m[1] ?? besedilo(m[2])).trim(),
  )
  if (povezave.length === 2) return povezave
  const d = t.match(/<span>([^<]*)<\/span><span class="res1">/)?.[1]
  const g = t.match(/<span class="res2">[\s\S]*?<\/span><\/span><span>([^<]*)<\/span>/)?.[1]
  return d != null && g != null ? [razpakiraj(d).trim(), razpakiraj(g).trim()] : []
}

/**
 * Tekme tabele vseh tekem: [{ krog, id, pot, datum, ura, domaci, gostje, izid }].
 * Datum in ura sta v krajevnem času spletišča.
 */
export function tekmeTabele(tabela) {
  const out = []
  for (const del of String(tabela ?? '').split('<tr class="th1">').slice(1)) {
    const krog = Number(besedilo(del.match(/<span class="h3">([^<]*)<\/span>/)?.[1]).match(/^(\d+)\./)?.[1])
    if (!krog) continue
    for (const [, id, t] of del.matchAll(/<tr class="[^"]*" data-id="(\d+)">([\s\S]*?)<\/tr>/g)) {
      const imena = imenaVrstice(t)
      if (imena.length !== 2 || !imena[0] || !imena[1]) continue
      const datumCelica = t.match(/<div class="date">([^<]*)<\/div>/)?.[1] ?? t.match(/<td>(\d{4}-\d{2}-\d{2})<\/td>/)?.[1]
      const uraCelica = t.match(/<div class="time">([^<]*)<\/div>/)?.[1] ?? t.match(/<td>(\d{1,2}:\d{2})<\/td>/)?.[1]
      const r1 = izidCelice(t, 'res1')
      const r2 = izidCelice(t, 'res2')
      out.push({
        krog,
        id,
        pot: t.match(/href="(\/(?:rungtynes|utakmice)\/[^"]+)"/)?.[1] ?? null,
        datum: datumIz(datumCelica),
        ura: uraIz(uraCelica),
        domaci: imena[0],
        gostje: imena[1],
        izid: /^\d+$/.test(r1 ?? '') && /^\d+$/.test(r2 ?? '') ? { domaci: Number(r1), gostje: Number(r2) } : null,
      })
    }
  }
  return out
}

/** Najpogostejše leto datumov ("2026") ali null. */
export function letoTekem(tekme) {
  const st = new Map()
  for (const t of tekme) if (t.datum) st.set(t.datum.slice(0, 4), (st.get(t.datum.slice(0, 4)) ?? 0) + 1)
  return [...st.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** Sezona jesen–pomlad iz najzgodnejšega datuma ("2026-09-05" → "2026/27"). */
export function sezonaTekem(tekme) {
  const prvi = tekme.map((t) => t.datum).filter(Boolean).sort()[0]
  if (!prvi) return null
  const [leto, mesec] = prvi.split('-').map(Number)
  const z = mesec >= 7 ? leto : leto - 1
  return `${z}/${String((z + 1) % 100).padStart(2, '0')}`
}

/**
 * Razpored v obliko uvoza razporeda. Odigrana je tekma z izidom; izid brez
 * povezave na zapisnik je kontumacija (kot fss). `vCas` pretvori krajevni
 * datum in uro v ljubljanska.
 */
export function vKroge(tekme, vCas = (datum, ura) => ({ datum, ura })) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    const { datum, ura } = vCas(t.datum, t.ura)
    const kontumacija = !!t.izid && !t.pot
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum, ura, kontumacija, odigrana: !!t.izid,
      ...(kontumacija ? { izid: t.izid } : {}),
      cometId: t.id, pot: t.pot, izidRazporeda: t.izid,
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ----------------------------------------------------------------------

const ZNANE = new Set([
  'goal', 'penalty', 'own_goal', 'owngoal', 'penalty_failed', 'penalty_failed_miss', 'penalty_missed',
  'yellow', 'second_yellow', 'red', 'substitutionIn', 'substitutionOut',
])
const AVTOGOL = new Set(['own_goal', 'owngoal'])
const ZGRESENA = new Set(['penalty_failed', 'penalty_failed_miss', 'penalty_missed'])

/** Igralec ene celice protokola ali null (prazna celica ali "-"). */
function igralecCelice(celica, st, zacetnik) {
  const brezDogodkov = String(celica).replace(/<ul class="events">[\s\S]*?<\/ul>/g, '')
  const t = besedilo(brezDogodkov)
  if (!t || t === '-') return null
  const ime = t.replace(/\((?:C|G)\)/g, '').replace(/\s+/g, ' ').trim()
  if (!ime || ime === '-') return null
  const dogodki = [...String(celica).matchAll(/<li class="([A-Za-z_]+)">([\s\S]*?)<\/li>/g)].map((m) => ({
    vrsta: m[1],
    minuta: minuta(besedilo(m[2])),
  }))
  const prvi = (v) => dogodki.find((d) => d.vrsta === v)?.minuta ?? null
  // Šifra osebe le z litovskega profila (`/zaidejai/`, ima ga vsak igralec).
  // fscg.me povezavo `/igraci/` da le nekaterim (reprezentantom, kot lff.lv
  // `/speletaji/`) — ta ni identiteta, ker bi isti igralec dobil dve vrstici.
  const profil = brezDogodkov.match(/href="\/zaidejai\/[^"]*-(\d+)\/"/)?.[1]
  return {
    st: /^\d+$/.test(String(st).trim()) ? Number(String(st).trim()) : null,
    ime: vPriimekIme(ime),
    polnoIme: ime,
    regSt: profil ? Number(profil) : null,
    vratar: /\(G\)/.test(t),
    kapetan: /\(C\)/.test(t),
    zacetnik,
    noter: prvi('substitutionIn'),
    ven: prvi('substitutionOut'),
    rdec: dogodki.find((d) => d.vrsta === 'red' || d.vrsta === 'second_yellow')?.minuta ?? null,
    dogodki,
  }
}

/** Protokol: [{ postava, rezerve }, { postava, rezerve }] ali null. */
function protokol(s) {
  const i = s.indexOf('<table class="teams">')
  if (i < 0) return null
  const tabela = s.slice(i, s.indexOf('</table>', i))
  const ekipe = [{ postava: [], rezerve: [] }, { postava: [], rezerve: [] }]
  for (const [, vrsta, vrstica] of tabela.matchAll(/<tr class="(firstteam|bench)[^"]*">([\s\S]*?)<\/tr>/g)) {
    const c = [...vrstica.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    if (c.length < 5) continue
    const zacetnik = vrsta === 'firstteam'
    for (const [idx, st, celica] of [[0, c[1], c[0]], [1, c[3], c[4]]]) {
      const igralec = igralecCelice(celica, besedilo(st), zacetnik)
      if (igralec) ekipe[idx][zacetnik ? 'postava' : 'rezerve'].push(igralec)
    }
  }
  return ekipe
}

/** Glava zapisnika: { tekmovanje, krog, datum, ura } (krajevni čas). */
export function glavaZapisnika(html) {
  const s = cisto(html)
  const i = s.indexOf('<div class="matchHeader">')
  const glava = i < 0 ? '' : s.slice(i, s.indexOf('<div class="officials">', i) > 0 ? s.indexOf('<div class="officials">', i) : i + 6000)
  // Litva: <h2><span>KAFF-MAFF III lyga 2026</span>14. turas</h2>, datum v h4;
  // Črna gora: <li><span>Regionalna liga Centar 26/27</span></li><li>5. kolo</li>…
  const tekmovanje = besedilo(glava.match(/<div class="matchData">\s*(?:<ul>\s*<li>|<h2>)\s*<span>([\s\S]*?)<\/span>/)?.[1] ?? '')
  const krog = Number(besedilo(glava).match(/(\d+)\.\s*(?:turas|kolo)\b/)?.[1]) || null
  const datumNiz = glava.match(/<h4>([^<]*)<\/h4>/)?.[1] ?? besedilo(glava)
  const datum = datumIz(datumNiz)
  const ura = uraIz(glava.match(/<h4>[^<]*?(\d{1,2}:\d{2})[^<]*<\/h4>/)?.[1] ?? glava.match(/<li>(\d{1,2}:\d{2})<\/li>/)?.[1])
  return { tekmovanje, krog, datum, ura }
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida ali
 * kateri od ekip manjka postava (neodigrana tekma, kontumacija).
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = cisto(html)
  const r1 = s.match(/<div class="res1">\s*(\d+)\s*<\/div>/)?.[1]
  const r2 = s.match(/<div class="res2">\s*(\d+)\s*<\/div>/)?.[1]
  if (r1 == null || r2 == null) return null
  const rezultat = { domaci: Number(r1), gostje: Number(r2) }
  const klub = (k) => {
    const m = s.match(new RegExp(`<div class="${k}">([\\s\\S]*?)</div>`))?.[1] ?? ''
    return besedilo(m.replace(/<img[^>]*>/g, ''))
  }
  const imena = [klub('club1'), klub('club2')]
  const p = protokol(s)
  if (!p || !p[0].postava.length || !p[1].postava.length) return null
  const ekipe = p.map((e, idx) => ({ ime: imena[idx], ...e }))

  const opozorila = []
  const goli = []
  const zgresene = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    const izstopi = []
    for (const i of [...e.postava, ...e.rezerve]) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime, regSt: i.regSt }
      // Drugi rumeni: COMET vpiše prvi rumeni in second_yellow (kot lff) —
      // drugi rumeni, če je vpisan še kot `yellow`, odpade: 1 rumeni + 1 rdeči.
      const drugi = i.dogodki.some((d) => d.vrsta === 'second_yellow')
      let rumenih = 0
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'goal') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'penalty') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        else if (AVTOGOL.has(d.vrsta)) goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        else if (ZGRESENA.has(d.vrsta)) zgresene.push(z)
        else if (d.vrsta === 'yellow') {
          if (!(drugi && rumenih >= 1)) rumeni.push(z)
          rumenih++
        } else if (d.vrsta === 'red' || d.vrsta === 'second_yellow') {
          if (!rdeci.some((r) => r.ekipaIdx === ekipaIdx && r.st === i.st && r.ime === i.ime)) rdeci.push(z)
        } else if (d.vrsta === 'substitutionOut') izstopi.push({ st: i.st, ime: i.ime, minuta: d.minuta })
        if (!ZNANE.has(d.vrsta)) opozorila.push(`${e.ime}: neznan dogodek "${d.vrsta}" pri ${i.ime}`)
        if (d.minuta == null) opozorila.push(`${e.ime}: dogodek "${d.vrsta}" pri ${i.ime} brez minute`)
      }
    }
    // Menjave: vstop rezerve in izstop ob isti minuti tvorita par.
    for (const i of [...e.rezerve, ...e.postava].filter((x) => x.noter != null)) {
      const j = izstopi.findIndex((x) => x.minuta === i.noter)
      const ven = j >= 0 ? izstopi.splice(j, 1)[0] : { st: null, ime: null }
      menjave.push({ ekipaIdx, minuta: i.noter, noter: { st: i.st, ime: i.ime }, ven: { st: ven.st, ime: ven.ime } })
    }
    for (const x of izstopi) menjave.push({ ekipaIdx, minuta: x.minuta, noter: { st: null, ime: null }, ven: { st: x.st, ime: x.ime } })
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev (G) v postavi je ${vratarjev}`)
    const imenaIgralcev = new Map()
    for (const i of [...e.postava, ...e.rezerve]) imenaIgralcev.set(`${i.st}|${i.ime}`, (imenaIgralcev.get(`${i.st}|${i.ime}`) ?? 0) + 1)
    for (const [k, n] of imenaIgralcev) if (n > 1) opozorila.push(`${e.ime}: igralec ${k.split('|')[1]} je v zapisniku ${n}-krat`)
  })

  const zaEkipo = (idx) => goli.filter((g) => (g.avtogol ? 1 - g.ekipaIdx : g.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)

  const g = glavaZapisnika(s)
  const vObliko = ({ dogodki: _d, polnoIme: _p, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzNaslova(g.tekmovanje),
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    // Polčasa stran ne pove.
    polcas: null,
    goli,
    zgresene,
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/**
 * Nastopi po imenu in dresu (kot fss): začetnik od 0, rezerva od vstopa.
 * Kjer ima igralec povezavo na profil (Litva), dobi še šifro (`regSt`).
 */
export function nastopi(z) {
  const sifre = new Map()
  for (const [idx, e] of [z.domaci, z.gostje].entries())
    for (const i of [...e.postava, ...e.rezerve]) if (i.regSt) sifre.set(`${idx}|${i.st}|${i.ime}`, i.regSt)
  return nastopiPoImenu(z).map((n) => ({ ...n, regSt: sifre.get(`${n.ekipaIdx}|${n.st}|${n.ime}`) ?? null }))
}

// --- klubi -------------------------------------------------------------------------

/** Ključ kluba: male črke s krajevnimi znaki (ą č ę ė į š ų ū ž, ć đ). */
export const kljucKluba = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase()
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Oblike društva, ki jih v kratkem imenu ne potrebujemo. "OFK" ostane: v
// Sjeverni regiji sta "Gusinje" in "OFK Gusinje" dva kluba.
const OBLIKE = new Set(['fk', 'fc', 'fks', 'fsk'])

/** Kratko ime: "FK Švyturys" → "Švyturys", "FKS Ukmergė" → "Ukmergė"; največ tri besede. */
export function kratkoIme(polno) {
  const besede = razpakiraj(polno).trim().split(/\s+/).filter(Boolean)
  const ostale = besede.filter((b) => !OBLIKE.has(b.toLowerCase()))
  return ostale.length ? ostale.slice(0, 3).join(' ') : razpakiraj(polno).trim()
}

// --- prenos ------------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
export const starostDni = (datum) => (datum ? (Date.now() - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Zapisnik zadnjega tedna se še popravlja: vedno sveže. */
export const SVEZE_DNI = 7
/** Do te starosti se nerazčlenjena ali nepopolna stran iz predpomnilnika prebere še enkrat. */
export const PONOVNO_DNI = 45
const golovSeNeUjema = (z) => z.opozorila.some((o) => /^goli iz dogodkov .* se ne ujemajo/.test(o))

/**
 * Zapisnik z dano funkcijo razčlenjevanja (`razcleni(html)`), kot `zapisnikSvez`
 * v `zapisniki.mjs`: stran, zajeta pred vnosom postav ali popravkom gola, ne
 * sme obtičati v predpomnilniku. Tekma zadnjega tedna se bere sveže; starejša
 * do `PONOVNO_DNI` iz predpomnilnika, a če se stran ne razčleni ali goli
 * dogodkov niso izid, še enkrat sveže. Starejših ne beremo znova (stare
 * sezone bi sicer vsako noč brale kontumacije).
 */
export async function zapisnikSvez(beriStran, razcleni, datum) {
  const starost = starostDni(datum)
  const sveze = starost <= SVEZE_DNI
  const z = razcleni(await beriStran(sveze))
  if (sveze || starost > PONOVNO_DNI || (z && !golovSeNeUjema(z))) return z
  return razcleni(await beriStran(true)) ?? z
}

/**
 * Sme stran v predpomnilnik? Le prava stran tekmovanja (tabela tekem) ali
 * tekme (glava `matchHeader`). Stran vzdrževanja ali napake s statusom 200
 * ne sme obveljati za zapisnik (kot mlsz "Too many connections"): uvoz je ne
 * shrani in shranjene ne bere, ampak stran prebere znova.
 */
export const zaPredpomnilnik = (html) => /<table class="fixtures |<div class="matchHeader">/.test(String(html ?? ''))

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi (`ime` je ime vira za sporočilo). */
export async function beri(ime, prenesi, url, datoteka, sveze) {
  let html
  try {
    html = await prenesi(url, datoteka, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new CometZavrnitev(`${ime}: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new CometZavrnitev(`${ime}: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/**
 * Skupni del vira: `zapisniki` in `kontumacije` za dano spletišče.
 * `tekmeLige(koda, html)` vrne tekme tabele (in preveri tekmovanje),
 * `sezonaLige(tekme)` sezono, `naslovLige(koda)` stran tekmovanja,
 * `naslovZapisnika(id, pot, koda)` stran tekme, `predpona` šifro zapisnika v bazi,
 * `vCas(datum, ura)` krajevni čas spletišča v ljubljanskega (kot v `vKroge`).
 */
export function delVira({ ime, predpona, naslovLige, naslovZapisnika, tekmeLige, sezonaLige, vCas = (datum, ura) => ({ datum, ura }) }) {
  const imeLige = (koda) => `liga-${String(koda).replace(/[/:]/g, '-')}.html`
  const imeZapisnika = (id) => `tekma-${id}.html`
  const sifraZapisnika = (id) => `${predpona}${String(id).replace(new RegExp(`^${predpona}`), '')}`
  return {
    imeLige,
    sifraZapisnika,
    async zapisniki(koda, prenesi) {
      const tekme = tekmeLige(koda, await beri(ime, prenesi, naslovLige(koda), imeLige(koda), true))
      const sezona = sezonaLige(tekme)
      const out = []
      for (const t of tekme.filter((x) => x.izid && x.pot)) {
        const url = naslovZapisnika(t.id, t.pot, koda)
        // Zadnji teden sveže; do 45 dni še enkrat sveže, če stran iz
        // predpomnilnika nima postav ali se goli ne ujemajo z izidom.
        const z = await zapisnikSvez(
          (sveze) => beri(ime, prenesi, url, imeZapisnika(t.id), sveze),
          (html) => vZapisnik(html, { id: t.id, url }),
          t.datum,
        )
        if (!z) continue
        // Ime kluba, krog in sezona z razporeda, da se tekma ujame z vrstico razporeda.
        z.domaci.ime = t.domaci
        z.gostje.ime = t.gostje
        z.krog = t.krog
        z.sezona = sezona ?? z.sezona
        // Datum in ura zapisnika sta krajevna (Vilna: uro več) — v ljubljanski čas.
        const cas = vCas(z.datum ?? t.datum, z.ura ?? t.ura)
        z.datum = cas.datum
        z.ura = cas.ura
        if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
          z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
        z.zapisnikId = sifraZapisnika(t.id)
        out.push({ id: z.zapisnikId, z, url })
      }
      return out
    },
    /**
     * Kontumacije: tekma z izidom 3:0 ali 0:3, starejša od tedna dni, katere
     * zapisnik nima postav. Bere le take tekme (isti predpomnilnik kot uvoz).
     */
    async kontumacije(koda, prenesiKrog, krogi, danes) {
      const out = []
      const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * 86400000).toISOString().slice(0, 10)
      for (const k of krogi) {
        for (const t of k.tekme) {
          const i = t.izidRazporeda
          if (t.kontumacija || !i || !t.pot || !t.datum || t.datum > teden) continue
          if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
          const url = naslovZapisnika(t.cometId, t.pot, koda)
          const html = await prenesiKrog(url, imeZapisnika(t.cometId), t.datum)
          if (jeIzziv(html)) throw new CometZavrnitev(`${ime}: ${url} vrne izziv (CAPTCHA)`)
          if (!vZapisnik(html) && /<div class="res1">\s*\d+\s*<\/div>/.test(html)) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
        }
      }
      return out
    },
  }
}
