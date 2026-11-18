// Kosi nočnega uvoza: vklopljene lige države razdeli med več vzporednih poslov.
//
// Zakaj: 13. 10. 2026 je imela Avstrija 162 vklopljenih lig. En posel jih je v
// 240 minutah obdelal 42, potem ga je GitHub preklical — vsak zagon istih 42 v
// istem vrstnem redu, ostalih 120 lig se ni osvežilo od 11. 10. Isto je čakalo
// Madžarsko (146) in Hrvaško (110). Država je zdaj razdeljena na `kosov` poslov.
//
// Pravila:
//   - Liga pripada košu po zgoščenki šifre (stabilno med zagoni, da predpomnilnik
//     koša ostane njen), razen če vir ne sme brati iz več poslov hkrati.
//   - VZPOREDNI pove, iz koliko poslov hkrati sme brati posamezen vir. Vir, ki
//     ga ni na seznamu, bere en sam posel (vse njegove lige so v istem košu):
//     majhna spletišča MNZ, jalgpall.ee in fcf.cat (skupen proračun branja),
//     facr (posrednik, CAPTCHA), hlf (brskalnik), frf, lff, pzpn, wmzpn, ffm, fsb,
//     mascot, askf, tff, aft, hoff-km, pfl-ua, upl, ffl, ffa, pfl-az, dbu,
//     ncefl, isthmian, lowland, mfa, fscg, nsfbih, nfsbih, fmf.
//   - Faktor premora: vir, ki ga bere k poslov, v vsakem bere s k-krat daljšim
//     premorom (`SLFF_PREMOR_FAKTOR`, prenos.mjs). Skupni tempo zahtevkov k viru
//     tako ni večji kot pri enem poslu — hitrost pride iz baze (uvoz zapisnika je
//     večinoma pisanje) in iz tega, da počasen odgovor enega posla ne čaka drugih.
//   - Vrstni red v košu: najprej lige, ki jih nočni uvoz najdlje ni uspešno
//     obdelal (stanje v predpomnilniku koša). Če posel zmanjka časa, naslednjič
//     začne pri ligah, ki so ostale — nobena ne obvisi za vedno na koncu seznama.
//
// Uporaba (v delovnem toku):
//   node scripts/nocni-kosi.mjs --drzava AT --kos 2 --kosov 4 --stanje <json>
//       izpiše "slug faktor vir ključ" za lige koša, urejeno po stanju (ključ:
//       spletišče, ki ga zavrnitev ali izpad ustavi, glej kljucVira)
//   node scripts/nocni-kosi.mjs --zabelezi at-bundesliga --stanje <json>
//       zapiše čas uspešnega uvoza lige
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/** Iz koliko poslov hkrati sme brati vir (privzeto 1). */
export const VZPOREDNI = {
  // ÖFB je uporabo dovolil; oefb.at je velik strežnik, odgovor 2–7 s.
  oefb: 4,
  // HNS Semafor (COMET): 5 s osnove, 15 s na koš; trenutno izključen.
  hns: 3,
  // MLSZ adatbank: robots.txt Crawl-delay 1 s. S faktorjem premora (3 × 1,5 s)
  // ostane skupni tempo 0,67 zahtevka na sekundo kot pri enem poslu.
  mlsz: 3,
  // Sportnet je API (futbalnet.sk), 300 ms med zahtevki.
  sportnet: 2,
  // fss.rs (državni ligi in regijske po šifri COMET), 2 s med zahtevki.
  fss: 2,
  fssid: 2,
  // EPS (Grčija): devet regijskih zvez, vsaka na svoji domeni, 3 s med zahtevki
  // (Atene odgovarjajo ~5 s). 32 lig po 12–20 minut v enem poslu ne gre v
  // 190 minut; v štirih koših (vsak z 12 s premora) jih ima koš 7–9. Mascot
  // (31 lig po ~4 minute) ostane v enem košu, ki ga eps ne deli (glej KOSOV GR).
  eps: 4,
}

/** Koliko poslov ima država (1 = kot doslej). Matrika v uvoz-zapisnikov.yml mora biti ista. */
// GR 6: zamik zgoščenke da eps koše 2–5 in mascot koš 1, koš 6 ostane prazen
// (pri 5 koših bi mascot delil koš z 9 ligami eps).
export const KOSOV = { AT: 4, HR: 3, HU: 3, SK: 2, RS: 2, SI: 2, GR: 6 }

// FCF and EPSdod redesigned public routes verified from GitHub on 18 Nov.
// FCF nightly uses bounded existing fixtures instead of a full-season scan.
export const IZKLOPLJENI_VIRI = new Set()

/**
 * Spletišča, ki nas zavračajo vsak zagon (SLF-500): ne obhajamo, zato jih nočni
 * uvoz ne bere, dokler kdo ne preveri, da spet odgovarjajo. Vsak zagon je bil
 * zaradi njih rdeč in rdeča ni več povedala nič novega.
 *   - hns (semafor.hns.family): HTTP 403 vsak zagon od 10. 11. 2026, vsa HR.
 *   - pzpn (szpnkielce.pl, posrednik Świętokrzyskega ZPN): HTTP 403 GitHubovim
 *     strežnikom od 17. 11. 2026, vseh 8 lig PL pzpn (SLF-557).
 * Ponovno vklopi: odstrani ključ, ko en ročni zahtevek vrne 200.
 */
export const ZAVRNJENA_SPLETISCA = new Set(['hns', 'pzpn'])

/**
 * Lige z znano napako, ki ima svojo nalogo: nočni uvoz jih še vedno poskusi,
 * neuspeh pa je opozorilo, ne rdeč koš (SLF-557). Ena liga je dneve barvala
 * cel posel DE rdeče in prave nove napake niso bile več vidne. Po datumu `do`
 * je liga spet navadna: če še pada, je koš spet rdeč. Zavrnitev (4) ostane
 * rdeča vedno.
 */
