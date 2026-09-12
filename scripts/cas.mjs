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
