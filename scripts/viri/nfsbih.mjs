// Vir: Nogometni/Fudbalski savez Bosne i Hercegovine — nfsbih.ba (državna raven BiH).
//
// NFSBiH vodi WWIN ligo BiH (Premijer liga, 1. raven, 10 klubov). Podatki so
// iz istega COMET kot pri `nsfbih` (šifre tekem 46xxxxxx = 2025/26, 54xxxxxx =
// 2026/27), stran je Joomla z lastno komponento, HTML iz strežnika. Druga
// stran in druga oblika kot nsfbih.ba (NS FBiH), zato svoj vir. fsrs.org
// (Republika Srpska) NI ta vir in ga ne beremo. Glej docs/viri/bih.md (Bosna in
// Hercegovina — vir nfsbih).
//
// ŠIFRA LIGE je `<slug>/<id tekmovanja COMET>`, npr. `wwin-liga-bih/54152223`
// (2026/27). Slug je pot pod /takmicenja/nogomet-muskarci/, id izbere sezono
// (2025/26 = 46565761). Razpored je `?view=fixtures&id=<id>`, tekma
// `?view=match&id=<id tekme>`. Seznama tekmovanj in sezon stran ne kaže;
// id tekoče sezone je v strani lige (`view=fixtures&id[0]=…`).
//
// RAZPORED: "N. KOLO" (`<h4>`), pod njim tabela: datum in ura ("07.08.2026
// &nbsp;20:00", sarajevski = ljubljanski čas), igrišče, domači in gostje
// (`/stats/team/<tekmovanje>/<šifra kluba>-<slug>/`), izid ("2 : 1",
// neodigrana "- : -") in povezava na tekmo.
//
// ZAPISNIK: glava "DOMAČI - GOSTJE (1 : 0) 2 : 0", "Status: Odigrana",
// "Datum: 10.10.2026 18:30"; nato dve tabeli (domači, gostje): vrstica je
// dres | igralec (`view=player&id=<šifra>:…`) z oznakama "(GK)" (vratar, tudi
// rezervni) in "(C)" (kapetan); pred vrstico "Izmjene" so
// začetniki, za njo klop. Dogodki so `<div class="…">minuta'</div>` pri
// igralcu: `gol`, `penal` (gol z 11 m), `autogol` (pri strelcu v NJEGOVI
// ekipi), `zuta`, `crvena`, `izmjena` (pri začetniku izstop, pri rezervi
// vstop; minute so točne). Sodnikov, delegata in gledalcev ne beremo.
//
// IDENTITETA je ime + klub (kot nsfbih), NE šifra iz povezave: ta je vrstica
// strani, ki jo stran ob osvežitvi preštevilči (15. 10. 2026 v nekaj urah vsi
// igralci +293, Marčetić Stefan 22294400 → 22294693). Kot `reg_st` bi vsak nov
// nabor šifer ustvaril nove igralce in razklal minute. Šifra služi le znotraj
// ene strani (dogodki k pravemu igralcu, soimenjaka v isti ekipi).
//
// ARHIV 2025/26 (46565761) ima razpored in izide (36 krogov, 180 tekem), a
// zapisniki so BREZ postav — za cene ni uporaben.
//
// robots.txt prepove le sistemske mape Joomle (/administrator/, /cache/ …);
// /stats/ vrne 403 (ne beremo ga). Beremo odkrito: User-Agent SLFF, 3 s med
// zahtevki, popolnih zapisnikov ne beremo znova. Ob 403, 429, izzivu ali
// CAPTCHI se uvoz ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { sifra } from './zapisniki.mjs'
import { datumUra, minuta, sezonaIzDatuma } from './fss.mjs'
import { imeKluba, kljucKlubaBa, kratkoImeBa } from './nsfbih.mjs'

const OSNOVNI = 'https://www.nfsbih.ba'
const POT = '/takmicenja/nogomet-muskarci'
const DOLZINA_TEKME = 90

export { minuta, sezonaIzDatuma }

