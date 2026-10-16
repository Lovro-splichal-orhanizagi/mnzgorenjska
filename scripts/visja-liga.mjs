// Cena novinca iz višje lige.
//
// Igralec pod 270 minutami v svoji ligi dobi privzeto 4.5. Kdor je pravkar
// prišel iz višje lige (iz 3. HNL v županijsko), je tako med najcenejšimi v
// ekipi, čeprav je med boljšimi (pritožba iz Hrvaške, 13. 10. 2026). Kjer vir
// da stalno šifro osebe (`players.reg_st`), ga najdemo v drugih ligah iste
// države in vira in ceno izpeljemo od tam.
//
// Raven lige ni stolpec v bazi, ampak pravilo po šifri in imenu lige spodaj,
// namenoma ozko: kjer raven ni jasna, vrne null in igralec ostane pri 4.5.
//
// - `raven`: 1 je vrh države; večja številka je nižja liga.
// - `obmocje`: 'drzava', kadar je raven ista po vsej državi (uradna
//   piramida: slovaška IV. liga je četrta raven v vsaki regiji), sicer šifra
//   zveze — takrat se raven primerja le z ligami iste zveze (1. ŽNL Istra in
//   2. ŽNL Zagreb nista na isti lestvici).
// - `drzavna`: liga državne zveze (HNL, Bundesliga …) je nad vsako regijsko,
//   tudi kadar regijske ravni ne poznamo.
// - mladinske lige se primerjajo le z mladinskimi, članske s članskimi.
//
// Države brez pravila (SI, RS, RO, PL, CZ, MK) in viri brez šifer osebe
// (stari CMS MNZ, fsb, fss, fssid, ffm) ostanejo pri 4.5.

/** Mladinska liga po šifri (isto pravilo kot `jeMladinskiSlug` v src/lib/prevzem.ts). */
export function jeMladinska(slug) {
  return /(^|-)(u19|mladinci)($|-)/.test(slug) || /^sml[0-9]/.test(slug)
}

// Hrvaške regijske lige: raven znotraj zveze po imenu. 4. NL (Rijeka, Sisak)
// je ista raven kot Elitna ŽNL drugod, ena nad tamkajšnjo 1. ŽNL; vrstni red
// preverjanja je pomemben (III pred II pred I).
const HR_REGIJSKE = [
  [/\b4\. NL\b|Elitna|Premier|Premijer/i, 1],
  [/(^|\s)(III\.?|3\.|Treća)\s/, 4],
  [/(^|\s)(II\.?|2\.|Druga)\s/, 3],
  [/(^|\s)(I\.|1\.|Prva|Jedinstvena prva)\s/, 2],
]

/**
 * Raven lige ali null, če je ne poznamo.
 * @param {{ slug: string, name?: string|null, zveza?: string|null }} liga
 * @returns {{ raven: number|null, obmocje: string, drzavna: boolean, mladinska: boolean } | null}
 */
