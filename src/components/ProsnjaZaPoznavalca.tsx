import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t, tx } from '../i18n'

interface Klub {
  id: number
  name: string | null
}

const VLOGE: Array<[string, string]> = [
  ['igralec', t('igralci.poznavalec.vloge.igralec')],
  ['trener', t('igralci.poznavalec.vloge.trener')],
  ['vodstvo', t('igralci.poznavalec.vloge.vodstvo')],
  ['navijac', t('igralci.poznavalec.vloge.navijac')],
]

/**
 * Prijava za poznavalca lige.
 *
 * Igralci, trenerji in vodstva klubov vedo, kdo kje igra in kdo je podal —
 * stran jih mora vprašati, ne čakati na naključni mail. Prošnjo odobri admin
 * (za klub ali za celo ligo), ker gre za utež nad podatki cele lige.
 */
export default function ProsnjaZaPoznavalca({
  competitionId,
  klubi,
  insiderCompetitionId,
}: {
  competitionId: number
  klubi: Klub[]
  insiderCompetitionId: number | null
}) {
  const { session } = useAuth()
  const [odprto, setOdprto] = useState(false)
  const [status, setStatus] = useState<string | null | undefined>(undefined)
  const [klub, setKlub] = useState<number | ''>('')
  const [vloga, setVloga] = useState('igralec')
  const [sporocilo, setSporocilo] = useState('')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
    if (!session) return
    let veljavno = true
    supabase
      .from('poznavalec_prosnje')
      .select('status')
      .eq('user_id', session.user.id)
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (veljavno) setStatus((data?.[0]?.status as string | undefined) ?? null)
      })
    return () => {
      veljavno = false
    }
  }, [session, competitionId])

  async function poslji() {
    setNapaka(null)
    if (klub === '') return setNapaka(t('igralci.poznavalec.izberiKlubNapaka'))
    setDela(true)
    const { error } = await supabase.rpc('zaprosi_za_poznavalca', {
      p_competition_id: competitionId,
      p_team_id: Number(klub),
      p_vloga: vloga,
      p_sporocilo: sporocilo || undefined,
    })
    setDela(false)
    if (error) return setNapaka(error.message)
    setStatus('caka')
    setOdprto(false)
  }

  if (!session || status === undefined) return null

  if (insiderCompetitionId === competitionId)
    return (
      <p className="text-xs text-sky-200">
        <span aria-hidden="true">★ </span>{t('igralci.poznavalec.siPoznavalec')}
      </p>
    )

  if (status === 'caka')
    return (
      <p className="text-xs text-slate-400">
        {t('igralci.poznavalec.caka')}
      </p>
    )

  if (!odprto)
    return (
      <p className="text-xs text-slate-400">
        {tx('igralci.poznavalec.povabilo', {}, {
          gumb: (b) => (
            <button onClick={() => setOdprto(true)} className="text-gnl-300 hover:underline">
              {b}
            </button>
          ),
        })}
      </p>
    )

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm">
      <p className="text-xs text-slate-400">
        {t('igralci.poznavalec.opis')}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-slate-400">
          {t('igralci.poznavalec.vloga')}
          <select
            value={vloga}
            onChange={(e) => setVloga(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {VLOGE.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          {t('igralci.poznavalec.klub')}
          <select
            value={klub}
            onChange={(e) => setKlub(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{t('igralci.poznavalec.izberi')}</option>
            {klubi.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-xs text-slate-400">
        {t('igralci.poznavalec.oSebi')}
        <input
          value={sporocilo}
          onChange={(e) => setSporocilo(e.target.value.slice(0, 500))}
          placeholder={t('igralci.poznavalec.oSebiPrimer')}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={poslji} disabled={dela} className="gumb-glavni text-sm">
          {dela ? t('igralci.poznavalec.posiljam') : t('igralci.poznavalec.poslji')}
        </button>
        <button onClick={() => setOdprto(false)} className="text-sm text-slate-400 hover:text-slate-200">
          {t('skupno.preklici')}
        </button>
      </div>
      {napaka && <p className="text-xs text-rose-400">{napaka}</p>}
    </div>
  )
}
