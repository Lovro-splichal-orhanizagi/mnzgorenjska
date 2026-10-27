// Prejemnika uradnega kartona določi skupnost; šele preverjena potrditev
// spremeni statistiko. Tudi izbira v čakalni vrsti ostaja popravljiva.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from './Povezava'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { povezavaNaPrijavo } from '../lib/prijava'
import { t } from '../i18n'

export interface GlasovanjeKartonov {
  enabled: boolean
  statistics_pending: boolean
  threshold: number
  events: {
    id: number
    type: 'yellow' | 'red' | 'second_yellow'
    minute: number | null
    added: number | null
    team_id: number
    team_name: string
    status: 'pending' | 'queued' | 'confirmed'
    needs_review?: boolean
    confirmed_player_id: number | null
    my_vote: number | null
    candidates: { player_id: number; full_name: string; shirt_number: number | null; votes: number }[]
  }[]
}

export function StatistikaCakaKartone() {
  return <p role="status" className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-200">{t('tekme.kartoni.statistikaCaka')}</p>
}

export default function KartoniZaGlasovanje({ matchId, onStatisticsPending }: {
  matchId: number
  onStatisticsPending: (pending: boolean) => void
}) {
  const { session } = useAuth()
  const uid = session?.user.id
  const location = useLocation()
  const [data, setData] = useState<GlasovanjeKartonov | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)
  const [retry, setRetry] = useState(0)
  // A response from a previous match/session must never replace the current one.
  const generation = useRef(0)
  useEffect(() => {
    const current = ++generation.current
    setData(null)
    setError(false)
    setSaving(null)
    async function load() {
      try {
        const { data: result, error: failure } = await supabase.rpc('match_fussball_card_votes', { p_match_id: matchId })
        if (generation.current !== current) return
        if (failure || !result || Array.isArray(result)) return setError(true)
        const projection = result as unknown as GlasovanjeKartonov
        setData(projection)
        onStatisticsPending(projection.statistics_pending === true)
      } catch {
        if (generation.current === current) setError(true)
      }
    }
    if (Number.isSafeInteger(matchId) && matchId > 0) void load()
    return () => { generation.current++ }
  }, [matchId, uid, retry, onStatisticsPending])

  async function vote(eventId: number, playerId: number) {
    if (!session || saving !== null) return
    const current = generation.current
    setSaving(eventId)
    setError(false)
    try {
      const { data: result, error: failure } = await supabase.rpc('vote_fussball_card', { p_event_id: eventId, p_player_id: playerId })
      if (generation.current !== current) return
      if (failure || !result || Array.isArray(result)) { setError(true); return }
      const projection = result as unknown as GlasovanjeKartonov
      setData(projection)
      onStatisticsPending(projection.statistics_pending === true)
    } catch {
      if (generation.current === current) setError(true)
    } finally {
      if (generation.current === current) setSaving(null)
    }
  }

  if (!error && (!data?.enabled || !data.events.length)) return null
  return (
    <section className="space-y-3" aria-label={t('tekme.kartoni.naslov')}>
      <h2 className="text-lg font-bold">{t('tekme.kartoni.naslov')}</h2>
      {data?.enabled && <>
        <p className="text-sm text-slate-400">{t('tekme.kartoni.uvod', { prag: data.threshold })}</p>
        <ul className="kartica divide-y divide-white/10 overflow-hidden">
          {data.events.map(event => {
            const confirmed = event.status === 'confirmed'
            const recipient = event.candidates.find(candidate => candidate.player_id === event.confirmed_player_id)
            return <li key={event.id} className="space-y-3 px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-bold tabular-nums text-gnl-300">{event.minute == null ? '—' : `${event.minute}${event.added ? `+${event.added}` : ''}′`}</span>
                <strong>{t(`tekme.kartoni.${event.type}`)}</strong>
                <span className="text-slate-400">{event.team_name}</span>
              </div>
              <p role="status" className="text-sm text-amber-200">{event.needs_review && !confirmed ? t('tekme.kartoni.preveriPrejemnika') : t(`tekme.kartoni.${event.status}`)}</p>
              {confirmed ? <p className="text-sm font-semibold text-gnl-200">{recipient ? `${recipient.shirt_number != null ? `${recipient.shirt_number} — ` : ''}${recipient.full_name}` : t('tekme.kartoni.prejemnikNedosegljiv')}</p> : <>
                {!session && <Link to={povezavaNaPrijavo(location.pathname + location.search)} className="inline-block text-sm font-semibold text-gnl-300 hover:underline">{t('tekme.tekma.prijaviSe')}</Link>}
                <div className="grid gap-2 sm:grid-cols-2">
                  {event.candidates.map(candidate => {
                    const content = <>
                      {candidate.shirt_number != null && <span className="znacka shrink-0 bg-white/10 font-mono tabular-nums text-slate-400">{candidate.shirt_number}</span>}
                      <span className="min-w-0 flex-1 break-words">{candidate.full_name}</span>
                      <span className="shrink-0 tabular-nums text-xs text-slate-400" aria-label={t('tekme.kartoni.glasovi', { n: candidate.votes, prag: data.threshold })}>{candidate.votes} / {data.threshold}</span>
                    </>
                    const style = `flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${event.my_vote === candidate.player_id ? 'bg-gnl-500/25 ring-2 ring-gnl-400' : 'bg-white/5'}`
                    return session ? <button key={candidate.player_id} aria-pressed={event.my_vote === candidate.player_id} disabled={saving !== null} onClick={() => void vote(event.id, candidate.player_id)} className={`${style} enabled:hover:bg-white/10 disabled:opacity-60`}>{content}</button> : <div key={candidate.player_id} className={style}>{content}</div>
                  })}
                </div>
                {!event.candidates.length && <p className="text-sm text-slate-400">{t('tekme.kartoni.brezKandidatov')}</p>}
              </>}
            </li>
          })}
        </ul>
      </>}
      {error && <div role="alert" className="space-y-2 text-sm text-rose-400"><p>{t('tekme.kartoni.napaka')}</p><button className="gumb-tih" onClick={() => setRetry(n => n + 1)}>{t('tekme.kartoni.ponovi')}</button></div>}
    </section>
  )
}
