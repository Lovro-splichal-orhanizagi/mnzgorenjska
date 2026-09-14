// Kako pri danem viru priti do zapisnikov.
//
// Uvoz je doslej predpostavljal kranjsko obliko: seznam tekem, iz njega
// `zapisnik=<id>`, nato ena stran na tekmo. Od Ptuja naprej to ne drži —
// Ptuj, Murska Sobota in Lendava imajo **eno stran na krog** z vsemi
// tekmami, Nova Gorica in Maribor pa svoje oblike naslovov.
//
// Zato uvoz ne pozna več oblike vira: vpraša vir, ta pa vrne razčlenjene
// zapisnike. Vsak nov vir doda svojo funkcijo tu in ničesar v uvozu.

/** Šifra lige, varna za ime datoteke (vsebuje `:` in `/`). */
export const sifra = (koda) => String(koda).replace(/[^\w-]/g, '_')

/** Koliko zaporednih praznih krogov pomeni, da smo prišli do konca. */
const DOVOLJ_PRAZNIH = 3

/**
 * Prenesi zapisnik in ga razčleni; če iz predpomnilnika ne da ničesar,
 * poskusi še enkrat s svežo stranjo.
 *
 * Zakaj: zapisnik se objavi ŠELE nekaj ur po tekmi, uvoz pa ob koncu tedna
 * teče vsako uro. Prvi zagon po tekmi zato prenese stran BREZ postav — in ta
 * prazna stran obleži v predpomnilniku, ki se med zagoni obnavlja. Vsak
 * naslednji zagon jo prebere iz predpomnilnika, znova ne najde postav in
 * tekma ostane brez statistike ZA VEDNO, čeprav je zapisnik medtem objavljen.
 *
 * Tako so obviseli štirje krogi 1. SNL in še dvanajst tekem drugod. Uvoz ni
 * javil ničesar: z njegovega vidika stran pač ni bila zapisnik.
 *
 * Prazna stran je poceni; drugi prenos velja samo zanje.
 */
async function zapisnikSvez(vir, prenesi, url, ime, meta) {
  const izPredpomnilnika = await prenesi(url, ime)
  const z = vir.parsirajZapisnik(izPredpomnilnika, meta)
  if (z) return z
  const svez = await prenesi(url, ime, true)
  return vir.parsirajZapisnik(svez, meta)
}

/** Kranj, Ljubljana, Celje: seznam tekem → `zapisnik=<id>` → stran na tekmo. */
export async function izSeznamaTekem(vir, koda, prenesi) {
  // Cachebuster: vmesni predpomnilnik je že vračal star seznam brez
  // najnovejših tekem, čeprav je bil lokalni prepisan.
  const seznam = await prenesi(
    vir.naslovSeznamaTekem(koda) + `&_=${Date.now()}`,
    `liga-${koda}.html`,
    true,
  )
  const ids = [...new Set([...seznam.matchAll(/zapisnik=(\d+)/g)].map((m) => m[1]))]
  ids.sort((a, b) => Number(a) - Number(b))

  const out = []
  for (const id of ids) {
    const url = vir.naslovZapisnika(koda, id)
    // Ime v predpomnilniku mora nositi tudi LIGO. Naslov zapisnika vsebuje
    // `liga=`, prej pa se je shranil kot `<id>.html` — dve ligi iste zveze sta
    // si tako povozili stran. Pri 3. SNL Zahod se je zgodilo: arhiv 1703 in
    // 1603 tece drug za drugim v istem zagonu, zato je druga sezona dobila
    // postavo iz prve, invarianta `gol-brez-nastopa` pa je to ujela.
    const z = await zapisnikSvez(vir, prenesi, url, `${sifra(koda)}-${id}.html`, {
      zapisnikId: id, url,
    })
    if (z) out.push({ id, z, url })
  }
  return out
}

/**
 * Ptuj, Murska Sobota, Lendava: ena stran na krog z vsemi tekmami.
 *
 * Koliko krogov je, stran ne pove, zato štejemo navzgor in se ustavimo po
 * nekaj zaporednih praznih. Prazen krog sredi sezone je običajen (prestavljene
 * tekme), zato ena sama praznina ne sme ustaviti uvoza.
 */
export async function poKrogih(vir, koda, prenesi, { najvecKrogov = 40 } = {}) {
  const out = []
  let prazni = 0
  for (let krog = 1; krog <= najvecKrogov && prazni < DOVOLJ_PRAZNIH; krog++) {
    const url = vir.naslovKroga(koda, krog)
    let html
    try {
      html = await prenesi(url, `${vir.ime}-${koda.replace(/[^\w-]/g, '_')}-k${krog}.html`, krog > 1)
    } catch {
      prazni++
      continue
    }
    const zapisniki = vir.zapisnikiIzKroga(html, { vir: vir.ime, krog })
    if (!zapisniki.length) {
      prazni++
      continue
    }
    prazni = 0
    for (const z of zapisniki) out.push({ id: z.zapisnikId ?? `${koda}-k${krog}-${out.length}`, z, url })
  }
  return out
}

/** Nova Gorica in Maribor: seznam tekem da povezave, nato stran na tekmo. */
export async function izPovezav(vir, koda, prenesi) {
  const seznam = await prenesi(vir.naslovSeznamaTekem(koda), `${vir.ime}-${koda}-tekme.html`, true)
  const povezave = vir.povezaveZapisnikov(seznam)
  const out = []
  for (const p of povezave) {
    const url = vir.naslovZapisnika(koda, p.id, p.krog)
    let z
    try {
      z = await zapisnikSvez(vir, prenesi, url, `${vir.ime}-${sifra(koda)}-${p.id}.html`, {
        zapisnikId: String(p.id), url,
      })
    } catch {
      continue
    }
    if (z) out.push({ id: String(p.id), z, url })
  }
  return out
}
