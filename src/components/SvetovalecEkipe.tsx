// Svetovalec ekipe pod igriščem Moje ekipe. Na vrhu odgovor: do tri kartice
// prestopov z gumbom Zamenjaj; pod njimi zložena najboljša postava na igrišču
// in šibka mesta, združena po razlogu. Samo predlaga — gumbi spremenijo le
// osnutek, shrani ga uporabnik sam; podatke in odločitve pripravi
// `lib/svetovalecEkipe.ts`, tu je le izris.
import type { ReactNode } from 'react'
import { prikazniIme, formatirajCeno } from '../lib/pomozno'
import type {
  Svetovanje,
  IgralecZaSvetovalca,
  RazlogPrestopa,
  Prestop,
  RazlogSibkostiSvetovalca,
  SibkoMestoSvetovalca,
} from '../lib/svetovalecEkipe'
import { Link } from './Povezava'
import EnajstericaNaIgriscu from './EnajstericaNaIgriscu'
import { t, stevilo } from '../i18n'

type IgralecIzpisa = IgralecZaSvetovalca & {
  team_short?: string | null
  team_name?: string | null
  team_logo?: string | null
}

const ime = (polno: string | null | undefined) => prikazniIme(polno) || t('mojaEkipa.igralec')

const klub = (i: IgralecIzpisa) => i.team_short ?? i.team_name ?? ''

const dec = (n: number) => stevilo(n, { maximumFractionDigits: 1 })

/** Vrstni red skupin šibkih mest: najprej tisti, ki gotovo ne bodo igrali. */
const SKUPINE: RazlogSibkostiSvetovalca[] = ['neaktiven', 'poskodba', 'odsotnost', 'brezTekme', 'malMinut', 'slabaForma']

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

/** Zložljiv razdelek z naslovom in kratkim povzetkom desno. */
function Zlozeno({ naslov, povzetek, children }: { naslov: string; povzetek?: ReactNode; children: ReactNode }) {
  return (
    <details className="group/z border-t border-white/10">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 text-xs [&::-webkit-details-marker]:hidden">
        <span className="shrink-0 font-semibold text-slate-200">{naslov}</span>
        {povzetek && <span className="min-w-0 flex-1 truncate text-slate-400">{povzetek}</span>}
        <span aria-hidden className="ml-auto text-slate-400 transition group-open/z:rotate-180">
          ▾
        </span>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  )
}

function KarticaPrestopa<T extends IgralecIzpisa>({
  prestop: p,
  imenaKlubov,
  naZamenjaj,
}: {
  prestop: Prestop<T>
  imenaKlubov: Record<number, string>
  naZamenjaj?: (stari: T, novi: T) => void
}) {
  return (
    <li className="flex flex-col rounded-xl border border-white/10 bg-slate-900/60 p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-300">{t('mojaEkipa.svetovalec.ven')}</p>
          <p className="truncate text-slate-300">{ime(p.stari.full_name)}</p>
          <p className="truncate text-xs text-slate-500">
            {klub(p.stari)} · {formatirajCeno(p.stari.value)}
          </p>
        </div>
        <span aria-hidden className="text-lg text-gnl-300">
          →
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gnl-300">{t('mojaEkipa.svetovalec.noter')}</p>
          <p className="truncate font-semibold text-slate-50">{ime(p.novi.full_name)}</p>
          <p className="truncate text-xs text-slate-400">
            {klub(p.novi)} · {formatirajCeno(p.novi.value)}
          </p>
        </div>
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-xs">
        <strong className="tabular-nums text-gnl-300">
          {t('mojaEkipa.svetovalec.dobitek', { tocke: dec(p.dobitek) })}
        </strong>
        <span className="tabular-nums text-slate-400">
          {t('mojaEkipa.svetovalec.forma', { stari: dec(p.razlog.formaStari), novi: dec(p.razlog.formaNovi) })}
        </span>
      </p>
      <p className="mt-1 flex-1 text-xs leading-snug text-slate-400">
        <BesediloRazloga
          razlog={p.razlog}
          stari={ime(p.stari.full_name)}
          novi={ime(p.novi.full_name)}
          imenaKlubov={imenaKlubov}
        />
      </p>
      {naZamenjaj && (
        <button
          type="button"
          onClick={() => naZamenjaj(p.stari, p.novi)}
          className="mt-3 rounded-lg bg-gnl-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-gnl-400"
        >
          {t('mojaEkipa.svetovalec.zamenjaj')}
        </button>
      )}
    </li>
  )
}

function SibkaMesta<T extends IgralecIzpisa>({ sibkosti }: { sibkosti: SibkoMestoSvetovalca<T>[] }) {
  const skupine = SKUPINE.map((r) => [r, sibkosti.filter((s) => s.razlog === r)] as const).filter(
    ([, s]) => s.length > 0,
  )
  return (
    <ul className="space-y-1.5 text-xs">
      {skupine.map(([razlog, s]) => (
        <li key={razlog} className="flex gap-2">
          <span
            className={`w-28 shrink-0 font-semibold ${
              razlog === 'neaktiven' || razlog === 'poskodba' ? 'text-rose-300' : 'text-amber-200'
            }`}
          >
            {t(`mojaEkipa.svetovalec.skupina.${razlog}`)}
          </span>
          <span className="text-slate-300">{s.map(({ igralec }) => ime(igralec.full_name)).join(', ')}</span>
        </li>
      ))}
    </ul>
  )
}

export type DostopZaIzpis = 'zaklenjen' | 'odprt'

