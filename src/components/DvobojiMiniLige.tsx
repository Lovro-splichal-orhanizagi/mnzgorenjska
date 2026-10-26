import { useEffect, useRef, useState } from 'react'
import ImeEkipe, { jeMojaEkipa } from './ImeEkipe'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { formatirajTocke } from '../lib/pomozno'
import { stanjeDvoboja, type Dvoboji, type ParDvoboja } from '../lib/miniLige'
import { t } from '../i18n'

export type PogledMiniLige = 'skupno' | 'dvoboji' | 'napovedi'

const OZNAKA_POGLEDA: Record<PogledMiniLige, () => string> = {
  skupno: () => t('lestvice.dvoboji.skupno'),
  dvoboji: () => t('lestvice.dvoboji.naslov'),
  napovedi: () => t('lestvice.napovedi.napovedi'),
}

/** Preklop med skupno lestvico, dvoboji in napovedmi; nad lestvico mini lige. */
export function IzbiraPogleda({
  pogled,
  onPogled,
  moznosti = ['skupno', 'dvoboji'],
}: {
  pogled: PogledMiniLige
  onPogled: (p: PogledMiniLige) => void
  moznosti?: PogledMiniLige[]
}) {
  return (
    <div role="group" aria-label={t('lestvice.dvoboji.pogled')} className="flex gap-1 rounded-lg bg-white/5 p-1">
      {moznosti.map((p) => (
        <button
          key={p}
          onClick={() => onPogled(p)}
          aria-pressed={pogled === p}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            pogled === p ? 'bg-gnl-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          {OZNAKA_POGLEDA[p]()}
        </button>
      ))}
    </div>
  )
}

/**
 * Dvoboji mini lige: pari izbranega kroga (privzeto zadnjega) in lestvica
 * dvobojev. Pare sestavi baza ob roku kroga (`mini_liga_dvoboji`); točke
 * so iste kot na lestvici in se med krogom osvežujejo same, ko pridejo.
 */
