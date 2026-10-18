import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import grb from '../../../public/logo/slff-grb.png'
import { t } from '../besede'
import { izprazni } from '../kosarica'
import { useSeja } from '../seja'

/** Stripe se po plačilu vrne sem (?n=<javna oznaka>); košarica se izprazni, država ostane. */
export function Hvala() {
  const [q] = useSearchParams()
  const oznaka = (q.get('n') ?? '').replace(/[^A-Z0-9]/gi, '').slice(0, 16)
  const { seja } = useSeja()

  useEffect(izprazni, [])

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <img src={grb} alt="" className="mx-auto h-20 w-20" />
      <h1 className="text-3xl font-black naslov sm:text-4xl">{t('hvala.naslov')}</h1>
      {oznaka && (
        <div className="kartica inline-block px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('hvala.oznaka')}</p>
          <p className="font-mono text-2xl font-black tracking-widest text-gnl-300">{oznaka}</p>
        </div>
      )}
      <p className="leading-relaxed text-slate-300">{t('hvala.opis')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {seja && <Link to="/orders" className="gumb-tih">{t('hvala.narocila')}</Link>}
        <Link to="/" className="gumb-glavni">{t('hvala.nazaj')}</Link>
      </div>
    </div>
  )
}
