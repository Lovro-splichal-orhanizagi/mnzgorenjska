// Gibanje cene igralca skozi sezono.
//
// `price_changes` hrani samo KROGE, v katerih se je cena premaknila. Med njimi
// cena ni neznana, ampak nespremenjena — zato je za crto treba vmesne kroge
// dopolniti, sicer bi trije zapisi izgledali kot tri zaporedne spremembe, pa
// naj bo med njima pet mirnih krogov ali noben.

export interface SpremembaCene {
  krog: number
  nova: number
}

export interface TockaCene {
  krog: number
  cena: number
}

/**
 * Cena po krogih, od izhodiscne naprej. Krog 0 je cena ob postavitvi lige
 * (`players.value_start`), ki ni rezultat nobenega kroga.
 */
export function serijaCen(
  zacetna: number,
  spremembe: SpremembaCene[],
  doKroga: number,
): TockaCene[] {
  const poKrogu = new Map(spremembe.map((s) => [s.krog, s.nova]))
  // Ce je borza tekla dlje od zadnjega odigranega kroga, naj crta pokaze tudi
  // to — podatek je, ne napaka.
  const zadnji = Math.max(doKroga, ...spremembe.map((s) => s.krog), 0)
  const tocke: TockaCene[] = [{ krog: 0, cena: zacetna }]
  let cena = zacetna
  for (let k = 1; k <= zadnji; k++) {
    cena = poKrogu.get(k) ?? cena
    tocke.push({ krog: k, cena })
  }
  return tocke
}

/** Razlika med zadnjo in izhodiscno ceno. */
export function premik(serija: TockaCene[]): number {
  if (serija.length === 0) return 0
  return serija[serija.length - 1].cena - serija[0].cena
}

/**
 * Pot za SVG crto. Navpicno raztegne na razpon SERIJE, ne na razpon cenika:
  * premik za 0.3 je pri igralcu za 4.5 velika novica in bi se ob fiksni
 * lestvici od 0 do 15 zlil v ravno crto.
 */
export function crta(serija: TockaCene[], sirina = 120, visina = 28): string {
  if (serija.length < 2) return ''
  const cene = serija.map((t) => t.cena)
  const naj = Math.max(...cene)
  const naj_manj = Math.min(...cene)
  const razpon = naj - naj_manj || 1
  return serija
    .map((t, i) => {
      const x = (i / (serija.length - 1)) * sirina
      const y = visina - ((t.cena - naj_manj) / razpon) * visina
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/** Zadnjih nekaj premikov, od najnovejsega — za izpis pod crto. */
export function zadnjiPremiki(
  spremembe: SpremembaCene[],
  zacetna: number,
  koliko = 3,
): Array<{ krog: number; iz: number; v: number }> {
  const urejene = [...spremembe].sort((a, b) => a.krog - b.krog)
  const izpis: Array<{ krog: number; iz: number; v: number }> = []
  let prej = zacetna
  for (const s of urejene) {
    izpis.push({ krog: s.krog, iz: prej, v: s.nova })
    prej = s.nova
  }
  return izpis.reverse().slice(0, koliko)
}
