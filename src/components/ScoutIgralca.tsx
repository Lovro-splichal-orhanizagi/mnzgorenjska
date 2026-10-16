// SLFF Scout na prevzetem profilu (faza 2): privolitev (odprt za prestop,
// letnica, regije, stik) in ugovor. Vidi jo le potrjeni lastnik med urejanjem
// profila, ko je država lige odprta za Scout — v zaprti državi le še preklic
// privolitve oziroma ugovora (GDPR: umik kadarkoli). Vsa preverjanja so v bazi
// (scout_*, migracija 20261016160100).
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { prevediNapako } from '../lib/napake'
import { Link } from './Povezava'
import { t, tx } from '../i18n'

interface Stanje {
  drzava_odprta: boolean
  country_id: number
  skrit: boolean
  odprt_za_prestop: boolean | null
  letnik: number | null
  regije: number[] | null
  kontakt_dovoljen: boolean | null
}

/** Najmlajša dovoljena letnica: polnoleten vse tekoče leto (isto pravilo kot scout_shrani_privolitev). */
const NAJMLAJSI = new Date().getFullYear() - 19

export function ScoutIgralca({ glavni }: { glavni: number }) {
  const [stanje, setStanje] = useState<Stanje | null>(null)
  const [zveze, setZveze] = useState<{ id: number; name: string }[]>([])
  const [odprt, setOdprt] = useState(false)
  const [letnik, setLetnik] = useState('')
  const [regije, setRegije] = useState<number[]>([])
  const [kontakt, setKontakt] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const nalozi = useCallback(async () => {
    const { data } = await supabase.rpc('scout_moj_profil', { p_player_id: glavni })
    const s: Stanje | null = data?.[0] ?? null
    setStanje(s)
    if (!s?.drzava_odprta) return
    setOdprt(!!s.odprt_za_prestop)
    setLetnik(s.letnik ? String(s.letnik) : '')
    setRegije(s.regije ?? [])
    setKontakt(!!s.kontakt_dovoljen)
    const { data: z } = await supabase
      .from('federations')
      .select('id, name')
      .eq('country_id', s.country_id)
      .eq('active', true)
      .order('sort_order')
    setZveze(z ?? [])
  }, [glavni])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  if (!stanje || !(stanje.drzava_odprta || stanje.letnik != null || stanje.skrit)) return null

  // Strežnik je merilo: njegovo napako pokažemo (prevedeno, kjer jo poznamo).
  async function klic(fn: () => PromiseLike<{ error: { message: string } | null }>, uspeh: string) {
    setNapaka(null)
    setSporocilo(null)
    setDela(true)
    const { error } = await fn()
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message) || t('igralci.scout.napaka'))
    setSporocilo(uspeh)
    await nalozi()
  }

  function shrani(e: FormEvent) {
    e.preventDefault()
    void klic(
      () =>
        supabase.rpc('scout_shrani_privolitev', {
          p_player_id: glavni,
          p_odprt: odprt,
          p_letnik: Number(letnik),
          p_regije: regije,
          p_kontakt: kontakt,
        }),
      t('igralci.scout.shranjeno'),
    )
  }

  function preklici() {
    void klic(
      () => supabase.rpc('scout_preklici_privolitev', { p_player_id: glavni }),
      t('igralci.scout.preklicano'),
    )
  }

  function ugovor(skrij: boolean) {
    void klic(() => supabase.rpc('scout_ugovor', { p_player_id: glavni, p_skrij: skrij }), t('igralci.scout.shranjeno'))
  }

  return (
    <section className="kartica space-y-3 p-3 text-sm" aria-label={t('igralci.scout.naslov')}>
      <h3 className="font-bold">{t('igralci.scout.naslov')}</h3>
      <p className="text-slate-300">{t('igralci.scout.opis')}</p>
      {stanje.skrit ? (
        <>
          <p className="text-amber-200">{t('igralci.scout.skrit')}</p>
          <button type="button" disabled={dela} onClick={() => ugovor(false)} className="gumb-tih disabled:opacity-50">
            {t('igralci.scout.razkrij')}
          </button>
        </>
      ) : !stanje.drzava_odprta ? (
        <button
          type="button"
          disabled={dela}
          onClick={preklici}
          className="gumb-tih disabled:opacity-50"
        >
          {t('igralci.scout.preklici')}
        </button>
      ) : (
        <form onSubmit={shrani} className="space-y-3">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={odprt} onChange={(e) => setOdprt(e.target.checked)} />
            {t('igralci.scout.odprt')}
          </label>
          <label className="block space-y-1">
            <span className="text-slate-300">{t('igralci.scout.letnik')}</span>
            <input
              type="number"
              required
              min={1940}
              max={NAJMLAJSI}
              value={letnik}
              onChange={(e) => setLetnik(e.target.value)}
              className="w-32 rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <fieldset className="space-y-1">
            <legend className="text-slate-300">{t('igralci.scout.regije')}</legend>
            <div className="flex flex-wrap gap-x-4">
              {zveze.map((z) => (
                <label key={z.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={regije.includes(z.id)}
                    onChange={(e) =>
                      setRegije((r) => (e.target.checked ? [...r, z.id] : r.filter((x) => x !== z.id)))
                    }
                  />
                  {z.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={kontakt} onChange={(e) => setKontakt(e.target.checked)} />
            {t('igralci.scout.kontakt')}
          </label>
          <p className="text-xs text-slate-400">
            {tx('igralci.scout.privolitev', {}, {
              pravno: (v) => (
                <Link to="/legal#scout" className="text-gnl-300 underline">
                  {v}
                </Link>
              ),
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={dela} className="gumb-glavni disabled:opacity-50">
              {t('igralci.scout.shrani')}
            </button>
            {stanje.letnik != null && (
              <button
                type="button"
                disabled={dela}
                onClick={preklici}
                className="gumb-tih disabled:opacity-50"
              >
                {t('igralci.scout.preklici')}
              </button>
            )}
            <button
              type="button"
              disabled={dela}
              onClick={() => window.confirm(t('igralci.scout.skrijPotrdi')) && ugovor(true)}
              className="text-xs text-slate-500 hover:text-rose-300"
            >
              {t('igralci.scout.skrij')}
            </button>
          </div>
        </form>
      )}
      {napaka && <p role="alert" className="text-rose-400">{napaka}</p>}
      {sporocilo && <p role="status" className="text-gnl-300">{sporocilo}</p>}
    </section>
  )
}