export function ravenLige({ slug, name, zveza }) {
  const mladinska = jeMladinska(slug)
  const ime = name ?? ''
  const drz = (raven) => ({ raven, obmocje: 'drzava', drzavna: true, mladinska })
  const abs = (raven) => ({ raven, obmocje: 'drzava', drzavna: false, mladinska })
  const reg = (raven) => ({ raven, obmocje: zveza ?? slug, drzavna: false, mladinska })
  let m

  if (slug.startsWith('hr-')) {
    if (mladinska) {
      if (slug === 'hr-u19-1hnl') return drz(1)
      if (/^hr-u19-2nl(-b)?$/.test(slug)) return drz(2)
      return reg(null)
    }
    if (slug === 'hr-hnl') return drz(1)
    if (slug === 'hr-1nl') return drz(2)
    if (slug === 'hr-2nl') return drz(3)
    if (/^hr-(3nl-|hns-treca-nl-)/.test(slug)) return drz(4)
    const r = HR_REGIJSKE.find(([v]) => v.test(ime))
    return reg(r ? r[1] : null)
  }

  if (slug.startsWith('sk-')) {
    if (mladinska) {
      if ((m = slug.match(/^sk-sfz-u19-(\d)liga/))) return drz(Number(m[1]))
      if ((m = slug.match(/-u19-(\d)liga/))) return abs(Number(m[1]))
      return reg(null)
    }
    if (slug === 'sk-nike-liga') return drz(1)
    if ((m = slug.match(/^sk-sfz-(\d)liga/))) return drz(Number(m[1]))
    if ((m = slug.match(/-(\d)liga/))) return abs(Number(m[1]))
    return reg(null)
  }

  if (slug.startsWith('hu-')) {
    if (mladinska) {
      if (slug === 'hu-u19-orszagos-kiemelt') return drz(1)
      if (slug === 'hu-u19-orszagos-alap') return drz(2)
      if (/^hu-u19-kiemelt-/.test(slug)) return drz(3)
      if (/^hu-u19-/.test(slug)) return abs(4) // Regionális U19 Alap
      if ((m = slug.match(/^hu-[a-z]+-u19-(\d)/))) return abs(4 + Number(m[1]))
      if (/^hu-[a-z]+-u19/.test(slug)) return abs(5) // edina županijska U19
      return reg(null)
    }
    if ((m = slug.match(/^hu-nb(\d)/))) return drz(Number(m[1]))
    if ((m = slug.match(/^hu-[a-z]+-(\d)(-|$)/))) return abs(3 + Number(m[1]))
    return reg(null)
  }

  if (slug.startsWith('at-')) {
    if (mladinska) return null
    if (slug === 'at-bundesliga') return drz(1)
    if (slug === 'at-2-liga') return drz(2)
    if (/(^at-|-)regionalliga-/.test(slug)) return drz(3)
    // Deželne lige: vrstni red je po deželah različen, zato ga ne ugibamo —
    // šteje le, da je državna liga nad njimi.
    return reg(null)
  }

  if (slug.startsWith('es-ct-')) {
    const r = { elit: 1, primera: 2, segona: 3, tercera: 4, quarta: 5 }[slug.split('-')[2]]
    return r ? abs(r) : null
  }
  // Asturija (vir fas): Tercera Federación nad Primero AsturFútbol; raven le
  // znotraj Asturije (katalonske lige so druga piramida in drug vir).
  if (slug.startsWith('es-as-')) {
    const r = { tercera: 1, primera: 2 }[slug.split('-')[2]]
    return r ? { raven: r, obmocje: 'es-as', drzavna: false, mladinska } : null
  }
  // Grčija (vir eps): kategorije regionalne zveze EPS, `gr-<zveza>-<kategorija>[-<skupina>]`.
  // A1 nad A2 (Argolida) in A (Halkidika), A nad B nad Γ; le znotraj iste zveze
  // (šifre igralcev so po zvezah, vsaka EPS je svoja piramida).
  if (slug.startsWith('gr-')) {
    const [, zv, kat] = slug.split('-')
    const r = { a1: 1, a: 2, a2: 2, b: 3, g: 4 }[kat]
    return r ? { raven: r, obmocje: `gr-${zv}`, drzavna: false, mladinska } : null
  }

  if (slug.startsWith('ee-')) {
    if (slug === 'ee-premium-liiga') return abs(1)
    if (slug === 'ee-esiliiga') return abs(2)
    if (slug === 'ee-esiliiga-b') return abs(3)
    if ((m = slug.match(/^ee-(ii|iii|iv)-liiga/))) return abs({ ii: 4, iii: 5, iv: 6 }[m[1]])
    return null
  }

  if (slug.startsWith('lv-')) {
    if (mladinska) return null
    if (slug === 'lv-virsliga') return abs(1)
    if ((m = slug.match(/^lv-(\d)-liga/))) return abs(1 + Number(m[1]))
    return null
  }

  return null
}

/**
 * Za koliko ravni je liga `a` nad ligo `b`; 0, če ni višja ali ju ne moremo
 * primerjati. Državna liga je nad regijsko z neznano ravnijo za eno raven.
 */
export function koliko(a, b) {
  if (!a || !b || a.mladinska !== b.mladinska) return 0
  if (a.raven != null && b.raven != null && (a.obmocje === b.obmocje || (a.obmocje === 'drzava' && b.obmocje === 'drzava')))
    return Math.max(0, b.raven - a.raven)
  if (a.drzavna && !b.drzavna) return 1
  return 0
}

// Vsaka raven višje zapre 20 % razdalje do vrha lige: povprečen igralec
// (percentil 0.5) iz lige eno raven višje velja za percentil 0.6, dve
// ravni 0.68. Največ tri ravni.
const KORAK_RAVNI = 0.2
const NAJVEC_RAVNI = 3

/**
 * Cena v ciljni ligi iz cene v višji ligi. Cena je v obeh ligah ista
 * funkcija percentila znotraj pozicije (`spodnja + q^eksponent · razpon`),
 * zato percentil preberemo iz cene, ga za razliko ravni dvignemo in
 * preslikamo nazaj z mejami pozicije v ciljni ligi.
 *
 * @param {number} cena cena v višji ligi
 * @param {[number, number]} mejeVir meje pozicije v višji ligi
 * @param {[number, number]} mejeCilj meje pozicije v ciljni ligi
 * @param {number} ravni za koliko ravni je vir višji (≥ 1)
 * @param {number} eksponent
 */
export function cenaIzVisjeLige(cena, mejeVir, mejeCilj, ravni, eksponent) {
  const [sv, zv] = mejeVir
  const [sc, zc] = mejeCilj
  const delez = Math.min(1, Math.max(0, (Number(cena) - sv) / (zv - sv)))
  const q = Math.pow(delez, 1 / eksponent)
  const dvig = 1 - (1 - q) * Math.pow(1 - KORAK_RAVNI, Math.min(NAJVEC_RAVNI, ravni))
  return sc + Math.pow(dvig, eksponent) * (zc - sc)
}

/** Zadnji dve oznaki sezone (`2026/27`, `2025/26` ali `2026`, `2025`). */
export function zadnjiDveSezoni(oznake) {
  return [...new Set(oznake)].sort().reverse().slice(0, 2)
}
