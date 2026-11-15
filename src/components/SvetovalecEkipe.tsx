// Svetovalec ekipe pod igriščem Moje ekipe: šibka mesta, do tri prestope in
// najboljša postava s kapetanom. Samo predlaga — ekipe ne spreminja in je ne
// shrani; podatke in odločitve pripravi `lib/svetovalecEkipe.ts`, tu je le izris.
import { prikazniIme, formatirajCeno } from '../lib/pomozno'
import type { Svetovanje, IgralecZaSvetovalca, RazlogPrestopa } from '../lib/svetovalecEkipe'
import { Link } from './Povezava'
import { t, stevilo } from '../i18n'

const ime = (polno: string | null | undefined) => prikazniIme(polno) || t('mojaEkipa.igralec')

const klub = (i: IgralecZaSvetovalca & { team_short?: string | null; team_name?: string | null }) =>
  i.team_short ?? i.team_name ?? ''

const dec = (n: number) => stevilo(n, { maximumFractionDigits: 1 })

function BesediloRazloga({
  razlog,
  stari,
  novi,
  imenaKlubov,
}: {
  razlog: RazlogPrestopa
  stari: string
  novi: string
  imenaKlubov: Record<number, string>
}) {
  const kljuc = `mojaEkipa.svetovalec.prestopRazlog.${razlog.vrsta}` as const
  const nasprotniki = razlog.nasprotniki.map((id) => imenaKlubov[id]).filter(Boolean).join(', ')
  return (
    <>
      {t(kljuc, {
        stari,
        novi,
        razlog: razlog.sibkost ? t(`mojaEkipa.svetovalec.razlog.${razlog.sibkost}`) : '',
        formaNovi: dec(razlog.formaNovi),
        formaStari: dec(razlog.formaStari),
        minuteNovi: razlog.minuteNovi,
        minuteStari: razlog.minuteStari,
        nasprotniki,
        prihranek: formatirajCeno(Math.abs(razlog.prihranek)),
      })}
    </>
  )
}

export type DostopZaIzpis = 'zaklenjen' | 'odprt'

export default function SvetovalecEkipe<T extends IgralecZaSvetovalca & { team_short?: string | null; team_name?: string | null }>({
  dostop,
  krog,
  svetovanje,
  imenaKlubov,
}: {
  dostop: DostopZaIzpis
  krog: number | null
  svetovanje: Svetovanje<T> | null
  imenaKlubov: Record<number, string>
}) {
  if (dostop === 'zaklenjen')
    return (
      <section className="border-t border-white/10 pt-3 text-sm">
        <p className="text-slate-300">
          {t('mojaEkipa.svetovalec.zaklenjeno')}{' '}
          <Link to="/verified" className="font-semibold text-sky-300 underline hover:text-sky-200">
            {t('mojaEkipa.svetovalec.zaklenjenoPoveza')}
          </Link>
        </p>
      </section>
    )
  if (!svetovanje) return null
  const { sibkosti, prestopi, postava } = svetovanje
  return (
    <section className="border-t border-white/10 pt-3 text-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-sky-200">{t('mojaEkipa.svetovalec.naslov')}</h2>
      <p className="mt-0.5 text-xs text-slate-400">
        {krog != null ? t('mojaEkipa.svetovalec.zaKrog', { krog }) : t('mojaEkipa.svetovalec.opomba')}
      </p>

      <h3 className="mt-3 text-xs font-semibold text-slate-400">{t('mojaEkipa.svetovalec.sibkosti')}</h3>
      {sibkosti.length === 0 ? (
        <p className="mt-1 text-slate-300">{t('mojaEkipa.svetovalec.brezSibkosti')}</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {sibkosti.map(({ igralec, razlog }) => (
            <li key={igralec.id} className="znacka bg-amber-500/15 text-amber-200">
              {ime(igralec.full_name)} · {t(`mojaEkipa.svetovalec.razlog.${razlog}`)}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-3 text-xs font-semibold text-slate-400">{t('mojaEkipa.svetovalec.prestopi')}</h3>
      {prestopi.length === 0 ? (
        <p className="mt-1 text-slate-300">{t('mojaEkipa.svetovalec.brezPrestopov')}</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {prestopi.map((p) => (
            <li key={`${p.stari.id}-${p.novi.id}`}>
              <span className="text-slate-400">{ime(p.stari.full_name)}</span>
              <span aria-hidden className="text-gnl-300"> → </span>
              <span className="font-semibold text-slate-100">{ime(p.novi.full_name)}</span>{' '}
              <span className="text-xs text-slate-500">
                {klub(p.novi)} · {formatirajCeno(p.novi.value)}
              </span>
              <p className="text-xs text-slate-300">
                <BesediloRazloga
                  razlog={p.razlog}
                  stari={ime(p.stari.full_name)}
                  novi={ime(p.novi.full_name)}
                  imenaKlubov={imenaKlubov}
                />
              </p>
            </li>
          ))}
        </ul>
      )}

      {postava && (
        <>
          <h3 className="mt-3 text-xs font-semibold text-slate-400">
            {t('mojaEkipa.svetovalec.postava', { formacija: postava.formacija })}
          </h3>
          <p className="mt-1 text-slate-200">{postava.prvi.map((i) => ime(i.full_name)).join(', ')}</p>
          <p className="mt-1 text-slate-300">
            {t('mojaEkipa.svetovalec.kapetan', { ime: ime(postava.kapetan.full_name) })}
            {postava.namestnik && ` · ${t('mojaEkipa.svetovalec.namestnik', { ime: ime(postava.namestnik.full_name) })}`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {postava.enakoKotSedaj
              ? t('mojaEkipa.svetovalec.enakoKotSedaj')
              : postava.noter.length + postava.ven.length === 0
                ? t('mojaEkipa.svetovalec.samoTrak')
                : t('mojaEkipa.svetovalec.spremembe', {
                    noter: postava.noter.map((i) => ime(i.full_name)).join(', '),
                    ven: postava.ven.map((i) => ime(i.full_name)).join(', '),
                  })}
          </p>
        </>
      )}

      <p className="mt-3 text-xs text-slate-500">{t('mojaEkipa.svetovalec.opomba')}</p>
    </section>
  )
}
