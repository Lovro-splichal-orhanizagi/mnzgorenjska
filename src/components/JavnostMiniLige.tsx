import { useEffect, useMemo, useState } from 'react'
import { Link } from './Povezava'
import { supabase } from '../lib/supabase'
import { useTekmovanje } from '../lib/tekmovanje'
import {
  DOLZINA_OPISA,
  besediloNapake,
  napakaJavnosti,
  preveriJavnoLigo,
} from '../lib/javneMiniLige'
import { dogodek } from '../lib/analitika'
import { t } from '../i18n'

export interface LigaZaJavnost {
  id: number
  name: string
  javna: boolean
  opis: string | null
  competition_id: number | null
  javna_zaklenjena_at: string | null
}

export interface EkipaLastnika {
  competition_id: number | null
  competition_short: string | null
}

/**
 * Nastavitev javnosti mini lige — vidi jo le ustvarjalec. Javna liga je v
 * eni ligi (tekmovanju), v kateri ima lastnik ekipo; drugi jo najdejo na
 * strani Mini lige in se pridružijo brez kode.
 */
export default function JavnostMiniLige({
  liga,
  ekipe,
  onSpremenjeno,
}: {
  liga: LigaZaJavnost
  ekipe: EkipaLastnika[]
  onSpremenjeno: () => void
}) {
  const { id: izbranaLiga } = useTekmovanje()
  // Lige, v katerih ima lastnik ekipo; v drugi lige ne more objaviti.
  const lige = useMemo(() => {
    const videne = new Map<number, string>()
    for (const e of ekipe)
      if (e.competition_id != null && !videne.has(e.competition_id))
        videne.set(e.competition_id, e.competition_short ?? String(e.competition_id))
    return [...videne].map(([id, ime]) => ({ id, ime }))
  }, [ekipe])
  const privzeta =
    liga.competition_id ??
    lige.find((l) => l.id === izbranaLiga)?.id ??
    lige[0]?.id ??
    null

  const [opis, setOpis] = useState(liga.opis ?? '')
  const [tekmovanje, setTekmovanje] = useState<number | null>(privzeta)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
    setOpis(liga.opis ?? '')
    setTekmovanje(privzeta)
    setNapaka(null)
    setSporocilo(null)
    // Ob menjavi lige začnemo znova; `privzeta` sledi ligi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liga.id])

  const imeLige = lige.find((l) => l.id === (liga.javna ? liga.competition_id : tekmovanje))?.ime ?? ''

  async function nastavi(javna: boolean) {
    setNapaka(null)
    setSporocilo(null)
    if (javna) {
      if (tekmovanje == null) return setNapaka(besediloNapake('javna-brez-ekipe'))
      const koda = preveriJavnoLigo(liga.name, opis)
      if (koda) return setNapaka(besediloNapake(koda))
    }
    setDela(true)
    const { error } = await supabase.rpc('nastavi_javnost_mini_lige', {
      p_liga: liga.id,
      p_javna: javna,
      p_opis: javna ? opis : undefined,
      p_tekmovanje: javna ? (tekmovanje ?? undefined) : undefined,
    })
    setDela(false)
    if (error) return setNapaka(napakaJavnosti(error))
    if (javna && !liga.javna) dogodek('mini_liga_javna')
    setSporocilo(
      javna
        ? liga.javna
          ? t('lestvice.javneLige.shranjeno')
          : t('lestvice.javneLige.objavljena')
        : t('lestvice.javneLige.skrita'),
    )
    onSpremenjeno()
  }

  return (
    <details className="group kartica p-3" open={liga.javna || undefined}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="mr-1 inline-block text-slate-500 transition group-open:rotate-90">
          ›
        </span>
        {t('lestvice.javneLige.nastavitve')}
      </summary>
      <div className="mt-3 space-y-2 text-sm">
        <p className="text-slate-400">
          {liga.javna
            ? t('lestvice.javneLige.javna', { liga: imeLige })
            : t('lestvice.javneLige.zasebna')}
        </p>

        {liga.javna_zaklenjena_at ? (
          <p className="text-rose-400">{t('lestvice.javneLige.napake.zaklenjena')}</p>
        ) : lige.length === 0 ? (
          <p className="text-slate-400">{t('lestvice.javneLige.brezEkipe')}</p>
        ) : (
          <>
            {!liga.javna && lige.length > 1 && (
              <label className="block text-slate-400">
                {t('lestvice.javneLige.liga')}
                <select
                  value={tekmovanje ?? ''}
                  onChange={(e) => setTekmovanje(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10"
                >
                  {lige.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.ime}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-slate-400">
              {t('lestvice.javneLige.opisPolje')}
              <input
                value={opis}
                onChange={(e) => setOpis(e.target.value)}
                maxLength={DOLZINA_OPISA}
                className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10"
              />
            </label>
            <p className="text-xs text-slate-500">{t('lestvice.javneLige.pravila')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {liga.javna ? (
                <>
                  <button onClick={() => nastavi(true)} disabled={dela} className="gumb-glavni text-sm">
                    {t('lestvice.javneLige.shrani')}
                  </button>
                  <button
                    onClick={() => nastavi(false)}
                    disabled={dela}
                    className="rounded-md px-3 py-1.5 text-sm text-slate-300 ring-1 ring-white/10 hover:bg-white/5"
                  >
                    {t('lestvice.javneLige.skrij')}
                  </button>
                  <Link to={`/mini-leagues/${liga.id}`} className="text-gnl-300 hover:underline">
                    {t('lestvice.javneLige.stran')}
                  </Link>
                </>
              ) : (
                <button onClick={() => nastavi(true)} disabled={dela} className="gumb-glavni text-sm">
                  {t('lestvice.javneLige.objavi')}
                </button>
              )}
            </div>
          </>
        )}
        {napaka && <p role="alert" className="text-rose-400">{napaka}</p>}
        {sporocilo && <p role="status" className="text-gnl-300">{sporocilo}</p>}
      </div>
    </details>
  )
}