export const ZNANE_NAPAKE = {}

/** Naloga znane napake lige, če velja na dan `danes` (YYYY-MM-DD), sicer null. */
export function znanaNapaka(slug, danes = new Date().toISOString().slice(0, 10)) {
  const z = ZNANE_NAPAKE[slug]
  return z && danes < z.do ? z.naloga : null
}

/**
 * Ključ, s katerim nočna zanka ustavi vir po zavrnitvi (4) ali izpadu (5).
 * eps je ena koda za ~30 ločenih spletišč regionalnih zvez (šifra lige
 * "<domena>:<id>"): 403 Dodekaneza je 16. 11. ustavil še 11 lig drugih zvez v
 * istem košu. Drugi viri so eno spletišče.
 */
export function kljucVira(vir, koda) {
  if (vir === 'eps') {
    const m = String(koda ?? '').match(/^([a-z]+\.gr):/)
    if (m) return `eps:${m[1]}`
  }
  return vir
}

/** Vklopljene lige brez lig iz izklopljenih virov in zavrnjenih spletišč. */
export const brezIzklopljenih = (lige) =>
  lige.filter((t) => !IZKLOPLJENI_VIRI.has(t.source) && !ZAVRNJENA_SPLETISCA.has(kljucVira(t.source, t.source_league_code)))

/** FNV-1a, 32 bitov: stabilna zgoščenka niza (brez kripto, enaka v vsakem Node). */
export function zgoscenka(niz) {
  let h = 0x811c9dc5
  for (let i = 0; i < niz.length; i++) {
    h ^= niz.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** Koš (0 … kosov-1), v katerem se uvaža liga. */
export function kosLige(slug, vir, kosov) {
  if (kosov <= 1) return 0
  const smeje = Math.max(1, Math.min(VZPOREDNI[vir] ?? 1, kosov))
  // Vir z omejitvijo c zaseda c zaporednih košev od svojega zamika naprej.
  return (zgoscenka(vir ?? '') + (zgoscenka(slug) % smeje)) % kosov
}

/**
 * Razdeli lige ({slug, vir}) na koše. Vrne seznam košev; vsak element je
 * seznam {slug, vir, faktor}, kjer je faktor število košev, ki berejo isti vir.
 */
export function razdeli(lige, kosov) {
  const kosi = Array.from({ length: Math.max(1, kosov) }, () => [])
  const kosiVira = new Map()
  for (const l of lige) {
    const k = kosLige(l.slug, l.vir, kosov)
    kosi[k].push(l)
    if (!kosiVira.has(l.vir)) kosiVira.set(l.vir, new Set())
    kosiVira.get(l.vir).add(k)
  }
  return kosi.map((kos) => kos.map((l) => ({ ...l, faktor: kosiVira.get(l.vir).size })))
}

/**
 * Najprej lige, ki jih nočni uvoz najdlje ni uspešno obdelal (brez zapisa:
 * nikoli, torej prve). Ob enakem času ostane vhodni vrstni red.
 */
export function uredi(lige, stanje = {}) {
  return lige
    .map((l, i) => ({ l, i, t: stanje[l.slug] ?? '' }))
    .sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.i - b.i))
    .map((x) => x.l)
}

function preberiStanje(pot) {
  try {
    return JSON.parse(readFileSync(pot, 'utf8'))
  } catch {
    return {}
  }
}

const arg = (ime) => {
  const i = process.argv.indexOf(ime)
  return i > -1 ? process.argv[i + 1] : null
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const potStanja = arg('--stanje')
  const zabelezi = arg('--zabelezi')
  if (zabelezi) {
    const stanje = preberiStanje(potStanja)
    stanje[zabelezi] = new Date().toISOString()
    mkdirSync(dirname(potStanja), { recursive: true })
    writeFileSync(potStanja, JSON.stringify(stanje, null, 1))
    process.exit(0)
  }

  const drzava = arg('--drzava')?.toUpperCase()
  const kos = Number(arg('--kos') ?? 1)
  const kosov = Number(arg('--kosov') ?? 1)
  if (!drzava || !(kos >= 1 && kos <= kosov)) {
    console.error('Uporaba: --drzava XX --kos N --kosov M [--stanje pot]')
    process.exit(1)
  }
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data, error } = await db
    .from('competitions')
    .select('slug, source, source_league_code, sort_order, countries!inner(code)')
    .eq('active', true)
    .eq('countries.code', drzava)
    .order('sort_order')
    .order('slug')
  if (error) {
    console.error(`Tekmovanj ni mogoče prebrati: ${error.message}`)
    process.exit(1)
  }
  const izklopljene = (data ?? []).length - brezIzklopljenih(data ?? []).length
  if (izklopljene) console.error(`Izpuščenih lig iz izklopljenih virov (${[...IZKLOPLJENI_VIRI, ...ZAVRNJENA_SPLETISCA].join(', ')}): ${izklopljene}`)
  const lige = brezIzklopljenih(data ?? []).map((t) => ({ slug: t.slug, vir: t.source, kljuc: kljucVira(t.source, t.source_league_code) }))
  const kosi = razdeli(lige, kosov)
  // 5. stolpec: naloga znane napake (nocni-uvoz.sh jo javi kot opozorilo).
  for (const l of uredi(kosi[kos - 1], preberiStanje(potStanja))) console.log(`${l.slug} ${l.faktor} ${l.vir} ${l.kljuc}${znanaNapaka(l.slug) ? ` ${znanaNapaka(l.slug)}` : ''}`)
}
