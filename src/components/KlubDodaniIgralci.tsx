// Urejanje kluba: klubski račun doda igralca, ki ga vir še ne pozna
// (migracija 20261024123700). Igralec je takoj na trgu, točke dobi z nastopom
// v zapisniku; uvoz ga takrat posvoji. Pravice in omejitev preveri baza.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import { prevediNapako } from '../lib/napake'

const POZICIJE = ['GK', 'DEF', 'MID', 'FWD'] as const
const OMEJITEV = 25

interface Dodan {
  dnevnik: number
  igralec: number | null
  ime: string
  pozicija: string | null
  liga: string
  odstranjen: string | null
  nastopov: number
  aktiven: boolean
}

export default function KlubDodaniIgralci({ klubId, ligaId }: { klubId: number; ligaId: number }) {
  const [dodani, setDodani] = useState<Dodan[]>([])
  const [ime, setIme] = useState('')
  const [priimek, setPriimek] = useState('')
  const [pozicija, setPozicija] = useState<(typeof POZICIJE)[number]>('MID')
  const [dres, setDres] = useState('')
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data } = await supabase.rpc('klub_dodani', { p_team_id: klubId })
    setDodani((data ?? []) as Dodan[])
  }, [klubId])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function dodaj() {
    setDela(true)
    setNapaka(null)
    setSporocilo(null)
    const st = dres.trim() ? Number(dres) : undefined
    const { error } = await supabase.rpc('klub_dodaj_igralca', {
      p_competition_id: ligaId,
      p_ime: ime,
      p_priimek: priimek,
      p_position: pozicija,
      ...(st != null ? { p_st: st } : {}),
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setSporocilo(t('lestvice.klub.urejanje.dodan', { ime: `${ime.trim()} ${priimek.trim()}` }))
    setIme('')
    setPriimek('')
    setDres('')
    await nalozi()
  }

  async function odstrani(id: number) {
    setDela(true)
    setNapaka(null)
    setSporocilo(null)
    const { data, error } = await supabase.rpc('klub_odstrani_igralca', { p_player_id: id })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    setSporocilo(t(data === 'umaknjen' ? 'lestvice.klub.urejanje.umaknjen' : 'lestvice.klub.urejanje.izbrisan'))
    await nalozi()
  }

  const vnos = 'mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1'

  return (
    <section className="mt-4 space-y-2 text-sm">
      <h3 className="font-semibold">{t('lestvice.klub.urejanje.dodaj')}</h3>
      <p className="text-xs text-slate-400">{t('lestvice.klub.urejanje.dodajOpis', { n: OMEJITEV })}</p>
      {napaka && <p className="text-rose-400">{napaka}</p>}
      {sporocilo && <p className="text-gnl-300">{sporocilo}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          {t('lestvice.klub.urejanje.ime')}
          <input value={ime} maxLength={40} onChange={(e) => setIme(e.target.value)} className={vnos} />
        </label>
        <label className="block">
          {t('lestvice.klub.urejanje.priimek')}
          <input value={priimek} maxLength={40} onChange={(e) => setPriimek(e.target.value)} className={vnos} />
        </label>
        <label className="block">
          {t('lestvice.klub.urejanje.pozicijaIzbira')}
          <select
            value={pozicija}
            onChange={(e) => setPozicija(e.target.value as (typeof POZICIJE)[number])}
            className={vnos}
          >
            {POZICIJE.map((poz) => (
              <option key={poz} value={poz}>
                {t(`skupno.pozicija.${poz}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          {t('lestvice.klub.urejanje.dres')}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={dres}
            onChange={(e) => setDres(e.target.value)}
            className={vnos}
          />
        </label>
      </div>
      <button
        type="button"
        className="gumb-glavni text-sm disabled:opacity-50"
        disabled={dela || !ime.trim() || !priimek.trim()}
        onClick={() => void dodaj()}
      >
        {t('lestvice.klub.urejanje.dodajGumb')}
      </button>

      {dodani.length > 0 && (
        <>
          <h4 className="pt-2 font-semibold">{t('lestvice.klub.urejanje.dodani')}</h4>
          <p className="text-xs text-slate-400">
            {t('lestvice.klub.urejanje.porabljeno', { n: dodani.length, od: OMEJITEV })}
          </p>
          <ul className="divide-y divide-white/5">
            {dodani.map((d) => (
              <li key={d.dnevnik} className="flex flex-wrap items-center justify-between gap-2 py-1">
                <span className="min-w-0 truncate">
                  {d.ime} · {d.pozicija ?? '?'} · <span className="text-slate-500">{d.liga}</span>
                </span>
                <span className="flex items-center gap-2">
                  {d.odstranjen || !d.aktiven ? (
                    <span className="znacka bg-slate-400/20 text-slate-300">{t('lestvice.klub.urejanje.odstranjen')}</span>
                  ) : d.nastopov > 0 ? (
                    <span className="znacka bg-sky-400/20 text-sky-200">✓ {t('lestvice.klub.urejanje.vZapisniku')}</span>
                  ) : (
                    <>
                      <span className="znacka bg-amber-400/20 text-amber-200">{t('lestvice.klub.urejanje.caka')}</span>
                      {d.igralec != null && (
                        <button
                          type="button"
                          className="text-xs text-slate-400 underline"
                          disabled={dela}
                          onClick={() => void odstrani(d.igralec!)}
                        >
                          {t('lestvice.klub.urejanje.odstrani')}
                        </button>
                      )}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
