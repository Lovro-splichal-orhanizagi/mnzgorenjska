// Pred tekmo (SLF-373): poročilo preverjenemu igralcu pred naslednjo tekmo
// (v 10 dneh) na njegovem profilu. Le javna dejstva iz zapisnikov: forma,
// nasprotnikovi strelci in igralci z največ minutami, kartoni lastne ekipe,
// medsebojne tekme in lastna forma. Kdo ga vidi, odloči baza (`pred_tekmo`).
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zLigo } from '../lib/tekmovanje'
import { Link } from './Povezava'
import Grb from './Grb'
import { t, datum, stevilo } from '../i18n'

type Klub = { id: number; ime: string; logo: string | null }
type TekmaForme = { datum: string | null; doma: boolean; dani: number; prejeti: number; proti?: string }
type Igralec = { id: number; ime: string; goli?: number; minute?: number; nastopov?: number; rumeni?: number }
type Nastop = { datum: string | null; minute: number | null; goli: number | null; tocke: number | null }
type Porocilo = {
  tekma: { id: number; datum: string; krog: number; doma: boolean; liga: string; klub: Klub; nasprotnik: Klub }
  forma: { klub: TekmaForme[]; nasprotnik: TekmaForme[] }
  strelci: Igralec[]
  minute: Igralec[]
  kartoni: Igralec[]
  medsebojno: TekmaForme[]
  jaz: Nastop[]
}

