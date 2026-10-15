// Vir: Türkiye Futbol Federasyonu — tff.org (Turčija).
//
// TFF na tff.org objavi zapisnike profesionalnih lig in Profesyonelliğe Geçiş
// Ligi (nekdanji BAL): Trendyol 1. Lig (raven 2, brez skupin — šifra le
// `<pageID>`, glej `vrsticeTedna1Lig`), Nesine 2. Lig (raven 3, dve skupini), Nesine 3. Lig
// (raven 4, tri skupine v 2026/27) in PGL (raven 5, 12 skupin). Pokrajinske
// amaterske lige (ASKF) niso na tff.org. Süper Lig namenoma ne beremo (TFF
// ima svojo fantasy igro). Glej CLAUDE.md (Turčija — vir tff).
//
// Stran je ASP.NET iz strežnika v kodiranju **windows-1254** (ğ, ı, İ, ş) —
// `tffFetch` jo prebere kot bajte in pretvori v UTF-8, sicer bi bila turška
// imena pokvarjena.
//
// ŠIFRA LIGE je `<pageID>/<grupID>`: `<pageID>` je stran tekmovanja ene
// sezone (2026/27: 2. Lig `976`, 3. Lig `971`, PGL `1596`; arhiv 2025/26:
// 2. Lig `1769`, 3. Lig `1770`, BAL `1793`), `<grupID>` skupina (3. Lig 01 =
// `3543`). Vsaka sezona ima svoje številke obeh.
//
// TEDEN (krog) `default.aspx?pageID=<p>&grupID=<g>&hafta=<n>`: zavihek
// "<skupina> (<n>.hafta)" in vse tekme kroga skupine: datum, ura (istanbulski
// čas, UTC+3 vse leto → ljubljanski), domači in gostje s šifro kluba
// (`kulupID`), izid (prazen = neodigrana) in povezava na tekmo (`macId`).
// Koliko krogov je, povedo povezave `hafta=`. Neznan teden ali skupina stran
// tiho zamenja z drugo — vir preveri zavihek in se ustavi.
//
// ZAPISNIK `Default.aspx?pageId=29&macId=<id>`: glava (klubi s `kulupId`,
// izid, tekmovanje, "11.10.2026 - 14:30"), za vsako ekipo (`grdTakim1`,
// `grdTakim2`): "İlk 11" (začetniki: dres "47." in igralec s stalno šifro
// osebe `kisiId` → `reg_st`), "Yedekler" (klop), "Goller" ("IME,47.dk (H)";
// F noga, H glava, P 11 m, K avtogol, S izvajanje 11 m — ne šteje), "Kartlar"
// (Sarı Kart, Kırmızı Kart, Çift Sarı Kart = drugi rumeni), "Oyundan
// Çıkanlar" (izstop z minuto) in "Oyuna Girenler" (vstop z minuto) — minute
// so točne. Vratarja in pozicij stran ne pove; vse določi glasovanje.
// Sodnikov, opazovalcev, stadiona in trenerjev ne beremo.
//
// robots.txt ni (404). Pogoji uporabe (pageID=179): podatki se smejo
// objaviti z navedbo vira, a ne v komercialne namene — SLFF je brezplačen;
// ob prvem prihodku potrebujemo dovoljenje TFF. Beremo odkrito (User-Agent
// SLFF, 3 s med zahtevki), zaključenih tednov in zapisnikov ne beremo znova.
// Ob izzivu, CAPTCHI, 401, 403 ali 429 se uvoz ustavi — ne obhajaj.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { razpakiraj } from '../klubi.mjs'
import { nastopi } from './hlf.mjs'
import { sezonaIzDatuma } from './frf.mjs'
import { sifra } from './zapisniki.mjs'

export { nastopi }

const OSNOVNI = 'https://www.tff.org'
// Mapo tednov sme smoke preusmeriti v začasno (`SLFF_TFF_MAPA`), da ne piše v predpomnilnik.
const mapa = () => process.env.SLFF_TFF_MAPA || 'scripts/.predpomnilnik/tff'
const DOLZINA_TEKME = 90
const URA = 3600000
const DAN = 24 * URA
export const PREMOR_MS = 3000
const UA = 'SLFF fantasy (https://slff.eu)'

// --- šifre in naslovi ---------------------------------------------------------------

/**
 * "971/3543" → { stran: 971, grup: 3543 }; "142" → { stran: 142, grup: null }
 * (liga brez skupin — Trendyol 1. Lig, glej `vrsticeTedna1Lig`).
 */
export function razberiKodo(koda) {
  const s = String(koda ?? '').trim()
  const m = s.match(/^(\d+)\/(\d+)$/)
  if (m) return { stran: Number(m[1]), grup: Number(m[2]) }
  if (/^\d+$/.test(s)) return { stran: Number(s), grup: null }
  throw new Error(`tff: šifra lige je "<pageID>/<grupID>" (npr. 971/3543) ali "<pageID>" brez skupin (1. Lig: 142), ne "${koda}"`)
}

export const naslovLige = (koda) => {
  const { stran, grup } = razberiKodo(koda)
  return `${OSNOVNI}/default.aspx?pageID=${stran}${grup == null ? '' : `&grupID=${grup}`}`
}
export const naslovTedna = (koda, hafta) => `${naslovLige(koda)}&hafta=${hafta}`
export const naslovTekme = (id) => `${OSNOVNI}/Default.aspx?pageId=29&macId=${String(id).replace(/^tr/, '')}`
// Šifra zapisnika v bazi je `tr<id>`: macId (~300 000) je v številskem
// prostoru drugih virov, `matches.zapisnik_id` pa je enoličen čez vse.
export const sifraZapisnika = (id) => `tr${String(id).replace(/^tr/, '')}`
const imeTedna = (koda, hafta) => `hafta-${String(koda).replace(/\//g, '-')}-${hafta}.html`
const imeTekme = (id) => `mac-${id}.html`