/** "wwin-liga-bih/54152223" → { slug, id }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9-]+)\/(\d{6,})$/)
  if (!m) throw new Error(`nfsbih: šifra lige je "<slug>/<id tekmovanja>" (npr. wwin-liga-bih/54152223), ne "${koda}"`)
  return { slug: m[1], id: m[2] }
}

export const naslovLige = (koda) => {
  const { slug, id } = razberiKodo(koda)
  return `${OSNOVNI}${POT}/${slug}?view=fixtures&id=${id}`
}
// Šifra zapisnika v bazi je `ba<id>` kot pri nsfbih: isti COMET, šifre tekem
// so enolične v vsej BiH. Naslov predpono odreže.
export const sifraZapisnika = (id) => `ba${String(id).replace(/^ba/, '')}`
export const naslovTekme = (slug, id) => `${OSNOVNI}${POT}/${slug}?view=match&id=${String(id).replace(/^ba/, '')}`
const imeLige = (koda) => `nfsbih-liga-${sifra(koda)}.html`
const imeTekme = (id) => `nfsbih-tekma-${String(id).replace(/^ba/, '')}.html`

const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const brezSkript = (s) =>
  String(s ?? '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
/** Vsebina komponente (brez menija, stranske vrstice in modula z rezultati kroga). */
const vsebina = (html) => {
  const s = brezSkript(html)
  const i = s.indexOf('id="akeeba-renderjoomla"')
  if (i < 0) return ''
  const j = s.indexOf('id="sp-sidebar"', i)
  return s.slice(i, j < 0 ? undefined : j)
}

// --- zavrnitev -----------------------------------------------------------------

/** Zavrnitev (403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class NfsbihZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'NfsbihZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
// Refusals must reach the provider before the shared downloader can retry 429.
export async function nfsbihFetch(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'manual' })
  if (jeZavrnitev(response.status) || (response.status >= 300 && response.status < 400)) {
    try { await response.body?.cancel() } catch {}
    throw new NfsbihZavrnitev(`nfsbih: ${url} → HTTP ${response.status} — uvoz ustavljen, ne obhajamo`, response.status)
  }
  return response
}
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

// --- klubi ---------------------------------------------------------------------

// Isto ime, drug klub: NS FBiH (vir nsfbih) ima istoimenske klube iz drugih
// krajev (FK BORAC Jelah, FK VELEŽ Nevesinje, FK RADNIK Donji Vakuf), klubi pa
// se ujemajo po imenu v državi. Državni klub dobi kraj po šifri kluba COMET
// (`/stats/team/…/<šifra>-…`, grb `tim_big/<šifra>.gif`). Pregled 15. 10. 2026.
export const IME_KLUBA = {
  424: 'FK BORAC (Banja Luka)',
  607: 'FK VELEŽ (Mostar)',
  530: 'FK RADNIK (Bijeljina)',
}
const imeZaKlub = (sifraKluba, ime) => IME_KLUBA[sifraKluba] ?? imeKluba(ime)

// --- razpored ------------------------------------------------------------------

/** Je stran razpored tekmovanja (naslov sezone in krogi)? */
export const jeStranLige = (html) => {
  const v = vsebina(html)
  return /<h4>[^<]*\d{2}\/\d{2}\s*<\/h4>/.test(v) && /\d+\.\s*KOLO/.test(v)
}

/** Sezona iz naslova "WWIN liga BiH 26/27" → "2026/27". */
export function sezonaNaslova(html) {
  const m = vsebina(html).match(/<h4>[^<]*?(\d{2})\/(\d{2})\s*<\/h4>/)
  return m && (Number(m[1]) + 1) % 100 === Number(m[2]) ? `20${m[1]}/${m[2]}` : null
}

/** Izid "2 : 1" → { domaci, gostje }; "- : -" → null. */
export function izidIz(s) {
  const m = besedilo(s).match(/^(\d+)\s*:\s*(\d+)/)
  return m ? { domaci: Number(m[1]), gostje: Number(m[2]) } : null
}

