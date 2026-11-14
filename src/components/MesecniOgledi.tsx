// Mesečna statistika profila (SLF-373): koliko ljudi je odprlo profil
// preverjenega igralca, po mesecih in viru. Le števila — kdo je gledal, baza
// ne hrani. Vidi jo le preverjen lastnik (`mesecni_ogledi_profila`); kdor
// ne sme, dobi prazno in panela ni.
import { useEffect, useState } from 'react'
import { t, datum, stevilo } from '../i18n'
import { mesecniOgledi, type MesecOgledov } from '../lib/ogledi'

const skupaj = (m: MesecOgledov) => m.igra + m.gost + m.povezava

export default function MesecniOgledi({ igralecId }: { igralecId: number }) {
  const [meseci, setMeseci] = useState<MesecOgledov[]>([])

  useEffect(() => {
    let velja = true
    void mesecniOgledi(igralecId).then((v) => velja && setMeseci(v))
    return () => {
      velja = false
    }
  }, [igralecId])

  if (!meseci.length) return null
  const [ta, prejsnji] = meseci
  const razlika = prejsnji ? skupaj(ta) - skupaj(prejsnji) : null
  const imeMeseca = (m: string) => datum(m, { month: 'long', year: 'numeric' })

  return (
    <section aria-labelledby="mesecni-ogledi" className="kartica space-y-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="mesecni-ogledi" className="text-sm font-bold uppercase tracking-wide text-slate-300">
          {t('igralci.mesecniOgledi.naslov')}
        </h2>
        <span className="text-xs text-slate-400">{imeMeseca(ta.mesec)}</span>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p>
          <span className="block text-4xl font-black text-white">{stevilo(skupaj(ta))}</span>
          <span className="text-sm text-slate-300">{t('igralci.mesecniOgledi.taMesec')}</span>
        </p>
        {razlika !== null && (
          <p className="pb-1 text-sm text-slate-300">
            {razlika === 0
              ? t('igralci.mesecniOgledi.enako')
              : t('igralci.mesecniOgledi.razlika', { n: `${razlika > 0 ? '+' : '−'}${stevilo(Math.abs(razlika))}` })}
          </p>
        )}
        <p className="pb-1 text-sm text-slate-300">
          {t('igralci.mesecniOgledi.skavti', { n: stevilo(ta.scout) })}
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-400">
              <th scope="col" className="py-2 pr-3 font-semibold">{t('igralci.mesecniOgledi.mesec')}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t('igralci.mesecniOgledi.igra')}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t('igralci.mesecniOgledi.gost')}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t('igralci.mesecniOgledi.povezava')}</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">{t('igralci.mesecniOgledi.scout')}</th>
              <th scope="col" className="py-2 text-right font-semibold">{t('igralci.mesecniOgledi.skupaj')}</th>
            </tr>
          </thead>
          <tbody>
            {meseci.map((m) => (
              <tr key={m.mesec} className="border-b border-white/5 last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal text-slate-300">{imeMeseca(m.mesec)}</th>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-200">{stevilo(m.igra)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-200">{stevilo(m.gost)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-200">{stevilo(m.povezava)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-slate-200">{stevilo(m.scout)}</td>
                <td className="py-2 text-right font-bold tabular-nums text-white">{stevilo(skupaj(m))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">{t('igralci.mesecniOgledi.zasebnost')}</p>
    </section>
  )
}