// --- pomožno ---------------------------------------------------------------------------

const cisto = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
export const besedilo = (html) =>
  razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;?/g, ' ')).replace(/\s+/g, ' ').trim()

/** "47.dk" → 47, "90+3.dk" → 90, "45+1.dk" → 45. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d+)/)
  return m ? Math.min(Number(m[1]), DOLZINA_TEKME) : null
}

/** "11.10.2026" → "2026-10-11". */
export function datumIz(s) {
  const m = String(s ?? '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}

/**
 * Istanbulski čas (UTC+3 vse leto, od 2016) → ljubljanski { datum, ura }:
 * poleti −1 h, pozimi −2 h. Ura "00:00" pomeni, da ure ni.
 */
export function vLjubljanskiCas(datum, ura) {
  const u = String(ura ?? '').match(/(\d{1,2}):(\d{2})/)
  if (!datum || !u || (u[1] === '00' && u[2] === '00')) return { datum, ura: null }
  const t = new Date(`${datum}T${u[1].padStart(2, '0')}:${u[2]}:00+03:00`)
  const deli = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(t)
      .map((p) => [p.type, p.value]),
  )
  return { datum: `${deli.year}-${deli.month}-${deli.day}`, ura: `${deli.hour}:${deli.minute}` }
}

/** "MÜCAHİT ÇAKIR" → "Mücahit Çakır" (turška pravila za i/İ in ı/I). */
export function lepoIme(s) {
  // Tuja imena TFF piše z I brez pike ("GIANNI" → "Gıannı"); ločiti jih od
  // turških (YILMAZ, AYDIN, KAYALI) se zanesljivo ne da — ostanejo po turško.
  return String(s ?? '')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/(^|[\s'’\-.])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr'))
    .replace(/\s+/g, ' ')
}

/** "Mücahit Çakır" → "Çakır Mücahit" (priimek je zadnja beseda). */
export function vPriimekIme(ime) {
  const deli = String(ime ?? '').trim().split(/\s+/).filter(Boolean)
  return deli.length < 2 ? deli.join(' ') : [deli.at(-1), ...deli.slice(0, -1)].join(' ')
}

/** Izziv (Cloudflare, CAPTCHA). */
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha/i.test(String(html ?? ''))

/** Statusi, ki pomenijo "ne beri" (prijava, prepoved, preveč zahtevkov). */
export const ZAVRNITVE = [401, 403, 429]

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class TffZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'TffZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}

// --- teden (krog) ------------------------------------------------------------------------

/** Skupine na strani: Map(grupID → ime), npr. 3543 → "01", 3541 → "Beyaz". */
export function skupineStrani(html) {
  const out = new Map()
  for (const m of String(html ?? '').matchAll(/grupID=(\d+)(?:&(?:amp;)?hafta=\d+)?#hmac"[^>]*>\s*([^<]*?)\s*</g)) out.set(Number(m[1]), besedilo(m[2]))
  return out
}

/** Zavihek tedna: { skupina: "01", hafta: 6 } ali null. */
export function zavihekTedna(html) {
  const m = String(html ?? '').match(/maclarBaslik_Tab2"[^>]*><span class="wrap"><span class="innerWrap">([^<]*)<\/span>/)
  if (!m) return null
  const t = besedilo(m[1]).match(/^(.*?)\s*\((\d+)\.\s*hafta\)$/i)
  return t ? { skupina: t[1].trim(), hafta: Number(t[2]) } : null
}

/** Število krogov: največji `hafta=` med povezavami krogov. */
export function steviloTednov(html) {
  const n = [...String(html ?? '').matchAll(/class=haftaNo\w+><a href=[^ >]*[?&]hafta=(\d+)/g)].map((m) => Number(m[1]))
  return n.length ? Math.max(...n) : 0
}

/**
 * Tekme tedna: [{ id, datum, ura, domaci, gostje, domaciId, gostjeId, izid }].
 * Datum in ura sta istanbulska (pretvorbo naredi `tekmeTedna`).
 */
export function vrsticeTedna(html) {
  const out = []
  const s = cisto(html)
  for (const m of s.matchAll(/kupaMaclari_ctl(\d+)_lblTarih">([^<]*)<\/span>(?:&nbsp;)?\s*<span[^>]*_lbSaat"[^>]*>([^<]*)<\/span>([\s\S]*?)_lblTakim2"[^>]*kulupID=(\d+)"[^>]*>([^<]*)<\/a>/gi)) {
    const [, , tarih, saat, sredina, gostjeId, gostje] = m
    const d = sredina.match(/_lblTakim1"[^>]*kulupID=(\d+)"[^>]*>([^<]*)<\/a>/i)
    const sk = sredina.match(/_lblSkor"[^>]*macId=(\d+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!d || !sk) continue
    const izid = besedilo(sk[2]).match(/^(\d+)\s*-\s*(\d+)$/)
    out.push({
      id: Number(sk[1]),
      datum: datumIz(tarih),
      ura: /\d{1,2}:\d{2}/.test(saat) ? saat.trim() : null,
      domaci: besedilo(d[2]),
      gostje: besedilo(gostje),
      domaciId: Number(d[1]),
      gostjeId: Number(gostjeId),
      izid: izid ? { domaci: Number(izid[1]), gostje: Number(izid[2]) } : null,
    })
  }
  return out
}

// Trendyol 1. Lig (pageID 142, arhiv 2025/26 1772) je ena skupina in ima
// drugo predlogo: modul "Fikstürü" z zavihkom "10.Hafta" (`…_hs_Tab2`) in
// vrsticami `dtlHaftaninMaclari` (domači Label4, gostje Label1, izid
// Label5/Label6, `macId`). Na isti strani so še play-off (`kupaMaclari`, maja)
// in fiksture vse sezone brez datumov — ne beremo ne enega ne drugega.

/** Zavihek tedna 1. Lig: { skupina: null, hafta: 10 } ali null. */
export function zavihekTedna1Lig(html) {
  const m = String(html ?? '').match(/_hs_Tab2"[^>]*><span class="wrap"><span class="innerWrap">\s*(\d+)\s*\.\s*Hafta\s*<\/span>/i)
  return m ? { skupina: null, hafta: Number(m[1]) } : null
}

/** Tekme tedna 1. Lig (oblika kot `vrsticeTedna`; datum in ura istanbulska). */
export function vrsticeTedna1Lig(html) {
  const out = []
  const deli = cisto(html).split(/(?=<div id="[^"]*dtlHaftaninMaclari_ctl\d+_ayrt1")/)
  for (const d of deli.slice(1)) {
    const tarih = d.match(/_lblTarih">([^<]*)</)?.[1]
    const saat = d.match(/_lblSaat">([^<]*)</)?.[1] ?? ''
    const dom = d.match(/kulupID=(\d+)"[^>]*_A2">\s*<span[^>]*_Label4">([^<]*)</i)
    const gos = d.match(/kulupID=(\d+)"[^>]*_A5">\s*<span[^>]*_Label1">([^<]*)</i)
    const mac = d.match(/macId=(\d+)"[^>]*_A3"/i)
    if (!dom || !gos || !mac) continue
    const s1 = besedilo(d.match(/_Label5">([^<]*)</)?.[1])
    const s2 = besedilo(d.match(/_Label6">([^<]*)</)?.[1])
    out.push({
      id: Number(mac[1]),
      datum: datumIz(tarih),
      ura: /\d{1,2}:\d{2}/.test(saat) ? saat.trim() : null,
      domaci: besedilo(dom[2]),
      gostje: besedilo(gos[2]),
      domaciId: Number(dom[1]),
      gostjeId: Number(gos[1]),
      izid: /^\d+$/.test(s1) && /^\d+$/.test(s2) ? { domaci: Number(s1), gostje: Number(s2) } : null,
    })
  }
  return out
}

/**
 * Teden iz strani: { hafta, skupina, tednov, tekme } (datum in ura
 * ljubljanska). Stran druge skupine ali drugega tedna (neznan `hafta` ali
 * `grupID` stran tiho zamenja) vrže napako — uvoz se ustavi.
 */
export function tekmeTedna(koda, html, hafta = null) {
  const { grup } = razberiKodo(koda)
  if (grup == null) {
    const z = zavihekTedna1Lig(html)
    if (!z) throw new Error(`tff: ${naslovLige(koda)} nima zavihka tedna lige brez skupin (1. Lig) — stran se je spremenila? Uvoz ustavljen`)
    if (hafta != null && z.hafta !== hafta) throw new Error(`tff: ${naslovTedna(koda, hafta)} kaže ${z.hafta}. teden — uvoz ustavljen`)
    const tekme = vrsticeTedna1Lig(html).map((t) => ({ ...t, krog: z.hafta, ...vLjubljanskiCas(t.datum, t.ura) }))
    return { hafta: z.hafta, skupina: null, tednov: steviloTednov(html), tekme }
  }
  const z = zavihekTedna(html)
  if (!z) throw new Error(`tff: ${naslovLige(koda)} nima zavihka tedna — stran se je spremenila? Uvoz ustavljen`)
  const ime = skupineStrani(html).get(grup)
  if (ime == null) throw new Error(`tff: ${naslovLige(koda)} ne pozna skupine ${grup} — uvoz ustavljen`)
  if (z.skupina !== ime) throw new Error(`tff: ${naslovLige(koda)} kaže skupino "${z.skupina}", ne "${ime}" (${grup}) — uvoz ustavljen`)
  if (hafta != null && z.hafta !== hafta) throw new Error(`tff: ${naslovTedna(koda, hafta)} kaže ${z.hafta}. teden — uvoz ustavljen`)
  const tekme = vrsticeTedna(html).map((t) => ({ ...t, krog: z.hafta, ...vLjubljanskiCas(t.datum, t.ura) }))
  return { hafta: z.hafta, skupina: z.skupina, tednov: steviloTednov(html), tekme }
}

/**
 * Stran tedna za predpomnilnik: brez menijev, lestvice in fiksturjev drugih
 * skupin (stran 3. Lig ima 640 kB, tedenski del ~15 kB). Ostane, kar berejo
 * `skupineStrani`, `zavihekTedna`, `steviloTednov` in `vrsticeTedna`.
 */
export function obreziTeden(html) {
  const s = String(html ?? '')
  if (zavihekTedna1Lig(s) && !zavihekTedna(s)) {
    // 1. Lig: zavihek, povezave tednov in blok `dtlHaftaninMaclari` (brez play-offa).
    const tedni = [...s.matchAll(/<td[^>]*class=haftaNo\w+><a href=[^>]*>/g)].map((m) => m[0])
    const zavihek = s.match(/<a [^>]*_hs_Tab2"[^>]*><span class="wrap"><span class="innerWrap">[^<]*<\/span><\/span><\/a>/)?.[0] ?? ''
    const od = s.search(/<div id="[^"]*dtlHaftaninMaclari_ctl\d+_ayrt1"/)
    const zadnji = s.lastIndexOf('dtlHaftaninMaclari_ctl')
    const tekme = od >= 0 && zadnji > od ? s.slice(od, s.indexOf('</div>', zadnji) + 6) : ''
    return `<!-- tff teden 1. Lig (obrezano) -->\n${tedni.join('\n')}\n${zavihek}\n${tekme}\n`
  }
  const skupine = [...s.matchAll(/<a href="[^"]*grupID=\d+[^"]*#hmac"[^>]*>\s*[^<]*<\/a>/g)].map((m) => m[0])
  const tedni = [...s.matchAll(/<td[^>]*class=haftaNo\w+><a href=[^>]*>/g)].map((m) => m[0])
  const zavihek = s.match(/<a [^>]*maclarBaslik_Tab2"[^>]*><span class="wrap"><span class="innerWrap">[^<]*<\/span><\/span><\/a>/)?.[0] ?? ''
  const od = s.search(/kupaMaclari_ctl\d+_lblTarih"/)
  const zadnji = s.lastIndexOf('_lblTakim2"')
  const tekme = od >= 0 && zadnji > od ? s.slice(s.lastIndexOf('<', od), s.indexOf('</a>', zadnji) + 4) : ''
  return `<!-- tff teden (obrezano) -->\n${skupine.join('\n')}\n${tedni.join('\n')}\n${zavihek}\n<span id="x_kupaMaclari_ctl00_zacetek"></span>${tekme}\n`
}

// --- zapisnik -----------------------------------------------------------------------------

/** Igralci enega seznama ekipe (rptKadrolar, rptYedekler): [{ st, ime, regSt }]. */
function igralciSeznama(blok, seznam) {
  const out = []
  const re = new RegExp(`${seznam}_ctl\\d+_formaNo">([^<]*)<\\/span>\\s*<a [^>]*kisiId=(\\d+)"[^>]*>([^<]*)<\\/a>`, 'g')
  for (const m of blok.matchAll(re)) {
    const st = String(m[1]).replace(/\D/g, '')
    const polno = lepoIme(besedilo(m[3]))
    out.push({ st: st ? Number(st) : null, regSt: Number(m[2]), polnoIme: polno, ime: vPriimekIme(polno) })
  }
  return out
}

/** Dogodki ekipe: goli, kartoni, izstopi, vstopi (vsi s `kisiId`). */
function dogodkiEkipe(blok) {
  const goli = [...blok.matchAll(/rptGoller_ctl\d+_lblGol"[^>]*kisiId=(\d+)"[^>]*>([^<]*)<\/a>/g)].map((m) => {
    const t = besedilo(m[2])
    return { regSt: Number(m[1]), minuta: minuta(t.match(/,\s*([\d+]+)\s*\.?\s*dk/i)?.[1]), vrsta: t.match(/\(([A-ZÇĞİÖŞÜ])\)\s*$/)?.[1] ?? null, besedilo: t }
  })
  const kartoni = [...blok.matchAll(/rptKartlar_ctl(\d+)_k"[^>]*alt="([^"]*)"[\s\S]*?kisiId=(\d+)"[^>]*>([^<]*)<\/a>[\s\S]*?rptKartlar_ctl\1_d">([^<]*)</g)].map((m) => ({
    regSt: Number(m[3]),
    vrsta: /çift/i.test(m[2]) ? 'drugiRumeni' : /kırmızı|kirmizi/i.test(m[2]) ? 'rdeci' : /sarı|sari/i.test(m[2]) ? 'rumeni' : null,
    opis: m[2],
    minuta: minuta(m[5]),
  }))
  const izstopi = [...blok.matchAll(/rptCikanlar_ctl(\d+)_lblCikan"[^>]*kisiId=(\d+)"[^>]*>[^<]*<\/a>[\s\S]*?rptCikanlar_ctl\1_oc">([^<]*)</g)].map((m) => ({ regSt: Number(m[2]), minuta: minuta(m[3]) }))
  const vstopi = [...blok.matchAll(/rptGirenler_ctl(\d+)_lblGiren"[^>]*kisiId=(\d+)"[^>]*>[^<]*<\/a>[\s\S]*?rptGirenler_ctl\1_og">([^<]*)</g)].map((m) => ({ regSt: Number(m[2]), minuta: minuta(m[3]) }))
  return { goli, kartoni, izstopi, vstopi }
}

/** Glava zapisnika: { domaci, gostje, domaciId, gostjeId, izid, datum, ura, tekmovanje, kod }. */
export function glavaZapisnika(html) {
  const s = cisto(html)
  const ekipa = (n) => s.match(new RegExp(`dtMacBilgisi_lnkTakim${n}"[^>]*kulupId=(\\d+)"[^>]*>([^<]*)<\\/a>`, 'i'))
  const d = ekipa(1)
  const g = ekipa(2)
  if (!d || !g) return null
  const sk1 = besedilo(s.match(/dtMacBilgisi_lblTakim1Skor">([^<]*)</)?.[1])
  const sk2 = besedilo(s.match(/dtMacBilgisi_Label12">([^<]*)</)?.[1])
  const cas = besedilo(s.match(/dtMacBilgisi_lblTarih">([^<]*)</)?.[1])
  return {
    domaci: besedilo(d[2]),
    gostje: besedilo(g[2]),
    domaciId: Number(d[1]),
    gostjeId: Number(g[1]),
    izid: /^\d+$/.test(sk1) && /^\d+$/.test(sk2) ? { domaci: Number(sk1), gostje: Number(sk2) } : null,
    datum: datumIz(cas),
    ura: cas.match(/(\d{1,2}:\d{2})/)?.[1] ?? null,
    tekmovanje: besedilo(s.match(/dtMacBilgisi_lblOrganizasyonAdi">([\s\S]*?)<\/span>/)?.[1]),
    kod: besedilo(s.match(/dtMacBilgisi_lblKod">([^<]*)</)?.[1]) || null,
  }
}

/** Je stran sploh zapisnik tekme (ima glavo z obema kluboma)? */
export const jeStranTekme = (html) => glavaZapisnika(html) != null

/** Je stran teden lige (zavihek tedna s skupino ali 1. Lig)? */
export const jeStranTedna = (html) => zavihekTedna(html) != null || zavihekTedna1Lig(html) != null

/**
 * V predpomnilnik gre le prava stran: zapisnik z glavo, teden z zavihkom.
 * Napaka strežnika s statusom 200 (ASP.NET "Hata", prazna predloga) bi sicer
 * obveljala, dokler se ne postara — tekma, starejša od treh dni, pa za vedno.
 */
export function zaPredpomnilnik(html, datoteka = '') {
  if (/^mac-/.test(datoteka)) return jeStranTekme(html)
  if (/^(hafta|razpored)-/.test(datoteka)) return jeStranTedna(html)
  return jeStranTekme(html) || jeStranTedna(html)
}

/**
 * Zapisnik v obliko drugih virov. Null, če stran ni tekma, tekma nima izida
 * ali kateri ekipi manjka postava (neodigrana tekma, kontumacija — "Esame
 * Bilgileri Kulüpler Tarafından Girilmektedir").
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const g = glavaZapisnika(html)
  if (!g?.izid) return null
  const s = cisto(html)
  const bloki = [1, 2].map((n) => {
    const od = s.indexOf(`_grdTakim${n}_`)
    const naslednji = n === 1 ? s.indexOf('_grdTakim2_') : s.indexOf('rptGolTipleri')
    return od < 0 ? '' : s.slice(s.lastIndexOf('<', od), naslednji > od ? naslednji : undefined)
  })
  const ekipe = bloki.map((b) => ({ postava: igralciSeznama(b, 'rptKadrolar'), rezerve: igralciSeznama(b, 'rptYedekler'), ...dogodkiEkipe(b) }))
  if (!ekipe[0].postava.length || !ekipe[1].postava.length) return null
  const imeni = [g.domaci, g.gostje]
  const opozorila = []

  // Igralec po šifri osebe v ekipi; dogodek z neznano šifro je opozorilo.
  const poSifri = (idx, regSt) => [...ekipe[idx].postava, ...ekipe[idx].rezerve].find((i) => i.regSt === regSt) ?? null
  const kdo = (idx, i, m) => ({ ekipaIdx: idx, st: i.st, ime: i.ime, regSt: i.regSt, minuta: m })

  // Menjave: izstop in vstop ob isti minuti tvorita par; preklopi gredo k igralcu.
  const preklopi = new Map()
  const dodaj = (i, m) => {
    if (!preklopi.has(i)) preklopi.set(i, [])
    preklopi.get(i).push(m)
  }
  const menjave = []
  ekipe.forEach((e, idx) => {
    const ven = []
    for (const x of e.izstopi) {
      const i = poSifri(idx, x.regSt)
      if (!i) { opozorila.push(`${imeni[idx]}: izstop igralca ${x.regSt} (${x.minuta}.) — ni v zapisniku`); continue }
      if (x.minuta == null) { opozorila.push(`${imeni[idx]}: izstop ${i.ime} brez minute`); continue }
      dodaj(i, x.minuta)
      ven.push({ i, minuta: x.minuta })
    }
    for (const x of e.vstopi) {
      const i = poSifri(idx, x.regSt)
      if (!i) { opozorila.push(`${imeni[idx]}: vstop igralca ${x.regSt} (${x.minuta}.) — ni v zapisniku`); continue }
      if (x.minuta == null) { opozorila.push(`${imeni[idx]}: vstop ${i.ime} brez minute`); continue }
      dodaj(i, x.minuta)
      const j = ven.findIndex((v) => v.minuta === x.minuta)
      const par = j >= 0 ? ven.splice(j, 1)[0].i : null
      menjave.push({ ekipaIdx: idx, minuta: x.minuta, noter: { st: i.st, ime: i.ime }, ven: par ? { st: par.st, ime: par.ime } : { st: null, ime: null } })
    }
    for (const v of ven) menjave.push({ ekipaIdx: idx, minuta: v.minuta, noter: { st: null, ime: null }, ven: { st: v.i.st, ime: v.i.ime } })
  })

  // Goli: avtogol (K) je vpisan pri ekipi, ki ji je štel, ali pri strelčevi —
  // strelca iščemo v obeh ekipah. Izvajanje 11 m (S) ne šteje.
  const goli = []
  ekipe.forEach((e, idx) => {
    for (const x of e.goli) {
      if (x.vrsta === 'S') continue
      if (x.vrsta && !'FHPK'.includes(x.vrsta)) opozorila.push(`${imeni[idx]}: neznana vrsta gola "${x.vrsta}" (${x.besedilo})`)
      let ekipaStrelca = idx
      let i = poSifri(idx, x.regSt)
      if (!i) {
        i = poSifri(1 - idx, x.regSt)
        ekipaStrelca = 1 - idx
      }
      if (!i) { opozorila.push(`${imeni[idx]}: gol v ${x.minuta}. minuti (${x.besedilo}) — strelca ni v zapisniku`); continue }
      const avtogol = x.vrsta === 'K'
      if (!avtogol && ekipaStrelca !== idx) opozorila.push(`${imeni[idx]}: gol ${i.ime} je vpisan pri drugi ekipi in ni avtogol`)
      if (x.minuta == null) opozorila.push(`${imeni[idx]}: gol ${i.ime} brez minute`)
      goli.push({ ...kdo(ekipaStrelca, i, x.minuta), avtogol, enajstmetrovka: x.vrsta === 'P' })
    }
  })

  // Kartoni: drugi rumeni ("Çift Sarı Kart") je 1 rumeni + 1 rdeči kot pri
  // drugih virih; prvi rumeni je vpisan posebej ali pa ne — dodamo ga, če ga ni.
  const rumeni = []
  const rdeci = []
  ekipe.forEach((e, idx) => {
    for (const x of e.kartoni) {
      const i = poSifri(idx, x.regSt)
      if (!i) continue // trener ali osebje: karton ne šteje
      if (!x.vrsta) { opozorila.push(`${imeni[idx]}: neznan karton "${x.opis}" (${i.ime})`); continue }
      if (x.vrsta === 'rumeni') rumeni.push(kdo(idx, i, x.minuta))
      else if (!rdeci.some((r) => r.ekipaIdx === idx && r.regSt === i.regSt)) rdeci.push({ ...kdo(idx, i, x.minuta), drugiRumeni: x.vrsta === 'drugiRumeni' })
    }
  })
  for (const r of rdeci.filter((x) => x.drugiRumeni)) {
    const njegovi = rumeni.filter((y) => y.ekipaIdx === r.ekipaIdx && y.regSt === r.regSt)
    if (!njegovi.length) rumeni.push({ ...r, drugiRumeni: undefined, minuta: r.minuta })
    for (const y of njegovi.slice(1)) rumeni.splice(rumeni.indexOf(y), 1)
  }
  for (const r of rdeci) delete r.drugiRumeni
  for (const y of rumeni) delete y.drugiRumeni

  const sestava = ekipe.map((e, idx) => {
    if (e.postava.length !== 11) opozorila.push(`${imeni[idx]}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const sifre = new Map()
    for (const i of [...e.postava, ...e.rezerve]) sifre.set(i.regSt, (sifre.get(i.regSt) ?? 0) + 1)
    for (const [k, n] of sifre) if (n > 1) opozorila.push(`${imeni[idx]}: igralec ${k} je v zapisniku ${n}-krat`)
    const vObliko = (zacetnik) => (i) => ({
      st: i.st,
      ime: i.ime,
      regSt: i.regSt,
      zacetnik,
      vratar: false,
      pozicija: null,
      preklopi: [...(preklopi.get(i) ?? [])].sort((a, b) => a - b),
    })
    return { ime: imeni[idx], postava: e.postava.map(vObliko(true)), rezerve: e.rezerve.map(vObliko(false)) }
  })
  ekipe.forEach((e, idx) => {
    for (const i of e.rezerve) {
      const p = preklopi.get(i)
      if (p && p.length > 2) opozorila.push(`${imeni[idx]}: ${i.ime} ima ${p.length} menjav`)
    }
  })

  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje)
    opozorila.push(`goli iz zapisnika (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)

  const { datum, ura } = vLjubljanskiCas(g.datum, g.ura)
  return {
    zapisnikId: id,
    url,
    sezona: sezonaIzDatuma(g.datum),
    krog: null, // stran ga ne pove; da ga teden
    datum,
    ura,
    liga: g.tekmovanje,
    domaci: sestava[0],
    gostje: sestava[1],
    rezultat: g.izid,
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

// --- klubi ---------------------------------------------------------------------------------

/**
 * Ključ kluba: male črke po turško (I → ı, İ → i), turške črke ostanejo,
 * ločila proč ("KDZ.EREĞLİ 1980 SPOR KULÜBÜ" → "kdz ereğli 1980 spor kulübü").
 */
export const kljucKlubaTr = (ime) =>
  razpakiraj(ime)
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

// Pravne oblike in splošne besede, ki jih v kratkem imenu ne potrebujemo.
const OBLIKE_TR = new Set(['a.ş.', 'a.ş', 'aş', 'a', 'ş', 'sk', 'fk', 'kulübü', 'kulubu', 'spor kulübü', 'futbol kulübü', 'faaliyetleri', 'yat.'])
/**
 * Kratko ime: velike začetnice, brez "Spor Kulübü", "A.Ş." in podobnih
 * repov. "KDZ.EREĞLİ 1980 SPOR KULÜBÜ" → "Kdz.Ereğli 1980", "ORDUSPOR 1967
 * A.Ş." → "Orduspor 1967", "ALTAY" → "Altay". Največ tri besede.
 */
export function kratkoImeTr(polno) {
  let s = razpakiraj(polno).replace(/\s+/g, ' ').trim()
  s = s.replace(/\s+(SPOR\s+)?(FUTBOL\s+)?(SPOR\s+)?(KULÜBÜ|KULUBU)(?=\s|$).*$/i, '').replace(/\s+(A\.?\s*Ş\.?|SPOR\s+FAALİYETLERİ.*|SPOR\s+YAT\..*)$/i, '')
  const besede = lepoIme(s).split(' ').filter((b) => b && !OBLIKE_TR.has(b.toLocaleLowerCase('tr')))
  return (besede.length ? besede : lepoIme(polno).split(' ')).slice(0, 3).join(' ')
}

// --- branje ------------------------------------------------------------------------------

const pot = (ime) => `${mapa()}/${ime}`
function izPredpomnilnika(ime) {
  const p = pot(ime)
  if (!existsSync(p)) return null
  return { html: readFileSync(p, 'utf8'), starost: Date.now() - statSync(p).mtimeMs }
}

/**
 * Prenos strani tedna ali tekme: 403/429 in izziv vržeta `TffZavrnitev`
 * (uvoz izhod 4), da nočna zanka ostalih TR lig ne bere naprej.
 */
async function prenesiStran(prenesi, url, ime, sveze = true) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev || ZAVRNITVE.includes(e.status)) throw new TffZavrnitev(`tff: ${url} → ${e.status ?? e.message} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new TffZavrnitev(`tff: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo`)
  return html
}

const starostDni = (datum, danes = Date.now()) => (datum ? (danes - Date.parse(`${datum}T00:00:00Z`)) / DAN : 0)

/**
 * Kako star sme biti shranjen teden (ms): odigran teden (vsi izidi, zadnja
 * tekma pred več kot tremi dnevi) enkrat na teden do 45 dni — disciplinska
 * komisija izid lahko pozneje spremeni v hükmen 3:0 in `kontumacije` gleda
 * izide iz tedna —, nato se ne bere več; teden blizu danes (od −7 do +10 dni)
 * vsako uro; poznejši na tri dni; pretekli z neodigrano (prestavljeno) tekmo
 * dnevno.
 */
export function najvecStarostTedna(tekme, danes = Date.now()) {
  if (!tekme.length) return DAN
  const datumi = tekme.map((t) => t.datum).filter(Boolean).sort()
  if (!datumi.length) return DAN
  const vsiIzidi = tekme.every((t) => t.izid)
  if (vsiIzidi && starostDni(datumi.at(-1), danes) > 45) return Infinity
  if (vsiIzidi && starostDni(datumi.at(-1), danes) > 3) return 7 * DAN
  if (tekme.some((t) => t.datum && starostDni(t.datum, danes) >= -10 && starostDni(t.datum, danes) <= 7)) return URA
  if (starostDni(datumi[0], danes) < -10) return 3 * DAN
  return DAN
}

/** Prebere en teden (iz predpomnilnika, če je dovolj svež). */
async function beriTeden(koda, hafta, prenesi, danes) {
  const ime = imeTedna(koda, hafta)
  // Uvoz razporeda prenese 1. teden (`naslovRazporeda`) tik pred tem in ga
  // shrani pod `razpored-<šifra>.html` — ne beremo ga dvakrat.
  if (hafta === 1) {
    const r = izPredpomnilnika(`razpored-${sifra(koda)}.html`)
    if (r && r.starost <= 15 * 60000) {
      try {
        const t = tekmeTedna(koda, r.html, 1)
        mkdirSync(mapa(), { recursive: true })
        writeFileSync(pot(ime), obreziTeden(r.html))
        return t
      } catch {
        // ni 1. teden te skupine: preberemo ga sami
      }
    }
  }
  const c = izPredpomnilnika(ime)
  if (c) {
    try {
      const t = tekmeTedna(koda, c.html, hafta)
      if (c.starost <= najvecStarostTedna(t.tekme, danes)) return t
    } catch {
      // pokvarjen ali tuj teden v predpomnilniku: preberemo znova
    }
  }
  const html = await prenesiStran(prenesi, naslovTedna(koda, hafta), ime)
  const t = tekmeTedna(koda, html, hafta)
  mkdirSync(mapa(), { recursive: true })
  writeFileSync(pot(ime), obreziTeden(html))
  return t
}

/**
 * Ime kluba po šifri (`kulupID`) ne glede na sezono: 1. Lig nosi sponzorje v
 * imenu in jih menja vsako sezono ("ÖZBELSAN SİVASSPOR" 2025/26 → "EKENLER
 * BETON SİVASSPOR" 2026/27). Brez tega bi arhiv 2025/26 vpisal isti klub še
 * enkrat pod starim imenom. Pregled 15. 10. 2026 (1. Lig obeh sezon proti
 * 2./3. Lig, PGL in BAL): teh deset, trkov (isto ime, druga šifra) ni.
 * Ob novi sezoni poženi pregled znova in dodaj preimenovane.
 */
export const IME_KLUBA = {
  130: 'BANDIRMA SPOR', // 2025/26 ÖZBEYLİ BANDIRMA SPOR
  74: 'EKENLER BETON SİVASSPOR', // ÖZBELSAN SİVASSPOR
  3602: 'SMS GRUP SARIYER', // SMS GRUP SARIYERSPOR
  4824: 'BODRUM FK', // SİPAY BODRUM FK
  3623: 'ORFA YAPI PENDİKSPOR FUTBOL A.Ş.', // ATKO GRUP PENDİKSPOR FUTBOL A.Ş.
  2020: 'ARTI DEĞER VAN SPOR FUTBOL KULÜBÜ', // İMAJ ALTYAPI VAN SPOR FUTBOL KULÜBÜ
  6: 'KEÇTAŞ ANKARA KEÇİÖRENGÜCÜ', // EMRE GÖKDEMİR İNŞAAT ANKARA KEÇİÖRENGÜCÜ
  9387: 'ALAGÖZ HOLDİNG IĞDIR FUTBOL KULÜBÜ', // ALAGÖZ HOLDİNG IĞDIR FK
  964: 'TURKA ESENLER EROKSPOR', // ESENLER EROKSPOR
  121: 'HATAYSPOR', // 1. Lig 2025/26 ATAKAŞ HATAYSPOR, 2026/27 v 2. Lig
}

/**
 * Vse tekme lige: [{ krog, id, datum, ura, domaci, gostje, domaciId, gostjeId, izid }].
 * Število tednov da prvi teden; ime kluba je zadnje, ki ga stran pove za šifro
 * kluba (preimenovan klub ima tako eno ime v razporedu in zapisnikih).
 */
export async function tekmeLige(koda, prenesi, { danes = Date.now() } = {}) {
  const prvi = await beriTeden(koda, 1, prenesi, danes)
  const tednov = prvi.tednov
  if (!tednov) throw new Error(`tff: ${naslovLige(koda)} ne pove števila tednov — uvoz ustavljen`)
  const tekme = [...prvi.tekme]
  for (let h = 2; h <= tednov; h++) tekme.push(...(await beriTeden(koda, h, prenesi, danes)).tekme)
  const imena = new Map(Object.entries(IME_KLUBA).map(([k, v]) => [Number(k), v]))
  for (const t of tekme) {
    if (!(t.domaciId in IME_KLUBA)) imena.set(t.domaciId, t.domaci)
    if (!(t.gostjeId in IME_KLUBA)) imena.set(t.gostjeId, t.gostje)
  }
  return tekme.map((t) => ({ ...t, domaci: imena.get(t.domaciId), gostje: imena.get(t.gostjeId) }))
}

/** Razpored v obliko uvoza razporeda. */
export function razporedIzTekem(tekme) {
  const krogi = new Map()
  for (const t of tekme) {
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci, gostje: t.gostje, datum: t.datum, ura: t.ura, kontumacija: false, odigrana: !!t.izid,
      // Za `kontumacije`: tekmo z izidom 3:0 / 0:3 je treba pogledati v zapisniku.
      tffId: t.id, izid: t.izid,
    })
  }
  return [...krogi.values()].filter((k) => k.tekme.some((t) => t.datum)).sort((a, b) => a.stevilka - b.stevilka)
}

/** Prenos: bajti windows-1254 → UTF-8, z rokom tudi za telo. */
export async function tffFetch(url, moznosti = {}) {
  const { signal: _s, ...ostalo } = moznosti
  const o = await fetch(url, { ...ostalo, signal: AbortSignal.timeout(60000) })
  const bajti = new Uint8Array(await o.arrayBuffer())
  const tip = o.headers.get('content-type') ?? ''
  const kodiranje = /charset=([\w-]+)/i.exec(tip)?.[1] ?? 'windows-1254'
  let telo
  try {
    telo = new TextDecoder(kodiranje).decode(bajti)
  } catch {
    telo = new TextDecoder('windows-1254').decode(bajti)
  }
  const glave = new Headers(o.headers)
  glave.set('content-type', 'text/html; charset=utf-8')
  return new Response(telo, { status: o.status, statusText: o.statusText, headers: glave })
}

const vir = {
  ime: 'tff',
  fetch: tffFetch,
  polnoIme: 'Türkiye Futbol Federasyonu (tff.org)',
  drzava: 'TR',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': UA },
  premorMs: PREMOR_MS,
  imaRegistracije: false,

  naslovRazporeda: (koda) => naslovTedna(koda, 1),
  naslovZapisnika: (_koda, id) => naslovTekme(id),
  jeIzziv,
  zaPredpomnilnik,
  zavrnitev: (sporocilo, status = null) => new TffZavrnitev(`tff: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),
  // Teden v predpomnilniku je obrezan; uvoz razporeda shrani celo stran 1. tedna
  // pod svojim imenom, `beriTeden` pa bere le svoje datoteke `hafta-…`.

  async razporedVseStrani(koda, prenesi) {
    return razporedIzTekem(await tekmeLige(koda, prenesi))
  },

  async zapisniki(koda, prenesi) {
    const tekme = await tekmeLige(koda, prenesi)
    const out = []
    for (const t of tekme.filter((x) => x.izid)) {
      const url = naslovTekme(t.id)
      // Zapisnik zadnjih treh dni se lahko še popravlja; starejšega ne beremo znova.
      const starost = starostDni(t.datum)
      let html = await prenesiStran(prenesi, url, imeTekme(t.id), starost <= 3)
      let z = vZapisnik(html, { id: sifraZapisnika(t.id), url })
      // Stran brez postav ("Esame Bilgileri Kulüpler Tarafından Girilmektedir"):
      // klub postave vnese pozneje, zato je shranjena ne sme zamrzniti — do 45
      // dni jo beremo sveže. Kontumacije (3:0 / 0:3, starejše od tedna) ne.
      const kontumacija = starost > 7 && ((t.izid.domaci === 3 && t.izid.gostje === 0) || (t.izid.domaci === 0 && t.izid.gostje === 3))
      if (!z && starost > 3 && starost <= 45 && !kontumacija) {
        html = await prenesiStran(prenesi, url, imeTekme(t.id), true)
        z = vZapisnik(html, { id: sifraZapisnika(t.id), url })
      }
      if (!z) continue
      // Ime kluba, krog in datum s strani tedna, da se tekma ujame z razporedom.
      const g = glavaZapisnika(html)
      const obrnjeno = g.domaciId === t.gostjeId && g.gostjeId === t.domaciId
      if (g.domaciId !== t.domaciId && !obrnjeno) z.opozorila.push(`klubi zapisnika (${g.domaciId}, ${g.gostjeId}) niso klubi tedna (${t.domaciId}, ${t.gostjeId})`)
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.datum = t.datum ?? z.datum
      z.sezona = sezonaIzDatuma(t.datum) ?? z.sezona
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid tedna ${t.izid.domaci}:${t.izid.gostje}`)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  /**
   * Kontumacije (hükmen): tekma z izidom 3:0 ali 0:3, starejša od tedna dni,
   * katere zapisnik nima postav. Bere le take tekme; zapisnik gre v isti
   * predpomnilnik kot pri uvozu zapisnikov.
   */
  async kontumacije(_koda, prenesiKrog, krogi, danes) {
    const out = []
    const teden = new Date(Date.parse(`${danes}T00:00:00Z`) - 7 * DAN).toISOString().slice(0, 10)
    for (const k of krogi) {
      for (const t of k.tekme) {
        const i = t.izid
        if (!i || !t.tffId || !t.datum || t.datum > teden) continue
        if (!((i.domaci === 3 && i.gostje === 0) || (i.domaci === 0 && i.gostje === 3))) continue
        const html = await prenesiKrog(naslovTekme(t.tffId), imeTekme(t.tffId), t.datum)
        if (jeIzziv(html)) throw new TffZavrnitev(`tff: ${naslovTekme(t.tffId)} vrne izziv (CAPTCHA)`)
        if (jeStranTekme(html) && !vZapisnik(html)) out.push({ krog: k.stevilka, domaci: t.domaci, gostje: t.gostje })
      }
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaTr,
  kratkoIme: kratkoImeTr,
  poenostavi: kljucKlubaTr,
}

export default vir
