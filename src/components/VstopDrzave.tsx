// Vstopna stran države (`slff.eu/at`, `/sk`, `/si` …): vse aktivne lige
// države po zvezah, vsaka z domačo stranjo in lestvico. Isto vsebino ima
// strežnik HTML (`drzava` v scripts/hetzner/html/streznik.mjs) za iskalnike;
// kanonični naslov je `/at`, zato stran ne sme preusmeriti.
//
// Ligo izbere obiskovalec s klikom: `/?t=…` v naslovu je izrecna izbira in
// se shrani kot vedno. Države si stran ne zapomni — Slovenec, ki iz iskalnika
// pristane na `/at`, sicer ostane v Avstriji za vedno.
//
// Kampanja (`?src=…` ali `utm_*`) ostane pri starem: zapomni si državo in
// takoj odpre privzeto ligo države. Stran se naloži znova namesto preusmeritve v usmerjevalniku:
// kontekst lige ob istem trenutku sam popravlja naslov in dve hkratni
// preusmeritvi sta pustili naslov na `/sk?t=…`.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from './Povezava'
import { useTekmovanje, type Tekmovanje } from '../lib/tekmovanje'
import { poZvezah } from './IzbirnikLige'
import { oznaciVstopDrzave } from './PrviObisk'
import { privzetaLiga, zapomniDrzavo } from '../lib/drzava'
import { useNaslov } from '../lib/naslov'
import { t } from '../i18n'

const jeKampanja = (iskanje: string) =>
  [...new URLSearchParams(iskanje).keys()].some((k) => k === 'src' || k.startsWith('utm_'))

/** Povezava, ki izbere ligo: privzeta liga ima `?t=` tu izrecno, sicer bi Link dodal trenutno. */
const vLigi = (pot: string, liga: Tekmovanje) => `${pot}?t=${encodeURIComponent(liga.slug)}`

export default function VstopDrzave({ drzava }: { drzava: string }) {
  const { vsaTekmovanja: tekmovanja, ligeSveze } = useTekmovanje()
  const { search } = useLocation()
  const kampanja = jeKampanja(search)
  const lige = tekmovanja.filter((l) => l.country_code === drzava)
  const ime = lige[0]?.country_name ?? null
  useNaslov(ime)

  useEffect(() => {
    // Dokler se lige ne naložijo, ne vemo, ali ima država kakšno ligo
    // (seznam iz shrambe je lahko star).
    if (!ligeSveze) return
    const imaLige = tekmovanja.some((l) => l.country_code === drzava)
    if (imaLige && !kampanja) return
    // Državo si zapomnimo le, če v njej kaj igramo — sicer bi obiskovalec
    // dobil jezik države, v kateri nima kaj videti.
    if (imaLige) zapomniDrzavo(drzava)
    // Liga v naslovu je tu le ugib (prva liga države), ne izbira — novinec
    // naj vseeno dobi vprašanje, kje želi igrati (PrviObisk).
    oznaciVstopDrzave()
    window.location.replace(imaLige ? `/?t=${privzetaLiga(tekmovanja, drzava)}` : '/')
  }, [tekmovanja, ligeSveze, drzava, kampanja])

  // Lige se še nalagajo ali pa stran takoj preusmeri (kampanja, država brez lig).
  if (!lige.length || kampanja) return <p className="animiraj-utrip text-slate-400">{t('skupno.nalaganje')}</p>

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black naslov sm:text-3xl">{ime}</h1>
        <p className="max-w-2xl text-sm text-slate-400">{t('aplikacija.vstopDrzave.uvod')}</p>
      </header>
      {poZvezah(lige).map((zveza) => (
        <section key={zveza.kljuc} className="space-y-2">
          <h2 className="text-lg font-bold text-slate-200">{zveza.naslov}</h2>
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5">
            {zveza.lige.map((l) => (
              <li key={l.slug} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link to={vLigi('/', l)} className="font-semibold text-slate-100 hover:text-gnl-300">
                  {l.name}
                </Link>
                <Link to={vLigi('/table', l)} className="shrink-0 text-sm text-gnl-300 underline">
                  {t('tekme.tabela.naslov')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