/** Vse tekme razporeda: [{ krog, id, datum, ura, domaci, gostje, izid, zelenaMiza }]. */
export function tekmeStrani(html) {
  const v = vsebina(html)
  const out = []
  for (const del of v.split(/<h4[^>]*>\s*(?=\d+\.\s*KOLO)/).slice(1)) {
    const krog = Number(del.match(/^(\d+)\.\s*KOLO/)?.[1])
    if (!krog) continue
    for (const [, vrstica] of del.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const c = [...vrstica.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
      const klubi = [...vrstica.matchAll(/\/stats\/team\/\d+\/(\d+)-[^"]*">([^<]*)</g)]
      const id = vrstica.match(/view=match&amp;id=(\d+)/)?.[1]
      if (klubi.length < 2 || !id) continue
      const { datum, ura } = datumUra(besedilo(c[0]))
      const izidCelica = c.find((x) => /^\s*(\d+|-)\s*:\s*(\d+|-)\s*\*?\s*$/.test(besedilo(x))) ?? ''
      out.push({
        krog,
        id,
        datum,
        ura,
        domaci: imeZaKlub(Number(klubi[0][1]), klubi[0][2]),
        gostje: imeZaKlub(Number(klubi[1][1]), klubi[1][2]),
        izid: izidIz(izidCelica),
        zelenaMiza: /\*/.test(besedilo(izidCelica)),
      })
    }
  }
  return out
}

/** Tekme lige iz šifre; stran druge sezone ali brez krogov ustavi uvoz. */
export function tekmeLige(koda, html) {
  if (!jeStranLige(html)) throw new Error(`nfsbih: ${naslovLige(koda)} ni razpored (${String(html ?? '').length} B) — uvoz ustavljen`)
  const tekme = tekmeStrani(html)
  if (!tekme.length) throw new Error(`nfsbih: ${naslovLige(koda)} nima tekem — uvoz ustavljen`)
  const sezona = sezonaNaslova(html)
  const st = new Map()
  for (const t of tekme) st.set(sezonaIzDatuma(t.datum), (st.get(sezonaIzDatuma(t.datum)) ?? 0) + 1)
  const poDatumih = [...st.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!sezona || sezona !== poDatumih)
    throw new Error(`nfsbih: ${naslovLige(koda)} — sezona v naslovu ${sezona ?? '?'} ni sezona datumov ${poDatumih ?? '?'}; uvoz ustavljen`)
  return { sezona, tekme }
}

/** Kontumacija: izid za zeleno mizo ("*"). */
export const jeKontumacija = (t) => !!t.izid && t.zelenaMiza

export function razcleniRazpored(koda, html) {
  const krogi = new Map()
  for (const t of tekmeLige(koda, html).tekme) {
    const kontumacija = jeKontumacija(t)
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija,
      odigrana: !!t.izid,
      ...(kontumacija ? { izid: t.izid } : {}),
    })
  }
  return [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka)
}

// --- zapisnik ------------------------------------------------------------------

const DOGODEK = /<div class="(gol|penal|autogol|zuta|crvena|izmjena)">\s*([^<]*)<\/div>/g

