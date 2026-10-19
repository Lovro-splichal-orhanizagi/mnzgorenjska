import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { opisPersonalizacije, supabase, type Narocilo } from '../baza'
import { cena, datum, t } from '../besede'
import { Nalaganje, useSeja } from '../seja'

const BARVA: Record<Narocilo['stanje'], string> = {
  placano: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
  v_izdelavi: 'bg-sky-400/15 text-sky-200 ring-sky-400/30',
  poslano: 'bg-gnl-400/15 text-gnl-300 ring-gnl-400/30',
  dostavljeno: 'bg-emerald-400/20 text-emerald-200 ring-emerald-400/40',
  preklicano: 'bg-slate-400/15 text-slate-300 ring-slate-400/30',
  vrnjeno: 'bg-slate-400/15 text-slate-300 ring-slate-400/30',
}

export function Narocila() {
  const { seja, nalaga } = useSeja()
  const [narocila, setNarocila] = useState<Narocilo[] | null>(null)
  const [napaka, setNapaka] = useState(false)
  const uid = seja?.user.id

  useEffect(() => {
    if (!uid) return
    void supabase.rpc('trgovina_moja_narocila').then(({ data, error }) => {
      setNapaka(Boolean(error))
      setNarocila(error ? [] : ((data as unknown as Narocilo[] | null) ?? []))
    })
  }, [uid])

  if (nalaga) return <Nalaganje />
  if (!seja) return <Navigate to="/login" replace />
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-black naslov">{t('narocila.naslov')}</h1>
      <div aria-live="polite">{napaka && <p className="opozorilo">{t('napaka.nalaganje')}</p>}</div>
      {narocila === null ? <Nalaganje /> : !napaka && narocila.length === 0 ? (
        <p className="kartica p-5 text-slate-400">{t('narocila.prazno')}</p>
      ) : (
        <ul className="space-y-4">
          {narocila.map((n) => (
            <li key={n.id} className="kartica space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-lg font-black tracking-widest">{n.javna_oznaka}</p>
                <span className={`znacka ring-1 ${BARVA[n.stanje]}`}>{t(`narocila.stanje.${n.stanje}`)}</span>
              </div>
              <p className="text-sm text-slate-400">
                {t('narocila.naroceno', { datum: datum(n.placano_at ?? n.created_at) })}
                {n.poslano_at && ` · ${t('narocila.poslano', { datum: datum(n.poslano_at) })}`}
              </p>
              {n.sledilna && <p className="text-sm text-slate-300">{t('narocila.sledilna', { st: n.sledilna })}</p>}
              <ul className="divide-y divide-white/5 text-sm">
                {n.postavke.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-1.5">
                    <span className="text-slate-300">
                      {p.kolicina} × {p.ime}
                      {p.personalizacija && <span className="block text-xs font-semibold uppercase text-gnl-200">{opisPersonalizacije(p.personalizacija)}</span>}
                    </span>
                    <span className="tabular-nums">{cena((p.cena + p.doplacilo) * p.kolicina)}</span>
                  </li>
                ))}
                {n.znesek_dostava !== null && (
                  <li className="flex justify-between gap-3 py-1.5 text-slate-400">
                    <span>{t('narocila.postnina')}</span>
                    <span className="tabular-nums">{cena(n.znesek_dostava)}</span>
                  </li>
                )}
              </ul>
              {n.znesek_skupaj !== null && (
                <p className="flex justify-between border-t border-white/10 pt-2 font-bold">
                  <span>{t('narocila.skupaj')}</span>
                  <span className="tabular-nums">{cena(n.znesek_skupaj)}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
