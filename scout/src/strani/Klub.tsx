import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SKUPINE, supabase, type IgralecKluba, type PregledKluba, type Skupina, type StatEkipe } from '../baza'
import { napaka, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'
import { odst, st } from './Igralec'
import { opisVrzeli } from './Vrzeli'

/** Globina po poziciji iz kadra: koliko igralcev nosi vsaj 30 % minut in kdo največ (brez U19, kot stroj), in koliko je U19. */
export function globina(kader: IgralecKluba[]): { skupina: Skupina; stalnih: number; nosilec: IgralecKluba | null; mladih: number }[] {
  return SKUPINE.map((s) => {
    const v = kader.filter((k) => k.skupina === s && !k.mladi)
    const nosilec = v.reduce<IgralecKluba | null>((a, b) => (!a || (b.delez_minut ?? 0) > (a.delez_minut ?? 0) ? b : a), null)
    return {
      skupina: s,
      stalnih: v.filter((k) => (k.delez_minut ?? 0) >= 0.3).length,
      nosilec,
      mladih: kader.filter((k) => k.skupina === s && k.mladi).length,
    }
  })
}

const STOLPCI: [Kljuc, keyof IgralecKluba, (k: IgralecKluba) => string][] = [
  ['klub.st.nastopi', 'nastopi', (k) => String(k.nastopi)],
  ['igralec.st.minute', 'minute', (k) => String(k.minute)],
  ['igralec.st.delez', 'delez_minut', (k) => odst(k.delez_minut)],
  ['igralec.st.zacetki', 'zacetki_delez', (k) => odst(k.zacetki_delez)],
  ['klub.st.goli', 'goli', (k) => String(k.goli)],
  ['igralec.st.onoff', 'onoff_ref_90', (k) => st(k.onoff_ref_90)],
  ['igralec.st.kartoni', 'kartoni_90', (k) => st(k.kartoni_90)],
  // Sprememba deleža minut ekipe proti lani, v odstotnih točkah.
  ['klub.st.trend', 'trend_minut', ({ trend_minut: x }) => (x == null ? '–' : `${x > 0 ? '+' : ''}${Math.round(x * 100)}`)],
]

const VRSTICE: [Kljuc, keyof StatEkipe, (x: number | null | undefined) => string][] = [
  ['klub.v.tocke', 'tocke', (x) => st(x)],
  ['klub.v.za', 'za', (x) => st(x)],
  ['klub.v.proti', 'proti', (x) => st(x)],
  ['klub.v.ciste', 'ciste', (x) => odst(x)],
  ['klub.v.tockeDoma', 'tocke_doma', (x) => st(x)],
  ['klub.v.zaDoma', 'za_doma', (x) => st(x)],
  ['klub.v.protiDoma', 'proti_doma', (x) => st(x)],
  ['klub.v.tockeGost', 'tocke_gost', (x) => st(x)],
  ['klub.v.zaGost', 'za_gost', (x) => st(x)],
  ['klub.v.protiGost', 'proti_gost', (x) => st(x)],
  ['klub.v.kartoni', 'kartoni', (x) => st(x)],
]

/** Id kluba iz naslova (?team=): le varno pozitivno celo število. */
function klubIzNaslova(v: string | null): number | undefined {
  if (!v || !/^[1-9]\d*$/.test(v)) return undefined
  const n = Number(v)
  return Number.isSafeInteger(n) ? n : undefined
}

export function Klub() {
  const [q, setQ] = useSearchParams()
  const izbran = klubIzNaslova(q.get('team'))
  const [p, setP] = useState<PregledKluba | null>(null)
  const [napakaK, setNapakaK] = useState<string | null>(null)
  const [razvrsti, setRazvrsti] = useState<keyof IgralecKluba>('minute')
  // Iz zadnjega uspešnega odgovora: administrator ob napaki obdrži izbiro kluba.
  const [adm, setAdm] = useState<{ admin: boolean; country_id: number } | null>(null)

  useEffect(() => {
    let velja = true
    setP(null)
    setNapakaK(null)
    void supabase.rpc('scout_klub', izbran ? { p_team_id: izbran } : {}).then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaK(napaka(error))
      else {
        const r = data as unknown as PregledKluba
        setP(r)
        setAdm({ admin: r.admin, country_id: r.country_id })
      }
    })
    return () => {
      velja = false
    }
  }, [izbran])

  const onIzbira = (id: number) => setQ({ team: String(id) })
  if (napakaK)
    return (
      <div className="space-y-6">
        {adm?.admin && <IzbiraKluba drzava={adm.country_id} onIzbira={onIzbira} />}
        <p className="opozorilo">{napakaK}</p>
      </div>
    )
  if (!p) return <Nalaganje />
  return <PregledKlubaView p={p} razvrsti={razvrsti} setRazvrsti={setRazvrsti} onIzbira={onIzbira} />
}

