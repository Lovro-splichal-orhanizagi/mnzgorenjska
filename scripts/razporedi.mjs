// Razčlenitev razporeda pri virih, ki niso na starem CMS-u.
//
// `razpored.mjs` bere obliko "N. krog", datum v svoji vrstici in tekmo kot
// "Domači : Gostje" — tako pišejo Kranj, Ljubljana in Celje. Ostalih pet
// zvez piše vsaka po svoje in nobena ne uporabi dvopičja kot ločila med
// ekipama, zato jim prejšnji razčlenjevalnik vrne NIČ krogov in uvoz se
// ustavi. To se je pokazalo šele v produkciji, ko je arhiv že pretekel.
//
// Vsi vrnejo isto obliko kot `razcleniRazpored`, da uvoz ne loči med njimi:
//   [{ stevilka, tekme: [{ domaci, gostje, datum, ura }] }]
//
// `ura` je novost — te strani jo dajo že v razporedu. Stari CMS je zanjo
// terjal posebno delegacijsko stran, ki je te zveze nimajo.
import { datum } from './razpored.mjs'
import { offsetLjubljana } from './cas.mjs'

// Ime kluba ima črko; izid ("3:0", "-:-") in ura je nimata.
const jeIme = (s) => /[a-zžčšđćA-ZŽČŠĐĆ]/.test(s) && !/^\d{1,2}[.:]\d{2}$/.test(s)
const jeDatum = (s) => /^\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}\.?$/.test(s.trim())
const jeUra = (s) => /^\d{1,2}[.:]\d{2}$/.test(s.trim())
// Ura prihodnje tekme pogosto se ni znana: Nova Gorica napise "TBD", Lendava
// vrstice sploh ne izpise. Ura je zato NEOBVEZNA — brez tega se razpored
// prebere le do danasnjega dne in polovica sezone manjka.
const jeUraAliPrazno = (s) => jeUra(s) || /^(TBD|-|--|:)$/i.test((s ?? '').trim())
const uraIz = (s) => {
  const m = s.match(/(\d{1,2})[.:](\d{2})/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}
// "20. 8. 2026" -> "20.8.2026", da ga `datum()` prebere.
const datumIz = (s) => datum(s.replace(/\s+/g, ''))

/** Krog se začne z "N. krog"; naslov lahko nosi tudi datum. */
const krogIz = (v) => {
  const m = v.match(/^(\d{1,2})\.\s*krog/i)
  return m ? Number(m[1]) : null
}

/**
 * Splošno ogrodje: hodi po vrsticah, ob naslovu kroga odpre nov krog,
 * `vzemi` pa iz okna vrstic pobere eno tekmo in pove, koliko jih je použil.
 *
 * @param {string[]} vrstice
 * @param {(okno: string[]) => {tekma?: object, porabljeno: number}} vzemi
 */
function poKrogih(vrstice, vzemi) {
  const krogi = []
  let tekoci = null
  for (let i = 0; i < vrstice.length; i++) {
    const st = krogIz(vrstice[i])
    if (st !== null) {
      // Ista številka dvakrat pomeni stranski kazalnik (Maribor ima seznam
      // krogov v stolpcu ob vsebini); drugič ga ne odpremo znova.
      tekoci = krogi.find((k) => k.stevilka === st)
      if (!tekoci) { tekoci = { stevilka: st, tekme: [] }; krogi.push(tekoci) }
      continue
    }
    if (!tekoci) continue
    // Okno se NE sme raztezati čez naslov naslednjega kroga. Pri Mariboru je
    // iskanje imena gostov teklo, dokler ni naletelo na besedo — in "2. krog"
    // je beseda. Naslov bi tako postal ime ekipe, hkrati pa bi ga `porabljeno`
    // preskočilo in vse nadaljnje tekme bi pristale v prejšnjem krogu.
    let konec = i + 8
    for (let k = i + 1; k < konec && k < vrstice.length; k++) {
      if (krogIz(vrstice[k]) !== null) { konec = k; break }
    }
    const { tekma, porabljeno } = vzemi(vrstice.slice(i, konec))
    if (tekma) { tekoci.tekme.push(tekma); i += porabljeno - 1 }
  }
  return krogi.filter((k) => k.tekme.length)
}

/**
 * MNZ Ptuj — `tekmovanja?…&podatek=program`.
 * [kraj, "DD.MM.YY ob HH.MM", domači, gostje]
 */
export function razporedPtuj(vrstice) {
  return poKrogih(vrstice, (o) => {
    const m = o[1]?.match(/^(\d{1,2}\.\d{1,2}\.\d{2,4})\s+ob\s+(\d{1,2}[.:]\d{2})/)
    if (!m || !jeIme(o[2] ?? '') || !jeIme(o[3] ?? '')) return { porabljeno: 0 }
    return {
      tekma: { domaci: o[2].trim(), gostje: o[3].trim(), datum: datum(m[1]), ura: uraIz(m[2]) },
      porabljeno: 4,
    }
  })
}

/**
 * MNZ Murska Sobota — `arhiv?…&podatek=program`.
 * [domači, ura, gostje, "DD.MM.YY | kraj"]
 */
export function razporedMurskaSobota(vrstice) {
  return poKrogih(vrstice, (o) => {
    if (!jeIme(o[0] ?? '') || !jeUra(o[1] ?? '') || !jeIme(o[2] ?? '')) return { porabljeno: 0 }
    const m = o[3]?.match(/^(\d{1,2}\.\d{1,2}\.\d{2,4})\s*\|/)
    if (!m) return { porabljeno: 0 }
    return {
      tekma: { domaci: o[0].trim(), gostje: o[2].trim(), datum: datum(m[1]), ura: uraIz(o[1]) },
      porabljeno: 4,
    }
  })
}

/**
 * MNZ Nova Gorica — `/tekmovanja/<id>/razpored` (ne `/rezultati`, ki da le
 * odigrane kroge). [datum, ura, domači, gostje, izid, stanje, kraj]
 */
export function razporedNovaGorica(vrstice) {
  return poKrogih(vrstice, (o) => {
    if (!jeDatum(o[0] ?? '') || !jeUraAliPrazno(o[1] ?? '')) return { porabljeno: 0 }
    if (!jeIme(o[2] ?? '') || !jeIme(o[3] ?? '')) return { porabljeno: 0 }
    return {
      tekma: { domaci: o[2].trim(), gostje: o[3].trim(), datum: datumIz(o[0]), ura: uraIz(o[1]) },
      porabljeno: 4,
    }
  })
}

/**
 * MNZ Lendava — `/sezona-<s>/<slug>/razpored`.
 * [datum, ura, "Domači : Gostje"]; datum je pisan s presledki ("20. 8. 2026").
 */
export function razporedLendava(vrstice) {
  return poKrogih(vrstice, (o) => {
    if (!jeDatum(o[0] ?? '')) return { porabljeno: 0 }
    const zUro = jeUra(o[1] ?? '')
    const vrstica = zUro ? o[2] : o[1]
    const m = vrstica?.match(/^(.+?)\s+:\s+(.+?)$/)
    if (!m || !jeIme(m[1]) || !jeIme(m[2])) return { porabljeno: 0 }
    return {
      tekma: {
        domaci: m[1].trim(), gostje: m[2].trim(),
        datum: datumIz(o[0]), ura: zUro ? uraIz(o[1]) : null,
      },
      porabljeno: zUro ? 3 : 2,
    }
  })
}

/**
 * MNZ Maribor — `/tekmovanje/<slug>/tekme`.
 * [par krajev, datum, ura, domači, izid, "(polčas)", gostje]; neodigrana
 * tekma izida nima, zato je dolžina skupine različna.
 */
export function razporedMaribor(vrstice) {
  return poKrogih(vrstice, (o) => {
    if (!jeDatum(o[1] ?? '') || !jeUra(o[2] ?? '') || !jeIme(o[3] ?? '')) return { porabljeno: 0 }
    // Za domačimi pride izid ("5 : 1") in polčas ("(2 : 0)"), oboje brez črk.
    let i = 4
    while (i < o.length && o[i] !== undefined && !jeIme(o[i])) i++
    if (i >= o.length || !jeIme(o[i])) return { porabljeno: 0 }
    return {
      tekma: { domaci: o[3].trim(), gostje: o[i].trim(), datum: datum(o[1]), ura: uraIz(o[2]) },
      porabljeno: i + 1,
    }
  })
}

/** Razčlenjevalnik razporeda po viru; vir brez vnosa uporabi starega. */
export const RAZPOREDI = {
  mnzpt: razporedPtuj,
  mnzms: razporedMurskaSobota,
  mnzng: razporedNovaGorica,
  mnzle: razporedLendava,
  mnzmb: razporedMaribor,
}

// Rok, kadar ure prve tekme ne poznamo.
const URA_ROKA = 10

/**
 * Rok kroga: `pomakUr` pred prvo tekmo, kadar uro poznamo.
 *
 * Delegacijsko stran, ki pove uro, ima samo stari CMS. Ostalih pet zvez je
 * nima, dajo pa uro že v razporedu — brez tega bi vsem krogom obstal rok ob
 * 10h, tudi za tekme ob 17.30, in menjave bi se zapirale sedem ur prezgodaj.
 *
 * Poletje je +02:00, zima +01:00; enako je računala delegacijska skripta.
 */
export function rokKroga(datumKroga, ura, pomakUr) {
  if (!datumKroga) return null
  const odmik = offsetLjubljana(datumKroga, ura ?? '12:00')
  if (!ura) return `${datumKroga}T${String(URA_ROKA).padStart(2, '0')}:00:00${odmik}`
  const zacetek = new Date(`${datumKroga}T${ura}:00${odmik}`)
  return new Date(zacetek.getTime() - pomakUr * 3600000).toISOString()
}
