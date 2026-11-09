// Razpoložljivost na strani igralca: uradne odsotnosti potrjenega igralca
// in poročila skupnosti v enem razdelku. Obrazca sta privzeto zaprta, vsak
// za svojim gumbom; odpre ju le, kdor ima kaj javiti.
//
// Samo informativno (glej `Odsotnost.tsx`): poročilo ne odstrani igralca s
// trga in ne vpliva na točke, zato to ni nikoli koristi plačljivega profila.
import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { prevediNapako } from '../lib/napake'
import { povezavaNaPrijavo } from '../lib/prijava'
import { t, tx } from '../i18n'
import { Link } from './Povezava'
import UradneOdsotnostiIgralca from './UradnaOdsotnost'
import { VRSTE, VrsticaPorocila, type Porocilo, type VrstaPorocila } from './Odsotnost'

/** Toliko poročil skupnosti je vidnih, preostala so za "Pokaži vse". */
const VIDNIH = 3

export default function Razpolozljivost({
  igralecId,
  vLigo,
  nazaj,
}: {
  igralecId: number
  /** `?t=<liga>` igralčeve lige ali prazen niz. */
  vLigo: string
  /** Pot za vrnitev po prijavi. */
  nazaj: string
}) {
  const { session } = useAuth()
  const id = useId()
  const [porocila, setPorocila] = useState<Porocilo[]>([])
  const [uradnoPrazno, setUradnoPrazno] = useState(true)
  const [obrazec, setObrazec] = useState(false)
  const [vse, setVse] = useState(false)
  const [vrsta, setVrsta] = useState<VrstaPorocila>('poskodba')
  const [besedilo, setBesedilo] = useState('')
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const naPrazno = useCallback((prazno: boolean) => setUradnoPrazno(prazno), [])

  // Ločena poizvedba, da počasnejši pogled ne zadržuje profila igralca.
  useEffect(() => {
    if (!igralecId) return
    let preklican = false
    supabase
      .from('player_reports_view')
      .select('*')
      .eq('player_id', igralecId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!preklican) setPorocila((data ?? []) as Porocilo[])
      })
    return () => {
      preklican = true
    }
  }, [igralecId])

  async function objavi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return
    const vsebina = besedilo.trim()
    if (!vsebina) return
    setDela(true)
    setNapaka(null)
    const { data, error } = await supabase
      .from('player_reports')
      .insert({ player_id: igralecId, user_id: session.user.id, kind: vrsta, content: vsebina })
      .select('id')
      .single()
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    if (data)
      setPorocila((prej) => [
        {
          id: data.id,
          player_id: igralecId,
          user_id: session.user.id,
          kind: vrsta,
          content: vsebina,
          created_at: new Date().toISOString(),
        },
        ...prej,
      ])
    setBesedilo('')
    setObrazec(false)
  }

  async function izbrisi(porociloId: number) {
    const { error } = await supabase.from('player_reports').delete().eq('id', porociloId)
    if (error) return setNapaka(prevediNapako(error.message))
    setPorocila((prej) => prej.filter((p) => p.id !== porociloId))
  }

  return (
    <section aria-labelledby={`${id}-naslov`} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-naslov`} className="text-base font-bold text-slate-100">
          {t('igralci.razpolozljivost.naslov')}
        </h2>
        <Link to={`/absences${vLigo}`} className="text-xs text-gnl-300 hover:underline">
          {t('igralci.profil.vsaPorocila')}
        </Link>
      </div>

      {porocila.length === 0 && uradnoPrazno && (
        <p className="text-sm text-slate-500">{t('igralci.razpolozljivost.prazno')}</p>
      )}

      <UradneOdsotnostiIgralca igralecId={igralecId} naPrazno={naPrazno} />

      {porocila.length > 0 && (
        <ul className="space-y-2">
          {(vse ? porocila : porocila.slice(0, VIDNIH)).map((p) => (
            <VrsticaPorocila
              key={p.id}
              porocilo={p}
              naIzbris={session?.user?.id === p.user_id ? () => void izbrisi(p.id) : undefined}
            />
          ))}
        </ul>
      )}
      {porocila.length > VIDNIH && (
        <button type="button" onClick={() => setVse((v) => !v)} aria-expanded={vse} className="gumb-tih min-h-11 px-3 text-sm">
          {vse ? t('igralci.razpolozljivost.skrij') : t('igralci.razpolozljivost.pokaziVse', { n: porocila.length })}
        </button>
      )}
      {session ? (
        <>
          <button
            type="button"
            onClick={() => setObrazec((o) => !o)}
            aria-expanded={obrazec}
            aria-controls={`${id}-obrazec`}
            className="gumb-tih min-h-11 px-3 text-sm"
          >
            {t('igralci.odsotnosti.javi')}
          </button>
          {obrazec && (
            <form id={`${id}-obrazec`} onSubmit={objavi} className="kartica space-y-2 p-3">
              <div className="flex flex-wrap gap-1.5">
                {VRSTE.map((v) => (
                  <button
                    key={v.kljuc}
                    type="button"
                    onClick={() => setVrsta(v.kljuc)}
                    aria-pressed={vrsta === v.kljuc}
                    className={`znacka min-h-11 transition ${
                      vrsta === v.kljuc ? 'bg-gnl-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span aria-hidden="true">{v.ikona}</span> {v.oznaka}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={besedilo}
                  onChange={(e) => setBesedilo(e.target.value)}
                  maxLength={500}
                  aria-label={t('igralci.odsotnosti.javi')}
                  placeholder={t('igralci.profil.porociloPrimer')}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
                />
                <button type="submit" disabled={dela || !besedilo.trim()} className="gumb-glavni px-3 py-1.5 text-sm">
                  {t('igralci.odsotnosti.objavi')}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">{t('igralci.profil.samoInformacija')}</p>
            </form>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-500">
          {tx('igralci.profil.zaObjavoPrijava', {}, {
            povezava: (b) => (
              <Link to={povezavaNaPrijavo(nazaj)} className="underline hover:text-gnl-300">
                {b}
              </Link>
            ),
          })}
        </p>
      )}
      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}
    </section>
  )
}
