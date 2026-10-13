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
//     facr (posrednik, CAPTCHA), hlf (brskalnik), frf, lff, pzpn, ffm, fsb.
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
//       izpiše "slug faktor vir" za lige koša, urejeno po stanju
//   node scripts/nocni-kosi.mjs --zabelezi at-bundesliga --stanje <json>
//       zapiše čas uspešnega uvoza lige
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/** Iz koliko poslov hkrati sme brati vir (privzeto 1). */
export const VZPOREDNI = {
  // ÖFB je uporabo dovolil; oefb.at je velik strežnik, odgovor 2–7 s.
  oefb: 4,
  // HNS Semafor (COMET), javni prikaz; 500 ms med zahtevki.
  hns: 3,
  // MLSZ adatbank: robots.txt Crawl-delay 1 s. S faktorjem premora (3 × 1,5 s)
  // ostane skupni tempo 0,67 zahtevka na sekundo kot pri enem poslu.
  mlsz: 3,
  // Sportnet je API (futbalnet.sk), 300 ms med zahtevki.
  sportnet: 2,
  // fss.rs (državni ligi in regijske po šifri COMET), 2 s med zahtevki.
  fss: 2,
  fssid: 2,
}

/** Koliko poslov ima država (1 = kot doslej). Matrika v uvoz-zapisnikov.yml mora biti ista. */
export const KOSOV = { AT: 4, HR: 3, HU: 3, SK: 2, RS: 2, SI: 2 }

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
    .select('slug, source, sort_order, countries!inner(code)')
    .eq('active', true)
    .eq('countries.code', drzava)
    .order('sort_order')
    .order('slug')
  if (error) {
    console.error(`Tekmovanj ni mogoče prebrati: ${error.message}`)
    process.exit(1)
  }
  const kosi = razdeli((data ?? []).map((t) => ({ slug: t.slug, vir: t.source })), kosov)
  for (const l of uredi(kosi[kos - 1], preberiStanje(potStanja))) console.log(`${l.slug} ${l.faktor} ${l.vir}`)
}
