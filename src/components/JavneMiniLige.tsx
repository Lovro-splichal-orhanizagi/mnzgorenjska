import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from './Povezava'
import ImeLastnika from './ImeLastnika'
import { supabase } from '../lib/supabase'
import { useTekmovanje } from '../lib/tekmovanje'
import { povezavaNaPrijavo } from '../lib/prijava'
import { mnozina, EKIPE } from '../lib/pomozno'
import { OMEJITEV_SEZNAMA, napakaJavnosti, type JavnaLiga } from '../lib/javneMiniLige'
import { dogodek } from '../lib/analitika'
import { t, tx } from '../i18n'

export interface EkipaZaJavne {
  id: number
  competition_id: number | null
}

/**
 * Javne mini lige izbrane lige: največje najprej, iskanje po imenu in opisu,
 * pridružitev brez kode z ekipo te lige. `ekipe` je null za neprijavljenega
 * (seznam vidi, za pridružitev se prijavi).
 */
export default function JavneMiniLige({
  ekipe,
  onPridruzen,
}: {
  ekipe: EkipaZaJavne[] | null
  onPridruzen?: (ligaId: number) => void
}) {
  const { id: tekmovanjeId, tekmovanje } = useTekmovanje()
  const { pathname, search } = useLocation()
  const [iskanje, setIskanje] = useState('')
  const [poizvedba, setPoizvedba] = useState('')
  const [vrstice, setVrstice] = useState<JavnaLiga[] | null>(null)
  const [osvezi, setOsvezi] = useState(0)
  const [dela, setDela] = useState<number | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)

  // Iskanje počaka, da človek neha tipkati.
  useEffect(() => {
    const cas = setTimeout(() => setPoizvedba(iskanje.trim()), 300)
    return () => clearTimeout(cas)
  }, [iskanje])

  useEffect(() => {
    if (tekmovanjeId == null) return
    let veljavno = true
    supabase
      .rpc('javne_mini_lige', {
        p_tekmovanje: tekmovanjeId,
        p_iskanje: poizvedba || undefined,
        p_omejitev: OMEJITEV_SEZNAMA,
      })
      .then(({ data }) => {
        if (veljavno) setVrstice((data ?? []) as JavnaLiga[])
      })
    return () => {
      veljavno = false
    }
  }, [tekmovanjeId, poizvedba, osvezi])

  const mojaEkipa = ekipe?.find((e) => e.competition_id === tekmovanjeId) ?? null

  async function pridruzi(liga: JavnaLiga) {
    if (!mojaEkipa) return
    setNapaka(null)
    setSporocilo(null)
    setDela(liga.id)
    const { error } = await supabase.rpc('pridruzi_javni_mini_ligi', {
      p_liga: liga.id,
      p_ekipa: mojaEkipa.id,
    })
    setDela(null)
    if (error) return setNapaka(napakaJavnosti(error))
    dogodek('mini_liga_pridruzitev', { vir: 'javna' })
    setSporocilo(t('lestvice.javneLige.pridruzen', { ime: liga.name }))
    setOsvezi((n) => n + 1)
    onPridruzen?.(liga.id)
  }

  if (tekmovanjeId == null) return null

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">{t('lestvice.javneLige.naslov')}</h2>
        <p className="text-sm text-slate-400">
          {t('lestvice.javneLige.opis', { liga: tekmovanje?.short_name ?? tekmovanje?.name ?? '' })}
        </p>
      </div>

      <input
        type="search"
        value={iskanje}
        onChange={(e) => setIskanje(e.target.value)}
        placeholder={t('lestvice.javneLige.isci')}
        maxLength={40}
        className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
      />

      {ekipe === null ? (
        <p className="text-sm text-slate-400">
          {tx('lestvice.javneLige.prijava', {}, {
            prijava: (b) => (
              <Link
                to={povezavaNaPrijavo(pathname + search)}
                className="font-semibold text-gnl-300 underline hover:text-gnl-200"
              >
                {b}
              </Link>
            ),
          })}
        </p>
      ) : (
        !mojaEkipa && (
          <p className="text-sm text-slate-400">
            {t('lestvice.javneLige.potrebujesEkipo')}{' '}
            <Link to="/my-team" className="font-semibold text-gnl-300 hover:underline">
              {t('lestvice.javneLige.sestaviEkipo')}
            </Link>
          </p>
        )
      )}

      {napaka && <p role="alert" className="text-sm text-rose-400">{napaka}</p>}
      {sporocilo && <p role="status" className="text-sm text-gnl-300">{sporocilo}</p>}

      {vrstice === null ? (
        <p className="animiraj-utrip text-sm text-slate-400">{t('skupno.nalaganje')}</p>
      ) : vrstice.length === 0 ? (
        <p className="text-sm text-slate-400">
          {poizvedba ? t('lestvice.javneLige.niZadetkov') : t('lestvice.javneLige.prazno')}
        </p>
      ) : (
        <>
          <ul className="kartica divide-y divide-white/10 overflow-hidden">
            {vrstice.map((l) => (
              <li key={l.id} className="relative flex items-center gap-3 px-3 py-2 sm:px-4">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/mini-leagues/${l.id}`}
                    className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-gnl-400"
                  >
                    {l.name}
                  </Link>
                  {l.opis && <p className="truncate text-xs text-slate-400">{l.opis}</p>}
                  <p className="truncate text-xs text-slate-500">
                    {l.owner_name && (
                      <>
                        {tx('lestvice.javneLige.ustvaril', { ime: l.owner_name }, {
                          lastnik: () => <ImeLastnika ime={l.owner_name} id={l.owner_id} />,
                        })}
                        {' · '}
                      </>
                    )}
                    {mnozina(l.ekip, EKIPE)}
                  </p>
                </div>
                <div className="relative z-10 shrink-0">
                  {l.sem_clan ? (
                    <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400">
                      {t('lestvice.javneLige.clan')}
                    </span>
                  ) : mojaEkipa ? (
                    <button
                      onClick={() => pridruzi(l)}
                      disabled={dela != null}
                      className="gumb-glavni text-xs"
                    >
                      {t('lestvice.javneLige.pridruziSe')}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {!poizvedba && vrstice.length >= OMEJITEV_SEZNAMA && (
            <p className="text-xs text-slate-500">{t('lestvice.javneLige.vec', { n: vrstice.length })}</p>
          )}
        </>
      )}
    </section>
  )
}
