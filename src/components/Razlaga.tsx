// "Zakaj toliko?" — razlaga točk in cene igralca na mestu, kjer jih vidiš.
//
// Okno je domači <dialog>: Escape, fokus in plast nad vsem (tudi nad hitrim
// vpogledom v Moji ekipi) uredi brskalnik.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatirajCeno, formatirajPremik, formatirajTocke } from '../lib/pomozno'
import type { Postavka } from '../lib/tipi'
import { t } from '../i18n'

/** Kar okno točk potrebuje — `Razlaga` iz `lib/razlagaTock` ali `razloziTocke`. */
export interface PodatkiRazlage {
  postavke: Postavka[]
  skupaj: number
  brezPozicije?: boolean
  pravila?: number | null
}

function Okno({ naslov, naZapri, children }: { naslov: string; naZapri: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
  }, [])
  return (
    <dialog
      ref={ref}
      onClose={naZapri}
      // Klik na ozadje (sam <dialog>, ne vsebina) zapre okno.
      onClick={(e) => e.target === e.currentTarget && naZapri()}
      className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-slate-950 p-0 text-left text-slate-100 shadow-2xl backdrop:bg-slate-950/70"
    >
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-black">{naslov}</h3>
          <button
            onClick={naZapri}
            aria-label={t('tekme.razlaga.zapri')}
            className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-sm font-semibold hover:bg-white/15"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

/** Postavke točk z vsoto in opombami (pozicija, stara pravila, asistence). */
export function SeznamPostavk({ razlaga }: { razlaga: PodatkiRazlage }) {
  const { postavke, skupaj, brezPozicije, pravila } = razlaga
  if (postavke.length === 0)
    return <p className="text-xs text-slate-500">{t('igralci.profil.niIgralnegaCasa')}</p>
  return (
    <div className="space-y-2 text-xs">
      <ul className="space-y-1">
        {postavke.map((p, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-slate-400">{p.opis}</span>
            <span className={`font-bold tabular-nums ${p.tocke > 0 ? 'text-gnl-300' : 'text-rose-400'}`}>
              {p.tocke > 0 ? '+' : ''}
              {formatirajTocke(p.tocke)}
            </span>
          </li>
        ))}
        <li className="mt-1 flex justify-between gap-3 border-t border-white/10 pt-1 text-slate-300">
          <span className="font-semibold">{t('igralci.profil.skupaj')}</span>
          <span className="font-black tabular-nums">{formatirajTocke(skupaj)}</span>
        </li>
      </ul>
      {brezPozicije && <p className="text-amber-300">{t('tekme.razlaga.brezPozicije')}</p>}
      {pravila === 1 && <p className="text-slate-500">{t('tekme.razlaga.pravila1')}</p>}
      <p className="text-slate-500">{t('tekme.razlaga.asistence')}</p>
    </div>
  )
}

/** Gumb (vsebina so točke), ki odpre razlago točk. */
export function RazlagaTock({
  razlaga,
  naslov,
  className,
  children,
}: {
  razlaga: PodatkiRazlage
  naslov: string
  className?: string
  children: ReactNode
}) {
  const [odprto, setOdprto] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOdprto(true)}
        aria-label={t('tekme.razlaga.zakaj', { tocke: formatirajTocke(razlaga.skupaj) })}
        className={className}
      >
        {children}
      </button>
      {odprto && (
        <Okno naslov={naslov} naZapri={() => setOdprto(false)}>
          <SeznamPostavk razlaga={razlaga} />
        </Okno>
      )}
    </>
  )
}

/** "Zakaj ta cena?" — trenutna in izhodiščna cena ter pravila borze. */
export function RazlagaCene({ cena, izhodisce }: { cena: number | null; izhodisce: number | null }) {
  const [odprto, setOdprto] = useState(false)
  const premik = cena != null && izhodisce != null ? Math.round((cena - izhodisce) * 10) / 10 : 0
  return (
    <>
      <button
        type="button"
        onClick={() => setOdprto(true)}
        className="text-xs text-slate-400 underline decoration-dotted underline-offset-2 hover:text-white"
      >
        {t('tekme.razlaga.cena.zakaj')}
      </button>
      {odprto && (
        <Okno naslov={t('tekme.razlaga.cena.zakaj')} naZapri={() => setOdprto(false)}>
          <div className="space-y-2 text-xs text-slate-400">
            <ul className="space-y-1">
              <li className="flex justify-between gap-3">
                <span>{t('tekme.razlaga.cena.zdaj')}</span>
                <strong className="tabular-nums text-slate-100">{formatirajCeno(cena)}</strong>
              </li>
              {izhodisce != null && (
                <li className="flex justify-between gap-3">
                  <span>{t('tekme.razlaga.cena.izhodisce')}</span>
                  <span className="tabular-nums text-slate-200">
                    {formatirajCeno(izhodisce)}
                    {premik !== 0 && (
                      <span className={`ml-1.5 ${premik > 0 ? 'text-gnl-300' : 'text-rose-400'}`}>
                        {premik > 0 ? '▲' : '▼'} {formatirajPremik(premik)}
                      </span>
                    )}
                  </span>
                </li>
              )}
            </ul>
            <p>{t('tekme.razlaga.cena.izhodisceOpis')}</p>
            {/* 4.5 je privzeta cena; drugače je cena pač izračunana. */}
            {izhodisce === 4.5 && (
              <p className="text-amber-300">
                {t('tekme.razlaga.cena.privzeta', { cena: formatirajCeno(4.5), minut: 270 })}
              </p>
            )}
            <p>
              {t('tekme.razlaga.cena.borza', {
                korak: formatirajPremik(0.1),
                najvec: formatirajPremik(1),
              })}
            </p>
            <p>
              {t('tekme.razlaga.cena.razpon', { od: formatirajCeno(4), do: formatirajCeno(14) })}
            </p>
          </div>
        </Okno>
      )}
    </>
  )
}
