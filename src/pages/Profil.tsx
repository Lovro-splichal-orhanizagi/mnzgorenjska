// Javni profil uporabnika (/u/:id). Podatke zbere `javni_profil(id)` v bazi,
// ki vrne le javna polja: zasebni profil le ime, izbrisan ali sistemski nič.
// Ekipe so javne že na lestvicah; mini lige le tiste, v katerih je tudi
// gledalec (zasebne so). Stran je noindex (`ZASEBNE` v lib/naslov.ts).
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/Povezava'
import Avatar from '../components/Avatar'
import Grb from '../components/Grb'
import Zastava from '../components/Zastava'
import { supabase } from '../lib/supabase'
import { useNaslov, useNoindex } from '../lib/naslov'
import { zLigo } from '../lib/tekmovanje'
import { formatirajTocke, tockZ } from '../lib/pomozno'
import type { JavniProfil } from '../lib/profil'
import { datum, t } from '../i18n'

export default function Profil() {
  const { id } = useParams<{ id: string }>()
  const [profil, setProfil] = useState<JavniProfil | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  useNaslov(profil?.ime ?? t('racun.profil.naslov'))
  useNoindex(!nalaganje && !profil)

  useEffect(() => {
    if (!id) return
    let veljavno = true
    setNalaganje(true)
    // Neveljaven uuid baza zavrne z napako; za stran je to isto kot "ni profila".
    supabase.rpc('javni_profil', { p_id: id }).then(({ data }) => {
      if (!veljavno) return
      setProfil((data as JavniProfil | null) ?? null)
      setNalaganje(false)
    })
    return () => {
      veljavno = false
    }
  }, [id])

  if (nalaganje) return <p className="text-slate-400">{t('skupno.nalaganje')}</p>
  if (!profil)
    return (
      <div className="space-y-3">
        <p className="text-slate-300">{t('racun.profil.niProfila')}</p>
        <Link to="/standings" className="text-gnl-300 underline">
          {t('racun.profil.nazaj')}
        </Link>
      </div>
    )

  const poln = profil.javen || profil.jaz
  const ekipe = profil.ekipe ?? []
  const miniLige = profil.mini_lige ?? []
  const d = profil.dosezki

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center gap-4">
        <Avatar id={profil.id} ime={profil.ime} barva={profil.avatar_barva} ikona={profil.avatar_ikona} velikost={72} />
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-black naslov sm:text-3xl">{profil.ime}</h1>
          {poln && profil.clan_od && (
            <p className="text-sm text-slate-400">
              {t('racun.profil.clanOd', { datum: datum(profil.clan_od, { month: 'long', year: 'numeric' }) })}
            </p>
          )}
          {poln && profil.navijam && (
            <p className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-slate-400">{t('racun.profil.navija')}</span>
              <Grb ime={profil.navijam.ime} kratko={profil.navijam.kratko} logo={profil.navijam.grb} velikost={20} />
              <Link to={`/club/${profil.navijam.id}`} className="truncate font-semibold hover:text-gnl-300">
                {profil.navijam.ime}
              </Link>
            </p>
          )}
        </div>
      </header>

      {profil.jaz && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {!profil.javen && <p className="text-amber-300">{t('racun.profil.tvojZaseben')}</p>}
          <Link to="/account" className="gumb-tih min-h-[44px] px-3 py-2">
            {t('racun.profil.uredi')}
          </Link>
        </div>
      )}

      {!poln ? (
        <p className="text-slate-400">{t('racun.profil.zaseben')}</p>
      ) : (
        <>
          {profil.jaz && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold">{t('racun.profil.ekipe')}</h2>
            {ekipe.length === 0 ? (
              <p className="text-sm text-slate-400">{t('racun.profil.brezEkip')}</p>
            ) : (
              <ul className="kartica divide-y divide-white/10 overflow-hidden">
                {ekipe.map((e) => (
                  <li key={e.id} className="relative flex min-h-[52px] items-center gap-3 px-3 py-2 hover:bg-white/5 sm:px-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={zLigo(`/team/${e.id}`, e.liga)}
                        className="block truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-gnl-300"
                      >
                        {e.ime}
                      </Link>
                      <div className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                        {e.drzava && <Zastava koda={e.drzava} className="h-3" />}
                        <span className="truncate">{e.liga_kratko ?? e.liga_ime}</span>
                        {Number(e.tocke) > 0 && (
                          <span className="shrink-0">· {t('racun.profil.mesto', { mesto: e.mesto, ekip: e.ekip })}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-bold tabular-nums text-gnl-300">{formatirajTocke(e.tocke)}</span>
                      <span className="ml-1 text-xs text-slate-500">{tockZ(e.tocke)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}

          {d && (d.krogov > 0 || d.sezon > 0) && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold">{t('racun.profil.dosezki')}</h2>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="kartica p-3">
                  <dt className="text-xs text-slate-400">{t('racun.profil.sezone')}</dt>
                  <dd className="text-2xl font-black tabular-nums">{d.sezon}</dd>
                </div>
                <div className="kartica p-3">
                  <dt className="text-xs text-slate-400">{t('racun.profil.krogi')}</dt>
                  <dd className="text-2xl font-black tabular-nums">{d.krogov}</dd>
                </div>
                {d.najboljsi && (
                  <div className="kartica col-span-2 p-3 sm:col-span-1">
                    <dt className="text-xs text-slate-400">{t('racun.profil.najboljsiKrog')}</dt>
                    <dd className="text-2xl font-black tabular-nums text-gnl-300">
                      {formatirajTocke(d.najboljsi.tocke)}
                    </dd>
                    <dd className="truncate text-xs text-slate-500">
                      {t('lestvice.krog', { n: d.najboljsi.krog })} · {d.najboljsi.liga} · {d.najboljsi.sezona}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {profil.jaz && miniLige.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold">{t('racun.profil.miniLige')}</h2>
              <ul className="kartica divide-y divide-white/10 overflow-hidden">
                {miniLige.map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/mini-leagues?liga=${m.id}`}
                      className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-white/5 sm:px-4"
                    >
                      <span className="truncate font-semibold">{m.ime}</span>
                      <span className="shrink-0 text-xs text-slate-500" aria-hidden="true">
                        👥 {m.clanov}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