export function PregledKlubaView({ p, razvrsti, setRazvrsti, onIzbira }: {
  p: PregledKluba
  razvrsti: keyof IgralecKluba
  setRazvrsti: (polje: keyof IgralecKluba) => void
  onIzbira: (id: number) => void
}) {
  const g = p.glava
  const kader = [...p.kader].sort((a, b) => Number(b[razvrsti] ?? -Infinity) - Number(a[razvrsti] ?? -Infinity))
  return (
    <div className="space-y-6">
      {p.admin && <IzbiraKluba drzava={p.country_id} onIzbira={onIzbira} />}

      <header className="kartica space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black naslov sm:text-3xl">{p.ime}</h1>
            {g && <p className="text-sm text-slate-400">{g.liga}{g.sezona ? ` · ${g.sezona}` : ''}</p>}
          </div>
          {g?.mesto != null && g.klubov != null && (
            <p className="text-right text-lg font-bold text-slate-100">{t('klub.mesto', { mesto: g.mesto, n: g.klubov })}</p>
          )}
        </div>
        {g && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
            {g.forma && (
              <span className="flex items-center gap-1">
                <span className="mr-1 text-slate-400">{t('klub.forma')}</span>
                {[...g.forma].map((z, i) => (
                  <span
                    key={i}
                    className={`znacka ${z === 'W' ? 'bg-gnl-400/20 text-gnl-200' : z === 'D' ? 'bg-white/10 text-slate-300' : 'bg-rose-400/15 text-rose-200'}`}
                  >
                    {t(`klub.izid.${z}` as Kljuc)}
                  </span>
                ))}
              </span>
            )}
            {g.elo != null && (
              <span>
                <span className="text-slate-400">{t('klub.elo')}</span>{' '}
                <span className="font-bold tabular-nums text-gnl-300">{Math.round(g.elo)}</span>
                {g.elo_lani != null && <span className="text-slate-400"> · {t('klub.eloLani', { elo: Math.round(g.elo_lani) })}</span>}
              </span>
            )}
            {g.moc_mesto != null && <span className="text-slate-400">{t('klub.moc', { mesto: g.moc_mesto, n: g.lig })}</span>}
          </div>
        )}
      </header>

      {!p.ekipa?.klub ? (
        <p className="kartica p-5 text-center text-slate-400">{t('klub.brezPodatkov')}</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">{t('klub.ekipa')}</h2>
            <div className="kartica overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 text-left text-xs text-slate-400">
                  <tr>
                    <th className="px-3 py-2"><span className="sr-only">{t('klub.ekipa')}</span></th>
                    <th className="px-3 py-2 text-right font-semibold">{t('klub.stKlub')}</th>
                    <th className="px-3 py-2 text-right font-semibold">{t('klub.stLiga')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {VRSTICE.map(([k, polje, f]) => (
                    <tr key={k}>
                      <th scope="row" className="px-3 py-2 text-left font-normal text-slate-300">{t(k)}</th>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-100">{f(p.ekipa?.klub?.[polje])}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">{f(p.ekipa?.liga[polje])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">{t('klub.kader')}</h2>
            <div className="kartica overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-white/10 text-left text-xs text-slate-400">
                  <tr>
                    <th className="sticky left-0 bg-slate-900 px-3 py-2 font-semibold">{t('klub.st.ime')}</th>
                    <th className="px-3 py-2 font-semibold">{t('klub.st.poz')}</th>
                    {STOLPCI.map(([k, polje]) => (
                      <th key={k} aria-sort={razvrsti === polje ? 'descending' : 'none'} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                        <button type="button" onClick={() => setRazvrsti(polje)} className={razvrsti === polje ? 'text-gnl-300' : 'hover:text-slate-200'}>
                          {t(k)}
                          {razvrsti === polje && <span aria-hidden="true"> ▼</span>}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {kader.map((k) => (
                    <tr key={k.player_id} className="group hover:bg-slate-800">
                      <td className="sticky left-0 whitespace-nowrap bg-slate-900 px-3 py-2 group-hover:bg-slate-800">
                        {k.mladi ? (
                          <span className="font-semibold text-slate-100">
                            {k.ime}{' '}
                            <span title={t('klub.mladiOpis')} className="znacka bg-slate-700 text-slate-200">{t('klub.mladi')}</span>
                          </span>
                        ) : (
                          <Link to={`/player/${k.player_id}`} className="font-semibold text-slate-100 hover:text-gnl-300">{k.ime}</Link>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {k.skupina && <span className={`znacka poz-${k.skupina}`}>{t(`poz.${k.skupina}` as Kljuc)}</span>}
                      </td>
                      {STOLPCI.map(([kl, , f]) => (
                        <td key={kl} className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-300">{f(k)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {p.kader.some((k) => k.mladi) && <p className="text-xs text-slate-500">{t('klub.mladi')}: {t('klub.mladiOpis')}</p>}
            <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">{t('klub.globina')}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {globina(p.kader).map((x) => (
                <div key={x.skupina} className="kartica space-y-1 p-4">
                  <span className={`znacka poz-${x.skupina}`}>{t(`skupina.${x.skupina}` as Kljuc)}</span>
                  <p className="text-sm text-slate-200">{t('klub.stalnih', { n: x.stalnih })}</p>
                  {x.nosilec && (
                    <p className="text-xs text-slate-400">
                      {t('klub.nosilec', { ime: x.nosilec.ime, delez: Math.round((x.nosilec.delez_minut ?? 0) * 100) })}
                    </p>
                  )}
                  {x.mladih > 0 && <p className="text-xs text-slate-400">{t('klub.mladiVPoziciji', { n: x.mladih })}</p>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {p.vrzeli.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">{t('nav.vrzeli')}</h2>
          <ul className="kartica divide-y divide-white/5 overflow-hidden">
            {p.vrzeli.map((v, i) => (
              <li key={`${v.vrsta}-${v.skupina}-${v.player_id ?? i}`} className="flex flex-wrap items-center gap-2 px-4 py-3 text-slate-100">
                {v.skupina && <span className={`znacka poz-${v.skupina}`}>{t(`poz.${v.skupina}` as Kljuc)}</span>}
                <span className="min-w-0 flex-1">{opisVrzeli(v)}</span>
                {v.skupina && (
                  <Link to={`/?skupina=${v.skupina}&raven=ista_ali_nizja`} className="gumb-tih px-3 py-1 text-sm">{t('vrzeli.isci')} →</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Izbira kluba za administratorje SLFF (preizkus na pravih klubih); baza preveri še enkrat. */
function IzbiraKluba({ drzava, onIzbira }: { drzava: number; onIzbira: (id: number) => void }) {
  const [iskanje, setIskanje] = useState('')
  const [zadetki, setZadetki] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    const q = iskanje.trim()
    if (q.length < 2) return setZadetki([])
    let velja = true
    void supabase
      .from('teams')
      .select('id, name')
      .eq('country_id', drzava)
      .ilike('name', `%${q.replace(/[%_\\]/g, '')}%`)
      .order('name')
      .limit(8)
      .then(({ data }) => velja && setZadetki(data ?? []))
    return () => {
      velja = false
    }
  }, [iskanje, drzava])

  return (
    <div className="relative">
      <input value={iskanje} onChange={(e) => setIskanje(e.target.value)} placeholder={t('klub.izberi')} aria-label={t('klub.izberi')} className="polje w-full sm:w-80" />
      {zadetki.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-slate-900 p-1 sm:w-80">
          {zadetki.map((z) => (
            <li key={z.id}>
              <button
                type="button"
                onClick={() => {
                  onIzbira(z.id)
                  setIskanje('')
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
              >
                {z.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
