import { useState } from 'react'
import { datum, t, type Kljuc } from '../besede'

// Brez zaledja: obrazec pripravi e-sporočilo za info@slff.eu (mailto).
const POLJA = ['oznaka', 'ime', 'naslov', 'eposta', 'izdelki', 'naroceno', 'prejeto'] as const
type Polje = (typeof POLJA)[number]
const OZNAKA: Record<Polje, Kljuc> = {
  oznaka: 'odstop.oznaka',
  ime: 'odstop.ime',
  naslov: 'odstop.naslovKupca',
  eposta: 'odstop.eposta',
  izdelki: 'odstop.izdelki',
  naroceno: 'odstop.naroceno',
  prejeto: 'odstop.prejeto',
}
const VRSTA: Partial<Record<Polje, string>> = { eposta: 'email', naroceno: 'date', prejeto: 'date' }

export function mailOdstopa(v: Record<Polje, string>, danes: string): string {
  const p = { ...v, datum: danes, naroceno: v.naroceno && datum(v.naroceno), prejeto: v.prejeto && datum(v.prejeto) }
  const zadeva = encodeURIComponent(t('odstop.zadeva', { oznaka: v.oznaka }))
  return `mailto:info@slff.eu?subject=${zadeva}&body=${encodeURIComponent(t('odstop.telo', p))}`
}

export function Odstop() {
  const [v, setV] = useState<Record<Polje, string>>(() => Object.fromEntries(POLJA.map((p) => [p, ''])) as Record<Polje, string>)

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-black naslov">{t('odstop.naslov')}</h1>
      <p className="leading-relaxed text-slate-300">{t('odstop.uvod')}</p>
      <form
        className="kartica space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          location.href = mailOdstopa(v, datum(new Date().toISOString()))
        }}
      >
        {POLJA.map((p) => (
          <label key={p} className="block text-sm text-slate-400">
            {t(OZNAKA[p])}
            {p === 'izdelki' || p === 'naslov' ? (
              <textarea required rows={p === 'izdelki' ? 3 : 2} value={v[p]} onChange={(e) => setV({ ...v, [p]: e.target.value })} className="polje mt-1 w-full" />
            ) : (
              <input type={VRSTA[p] ?? 'text'} required={p !== 'naroceno'} value={v[p]} onChange={(e) => setV({ ...v, [p]: e.target.value })} className="polje mt-1 w-full" />
            )}
          </label>
        ))}
        <button className="gumb-glavni w-full py-3">{t('odstop.poslji')}</button>
        <p className="text-xs leading-relaxed text-slate-500">{t('odstop.opomba')}</p>
      </form>
      <p className="text-sm leading-relaxed text-slate-400">{t('odstop.vrnitev')}</p>
      <div className="kartica space-y-2 p-5">
        <h2 className="font-bold">{t('odstop.vzorecNaslov')}</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{t('odstop.vzorec')}</p>
      </div>
    </div>
  )
}
