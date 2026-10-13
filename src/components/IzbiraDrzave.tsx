// Izbira države: gumb "🇸🇮 Slovenija" s spustnim seznamom držav.
//
// Majhna in neopazna — v nogi in na strani računa. Ugib države (IP, jezik) se
// lahko zmoti; tu ga obiskovalec popravi sam. Preklop piše le v brskalnik
// (država, liga, jezik) in stran naloži na naslovnici nove države; ekip in
// ničesar na strežniku se ne dotakne.
//
// Pokaže le države z aktivnimi ligami; pri eni sami ni kaj izbirati. Ob
// imenu je število aktivnih lig, da se vidi, kje je kaj igrati.
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'
import { drzaveZLigami, preklopiDrzavo } from '../lib/drzava'
import Zastava from './Zastava'
import SpustniMeni, { type Moznost } from './SpustniMeni'
import { potrdiZapustitev } from '../lib/neshranjeno'
import { stevilo, t } from '../i18n'

/** Ime države v njenem jeziku (Slovenija, Slovensko); neznana ostane koda. */
export function imeDrzave(koda: string): string {
  if (koda === 'SI') return t('aplikacija.izbiraDrzave.imena.SI')
  if (koda === 'SK') return t('aplikacija.izbiraDrzave.imena.SK')
  if (koda === 'HR') return t('aplikacija.izbiraDrzave.imena.HR')
  if (koda === 'CZ') return t('aplikacija.izbiraDrzave.imena.CZ')
  if (koda === 'HU') return t('aplikacija.izbiraDrzave.imena.HU')
  if (koda === 'AT') return t('aplikacija.izbiraDrzave.imena.AT')
  if (koda === 'RS') return t('aplikacija.izbiraDrzave.imena.RS')
  if (koda === 'RO') return t('aplikacija.izbiraDrzave.imena.RO')
  if (koda === 'EE') return t('aplikacija.izbiraDrzave.imena.EE')
  if (koda === 'PL') return t('aplikacija.izbiraDrzave.imena.PL')
  if (koda === 'ES') return t('aplikacija.izbiraDrzave.imena.ES')
  if (koda === 'LV') return t('aplikacija.izbiraDrzave.imena.LV')
  if (koda === 'MK') return t('aplikacija.izbiraDrzave.imena.MK')
  return koda
}

/** Možnosti držav za `SpustniMeni`: zastava, ime in število aktivnih lig. */
export function moznostiDrzav(vse: readonly Tekmovanje[], izbrana: string): Moznost[] {
  const lig = new Map<string, number>()
  for (const l of vse) if (l.country_code) lig.set(l.country_code, (lig.get(l.country_code) ?? 0) + 1)
  return drzaveZLigami([...vse]).map((koda) => ({
    kljuc: koda,
    izbrana: koda === izbrana,
    oznaka: imeDrzave(koda),
    vsebina: (
      <>
        <Zastava koda={koda} className="h-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{imeDrzave(koda)}</span>
        <span aria-hidden="true" className="text-xs font-normal text-slate-500">
          {stevilo(lig.get(koda) ?? 0)}
        </span>
      </>
    ),
  }))
}

export default function IzbiraDrzave({
  className = '',
  navzgor = false,
}: {
  className?: string
  /** Seznam nad gumbom (noga strani). */
  navzgor?: boolean
}) {
  const { drzava, vsaTekmovanja } = useTekmovanje()
  const moznosti = moznostiDrzav(vsaTekmovanja, drzava)
  if (moznosti.length < 2) return null

  const preklopi = (koda: string) => {
    if (koda === drzava || !potrdiZapustitev()) return
    preklopiDrzavo(koda, vsaTekmovanja)
  }

  return (
    <SpustniMeni
      className={`text-xs ${className}`}
      navzgor={navzgor}
      oznakaGumba={t('aplikacija.izbiraDrzave.gumb', { drzava: imeDrzave(drzava) })}
      oznakaMenija={t('aplikacija.izbiraDrzave.oznaka')}
      gumb={
        <>
          <Zastava koda={drzava} className="h-3 shrink-0" />
          {imeDrzave(drzava)}
        </>
      }
      moznosti={moznosti}
      izberi={preklopi}
    />
  )
}