export default function DvobojiMiniLige({ ligaId }: { ligaId: number }) {
  const { session } = useAuth()
  const [krog, setKrog] = useState<number | null>(null)
  const [dvoboji, setDvoboji] = useState<Dvoboji | null | undefined>(undefined)
  const [osvezi, setOsvezi] = useState(0)

  useEffect(() => setKrog(null), [ligaId])
  useEffect(() => setDvoboji(undefined), [ligaId, krog])

  useEffect(() => {
    let veljavno = true
    supabase
      .rpc('dvoboji_mini_lige', { p_liga: ligaId, p_krog: krog ?? undefined })
      .then(({ data, error }) => {
        if (!veljavno) return
        // Napaka ali migracija, ki še ni prišla: dvobojev ni, stran dela naprej.
        // Neuspela osvežitev pusti, kar je že na zaslonu.
        if (error) setDvoboji((prej) => (prej === undefined ? null : prej))
        else setDvoboji((data as unknown as Dvoboji | null) ?? null)
      })
    return () => {
      veljavno = false
    }
  }, [ligaId, krog, osvezi])

  // Med krogom točke prihajajo z uvozom zapisnikov: dokler kak dvoboj ni
  // končan in je stran odprta, izide preberemo vsako minuto znova.
  const vTeku = !!dvoboji?.pari.some((p) => !p.koncan)
  useEffect(() => {
    if (!vTeku) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') setOsvezi((n) => n + 1)
    }, 60_000)
    return () => window.clearInterval(id)
  }, [vTeku])

  // Vrstica krogov drsi vodoravno; izbrani krog naj bo viden.
  const vrsticaKrogov = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const vrsta = vrsticaKrogov.current
    const gumb = vrsta?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (vrsta && gumb) vrsta.scrollLeft = gumb.offsetLeft - (vrsta.clientWidth - gumb.offsetWidth) / 2
  }, [dvoboji])

  if (dvoboji === null) return null
  const moja = (lastnikId: string | null | undefined) => jeMojaEkipa(lastnikId, session?.user.id)

  return (
    <section className="kartica space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t('lestvice.dvoboji.naslov')}</h2>
        {dvoboji && dvoboji.krogi.length > 0 && (
          <div
            ref={vrsticaKrogov}
            className="relative flex min-w-0 max-w-full gap-1 overflow-x-auto pb-1"
            role="group"
            aria-label={t('lestvice.pregled.krog')}
          >
            {dvoboji.krogi.map((k) => (
              <button
                key={k}
                onClick={() => setKrog(k)}
                aria-pressed={k === dvoboji.krog}
                className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-bold tabular-nums ${
                  k === dvoboji.krog
                    ? 'bg-gnl-500/20 text-gnl-200 ring-1 ring-gnl-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('lestvice.krog', { n: k })}
              </button>
            ))}
          </div>
        )}
      </div>

      {dvoboji === undefined ? (
        <p className="animiraj-utrip text-sm text-slate-400">{t('lestvice.dvoboji.nalaganje')}</p>
      ) : dvoboji.krog == null ? (
        <p className="text-sm text-slate-400">{t('lestvice.dvoboji.prazno')}</p>
      ) : (
        <>
          <ul className="divide-y divide-white/10">
            {dvoboji.pari.map((p) => (
              <Par key={p.a.ekipa_id} par={p} moja={moja} />
            ))}
          </ul>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-slate-300">{t('lestvice.dvoboji.lestvica')}</h3>
            <table className="w-full table-fixed text-sm tabular-nums">
              <thead className="text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="w-6 py-1 text-right font-semibold" aria-hidden />
                  <th className="py-1 pl-2 text-left font-semibold">{t('lestvice.dvoboji.ekipa')}</th>
                  {(
                    [
                      ['odigrani', 'odigraniCelo'],
                      ['zmage', 'zmageCelo'],
                      ['remiji', 'remijiCelo'],
                      ['porazi', 'poraziCelo'],
                    ] as const
                  ).map(([kratko, celo]) => (
                    <th key={kratko} className="w-7 py-1 text-center font-semibold">
                      <abbr title={t(`lestvice.dvoboji.${celo}`)} className="no-underline">
                        {t(`lestvice.dvoboji.${kratko}`)}
                      </abbr>
                    </th>
                  ))}
                  <th className="w-11 py-1 text-right font-semibold">
                    <abbr title={t('lestvice.dvoboji.tockeZaCelo')} className="no-underline">
                      {t('lestvice.dvoboji.tockeZa')}
                    </abbr>
                  </th>
                  <th className="w-9 py-1 text-right font-semibold">
                    <abbr title={t('lestvice.dvoboji.tockeCelo')} className="no-underline">
                      {t('lestvice.dvoboji.tocke')}
                    </abbr>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dvoboji.lestvica.map((v, i) => (
                  <tr key={v.ekipa_id} className={moja(v.lastnik_id) ? 'bg-gnl-500/10' : undefined}>
                    <td className="py-2 text-right text-xs text-slate-500">{i + 1}.</td>
                    <td className="min-w-0 py-2 pl-2">
                      <ImeEkipe
                        id={v.ekipa_id}
                        lastnikId={v.lastnik_id}
                        className="block truncate font-semibold"
                        povezavaRazred="hover:text-gnl-300"
                      >
                        {v.ekipa}
                      </ImeEkipe>
                    </td>
                    <td className="py-2 text-center text-slate-400">{v.odigranih}</td>
                    <td className="py-2 text-center">{v.zmage}</td>
                    <td className="py-2 text-center">{v.remiji}</td>
                    <td className="py-2 text-center">{v.porazi}</td>
                    <td className="py-2 text-right text-slate-400">{formatirajTocke(v.tocke_za)}</td>
                    <td className="py-2 text-right font-bold text-gnl-300">{v.tocke}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">{t('lestvice.dvoboji.pravila')}</p>
          </div>
        </>
      )}
    </section>
  )
}

/** En par: ekipa A levo, B (ali povprečje) desno, izid na sredini. */
function Par({ par, moja }: { par: ParDvoboja; moja: (lastnikId: string | null | undefined) => boolean }) {
  const { stanje, vodi, tockeB } = stanjeDvoboja(par)
  const barva = (stran: 'a' | 'b') =>
    vodi === stran ? 'text-gnl-300' : vodi === 'remi' ? 'text-slate-200' : 'text-slate-400'
  const oznaka =
    stanje === 'caka'
      ? t('lestvice.dvoboji.caka')
      : stanje === 'v_teku'
        ? t('lestvice.dvoboji.vTeku')
        : t('lestvice.dvoboji.koncan')
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2.5">
      <div className="min-w-0 text-right">
        <ImeEkipe
          id={par.a.ekipa_id}
          lastnikId={par.a.lastnik_id}
          className={`block truncate text-sm ${moja(par.a.lastnik_id) ? 'font-bold' : 'font-semibold'}`}
          povezavaRazred="hover:text-gnl-300"
        >
          {par.a.ekipa}
        </ImeEkipe>
        {par.a.lastnik && <div className="truncate text-xs text-slate-500">{par.a.lastnik}</div>}
      </div>
      <div className="flex min-w-[4.5rem] flex-col items-center">
        <div className="text-base font-black tabular-nums">
          <span className={barva('a')}>{par.a.tocke == null ? '–' : formatirajTocke(par.a.tocke)}</span>
          <span className="px-1 text-slate-600">:</span>
          <span className={barva('b')}>{tockeB == null ? '–' : formatirajTocke(tockeB)}</span>
        </div>
        <div
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            stanje === 'v_teku' ? 'text-amber-300' : 'text-slate-500'
          }`}
        >
          {oznaka}
        </div>
      </div>
      <div className="min-w-0">
        {par.b ? (
          <>
            <ImeEkipe
              id={par.b.ekipa_id}
              lastnikId={par.b.lastnik_id}
              className={`block truncate text-sm ${moja(par.b.lastnik_id) ? 'font-bold' : 'font-semibold'}`}
              povezavaRazred="hover:text-gnl-300"
            >
              {par.b.ekipa}
            </ImeEkipe>
            {par.b.lastnik && <div className="truncate text-xs text-slate-500">{par.b.lastnik}</div>}
          </>
        ) : (
          <span className="block truncate text-sm italic text-slate-400">{t('lestvice.dvoboji.povprecje')}</span>
        )}
      </div>
    </li>
  )
}