/** Igralci ene tabele: [{ st, ime, sifraStrani, vratar, kapetan, zacetnik, dogodki }]. */
function igralciTabele(tabela) {
  const out = []
  let zacetnik = true
  for (const [, vrstica] of String(tabela).matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    if (/<strong>\s*Izmjene\s*<\/strong>/.test(vrstica)) {
      zacetnik = false
      continue
    }
    // Povezava na igralca je v dveh oblikah: `?view=player&id=<šifra>:<slug>`
    // ali `/stats/player/<šifra>-<slug>/` (ista šifra; strani /stats/ ne beremo).
    // Šifra ni stalna (glej IDENTITETA zgoraj) — le ključ znotraj te strani.
    const igralec = vrstica.match(/(?:view=player&amp;id=(\d+)|\/stats\/player\/(\d+)-)[^"]*">([^<]*)<\/a>([\s\S]*)$/)
    if (!igralec) continue
    const dres = besedilo(vrstica.match(/<td class="text-center">([\s\S]*?)<\/td>/)?.[1])
    const oznake = besedilo(igralec[4].replace(DOGODEK, ''))
    out.push({
      st: /^\d+$/.test(dres) ? Number(dres) : null,
      ime: besedilo(igralec[3]),
      sifraStrani: igralec[1] ?? igralec[2],
      vratar: /\(GK\)/.test(oznake),
      kapetan: /\(C\)/.test(oznake),
      zacetnik,
      dogodki: [...igralec[4].matchAll(DOGODEK)].map(([, vrsta, za]) => ({ vrsta, minuta: /\d/.test(za) ? minuta(za) : null })),
    })
  }
  return out
}

/** Glava tekme: klubi (z šifro), izid, polčas, zelena miza, status, sezona, datum, ura. */
export function glavaTekme(html) {
  const v = vsebina(html)
  const naslov = besedilo(v.match(/<h4 class="no-padding">([\s\S]*?)<\/h4>/)?.[1])
  const izidi = naslov.match(/\(\s*(\d+|-)\s*:\s*(\d+|-)\s*\)\s*(\d+|-)\s*:\s*(\d+|-)\s*(\*)?/)
  const stevilo = (x) => (/^\d+$/.test(x ?? '') ? Number(x) : null)
  // Glava tabele ekipe: grb (`tim_big/<šifra kluba>.gif`, lahko manjka) in ime.
  const klubi = [...v.matchAll(/<th colspan="2">([\s\S]*?)<\/th>/g)]
    .map(([, th]) => ({ sifra: Number(th.match(/tim_big\/(\d+)\.gif/)?.[1] ?? 0), ime: th.match(/<strong>([^<]*)<\/strong>/)?.[1] }))
    .filter((k) => k.ime)
  const sez = v.match(/<h4>[^<]*?(\d{2})\/(\d{2})\s*<\/h4>/)
  const { datum, ura } = datumUra(besedilo(v.match(/<strong>Datum<\/strong>:\s*([^<]*)/)?.[1]))
  const status = besedilo(v.match(/Status:\s*<strong>([^<]*)<\/strong>/)?.[1]) || null
  // Neodigrana ("Zakazana") ima v glavi "(0 : 0) 0 : 0" — to ni izid. Velja le
  // "Odigrana" na začetku (ne "Neodigrana").
  const odigrana = !status || /^odigran/i.test(status)
  const izid = odigrana && izidi && stevilo(izidi[3]) != null && stevilo(izidi[4]) != null ? { domaci: stevilo(izidi[3]), gostje: stevilo(izidi[4]) } : null
  const polcas = odigrana && izidi && stevilo(izidi[1]) != null && stevilo(izidi[2]) != null ? { domaci: stevilo(izidi[1]), gostje: stevilo(izidi[2]) } : null
  return {
    domaci: klubi[0] ? imeZaKlub(klubi[0].sifra, klubi[0].ime) : null,
    gostje: klubi[1] ? imeZaKlub(klubi[1].sifra, klubi[1].ime) : null,
    izid,
    polcas,
    zelenaMiza: !!izidi?.[5] || /p\.\s*f\./i.test(naslov),
    status,
    sezona: sez && (Number(sez[1]) + 1) % 100 === Number(sez[2]) ? `20${sez[1]}/${sez[2]}` : null,
    datum,
    ura,
  }
}

/** Je stran tekme (glava z izidom ali statusom)? Napaka ali vzdrževanje ni. */
export const jeStranTekme = (html) => /<h4 class="no-padding">/.test(vsebina(html)) && /Status:/.test(vsebina(html))

/** Dve tabeli ekip: [domači, gostje]. */
const tabeliEkip = (v) => [...v.matchAll(/<table class="table table-striped">([\s\S]*?)<\/table>/g)].map((m) => m[1]).slice(0, 2)

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida, ni
 * odigrana, je kontumacija ali kateri od ekip manjka postava.
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const v = vsebina(html)
  const g = glavaTekme(html)
  if (!g.izid || g.zelenaMiza) return null
  const [td = '', tg = ''] = tabeliEkip(v)
  const ekipe = [
    { ime: g.domaci ?? '', igralci: igralciTabele(td) },
    { ime: g.gostje ?? '', igralci: igralciTabele(tg) },
  ].map((e) => ({ ...e, postava: e.igralci.filter((i) => i.zacetnik), rezerve: e.igralci.filter((i) => !i.zacetnik) }))
  if (ekipe.some((e) => !e.postava.length)) return null

  const rezultat = g.izid
  const opozorila = []
  const goli = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  ekipe.forEach((e, ekipaIdx) => {
    const izstopi = []
    for (const i of e.igralci) {
      const kdo = { ekipaIdx, st: i.st, ime: i.ime, regSt: null, sifraStrani: i.sifraStrani }
      const zute = i.dogodki.filter((d) => d.vrsta === 'zuta')
      const crvena = i.dogodki.find((d) => d.vrsta === 'crvena')
      // Drugi rumeni: dva rumena (s rdečim ali brez) → 1 rumeni + 1 rdeči ob drugem.
      const rdecMinuta = crvena ? crvena.minuta : zute.length >= 2 ? zute[1].minuta : null
      if (zute.length) rumeni.push({ ...kdo, minuta: zute[0].minuta })
      if (crvena || zute.length >= 2) rdeci.push({ ...kdo, minuta: rdecMinuta })
      i.rdec = crvena || zute.length >= 2 ? (rdecMinuta ?? DOLZINA_TEKME) : null
      const izmjene = i.dogodki.filter((d) => d.vrsta === 'izmjena').map((d) => d.minuta)
      if (i.zacetnik) {
        i.noter = null
        i.ven = izmjene[0] ?? null
        if (izmjene.length > 1) opozorila.push(`${e.ime}: začetnik ${i.ime} ima ${izmjene.length} menjave — upoštevan prvi izstop`)
      } else {
        i.noter = izmjene[0] ?? null
        i.ven = izmjene[1] ?? null
      }
      if (i.ven != null) izstopi.push({ st: i.st, ime: i.ime, minuta: i.ven })
      for (const d of i.dogodki) {
        const z = { ...kdo, minuta: d.minuta }
        if (d.vrsta === 'gol') goli.push({ ...z, avtogol: false, enajstmetrovka: false })
        else if (d.vrsta === 'penal') goli.push({ ...z, avtogol: false, enajstmetrovka: true })
        else if (d.vrsta === 'autogol') goli.push({ ...z, avtogol: true, enajstmetrovka: false })
        if (d.minuta == null) opozorila.push(`${e.ime}: dogodek "${d.vrsta}" pri ${i.ime} brez minute`)
      }
    }
    for (const i of e.rezerve.filter((x) => x.noter != null)) {
      const j = izstopi.findIndex((x) => x.minuta === i.noter && !(x.st === i.st && x.ime === i.ime))
      const ven = j >= 0 ? izstopi.splice(j, 1)[0] : { st: null, ime: null }
      // Vir kdaj izpusti izstop začetnika (dve rezervi ob 46', en izstop): ekipa ima čez 990 minut.
      if (j < 0) opozorila.push(`${e.ime}: ${i.ime} vstopi v ${i.noter}. minuti, izstopa ob tej minuti ni`)
      menjave.push({ ekipaIdx, minuta: i.noter, noter: { st: i.st, ime: i.ime }, ven: { st: ven.st, ime: ven.ime } })
    }
    for (const x of izstopi) menjave.push({ ekipaIdx, minuta: x.minuta, noter: { st: null, ime: null }, ven: { st: x.st, ime: x.ime } })
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const vratarjev = e.postava.filter((i) => i.vratar).length
    if (vratarjev !== 1) opozorila.push(`${e.ime}: vratarjev v postavi ${vratarjev}`)
    const sifre = new Map()
    for (const i of e.igralci) sifre.set(i.sifraStrani, (sifre.get(i.sifraStrani) ?? 0) + 1)
    for (const [k, n] of sifre) if (n > 1) opozorila.push(`${e.ime}: igralec s šifro ${k} je v zapisniku ${n}-krat`)
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (zaEkipo(0) !== rezultat.domaci || zaEkipo(1) !== rezultat.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${rezultat.domaci}:${rezultat.gostje}`)
  const sezonaDatuma = sezonaIzDatuma(g.datum)
  if (g.sezona && sezonaDatuma && g.sezona !== sezonaDatuma) opozorila.push(`sezona v naslovu ${g.sezona} ni sezona datuma ${sezonaDatuma}`)

  const vObliko = ({ dogodki: _d, kapetan: _k, ...i }) => ({ ...i, regSt: null, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: g.sezona ?? sezonaDatuma,
    krog: null,
    datum: g.datum,
    ura: g.ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat,
    polcas: g.polcas,
    goli,
    // Zgrešenih 11 m stran ne objavlja.
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Nastopi; dogodki k igralcu po šifri strani (dres ni enoličen ključ), brez reg_st. */
export function nastopi(z) {
  const out = []
  for (const [idx, ekipa] of [z.domaci, z.gostje].entries()) {
    const prejeti = idx === 0 ? z.rezultat.gostje : z.rezultat.domaci
    for (const i of [...ekipa.postava, ...ekipa.rezerve]) {
      const zacetnik = !!i.zacetnik
      const od = zacetnik ? 0 : i.noter
      if (od == null) continue
      let do_ = i.ven ?? DOLZINA_TEKME
      if (i.rdec != null) do_ = Math.min(do_, i.rdec)
      do_ = Math.max(od, Math.min(do_, DOLZINA_TEKME))
      const moji = (seznam) => seznam.filter((x) => x.ekipaIdx === idx && x.sifraStrani === i.sifraStrani)
      const goliIgralca = moji(z.goli)
      out.push({
        ekipaIdx: idx,
        ekipa: ekipa.ime,
        st: i.st,
        ime: i.ime,
        regSt: null,
        pozicija: i.vratar ? 'GK' : null,
        vratar: !!i.vratar,
        zacetnik,
        minutaOd: od,
        minutaDo: do_,
        minute: do_ - od,
        goli: goliIgralca.filter((g) => !g.avtogol).length,
        goliIzEnajstmetrovke: goliIgralca.filter((g) => !g.avtogol && g.enajstmetrovka).length,
        avtogoli: goliIgralca.filter((g) => g.avtogol).length,
        zgreseneEnajstmetrovke: 0,
        rumeni: moji(z.rumeni).length,
        rdeci: i.rdec != null ? 1 : 0,
        prejetiGoli: prejeti,
        cleanSheet: prejeti === 0,
      })
    }
  }
  return out
}

// --- prenos ----------------------------------------------------------------------

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi. */
async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new NfsbihZavrnitev(`nfsbih: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new NfsbihZavrnitev(`nfsbih: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

/** Stran tekme; napaka ali vzdrževanje (ni glave tekme) se prebere še enkrat sveže. */
async function stranTekme(prenesi, url, ime, sveze) {
  let html = await beri(prenesi, url, ime, sveze)
  if (!jeStranTekme(html) && !sveze) html = await beri(prenesi, url, ime, true)
  return html
}

const vir = {
  ime: 'nfsbih',
  fetch: nfsbihFetch,
  polnoIme: 'Nogometni/Fudbalski savez BiH (nfsbih.ba)',
  drzava: 'BA',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (koda, id) => naslovTekme(razberiKodo(koda).slug, id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new NfsbihZavrnitev(`nfsbih: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // V predpomnilnik gre le prava stran (razpored ali tekma), nikoli stran z
  // napako ali vzdrževanjem, ki jo Joomla vrne s 200.
  zaPredpomnilnik: (html, datoteka = '') =>
    /^nfsbih-tekma-/.test(datoteka) ? jeStranTekme(html) : /^nfsbih-liga-/.test(datoteka) ? jeStranLige(html) : jeStranLige(html) || jeStranTekme(html),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
  },

  async zapisniki(koda, prenesi, { preskoci = new Set(), samoZapisnik = null } = {}) {
    const { slug } = razberiKodo(koda)
    const { sezona, tekme } = tekmeLige(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
    const out = []
    const preskoceni = new Set(preskoci ?? [])
    const iskaniID = samoZapisnik == null ? null : String(samoZapisnik).replace(/^ba/, '')
    for (const t of tekme.filter((x) => x.izid && !jeKontumacija(x))) {
      const sourceId = String(t.id).replace(/^ba/, '')
      if (preskoceni.has(sourceId) || preskoceni.has(`ba${sourceId}`) || (iskaniID && sourceId !== iskaniID)) continue
      const url = naslovTekme(slug, t.id)
      const id = sifraZapisnika(t.id)
      const star = starostDni(t.datum)
      // Zapisnik zadnjih dni se lahko še popravlja; brez postav ga 45 dni beremo znova (kot zapisnikSvez).
      const sveze = star <= 3
      let z = vZapisnik(await stranTekme(prenesi, url, imeTekme(t.id), sveze), { id, url })
      if (!z && !sveze && star <= 45) z = vZapisnik(await beri(prenesi, url, imeTekme(t.id), true), { id, url })
      if (!z) continue
      // Ime kluba in krog z razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid v razporedu ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaBa,
  kratkoIme: kratkoImeBa,
  poenostavi: kljucKlubaBa,
}

export default vir
