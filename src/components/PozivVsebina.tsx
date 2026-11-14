// Okno poziva "vabilo", "aplikacija" ali "sledi" (izbere lib/pozivi.ts, odpre PivoOkno).
// Zapiranje poziv utiša za 60 dni (vabilo 3), klik na povezavo za leto (vabilo 7 dni).
import type { MutableRefObject } from 'react'
import { utisajPoziv, trgovinaTelefona, type Poziv } from '../lib/pozivi'
import { zabeleziKorak } from '../lib/lijak'
import { jeMladinskiSlug } from '../lib/prevzem'
import { useTekmovanje } from '../lib/tekmovanje'
import { Link } from './Povezava'
import { deliMojeVabilo } from '../lib/povabilo'
import { FACEBOOK } from './Facebook'
import { INSTAGRAM } from './Instagram'
import { t } from '../i18n'

type Lastnosti = {
  vrsta: Exclude<Poziv, 'pivo'>
  okno: MutableRefObject<HTMLDivElement | null>
  zapri: () => void
  odkloni: () => void
}

const GUMB =
  'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-base font-black shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

export default function PozivVsebina({ vrsta, okno, zapri, odkloni }: Lastnosti) {
  const { slug } = useTekmovanje()
  const trgovina = trgovinaTelefona()
  const ios = trgovina != null && !/play\.google/.test(trgovina)
  const maskota = jeMladinskiSlug(slug) ? 'spodbuda-mladi' : 'spodbuda'

  const kasneje = odkloni
  const klik = () => {
    utisajPoziv(vrsta, vrsta === 'vabilo' ? 7 : 365)
    zabeleziKorak(vrsta === 'vabilo' ? 'poziv_vabilo_klik' : vrsta === 'aplikacija' ? 'poziv_aplikacija_klik' : 'poziv_sledi_klik')
    zapri()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 pb-[max(1rem,var(--dno))] pt-[max(1rem,var(--vrh))] backdrop-blur"
      onClick={(e) => e.target === e.currentTarget && kasneje()}
    >
      <div
        ref={okno}
        role="dialog"
        aria-modal="true"
        aria-labelledby="poziv-naslov"
        tabIndex={-1}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gnl-400/30 bg-slate-900 p-5 text-center shadow-2xl outline-none"
      >
        <button
          onClick={kasneje}
          aria-label={t('aplikacija.poziv.kasneje')}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-xl text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden>✕</span>
        </button>
        <img src={`/logo/maskota/${maskota}.svg`} alt="" aria-hidden className="mx-auto -mt-2 h-40 w-40" />

        {vrsta === 'vabilo' ? (
          <>
            <h2 id="poziv-naslov" className="mt-2 text-xl font-black naslov">{t('aplikacija.poziv.vabilo.naslov')}</h2>
            <p className="mt-2 text-sm text-slate-300">{t('aplikacija.poziv.vabilo.besedilo')}</p>
            <button
              type="button"
              onClick={() => {
                klik()
                void deliMojeVabilo()
              }}
              className={`${GUMB} mt-4 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 hover:from-amber-200 hover:to-amber-400`}
            >
              <span aria-hidden>🍺</span>
              {t('aplikacija.poziv.vabilo.deli')}
            </button>
            <Link to="/invite" onClick={klik} className="mt-2 block text-sm font-semibold text-gnl-300 underline">
              {t('aplikacija.poziv.vabilo.vec')}
            </Link>
          </>
        ) : vrsta === 'aplikacija' ? (
          <>
            <h2 id="poziv-naslov" className="mt-2 text-xl font-black naslov">{t('aplikacija.poziv.aplikacija.naslov')}</h2>
            <p className="mt-2 text-sm text-slate-300">{t('aplikacija.poziv.aplikacija.besedilo')}</p>
            <a
              href={trgovina ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={klik}
              className={`${GUMB} mt-4 bg-gnl-500 text-slate-950 hover:bg-gnl-400`}
            >
              {ios ? t('aplikacija.poziv.aplikacija.appStore') : t('aplikacija.poziv.aplikacija.googlePlay')}
            </a>
          </>
        ) : (
          <>
            <h2 id="poziv-naslov" className="mt-2 text-xl font-black naslov">{t('aplikacija.poziv.sledi.naslov')}</h2>
            <p className="mt-2 text-sm text-slate-300">{t('aplikacija.poziv.sledi.besedilo')}</p>
            <div className="mt-4 space-y-2">
              <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" onClick={klik}
                className={`${GUMB} bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white`}>
                {t('aplikacija.poziv.sledi.instagram')}
              </a>
              <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" onClick={klik}
                className={`${GUMB} bg-[#1877F2] text-white`}>
                {t('aplikacija.poziv.sledi.facebook')}
              </a>
            </div>
          </>
        )}

        <button onClick={kasneje} className="mt-3 min-h-[44px] text-xs text-slate-400 underline hover:text-white">
          {t('aplikacija.poziv.kasneje')}
        </button>
      </div>
    </div>
  )
}
