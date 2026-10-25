// Popravek podatkov igralca (migracija 20261025150100): napačna pozicija ali
// igralec ni več v klubu. Namesto prostega besedila v prijavi "drugo" gre
// popravek v pregled klubu ali adminu; sprejet preživi nočni uvoz.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { t } from '../i18n'
import type { Pozicija } from '../lib/tipi'

const POZICIJE: Pozicija[] = ['GK', 'DEF', 'MID', 'FWD']

export default function PopravekIgralca({
  igralecId,
  pozicija,
  aktiven,
}: {
  igralecId: number
  pozicija: Pozicija | null
  aktiven: boolean
}) {
  const [vrsta, setVrsta] = useState<'pozicija' | 'odhod'>('pozicija')
  const [nova, setNova] = useState<Pozicija | ''>('')
  const [opomba, setOpomba] = useState('')
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  async function poslji() {
    setDela(true)
    setNapaka(null)
    setSporocilo(null)
    const { data, error } = await supabase.rpc('prijavi_popravek', {
      p_vrsta: vrsta,
      p_player_id: igralecId,
      ...(vrsta === 'pozicija' && nova ? { p_pozicija: nova } : {}),
      ...(opomba.trim() ? { p_opomba: opomba.trim() } : {}),
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setSporocilo(t(data === 'sprejet' ? 'skupno.popravki.sprejet' : 'skupno.popravki.caka'))
    setNova('')
    setOpomba('')
  }

  const vnos = 'mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1'
  const gumb = (izbran: boolean) =>
    `znacka transition ${izbran ? 'bg-gnl-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`

  return (
    <details className="kartica p-3 text-sm">
      <summary className="cursor-pointer font-semibold">{t('skupno.popravki.naslov')}</summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs text-slate-400">{t('skupno.popravki.opis')}</p>
        {napaka && <p className="text-rose-400">{napaka}</p>}
        {sporocilo && <p className="text-gnl-300">{sporocilo}</p>}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={gumb(vrsta === 'pozicija')} onClick={() => setVrsta('pozicija')}>
            {t('skupno.popravki.pozicija')}
          </button>
          {aktiven && (
            <button type="button" className={gumb(vrsta === 'odhod')} onClick={() => setVrsta('odhod')}>
              {t('skupno.popravki.odhod')}
            </button>
          )}
        </div>
        {vrsta === 'pozicija' && (
          <div className="grid grid-cols-4 gap-2 sm:max-w-md">
            {POZICIJE.filter((p) => p !== pozicija).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={nova === p}
                onClick={() => setNova(p)}
                className={`rounded-lg px-2 py-1.5 font-semibold ${
                  nova === p ? 'ring-2 ring-gnl-400' : 'ring-1 ring-white/10 hover:ring-white/30'
                } poz-${p}`}
              >
                {t(`skupno.pozicija.${p}`)}
              </button>
            ))}
          </div>
        )}
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
          disabled={dela || (vrsta === 'pozicija' && !nova)}
          onClick={() => void poslji()}
        >
          {t('skupno.popravki.poslji')}
        </button>
      </div>
    </details>
  )
}
