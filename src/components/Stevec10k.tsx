// Števec uporabnikov na naslovnici: pot do 10.000 (`stevec_uporabnikov`).
// Ob 10.000 se prelevi v praznovanje; cilj se nato dvigne na naslednjih 10.000.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t, stevilo } from '../i18n'

const KORAK = 10_000

export default function Stevec10k() {
  const [n, setN] = useState<number | null>(null)
  const [prikaz, setPrikaz] = useState(0)

  useEffect(() => {
    let velja = true
    void Promise.resolve(supabase.rpc('stevec_uporabnikov')).then(({ data }) => {
      if (velja && typeof data === 'number') setN(data)
    })
    return () => {
      velja = false
    }
  }, [])

  // Število se nažene od 0 do prave vrednosti (brez animacije, če jo obiskovalec izklopi).
  useEffect(() => {
    if (n == null) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setPrikaz(n)
    const zacetek = performance.now()
    let okvir = 0
    const korak = (cas: number) => {
      const d = Math.min(1, (cas - zacetek) / 1400)
      setPrikaz(Math.round(n * (1 - Math.pow(1 - d, 3))))
      if (d < 1) okvir = requestAnimationFrame(korak)
    }
    okvir = requestAnimationFrame(korak)
    return () => cancelAnimationFrame(okvir)
  }, [n])

  if (n == null || n <= 0) return null
  const dosezeno = n >= KORAK
  const cilj = dosezeno ? Math.ceil((n + 1) / KORAK) * KORAK : KORAK
  const delez = Math.min(100, (n / cilj) * 100)

  return (
    <section aria-label={t('domov.stevec.naslov')} className="kartica space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gnl-300">
            {dosezeno ? `🎉 ${t('domov.stevec.dosezeno')}` : t('domov.stevec.naslov')}
          </p>
          <p className="text-3xl font-black tabular-nums text-white sm:text-4xl">
            {stevilo(prikaz)}
            <span className="text-lg font-bold text-slate-400 sm:text-xl"> / {stevilo(cilj)}</span>
          </p>
        </div>
        <p className="text-sm text-slate-300">{t('domov.stevec.opis', { n: stevilo(Math.max(0, cilj - n)) })}</p>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={cilj}
        aria-valuenow={n}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gnl-500 to-gnl-300 transition-[width] duration-1000"
          style={{ width: `${delez}%` }}
        />
      </div>
    </section>
  )
}