export default function PredTekmo({ igralecId }: { igralecId: number }) {
  const [p, setP] = useState<Porocilo | null>(null)
  useEffect(() => {
    let velja = true
    void Promise.resolve(supabase.rpc('pred_tekmo', { p_player_id: igralecId })).then(
      ({ data }) => velja && setP((data as Porocilo | null) ?? null),
    )
    return () => {
      velja = false
    }
  }, [igralecId])

  if (!p) return null
  const { tekma } = p
  const [domaci, gostje] = tekma.doma ? [tekma.klub, tekma.nasprotnik] : [tekma.nasprotnik, tekma.klub]
  const naIgralca = (id: number) => zLigo(`/player/${id}`, tekma.liga)

  return (
    <section aria-labelledby="pred-tekmo" className="kartica space-y-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pred-tekmo" className="text-sm font-bold uppercase tracking-wide text-slate-300">
          {t('igralci.predTekmo.naslov')}
        </h2>
        <span className="text-xs text-slate-400">
          {t('igralci.predTekmo.krog', { n: tekma.krog })} · {datum(tekma.datum, { weekday: 'short', day: 'numeric', month: 'numeric' })}
        </span>
      </div>

      <Link to={zLigo(`/match/${tekma.id}`, tekma.liga)} className="flex items-center justify-center gap-3 rounded-xl bg-white/5 p-3 hover:bg-white/10">
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right font-bold text-white">
          <span className="truncate">{domaci.ime}</span>
          <Grb ime={domaci.ime} logo={domaci.logo} velikost={28} />
        </span>
        <span className="text-slate-400">–</span>
        <span className="flex min-w-0 flex-1 items-center gap-2 font-bold text-white">
          <Grb ime={gostje.ime} logo={gostje.logo} velikost={28} />
          <span className="truncate">{gostje.ime}</span>
        </span>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <Blok naslov={t('igralci.predTekmo.forma')}>
          <Forma ime={tekma.klub.ime} tekme={p.forma.klub} />
          <Forma ime={tekma.nasprotnik.ime} tekme={p.forma.nasprotnik} />
        </Blok>

        <Blok naslov={t('igralci.predTekmo.medsebojno')}>
          {p.medsebojno.length ? (
            <ul className="space-y-1 text-sm text-slate-200">
              {p.medsebojno.map((m, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="text-slate-400">{m.datum ? datum(m.datum, { day: 'numeric', month: 'numeric', year: '2-digit' }) : ''}</span>
                  <span className="tabular-nums">
                    {m.doma ? `${m.dani}:${m.prejeti}` : `${m.prejeti}:${m.dani}`}{' '}
                    <span className="text-xs text-slate-400">{m.doma ? t('igralci.predTekmo.doma') : t('igralci.predTekmo.vGosteh')}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">{t('igralci.predTekmo.prvic')}</p>
          )}
        </Blok>

        <Blok naslov={t('igralci.predTekmo.strelci', { klub: tekma.nasprotnik.ime })}>
          <Seznam igralci={p.strelci} vrednost={(x) => `⚽ ${stevilo(x.goli ?? 0)}`} pot={naIgralca} prazno={t('igralci.predTekmo.niStrelcev')} />
        </Blok>

        <Blok naslov={t('igralci.predTekmo.minute', { klub: tekma.nasprotnik.ime })}>
          <Seznam igralci={p.minute} vrednost={(x) => `${stevilo(x.minute ?? 0)}′`} pot={naIgralca} prazno={t('igralci.predTekmo.niPodatkov')} />
        </Blok>

        {p.kartoni.length > 0 && (
          <Blok naslov={t('igralci.predTekmo.kartoni')}>
            <Seznam igralci={p.kartoni} vrednost={(x) => `🟨 ${stevilo(x.rumeni ?? 0)}`} pot={naIgralca} prazno="" />
          </Blok>
        )}

        {p.jaz.length > 0 && (
          <Blok naslov={t('igralci.predTekmo.jaz')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th scope="col" className="pb-1 font-normal">{t('igralci.predTekmo.datum')}</th>
                  <th scope="col" className="pb-1 text-right font-normal">{t('igralci.predTekmo.min')}</th>
                  <th scope="col" className="pb-1 text-right font-normal">{t('igralci.predTekmo.goli')}</th>
                  <th scope="col" className="pb-1 text-right font-normal">{t('igralci.predTekmo.tocke')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-slate-200">
                {p.jaz.map((n, i) => (
                  <tr key={i}>
                    <td className="text-slate-400">{n.datum ? datum(n.datum, { day: 'numeric', month: 'numeric' }) : ''}</td>
                    <td className="text-right">{stevilo(n.minute ?? 0)}′</td>
                    <td className="text-right">{stevilo(n.goli ?? 0)}</td>
                    <td className="text-right">{n.tocke != null ? stevilo(Number(n.tocke)) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Blok>
        )}
      </div>

      <p className="text-xs text-slate-400">{t('igralci.predTekmo.opomba')}</p>
    </section>
  )
}

function Blok({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-400">{naslov}</h3>
      {children}
    </div>
  )
}

/** Zadnjih 5 izidov ekipe kot črke Z/R/P (barva je le dodatek, črka pove sama). */
function Forma({ ime, tekme }: { ime: string; tekme: TekmaForme[] }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm text-slate-200">{ime}</span>
      <span className="flex gap-1">
        {tekme.length ? (
          tekme.map((m, i) => {
            const izid = m.dani > m.prejeti ? 'z' : m.dani < m.prejeti ? 'p' : 'r'
            const barva = izid === 'z' ? 'bg-gnl-500 text-slate-950' : izid === 'p' ? 'bg-red-400/80 text-slate-950' : 'bg-slate-500 text-white'
            return (
              <span
                key={i}
                title={`${m.proti ?? ''} ${m.dani}:${m.prejeti}`}
                className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-black ${barva}`}
              >
                {t(`igralci.predTekmo.izid.${izid}`)}
              </span>
            )
          })
        ) : (
          <span className="text-xs text-slate-400">{t('igralci.predTekmo.niPodatkov')}</span>
        )}
      </span>
    </div>
  )
}

function Seznam({ igralci, vrednost, pot, prazno }: { igralci: Igralec[]; vrednost: (x: Igralec) => string; pot: (id: number) => string; prazno: string }) {
  if (!igralci.length) return <p className="text-sm text-slate-400">{prazno}</p>
  return (
    <ul className="space-y-1 text-sm">
      {igralci.map((x) => (
        <li key={x.id} className="flex justify-between gap-2">
          <Link to={pot(x.id)} className="truncate text-slate-200 hover:text-white hover:underline">
            {x.ime}
          </Link>
          <span className="shrink-0 tabular-nums text-slate-300">{vrednost(x)}</span>
        </li>
      ))}
    </ul>
  )
}
