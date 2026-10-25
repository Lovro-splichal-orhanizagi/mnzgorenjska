// Popravek asistence (migracija 20261025150100): tudi po zaprtem glasovanju
// ali ko je skupnost odločila narobe. Odloči klub strelca ali admin; sprejet
// popravek preživi ponovni uvoz zapisnika.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { prikazniIme } from '../lib/pomozno'
import { t } from '../i18n'
import type { Gol, Kandidat } from './GolZaGlasovanje'

const BREZ = 'brez'

export default function PopravekAsistence({ goli, nastopi }: { goli: Gol[]; nastopi: Kandidat[] }) {
  const izbirni = goli.filter((g) => !g.is_own_goal && !g.is_penalty)
  const [golId, setGolId] = useState<number | null>(izbirni[0]?.id ?? null)
  const [podajalec, setPodajalec] = useState('')
  const [opomba, setOpomba] = useState('')
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  if (izbirni.length === 0) return null
  const gol = izbirni.find((g) => g.id === golId) ?? izbirni[0]
  const kandidati = nastopi.filter(
    (n) => n.team_id === gol.team_id && n.player_id !== gol.scorer?.id && Number(n.minutes_played ?? 0) > 0,
  )

  async function poslji() {
    setDela(true)
    setNapaka(null)
    setSporocilo(null)
    const { data, error } = await supabase.rpc('prijavi_popravek', {
      p_vrsta: 'asistenca',
      p_goal_id: gol.id,
      ...(podajalec !== BREZ ? { p_asistent_id: Number(podajalec) } : {}),
      ...(opomba.trim() ? { p_opomba: opomba.trim() } : {}),
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setSporocilo(t(data === 'sprejet' ? 'skupno.popravki.sprejet' : 'skupno.popravki.caka'))
    setPodajalec('')
    setOpomba('')
  }

  const vnos = 'mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1'

  return (
    <details className="kartica p-3 text-sm">
      <summary className="cursor-pointer font-semibold">{t('skupno.popravki.asistenca')}</summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs text-slate-400">{t('skupno.popravki.asistencaOpis')}</p>
        {napaka && <p className="text-rose-400">{napaka}</p>}
        {sporocilo && <p className="text-gnl-300">{sporocilo}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            {t('skupno.popravki.gol')}
            <select
              value={gol.id}
              onChange={(e) => {
                setGolId(Number(e.target.value))
                setPodajalec('')
              }}
              className={vnos}
            >
              {izbirni.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.minute != null ? `${g.minute}' ` : ''}
                  {prikazniIme(g.scorer?.full_name ?? '?')}
                  {g.assist?.full_name ? ` (${prikazniIme(g.assist.full_name)})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {t('skupno.popravki.podajalec')}
            <select value={podajalec} onChange={(e) => setPodajalec(e.target.value)} className={vnos}>
              <option value="" disabled>
                …
              </option>
              {kandidati.map((n) => (
                <option key={n.player_id} value={n.player_id}>
                  {n.shirt_number != null ? `${n.shirt_number} ` : ''}
                  {prikazniIme(n.players?.full_name ?? '?')}
                </option>
              ))}
              <option value={BREZ}>{t('skupno.popravki.brezAsistence')}</option>
            </select>
          </label>
        </div>
        <input
          value={opomba}
          maxLength={300}
          onChange={(e) => setOpomba(e.target.value)}
          placeholder={t('skupno.popravki.opomba')}
          className={vnos}
        />
        <button
          type="button"
          className="gumb-glavni px-3 py-1.5 text-sm disabled:opacity-50"
          disabled={dela || !podajalec}
          onClick={() => void poslji()}
        >
          {t('skupno.popravki.poslji')}
        </button>
      </div>
    </details>
  )
}
