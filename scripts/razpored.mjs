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
 * @returns {{stevilka:number, tekme:{domaci:string,gostje:string,datum:string|null}[]}[]}
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

    // "Eltron Preddvor : Tržič 2012" (lahko z datumom na začetku iste vrstice)
    const mTekma = v.match(/^(?:\d{1,2}\.\d{1,2}\.\d{2,4}\s+)?(.+?)\s+:\s+(.+?)$/)
    if (mTekma && jeIme(mTekma[1]) && jeIme(mTekma[2])) {
      tekoci.tekme.push({
        domaci: mTekma[1].trim(),
        gostje: mTekma[2].trim(),
        datum: datum(v) ?? zadnjiDatum,
      })
    }
  }

  return krogi.filter((k) => k.tekme.length)
}
