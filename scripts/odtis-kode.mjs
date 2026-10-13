// Odtis kode, ki je razčlenila zapisnik ene lige.
//
// Nočni uvoz preskoči nespremenjen zapisnik, ki ga je prebrala ista koda
// (uvoz-zapisnikov.mjs, odtisi). Prej je odtis zajel VSE datoteke v
// scripts/viri/: vsak popravek kateregakoli vira (12. 10. 2026 jih je bilo več
// na dan) je razveljavil odtise vseh lig vseh držav in naslednji nočni uvoz je
// znova uvozil vse zapisnike zadnjih 21 dni. Zdaj odtis zajame skupne datoteke
// uvoza in le vir lige z datotekami, ki jih ta vir uvaža (rekurzivno).
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

/** Lokalni uvozi ('./…', '../…') v besedilu modula. */
export function lokalniUvozi(besedilo) {
  const poti = new Set()
  for (const m of besedilo.matchAll(/(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g))
    poti.add(m[1] ?? m[2])
  return [...poti]
}

/** Datoteka in vse lokalne datoteke, ki jih (posredno) uvaža; urejeno. */
export function zaprtje(zacetna, beri = (p) => readFileSync(p, 'utf8'), obstaja = existsSync) {
  const videne = new Set()
  const vrsta = [normalize(zacetna)]
  while (vrsta.length) {
    const pot = vrsta.pop()
    if (videne.has(pot) || !obstaja(pot)) continue
    videne.add(pot)
    if (!/\.(m?js|ts)$/.test(pot)) continue
    for (const u of lokalniUvozi(beri(pot))) vrsta.push(normalize(join(dirname(pot), u)))
  }
  return [...videne].sort()
}
