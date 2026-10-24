// Stran kluba: urejanje za klubski račun tega kluba (migracije 20261013211100
// in 20261013215100). Pozicije čakajo na ponedeljek (uveljavi_pozicije), opis
// in grb veljata takoj. Pravice preveri baza; tu le obrazci.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { pripraviGrb } from '../lib/klubskiRacun'
import type { Predstavitev } from './KlubPredstavitev'
import KlubDodaniIgralci from './KlubDodaniIgralci'

const POZICIJE = ['GK', 'DEF', 'MID', 'FWD'] as const

interface IgralecKluba {
  id: number
  full_name: string | null
}

export default function KlubUrejanje({
  klubId,
  ligaId,
  igralci,
  onSpremeni,
}: {
  klubId: number
  ligaId: number | null
  igralci: IgralecKluba[]
  onSpremeni: () => void
}) {
  const [viri, setViri] = useState<Map<number, { position: string | null; position_source: string | null }>>(new Map())
  const [cakajo, setCakajo] = useState<Map<number, string>>(new Map())
  const [p, setP] = useState<Predstavitev>({ opis: null, spletna_stran: null, instagram: null, facebook: null })
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  // Odprte poškodbe in bolezni igralcev kluba (zamrznitev cene, 20261013233100).
  const [odsotnosti, setOdsotnosti] = useState<
    { id: number; player_name: string | null; vrsta: string; od: string; vrnitev: string | null; potrjena: boolean }[]
  >([])

  const nalozi = useCallback(async () => {
    const ids = igralci.map((i) => i.id)
    const [pl, ck, pr, od] = await Promise.all([
      ids.length
        ? supabase.from('players').select('id, position, position_source').in('id', ids)
        : Promise.resolve({ data: [] as { id: number; position: string | null; position_source: string | null }[] }),
      supabase.rpc('klub_cakajoce_pozicije', { p_team_id: klubId }),
      supabase
        .from('klub_predstavitev')
        .select('opis, spletna_stran, instagram, facebook')
        .eq('team_id', klubId)
        .maybeSingle(),
      supabase.rpc('klub_odsotnosti', { p_team_id: klubId }),
    ])
    setViri(new Map((pl.data ?? []).map((v) => [v.id, { position: v.position, position_source: v.position_source }])))
    setCakajo(new Map((ck.data ?? []).map((c) => [c.igralec, c.pozicija])))
    if (pr.data) setP(pr.data as Predstavitev)
    setOdsotnosti(od.data ?? [])
  }, [igralci, klubId])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  async function izvedi(fn: () => PromiseLike<{ error: { message: string } | null }>, uspeh?: string) {
    setDela(true)
    setNapaka(null)
    setSporocilo(null)
    const { error } = await fn()
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    if (uspeh) setSporocilo(uspeh)
    await nalozi()
  }

  async function naloziGrb(datoteka: File) {
    setDela(true)
    setNapaka(null)
    setSporocilo(null)
    try {
      const { blob, koncnica } = await pripraviGrb(datoteka)
      const pot = `${klubId}/grb-${crypto.randomUUID().slice(0, 8)}.${koncnica}`
      const { error: eN } = await supabase.storage
        .from('grbi-klubov')
        .upload(pot, blob, { contentType: blob.type, upsert: false, cacheControl: '31536000' })
      if (eN) throw eN
      const { error: eG } = await supabase.rpc('klub_nastavi_grb', { p_team_id: klubId, p_pot: pot })
      if (eG) throw eG
      setSporocilo(t('lestvice.klub.urejanje.grbNalozen'))
      onSpremeni()
    } catch {
      setNapaka(t('lestvice.klub.urejanje.grbNapaka'))
    } finally {
      setDela(false)
    }
  }

  const vnos = 'mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1'

  return (
    <details className="kartica group p-3 sm:p-4">
      <summary className="cursor-pointer list-none font-bold">
        <span className="mr-1 inline-block text-slate-500 transition group-open:rotate-90">›</span>
        {t('lestvice.klub.urejanje.naslov')}
      </summary>
      <p className="mt-1 text-xs text-slate-400">{t('lestvice.klub.urejanje.opisRazdelka')}</p>
      {napaka && <p className="mt-2 text-sm text-rose-400">{napaka}</p>}
      {sporocilo && <p className="mt-2 text-sm text-gnl-300">{sporocilo}</p>}

      <section className="mt-4 space-y-2">
        <h3 className="font-semibold">{t('lestvice.klub.urejanje.odsotnosti')}</h3>
        <p className="text-xs text-slate-400">{t('lestvice.klub.urejanje.odsotnostiOpis')}</p>
        {odsotnosti.length === 0 ? (
          <p className="text-sm text-slate-500">{t('lestvice.klub.urejanje.niOdsotnosti')}</p>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {odsotnosti.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-1">
                <span className="min-w-0 truncate">
                  {o.player_name} · {t(`igralci.uradno.vrste.${o.vrsta as 'poskodba' | 'bolezen'}`)}
                </span>
                {o.potrjena ? (
                  <span className="znacka bg-sky-400/20 text-sky-200">✓ {t('lestvice.klub.urejanje.potrjeno')}</span>
                ) : (
                  <button
                    type="button"
                    className="gumb-glavni text-xs disabled:opacity-50"
                    disabled={dela}
                    onClick={() => void izvedi(() => supabase.rpc('klub_potrdi_odsotnost', { p_id: o.id }))}
                  >
                    {t('lestvice.klub.urejanje.potrdi')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {ligaId != null && <KlubDodaniIgralci klubId={klubId} ligaId={ligaId} />}

      <section className="mt-4 space-y-2">
        <h3 className="font-semibold">{t('lestvice.klub.urejanje.pozicije')}</h3>
        <p className="text-xs text-slate-400">{t('lestvice.klub.urejanje.pozicijeOpis')}</p>
        <ul className="divide-y divide-white/5 text-sm">
          {igralci.map((i) => {
            const v = viri.get(i.id)
            const caka = cakajo.get(i.id)
            const admin = v?.position_source === 'admin'
            return (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-1">
                <span className="min-w-0 truncate">{i.full_name}</span>
                <span className="flex items-center gap-2">
                  {caka && (
                    <span className="znacka bg-amber-400/20 text-amber-200">
                      {caka} · {t('lestvice.klub.urejanje.veljaOdPonedeljka')}
                    </span>
                  )}
                  {caka && (
                    <button
                      type="button"
                      className="text-xs text-slate-400 underline"
                      disabled={dela}
                      onClick={() => void izvedi(() => supabase.rpc('klub_preklici_pozicijo', { p_player_id: i.id }))}
                    >
                      {t('lestvice.klub.urejanje.preklici')}
                    </button>
                  )}
                  <select
                    value={caka ?? v?.position ?? ''}
                    disabled={dela || admin}
                    title={admin ? t('lestvice.klub.urejanje.zaklenjenoAdmin') : undefined}
                    onChange={(e) =>
                      void izvedi(() =>
                        supabase.rpc('klub_nastavi_pozicijo', { p_player_id: i.id, p_position: e.target.value }),
                      )
                    }
                    className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 disabled:opacity-50"
                  >
                    {!v?.position && !caka && <option value="">?</option>}
                    {POZICIJE.map((poz) => (
                      <option key={poz} value={poz}>
                        {poz}
                      </option>
                    ))}
                  </select>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-4 space-y-2 text-sm">
        <h3 className="font-semibold">{t('lestvice.klub.urejanje.predstavitev')}</h3>
        <label className="block">
          {t('lestvice.klub.urejanje.opis')}
          <textarea
            maxLength={300}
            value={p.opis ?? ''}
            onChange={(e) => setP({ ...p, opis: e.target.value })}
            className={vnos}
          />
        </label>
        <label className="block">
          {t('lestvice.klub.urejanje.spletnaStran')}
          <input
            type="url"
            value={p.spletna_stran ?? ''}
            onChange={(e) => setP({ ...p, spletna_stran: e.target.value })}
            className={vnos}
          />
        </label>
        <label className="block">
          {t('lestvice.klub.urejanje.instagram')}
          <input
            value={p.instagram ?? ''}
            onChange={(e) => setP({ ...p, instagram: e.target.value })}
            className={vnos}
          />
        </label>
        <label className="block">
          {t('lestvice.klub.urejanje.facebook')}
          <input value={p.facebook ?? ''} onChange={(e) => setP({ ...p, facebook: e.target.value })} className={vnos} />
        </label>
        <button
          type="button"
          className="gumb-glavni text-sm disabled:opacity-50"
          disabled={dela}
          onClick={() =>
            void izvedi(
              () =>
                supabase.rpc('klub_uredi_predstavitev', {
                  p_team_id: klubId,
                  p_opis: p.opis ?? '',
                  p_spletna_stran: p.spletna_stran ?? '',
                  p_instagram: (p.instagram ?? '').replace(/^@/, ''),
                  p_facebook: p.facebook ?? '',
                }),
              t('lestvice.klub.urejanje.shranjeno'),
            ).then(onSpremeni)
          }
        >
          {t('lestvice.klub.urejanje.shrani')}
        </button>
      </section>

      <section className="mt-4 space-y-2 text-sm">
        <h3 className="font-semibold">{t('lestvice.klub.urejanje.grb')}</h3>
        <label className="gumb-tih inline-block cursor-pointer text-sm">
          {t('lestvice.klub.urejanje.naloziGrb')}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={dela}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void naloziGrb(f)
            }}
          />
        </label>
      </section>
    </details>
  )
}
