// Predlog domene ob tipkarski napaki v e-naslovu ("gmail.con" → "gmail.com").
//
// Kdor se registrira z napačno domeno, potrditvenega sporočila nikoli ne
// dobi. Prijava zato pod poljem ponudi popravek z enim dotikom, oddaje pa ne
// ustavi: naslov je morda res pravilen.

/** Domene, ki jih predlagamo. Vrstni red odloči pri enaki razdalji. */
const PONUDNIKI = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'freemail.hu',
  'citromail.hu',
  'azet.sk',
  'centrum.sk',
  'seznam.cz',
  'siol.net',
  't-com.hr',
  'gmx.at',
  'web.de',
]

// Prave domene, ki so blizu kateri od zgornjih: zanje ni predloga.
const PRAVE = new Set([
  ...PONUDNIKI,
  'mail.com', 'email.com', 'ymail.com', 'gmx.de', 'gmx.net', 'gmx.com', 'gmx.ch', 'gmx.fr', 'gmx.es',
  'centrum.cz', 'freemail.de', 'hotmail.de', 'hotmail.it', 'hotmail.fr', 'hotmail.es',
  'outlook.de', 'outlook.it', 'outlook.fr', 'outlook.es', 'yahoo.de', 'yahoo.it', 'yahoo.fr', 'yahoo.es',
  'live.com', 'msn.com', 'me.com', 'mac.com', 'googlemail.com', 'email.cz', 'post.cz', 'post.sk',
])

/** Razdalja med nizoma: vstavljanje, brisanje, zamenjava in zamenjava sosednjih črk. */
function razdalja(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

/**
 * Popravljen e-naslov, če je domena verjetno tipkarska napaka znanega
 * ponudnika, sicer `null`. Kratke domene (do 7 znakov) dovolijo eno napako,
 * daljše dve.
 */
export function predlogEposte(eposta: string): string | null {
  const s = eposta.trim()
  const afna = s.lastIndexOf('@')
  if (afna < 1) return null
  const domena = s.slice(afna + 1).toLowerCase().replace(/\.+$/, '')
  if (!domena || PRAVE.has(domena)) return null
  let najboljsa: string | null = null
  let najmanj = Infinity
  for (const p of PONUDNIKI) {
    const r = razdalja(domena, p)
    if (r < najmanj && r <= (p.length <= 7 ? 1 : 2)) {
      najboljsa = p
      najmanj = r
    }
  }
  return najboljsa ? `${s.slice(0, afna)}@${najboljsa}` : null
}
