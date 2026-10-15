// Je igralec z istim imenom pri drugem klubu ista oseba (prestop) ali
// soimenjak?
//
// Vir brez šifre igralca (stari CMS MNZ, NZS, fsb, fss, fssid …) pozna le ime
// in klub. Uvoz je istoimenskega igralca drugega kluba v isti ligi imel vedno
// za prestop — tudi kadar sta igrala hkrati. Petrović Lazar (rs-srpska-istok,
// oktober 2026) je bil tako en igralec: vratar Morave 1918 in igralec v polju
// Malošišta v krogih 1–3, vsak krog dve tekmi, klub pa je skakal sem in tja z
// vsako uvoženo tekmo. Točke obeh so šle lastnikom enega.
//
// Prestop je mogoč le, če je skladen s časom:
//   * oseba ne igra za dva kluba na isti dan ali v istem krogu (isti krog
//     velja, kadar sta tekmi največ DNI_KROGA narazen — prestavljena tekma
//     tedne pozneje je lahko že za novi klub),
//   * za novi klub: vsi dosedanji nastopi so pred tem,
//   * za klub, ki ga ima že v zgodovini (vrnitev s posoje, ponoven uvoz
//     starejše tekme): nastop ne pade v obdobje drugega kluba.
// Dvom pomeni nov zapis. Dvojnika nočni `zdruzi-duplikate` združi (njegovi
// časovnici se ne prekrivata in nimata trka), zlitje pa pokvari točke in ga
// razdeli šele `razdeli-zlite-igralce.mjs` (SQL `razdeli_zlitega_igralca`
// uporablja isto merilo trka).

/** Tekmi istega kroga, ki sta največ toliko dni narazen, sta isti krog za igralca. */
export const DNI_KROGA = 6

const dni = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000

/** Primerja čas dveh nastopov: po datumu, kjer ga imata oba, sicer po sezoni in krogu. */
export function primerjajCas(a, b) {
  if (a.datum && b.datum) return a.datum === b.datum ? 0 : a.datum < b.datum ? -1 : 1
  const s = String(a.sezona ?? '').localeCompare(String(b.sezona ?? ''))
  if (s) return s
  return Number(a.krog ?? 0) - Number(b.krog ?? 0)
}

/**
 * Nastopa za dva različna kluba, ki ju ena oseba ne more imeti: isti dan, ali
 * isti krog iste sezone, največ DNI_KROGA narazen (ali brez datuma).
 */
export function trk(a, b) {
  if (a.klub === b.klub) return false
  if (a.datum && b.datum && a.datum === b.datum) return true
  if (a.sezona == null || String(a.sezona) !== String(b.sezona)) return false
  if (Number(a.krog) !== Number(b.krog)) return false
  return !(a.datum && b.datum) || dni(a.datum, b.datum) <= DNI_KROGA
}

/**
 * @typedef {{klub: number, tekma?: number|null, sezona?: string|null, krog?: number|null, datum?: string|null}} Nastop
 * @param {Nastop[]} nastopi dosedanji nastopi obstoječega igralca (vsi klubi)
 * @param {Nastop} nov nastop, ki ga uvažamo
 * @returns {{skladen: boolean, razlog: string|null}}
 */
export function prestopSkladen(nastopi, nov) {
  // Ponoven uvoz iste tekme: njen stari nastop ni dokaz ne za ne proti.
  const ostali = nastopi.filter((n) => nov.tekma == null || n.tekma !== nov.tekma)
  const drugje = ostali.filter((n) => n.klub !== nov.klub)
  if (!drugje.length) return { skladen: true, razlog: null }

  const t = drugje.find((n) => trk(n, nov))
  if (t) return { skladen: false, razlog: `isti krog ali dan za klub ${t.klub} (${t.datum ?? `krog ${t.krog}`})` }

  const svoji = ostali.filter((n) => n.klub === nov.klub)
  if (!svoji.length) {
    const pozneje = drugje.find((n) => primerjajCas(n, nov) >= 0)
    if (pozneje)
      return { skladen: false, razlog: `nastop za klub ${pozneje.klub} (${pozneje.datum ?? `krog ${pozneje.krog}`}) ni pred tem` }
    return { skladen: true, razlog: null }
  }

  const klubi = new Map()
  for (const n of drugje) klubi.set(n.klub, [...(klubi.get(n.klub) ?? []), n])
  for (const [klub, vrste] of klubi) {
    const urejeni = [...vrste].sort(primerjajCas)
    if (primerjajCas(urejeni[0], nov) <= 0 && primerjajCas(nov, urejeni[urejeni.length - 1]) <= 0)
      return { skladen: false, razlog: `nastop pade v obdobje kluba ${klub}` }
  }
  return { skladen: true, razlog: null }
}

/**
 * Sta dva zapisa istega imena lahko ista oseba? Ne, če imata trk (isti dan ali
 * isti krog) — za `zdruzi-duplikate`, da ne zlije, kar je razdelil
 * `razdeli-zlite-igralce`.
 * @param {Nastop[]} a
 * @param {Nastop[]} b
 */
export function imataTrk(a, b) {
  return a.some((x) => b.some((y) => trk(x, y)))
}

/**
 * Vir, pri katerem šifra osebe pride šele pozneje (fmf: zapisniki prvih krogov
 * je nimajo), igralca najprej vpiše brez šifre (klub + ime). Ko ga zapisnik
 * pokaže s šifro, ki je v ligi še ni, je to isti človek — če je pri tem klubu
 * z istim imenom natanko en zapis brez šifre in na tej tekmi še ni zaseden.
 * Dva ali več pomeni soimenjake: ne ugibamo.
 *
 * @param {{ id: number, reg_st?: string|null }[] | null} vrstice zapisi kluba z istim imenom
 * @param {Set<number> | null} zasedeni igralci, ki so na tej tekmi že porabljeni
 */
export function posvojiBrezSifre(vrstice, zasedeni) {
  const brez = (vrstice ?? []).filter((x) => x.reg_st == null)
  if (brez.length !== 1) return null
  return zasedeni?.has(brez[0].id) ? null : brez[0]
}
