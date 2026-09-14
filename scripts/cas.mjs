// Slovenski čas brez zunanje knjižnice.
//
// Rok kroga se zapiše z odmikom UTC, ki velja NA DAN TEKME. Groba delitev po
// mesecu (april–oktober = poletje) se zmoti v marcu in oktobru, ko preklop
// pade sredi meseca — rok bi bil uro narazen in menjave bi se zaprle uro
// prezgodaj ali prepozno. Zato štejemo zadnjo nedeljo v mesecu, kakor je to
// od nekdaj počel `uvoz-delegiranja.mjs`.

/** Zadnja nedelja v mesecu (1–12). */
function zadnjaNedelja(leto, mesec) {
  const zadnji = new Date(Date.UTC(leto, mesec, 0)).getUTCDate()
  for (let d = zadnji; d > zadnji - 7; d--) {
    if (new Date(Date.UTC(leto, mesec - 1, d)).getUTCDay() === 0) return d
  }
  return zadnji
}

/**
 * Odmik UTC za Ljubljano: `+01:00` ali `+02:00`.
 *
 * Preklop se zgodi ob 02:00 po lokalnem casu, ne ob polnoci, zato je na DAN
 * preklopa odvisen tudi od ure. Brez `ura` privzamemo popoldne, ko je tekma;
 * to je pravilno za vse dnevne termine, zgresi pa nocne, ki jih v razporedu
 * ni. Kadar uro poznamo, jo podaj.
 */
export function offsetLjubljana(datumIso, ura = '12:00') {
  const [y, m, d] = datumIso.split('-').map(Number)
  if (m < 3 || m > 10) return '+01:00'
  if (m > 3 && m < 10) return '+02:00'
  const preklop = zadnjaNedelja(y, m)
  const h = Number(String(ura).split(':')[0])
  if (m === 3) {
    if (d > preklop) return '+02:00'
    if (d < preklop) return '+01:00'
    // Na dan preklopa: pred 02:00 se zimski cas.
    return h >= 2 ? '+02:00' : '+01:00'
  }
  if (d < preklop) return '+02:00'
  if (d > preklop) return '+01:00'
  // Jeseni ura pred 03:00 se tece po poletnem casu.
  return h < 3 ? '+02:00' : '+01:00'
}

/** Datum in ura v slovenskem času → ISO z odmikom. */
export function isoLjubljana(datumIso, uraHhmm) {
  return `${datumIso}T${uraHhmm}:00${offsetLjubljana(datumIso, uraHhmm)}`
}

/**
 * Teden po ISO 8601: `2026-W38`.
 *
 * Uporablja ga tedensko prevrednotenje kot ključ "ta igralec je bil ta teden
 * že prevrednoten". Teden je boljše merilo od časovnega žiga: ponovni zagon
 * v torek zvečer ali v sredo mora zadeti isti ključ, primerjava "manj kot
 * sedem dni nazaj" pa bi se z vsakim zagonom premikala naprej.
 *
 * ISO teden se začne v ponedeljek, prvi teden leta pa je tisti s prvim
 * četrtkom. Zato štejemo od četrtka tekočega tedna.
 */
export function isoTeden(datum = new Date()) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  // Nedelja je 0; ISO ima ponedeljek 1 in nedeljo 7.
  const dan = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dan) // četrtek tega tedna
  const leto = d.getUTCFullYear()
  const prviJanuar = new Date(Date.UTC(leto, 0, 1))
  const teden = Math.ceil(((d - prviJanuar) / 86400000 + 1) / 7)
  return `${leto}-W${String(teden).padStart(2, '0')}`
}
