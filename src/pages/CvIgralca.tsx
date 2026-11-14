// CV igralca (`/cv/:id`, SLF-373): ena stran za trenerja ob prestopu. Javna
// za preverjene polnoletne igralce (`cv_igralca`), sicer "ni CV". Le kar je
// na profilu že javno: ime, pozicija, klub, opis, povezave, sezone po ligah.
// "Natisni ali shrani PDF" je brskalnikov tisk; za tisk je stran svetla.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import { Kljukica } from '../components/ZnakPreverjen'
import Grb from '../components/Grb'
import { supabase } from '../lib/supabase'
import { useNaslov, useNoindex } from '../lib/naslov'
import { useFotografija } from '../lib/prevzem'
import { izvor } from '../lib/platforma'
import { zLigo } from '../lib/tekmovanje'
import { t, stevilo } from '../i18n'

type Sezona = { sezona: string; liga: string; klub: string; tekme: number; minute: number; goli: number; asistence: number | null; ciste: number | null; pozicija: string | null }
type Cv = {
  glavni: number
  vrstica: number
  ime: string
  pozicija: string | null
  klub: { ime: string; logo: string | null } | null
  liga: { ime: string; slug: string } | null
  vzdevek: string | null
  opis: string | null
  povezave: { youtube: string | null; x: string | null; splet: string | null } | null
  posnetkov: number
  sezone: Sezona[]
}

const POZICIJE = ['GK', 'DEF', 'MID', 'FWD'] as const
const imePozicije = (p: string | null) =>
  p && (POZICIJE as readonly string[]).includes(p) ? t(`skupno.pozicija.${p as (typeof POZICIJE)[number]}`) : null

export default function CvIgralca() {
  const { id } = useParams()
  const igralecId = Number(id)
  const [cv, setCv] = useState<Cv | null | undefined>(undefined)
  const [kopirano, setKopirano] = useState(false)
  const foto = useFotografija(cv?.glavni ?? null)
  useNaslov(cv ? t('igralci.cv.naslovStrani', { ime: cv.ime }) : t('igralci.cv.naslov'))
  // CV je za trenerja s povezavo, ne za iskalnike.
  useNoindex(true)

  useEffect(() => {
    let velja = true
    if (!Number.isFinite(igralecId)) return setCv(null)
    void Promise.resolve(supabase.rpc('cv_igralca', { p_player_id: igralecId })).then(
      ({ data }) => velja && setCv((data as Cv | null) ?? null),
    )
    return () => {
      velja = false
    }
  }, [igralecId])

  if (cv === undefined) return <div className="min-h-[60vh]" role="status" aria-label={t('preverjeni.nalaga')} />
  if (cv === null)
    return (
      <div className="kartica max-w-md space-y-3 p-5">
        <h1 className="text-xl font-black naslov">{t('igralci.cv.naslov')}</h1>
        <p className="text-sm text-slate-300">{t('igralci.cv.niCv')}</p>
        <Link to="/verified" className="text-sm text-sky-300 underline">{t('preverjeni.vec')}</Link>
      </div>
    )

  const skupaj = cv.sezone.reduce(
    (a, s) => ({ tekme: a.tekme + (s.tekme ?? 0), minute: a.minute + (s.minute ?? 0), goli: a.goli + (s.goli ?? 0), asistence: a.asistence + (s.asistence ?? 0) }),
    { tekme: 0, minute: 0, goli: 0, asistence: 0 },
  )
  const povezava = `${izvor()}/cv/${cv.glavni}`
  const profil = zLigo(`/player/${cv.vrstica}`, cv.liga?.slug)
  const pozicija = imePozicije(cv.pozicija)

  async function kopiraj() {
    try {
      await navigator.clipboard.writeText(povezava)
      setKopirano(true)
    } catch {}
  }

  return (
    <div className="cv-stran mx-auto max-w-3xl space-y-4">
      <div className="ne-tiskaj flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="gumb-glavni inline-flex min-h-11 items-center px-4 text-sm">
          {t('igralci.cv.natisni')}
        </button>
        <button type="button" onClick={kopiraj} className="gumb-tih inline-flex min-h-11 items-center px-4 text-sm">
          {kopirano ? t('igralci.cv.kopirano') : t('igralci.cv.kopiraj')}
        </button>
      </div>

      <article className="cv-list kartica space-y-6 p-5 sm:p-8">
        <header className="flex items-center gap-4">
          {foto ? (
            <img src={foto} alt="" width={96} height={96} className="h-24 w-24 shrink-0 rounded-full object-cover" />
          ) : (
            cv.klub && <Grb ime={cv.klub.ime} logo={cv.klub.logo} velikost={80} />
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="flex flex-wrap items-center gap-2 text-3xl font-black naslov">
              {cv.ime}
              <Kljukica velikost={22} />
            </h1>
            {cv.vzdevek && <p className="text-sm text-slate-300">"{cv.vzdevek}"</p>}
            <p className="text-sm text-slate-300">
              {[pozicija, cv.klub?.ime, cv.liga?.ime].filter(Boolean).join(' · ')}
            </p>
          </div>
        </header>

        {cv.opis && <p className="whitespace-pre-line text-base text-slate-200">{cv.opis}</p>}

        <section aria-labelledby="cv-kariera" className="space-y-2">
          <h2 id="cv-kariera" className="text-sm font-bold uppercase tracking-wide text-slate-400">{t('igralci.cv.kariera')}</h2>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [stevilo(skupaj.tekme), t('igralci.zgodbe.tekme')],
              [`${stevilo(skupaj.minute)}′`, t('igralci.zgodbe.minute')],
              [stevilo(skupaj.goli), t('igralci.zgodbe.goli')],
              [stevilo(skupaj.asistence), t('igralci.zgodbe.asistence')],
            ].map(([v, n]) => (
              <div key={n} className="rounded-xl bg-white/5 p-3 text-center">
                <dt className="text-xs text-slate-400">{n}</dt>
                <dd className="text-2xl font-black text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-semibold">{t('igralci.cv.sezona')}</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">{t('igralci.cv.klubLiga')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t('igralci.zgodbe.tekme')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t('igralci.predTekmo.min')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">{t('igralci.zgodbe.goli')}</th>
                  <th scope="col" className="py-2 text-right font-semibold">{t('igralci.zgodbe.asistence')}</th>
                </tr>
              </thead>
              <tbody>
                {cv.sezone.map((s, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-semibold text-slate-200">{s.sezona}</th>
                    <td className="py-2 pr-3 text-slate-300">
                      <span className="block text-slate-200">{s.klub}</span>
                      <span className="text-xs text-slate-400">{s.liga}</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-200">{stevilo(s.tekme ?? 0)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-200">{stevilo(s.minute ?? 0)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-200">{stevilo(s.goli ?? 0)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-200">{stevilo(s.asistence ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-1 text-sm text-slate-300">
          {cv.posnetkov > 0 && (
            <p>
              {t('igralci.cv.posnetki', { n: stevilo(cv.posnetkov) })}{' '}
              <Link to={profil} className="text-sky-300 underline">{t('igralci.cv.oglejProfil')}</Link>
            </p>
          )}
          {cv.povezave?.youtube && <p>YouTube: youtube.com/@{cv.povezave.youtube}</p>}
          {cv.povezave?.x && <p>X: x.com/{cv.povezave.x}</p>}
          {cv.povezave?.splet && <p>{cv.povezave.splet}</p>}
        </section>

        <footer className="border-t border-white/10 pt-3 text-xs text-slate-400">
          {t('igralci.cv.noga')} · {povezava}
        </footer>
      </article>
    </div>
  )
}
