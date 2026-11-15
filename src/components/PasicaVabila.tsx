// Pasica akcije vabil pod navigacijo (do 30. 11. 2026): kratek poziv, gumb
// "Povabi" (sistemski list z osebno kodo) in povezava na /invite. Zapiranje jo
// utiša za 3 dni (le na napravi). Ne za neprijavljene, ne v mladinski ligi
// (nagrada je pivo) in ne na straneh, kjer bi motila.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from './Povezava'
import { useAuth } from '../lib/useAuth'
import { useTekmovanje } from '../lib/tekmovanje'
import { jeMladinskiSlug } from '../lib/prevzem'
import { akcijaVabilTece } from '../lib/akcijaVabil'
import { deliMojeVabilo } from '../lib/povabilo'
import { zabeleziKorak } from '../lib/lijak'
import { t } from '../i18n'

const KLJUC = 'slff-pasica-vabila-do'
const BREZ = ['/invite', '/i/', '/login', '/admin', '/auth', '/legal', '/novo-geslo', '/new-password', '/claim']

function utisana(): boolean {
  try {
    return Number(localStorage.getItem(KLJUC) ?? 0) > Date.now()
  } catch {
    return false
  }
}

export default function PasicaVabila() {
  const { session } = useAuth()
  const { slug } = useTekmovanje()
  const { pathname } = useLocation()
  const [skrita, setSkrita] = useState(utisana)

  const vidna = Boolean(session) && !skrita && akcijaVabilTece() && !jeMladinskiSlug(slug) && !BREZ.some((p) => pathname.startsWith(p))
  useEffect(() => {
    if (vidna) zabeleziKorak('pasica_vabila')
  }, [vidna])
  if (!vidna) return null

  const skrij = () => {
    try {
      localStorage.setItem(KLJUC, String(Date.now() + 3 * 24 * 60 * 60 * 1000))
    } catch {
      /* zasebno okno: skrita do osvežitve */
    }
    zabeleziKorak('pasica_vabila_zaprta')
    setSkrita(true)
  }

  return (
    <div className="border-b border-amber-300/20 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 text-sm">
        <span aria-hidden className="text-lg">🍺</span>
        <Link to="/invite" className="min-w-0 flex-1 font-semibold text-amber-100 hover:text-white" onClick={() => zabeleziKorak('pasica_vabila_klik')}>
          {t('aplikacija.akcijaVabil.pasica')}
        </Link>
        <button
          type="button"
          onClick={() => {
            zabeleziKorak('pasica_vabila_klik')
            void deliMojeVabilo()
          }}
          className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-300"
        >
          {t('aplikacija.akcijaVabil.povabi')}
        </button>
        <button
          type="button"
          onClick={skrij}
          aria-label={t('aplikacija.akcijaVabil.skrij')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden>✕</span>
        </button>
      </div>
    </div>
  )
}
