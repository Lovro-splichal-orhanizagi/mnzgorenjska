// Vstop s povezave `slff.eu/sk` (ali `/si`): država, ki jo je obiskovalec
// izbral sam s klikom na povezavo za svojo državo.
//
// Zapomni si državo in, če ima ta aktivne lige, odpre njeno privzeto ligo —
// tudi kadar je imel shranjeno ligo iz druge države: povezava je izrecna
// namera. Liga gre v naslov (`/?t=…`), ker ga kontekst lige razume kot
// izrecno izbiro.
//
// Stran se naloži znova namesto preusmeritve v usmerjevalniku: kontekst lige
// ob istem trenutku sam popravlja naslov (nov obiskovalec dobi ligo svoje
// države) in dve hkratni preusmeritvi sta pustili naslov na `/sk?t=…`. En
// ponoven nalog ob vstopu s kampanje ni cena.
import { useEffect } from 'react'
import { useTekmovanje } from '../lib/tekmovanje'
import { privzetaLiga, zapomniDrzavo } from '../lib/drzava'

export default function VstopDrzave({ drzava }: { drzava: string }) {
  const { vsaTekmovanja: tekmovanja } = useTekmovanje()

  useEffect(() => {
    // Dokler se lige ne naložijo, ne vemo, ali ima država kakšno ligo.
    if (!tekmovanja.length) return
    const imaLige = tekmovanja.some((t) => t.country_code === drzava)
    // Državo si zapomnimo le, če v njej kaj igramo — sicer bi obiskovalec
    // dobil jezik države, v kateri nima kaj videti.
    if (imaLige) zapomniDrzavo(drzava)
    window.location.replace(imaLige ? `/?t=${privzetaLiga(tekmovanja, drzava)}` : '/')
  }, [tekmovanja, drzava])

  return null
}
