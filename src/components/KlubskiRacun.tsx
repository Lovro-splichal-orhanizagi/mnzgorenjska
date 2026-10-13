// Stran Račun: stanje klubskega računa in prošnja za nov uradni naslov.
// Pravila so v bazi (migracija 20261013201100); tu le prikaz in obrazec.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { mojKlubskiRacun, VLOGE_KLUBA, type StanjeKluba, type VlogaKluba } from '../lib/klubskiRacun'

interface Klub {
  id: number
  name: string
}

export default function KlubskiRacun() {
  const { session, klubPreverjen } = useAuth()
  const [stanje, setStanje] = useState<StanjeKluba | null>(null)
  const [iskanje, setIskanje] = useState('')
  const [zadetki, setZadetki] = useState<Klub[]>([])
  const [klub, setKlub] = useState<Klub | null>(null)
  const [vloga, setVloga] = useState<VlogaKluba>('tajnik')
  const [dokaz, setDokaz] = useState('')
  const [opomba, setOpomba] = useState('')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  // Šele po preverbi ob prijavi (useAuth), da nov klub ne vidi obrazca.
  useEffect(() => {
    if (session && klubPreverjen) void mojKlubskiRacun().then(setStanje)
  }, [session, klubPreverjen])

  useEffect(() => {
    const q = iskanje.trim()
    if (q.length < 2 || klub?.name === q) return setZadetki([])
    let veljavno = true
    void supabase
      .from('teams')
      .select('id, name')
      .ilike('name', `%${q.replace(/[%_]/g, '')}%`)
      .order('name')
      .limit(8)
      .then(({ data }) => {
        if (veljavno) setZadetki((data ?? []) as Klub[])
      })
    return () => {
      veljavno = false
    }
  }, [iskanje, klub])

  if (!session || !stanje) return null
  const potrjen = Boolean(session.user.email_confirmed_at)

  async function poslji() {
    if (!klub) return
    setDela(true)
    setNapaka(null)
    const { error } = await supabase.rpc('klub_zaprosi_za_naslov', {
      p_team_id: klub.id,
      p_vloga: vloga,
      p_dokaz_url: dokaz.trim(),
      p_opomba: opomba.trim() || undefined,
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setStanje(await mojKlubskiRacun())
  }

  const z = stanje.zahtevek
  return (
    <section className="kartica space-y-2 p-3 sm:p-4">
      <h2 className="font-bold">{t('racun.klubskiRacun.naslov')}</h2>
      {stanje.racun ? (
        <>
          <p className="text-sm">{t('racun.klubskiRacun.aktiven', { klub: stanje.racun.team_name })}</p>
          <p className="text-xs text-slate-400">{t('racun.klubskiRacun.pravice')}</p>
        </>
      ) : z?.status === 'odprt' ? (
        <p className="text-sm text-slate-300">
          {z.vrsta === 'brez_kluba'
            ? t('racun.klubskiRacun.cakaBrezKluba')
            : z.vrsta === 'polno'
              ? t('racun.klubskiRacun.cakaPolno')
              : t('racun.klubskiRacun.caka', { klub: z.team_name ?? '' })}
        </p>
      ) : (
        <>
          {z?.status === 'zavrnjen' && (
            <p className="text-sm text-rose-300">{t('racun.klubskiRacun.zavrnjeno', { razlog: z.razlog ?? '' })}</p>
          )}
          <p className="text-sm">{t('racun.klubskiRacun.vprasanje')}</p>
          <p className="text-xs text-slate-400">{t('racun.klubskiRacun.pojasnilo')}</p>
          {!potrjen ? (
            <p className="text-sm text-amber-300">{t('racun.klubskiRacun.nepotrjen')}</p>
          ) : (
            <div className="space-y-2 text-sm">
              <label className="block">
                {t('racun.klubskiRacun.klub')}
                <input
                  value={iskanje}
                  onChange={(e) => {
                    setIskanje(e.target.value)
                    setKlub(null)
                  }}
                  placeholder={t('racun.klubskiRacun.isciKlub')}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
              </label>
              {zadetki.length > 0 && !klub && (
                <ul className="rounded-lg border border-white/10 bg-slate-900">
                  {zadetki.map((k) => (
                    <li key={k.id}>
                      <button
                        type="button"
                        className="w-full px-2 py-1 text-left hover:bg-white/5"
                        onClick={() => {
                          setKlub(k)
                          setIskanje(k.name)
                        }}
                      >
                        {k.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="block">
                {t('racun.klubskiRacun.vloga')}
                <select
                  value={vloga}
                  onChange={(e) => setVloga(e.target.value as VlogaKluba)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                >
                  {VLOGE_KLUBA.map((v) => (
                    <option key={v} value={v}>
                      {t(`racun.klubskiRacun.vloge.${v}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                {t('racun.klubskiRacun.dokaz')}
                <input
                  type="url"
                  value={dokaz}
                  onChange={(e) => setDokaz(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
              </label>
              <label className="block">
                {t('racun.klubskiRacun.opomba')}
                <textarea
                  value={opomba}
                  maxLength={500}
                  onChange={(e) => setOpomba(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1"
                />
              </label>
              <p className="text-xs text-slate-400">
                {t('racun.klubskiRacun.naslovRacuna', { email: session.user.email ?? '' })}
              </p>
              {napaka && <p className="text-rose-400">{napaka}</p>}
              <button
                type="button"
                className="gumb-glavni text-sm disabled:opacity-50"
                disabled={!klub || dela}
                onClick={() => void poslji()}
              >
                {t('racun.klubskiRacun.poslji')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
