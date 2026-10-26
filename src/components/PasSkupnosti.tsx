import { t, stevilo } from '../i18n'

/**
 * Izbira skupnosti za eno tekmo: delež napovedi za domače, remi in goste kot
 * vodoraven pas s številom napovedi. Podatke da `skupnost_napovedi_kroga`
 * (šele po roku kroga in od treh napovedi naprej).
 */
export default function PasSkupnosti({ n, doma, remi, gostje }: {
  n: number
  doma: number
  remi: number
  gostje: number
}) {
  if (n <= 0) return null
  const deli = [
    { kljuc: 'doma', ime: t('lestvice.napovediLige.doma'), stevec: doma, barva: 'bg-gnl-400' },
    { kljuc: 'remi', ime: t('lestvice.napovediLige.remi'), stevec: remi, barva: 'bg-slate-400' },
    { kljuc: 'gostje', ime: t('lestvice.napovediLige.gostje'), stevec: gostje, barva: 'bg-sky-400' },
  ]
  const odstotek = (x: number) => stevilo(x / n, { style: 'percent', maximumFractionDigits: 0 })
  const opis = deli.map((d) => `${d.ime} ${odstotek(d.stevec)}`).join(', ')
  return (
    <div className="space-y-1">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/5" role="img" aria-label={opis}>
        {deli.map((d) =>
          d.stevec > 0 ? (
            <span key={d.kljuc} className={d.barva} style={{ width: `${(d.stevec / n) * 100}%` }} />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 text-[11px] tabular-nums text-slate-400">
        {deli.map((d) => (
          <span key={d.kljuc} className="inline-flex items-center gap-1">
            <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${d.barva}`} />
            {d.ime} {odstotek(d.stevec)}
          </span>
        ))}
        <span className="text-slate-500">{t('lestvice.napovediLige.stevilo', { n })}</span>
      </div>
    </div>
  )
}
