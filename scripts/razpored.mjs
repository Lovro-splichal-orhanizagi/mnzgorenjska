// Razčlenitev razporeda: iz zaporedja besedila v kroge in tekme.
//
// Ločeno od uvoza, ker je edini del, ki se med viri obnaša različno, in ker
// ga je tako mogoče preveriti brez omrežja (`npm run smoke`).

/** "29.08.26" in "29.08.2026" → "2026-08-29" */
export function datum(slovenski) {
  const m = slovenski.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (!m) return null
  const [, d, mes, l] = m
  const leto = l.length === 2 ? 2000 + Number(l) : Number(l)
  return `${leto}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Sezona iz datuma prvega kroga: avgust 2026 → "2026/27". */
export function sezonaIz(datumIso) {
  const [leto, mesec] = datumIso.split('-').map(Number)
  const zacetek = mesec >= 7 ? leto : leto - 1
  return `${zacetek}/${String((zacetek + 1) % 100).padStart(2, '0')}`
}

// Ime kluba ima vedno vsaj eno črko. Rezultat ("8 : 1(5 : 0)") je nima — brez
// tega bi vsak že odigran krog dobil še enkrat toliko izmišljenih tekem.
const jeIme = (s) => /[a-zžčšđćA-ZŽČŠĐĆ]/.test(s)

// Konec razporeda. Pod njim stran nadaljuje z odigranimi rezultati — najprej
// te lige, nato DRUGE (pri Kranju so pod mladinci člani, pri Ljubljani pod
// 1. ligo druga). Brez tega konca pristanejo v bazi kot dodatni krogi te lige.
//
// Kranj piše "REZULTATI", Ljubljana "REZULTATI TEKEM"; primerjava z enakostjo
// je zato Ljubljani spustila skozi cel blok druge lige. Naslov je izpisan z
// velikimi črkami — enako ime v meniju ("Rezultati") pustimo pri miru.
const KONEC = /^REZULTATI\b/

/**
 * @param {string[]} vrstice besedilo strani, vrstica za vrstico
 * @returns {{stevilka:number, tekme:{domaci:string,gostje:string,datum:string|null,kontumacija?:boolean,odigrana:boolean}[]}[]}
 */
export function razcleniRazpored(vrstice) {
  const krogi = []
  let tekoci = null
  let zadnjiDatum = null

  for (const v of vrstice) {
    if (KONEC.test(v.trim()) && krogi.length) break

    const mKrog = v.match(/^(\d{1,2})\.\s*krog/i)
    if (mKrog) {
      tekoci = { stevilka: Number(mKrog[1]), tekme: [] }
      krogi.push(tekoci)
      zadnjiDatum = datum(v)
      continue
    }
    if (!tekoci) continue

    const mDatum = v.match(/^(\d{1,2}\.\d{1,2}\.\d{2,4})$/)
    if (mDatum) {
      zadnjiDatum = datum(mDatum[1])
      continue
    }

    // Izid pod tekmo. Odigrana ima polčas ("8 : 1(5 : 0)"), kontumacija ga
    // nima ("3 : 0()") — zapisnika zanjo ne bo in borza nanjo ne sme čakati.
    // Celje namesto praznih oklepajev piše "po uradni dolžnosti":
    // "0 :3(u.d.)" (1801, 1. krog Šmarje pri Jelšah : Žalec) — zapisnik te
    // tekme je prazen, brez sodnika in postav.
    const mIzid = v.trim().match(/^(\d+)\s*:\s*(\d+)\s*\(\s*(?:u\.\s*d\.)?\s*\)$/i)
    if (mIzid && tekoci.tekme.length) {
      tekoci.tekme.at(-1).kontumacija = true
      tekoci.tekme.at(-1).odigrana = true
      continue
    }
    // Izid odigrane tekme ("8 : 1(5 : 0)", tudi brez polčasa). Tekma brez
    // njega pri viru še ni odigrana — zveza jo lahko prestavi, ne da bi ji
    // dala nov datum (Bled Bohinj : Sava Kranj, mladinci 4. 10. 2026), in
    // preverba je ne sme javljati kot zamujen uvoz.
    // Presledek ob dvopičju loči izid od ure ("17:30").
    if (/^\d+(?:\s+:\s*|\s*:\s+)\d+\s*(?:\([^)]*\))?$/.test(v.trim()) && tekoci.tekme.length) {
      tekoci.tekme.at(-1).odigrana = true
      continue
    }

    // "Eltron Preddvor : Tržič 2012" (lahko z datumom na začetku iste vrstice)
    const mTekma = v.match(/^(?:\d{1,2}\.\d{1,2}\.\d{2,4}\s+)?(.+?)\s+:\s+(.+?)$/)
    if (mTekma && jeIme(mTekma[1]) && jeIme(mTekma[2])) {
      tekoci.tekme.push({
        domaci: mTekma[1].trim(),
        gostje: mTekma[2].trim(),
        datum: datum(v) ?? zadnjiDatum,
        odigrana: false,
      })
    }
  }

  return krogi.filter((k) => k.tekme.length)
}

/**
 * Katera minula tekma je pri viru brez izida.
 *
 * Zveza tekmo lahko prestavi, ne da bi ji dala nov datum (Bled Bohinj : Sava
 * Kranj, mladinci 4. 10. 2026; Infostyle Šmartno : Svoboda, lj-mladinci
 * 5. 9.): vrstica ostane pri starem datumu brez zapisnika in preverba bi jo
 * javljala vsak dan do konca sezone. Uvoz razporeda jo zato označi
 * (`matches.vir_brez_izida`), preverba pa javi le tekmo, ki ima pri viru
 * izid, pri nas pa zapisnika ne.
 *
 * Razčlenjevalnik, ki izid pozna, tekmi doda `odigrana`. Vir brez tega
 * podatka (Ptuj, Maribor, NZS …) da `null` — preverba zanj dela kot doslej.
 * Razpored, v katerem ni odigrana NOBENA od vsaj treh minulih tekem, je
 * skoraj gotovo razčlenjevalnik, ki izida ne najde več (zveza je spremenila
 * stran): tudi tedaj `null`, sicer bi preverba utihnila prav ob pokvarjenem
 * uvozu.
 *
 * @param {{tekme:{datum:string|null, odigrana?:boolean}[]}[]} krogi
 * @param {string} danes 'YYYY-MM-DD'
 * @returns {{ brezIzida: (t: {datum:string|null, odigrana?:boolean}) => boolean|null, pokvarjen: boolean }}
 */
export function oznakaBrezIzida(krogi, danes) {
  const tekme = krogi.flatMap((k) => k.tekme)
  const minule = tekme.filter((t) => t.datum && t.datum < danes)
  const vePove = tekme.some((t) => typeof t.odigrana === 'boolean')
  const pokvarjen = vePove && minule.length >= 3 && !minule.some((t) => t.odigrana)
  const brezIzida = (t) =>
    !vePove || pokvarjen || typeof t.odigrana !== 'boolean' ? null : !t.odigrana && !!t.datum && t.datum < danes
  return { brezIzida, pokvarjen }
}