export default function SvetovalecEkipe<T extends IgralecIzpisa>({
  dostop,
  krog,
  svetovanje,
  imenaKlubov,
  naZamenjaj,
  naUporabiPostavo,
}: {
  dostop: DostopZaIzpis
  krog: number | null
  svetovanje: Svetovanje<T> | null
  imenaKlubov: Record<number, string>
  /** Prestop v osnutek (isto kot pri namigih). */
  naZamenjaj?: (stari: T, novi: T) => void
  /** Predlagano postavo in trak prepiše v osnutek. */
  naUporabiPostavo?: () => void
}) {
  const glava = (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-bold text-sky-100">{t('mojaEkipa.svetovalec.naslov')}</h2>
      <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-200">
        {t('mojaEkipa.svetovalec.preverjeni')}
      </span>
    </div>
  )

  if (dostop === 'zaklenjen')
    return (
      <section className="rounded-2xl border border-sky-400/20 bg-sky-950/30 p-4 text-sm">
        {glava}
        <p className="mt-1 text-slate-300">{t('mojaEkipa.svetovalec.zaklenjeno')}</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          {(['prestopi', 'postava', 'sibkosti'] as const).map((k) => (
            <li key={k} className="flex gap-2">
              <span aria-hidden className="text-sky-300">
                ✓
              </span>
              {t(`mojaEkipa.svetovalec.koristi.${k}`)}
            </li>
          ))}
        </ul>
        <Link
          to="/verified"
          className="mt-3 inline-block rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-sky-300"
        >
          {t('mojaEkipa.svetovalec.zaklenjenoPoveza')}
        </Link>
      </section>
    )
  if (!svetovanje) return null
  const { sibkosti, prestopi, postava } = svetovanje
  const skupajDobitek = prestopi.reduce((s, p) => s + p.dobitek, 0)
  const spremembPostave = postava ? postava.noter.length : 0

  return (
    <details open className="group rounded-2xl border border-sky-400/20 bg-sky-950/20 text-sm">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          {glava}
          <p className="mt-0.5 text-xs text-slate-300">
            {prestopi.length > 0 ? (
              <>
                {t('mojaEkipa.svetovalec.povzetekPrestopi', { n: prestopi.length })}
                {' · '}
                <strong className="text-gnl-300">
                  {t('mojaEkipa.svetovalec.dobitek', { tocke: dec(skupajDobitek) })}
                </strong>
              </>
            ) : (
              t('mojaEkipa.svetovalec.povzetekBrez')
            )}
          </p>
        </div>
        <span aria-hidden className="mt-0.5 text-slate-400 transition group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="px-4 pb-1">
        {krog != null && <p className="-mt-2 mb-3 text-xs text-slate-500">{t('mojaEkipa.svetovalec.zaKrog', { krog })}</p>}

        {prestopi.length === 0 ? (
          <p className="mb-3 text-slate-300">{t('mojaEkipa.svetovalec.brezPrestopov')}</p>
        ) : (
          <ul className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {prestopi.map((p) => (
              <KarticaPrestopa key={`${p.stari.id}-${p.novi.id}`} prestop={p} imenaKlubov={imenaKlubov} naZamenjaj={naZamenjaj} />
            ))}
          </ul>
        )}

        {postava && (
          <Zlozeno
            naslov={t('mojaEkipa.svetovalec.postava', { formacija: postava.formacija })}
            povzetek={
              postava.enakoKotSedaj
                ? t('mojaEkipa.svetovalec.enakoKotSedaj')
                : spremembPostave > 0
                  ? t('mojaEkipa.svetovalec.povzetekPostava', { n: spremembPostave })
                  : t('mojaEkipa.svetovalec.samoTrak')
            }
          >
            <EnajstericaNaIgriscu
              igralci={postava.prvi.map((i) => ({
                ...i,
                points: i.form ?? 0,
                oznaka: i.id === postava.kapetan.id ? 'K' : i.id === postava.namestnik?.id ? 'N' : null,
              }))}
            />
            <p className="mt-2 text-[11px] text-slate-500">{t('mojaEkipa.svetovalec.legendaIgrisca')}</p>
            {!postava.enakoKotSedaj && (
              <div className="mt-2 space-y-1 text-xs">
                {postava.noter.length > 0 && (
                  <p>
                    <span className="font-semibold text-gnl-300">▲ {t('mojaEkipa.svetovalec.vPostavo')}</span>{' '}
                    <span className="text-slate-200">{postava.noter.map((i) => ime(i.full_name)).join(', ')}</span>
                  </p>
                )}
                {postava.ven.length > 0 && (
                  <p>
                    <span className="font-semibold text-rose-300">▼ {t('mojaEkipa.svetovalec.izPostave')}</span>{' '}
                    <span className="text-slate-300">{postava.ven.map((i) => ime(i.full_name)).join(', ')}</span>
                  </p>
                )}
                {naUporabiPostavo && (
                  <button
                    type="button"
                    onClick={naUporabiPostavo}
                    className="mt-1 rounded-lg bg-gnl-500 px-3 py-1.5 font-bold text-slate-950 transition hover:bg-gnl-400"
                  >
                    {t('mojaEkipa.svetovalec.uporabiPostavo')}
                  </button>
                )}
              </div>
            )}
          </Zlozeno>
        )}

        <Zlozeno
          naslov={t('mojaEkipa.svetovalec.sibkosti')}
          povzetek={
            sibkosti.length === 0
              ? t('mojaEkipa.svetovalec.brezSibkosti')
              : t('mojaEkipa.svetovalec.povzetekSibkosti', { n: sibkosti.length })
          }
        >
          {sibkosti.length > 0 && <SibkaMesta sibkosti={sibkosti} />}
        </Zlozeno>

        <p className="border-t border-white/10 py-2.5 text-[11px] text-slate-500">{t('mojaEkipa.svetovalec.opomba')}</p>
      </div>
    </details>
  )
}
