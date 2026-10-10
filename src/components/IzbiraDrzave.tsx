// Izbira države: "🇸🇮 Slovenija · 🇸🇰 Slovensko".
//
// Majhna in neopazna — v nogi in v glavi izbirnika lige. Ugib države (IP,
// jezik) se lahko zmoti; tu ga obiskovalec popravi sam. Preklop piše le v
// brskalnik (država, liga, jezik) in stran naloži na naslovnici nove države;
// ekip in ničesar na strežniku se ne dotakne.
//
// Pokaže le države z aktivnimi ligami; pri eni sami ni kaj izbirati.
import { useTekmovanje } from '../lib/tekmovanje'
import { drzaveZLigami, preklopiDrzavo } from '../lib/drzava'
import Zastava from './Zastava'
import { potrdiZapustitev } from '../lib/neshranjeno'
import { t } from '../i18n'

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
  return koda
}

export default function IzbiraDrzave({ className = '' }: { className?: string }) {
  const { drzava, vsaTekmovanja } = useTekmovanje()
  const drzave = drzaveZLigami(vsaTekmovanja)
  if (drzave.length < 2) return null

  const preklopi = (koda: string) => {
    if (koda === drzava || !potrdiZapustitev()) return
    preklopiDrzavo(koda, vsaTekmovanja)
  }

  return (
    <nav aria-label={t('aplikacija.izbiraDrzave.oznaka')} className={`text-xs ${className}`}>
      {drzave.map((koda, i) => {
        const ime = imeDrzave(koda)
        const oznaka = (
          <>
            <Zastava koda={koda} className="h-3" /> {ime}
          </>
        )
        return (
          <span key={koda}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            {koda === drzava ? (
              <span aria-current="true" className="inline-flex items-center gap-1 px-1.5 font-semibold text-slate-200">
                {oznaka}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => preklopi(koda)}
                title={t('aplikacija.izbiraDrzave.preklopi', { drzava: ime })}
                className="inline-flex min-h-[44px] items-center gap-1 px-1.5 text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              >
                {oznaka}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
