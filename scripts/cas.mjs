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

/** Odmik UTC za Ljubljano na dani dan: `+01:00` ali `+02:00`. */
export function offsetLjubljana(datumIso) {
  const [y, m, d] = datumIso.split('-').map(Number)
  if (m < 3 || m > 10) return '+01:00'
  if (m > 3 && m < 10) return '+02:00'
  const preklop = zadnjaNedelja(y, m)
  if (m === 3) return d >= preklop ? '+02:00' : '+01:00'
  return d < preklop ? '+02:00' : '+01:00'
}

/** Datum in ura v slovenskem času → ISO z odmikom. */
export function isoLjubljana(datumIso, uraHhmm) {
  return `${datumIso}T${uraHhmm}:00${offsetLjubljana(datumIso)}`
}
