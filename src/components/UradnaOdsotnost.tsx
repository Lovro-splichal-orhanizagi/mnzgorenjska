// Uradne odsotnosti potrjenega igralca: vrstica (forum in stran igralca) in
// razdelek na strani igralca z obrazcem za lastnika.
//
// Samo informacija: ne vpliva na izbiro ekip, cene ne točke. Kdo sme javiti,
// zapreti in kdaj je opomin, odloči baza (migracija 20261012135100).
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { t } from '../i18n'
import { prevediNapako } from '../lib/napake'
import { relativniCas } from './Odsotnost'
import { EKIPA_SHRANJENA } from './OpozoriloEkipe'
import {
  IKONA_URADNE,
  NAJVEC_OPOMBA,
  VRSTE_URADNE,
  danes,
  jeAktivna,
  kratekDatum,
  type UradnaOdsotnost,
  type VrstaUradne,
} from '../lib/uradneOdsotnosti'

/** Ena uradna odsotnost. `naZapri` ima le lastnik odprte odsotnosti. */
export function VrsticaUradne({
  odsotnost: o,
  naslov,
  naZapri,
  dela,
}: {
  odsotnost: UradnaOdsotnost
  naslov?: ReactNode
  naZapri?: () => void
  dela?: boolean
}) {
  const aktivna = jeAktivna(o)
  return (
    <li className={`kartica p-3 ${aktivna ? 'border-sky-400/30' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="znacka shrink-0 bg-sky-400/20 text-sky-200" title={t('igralci.uradno.opisZnacke')}>
          <span aria-hidden="true">✓</span> {t('igralci.uradno.znacka')}
        </span>
        <span className="znacka shrink-0 bg-white/10 text-slate-200">
          <span aria-hidden="true">{IKONA_URADNE[o.vrsta] ?? '💬'}</span> {t(`igralci.uradno.vrste.${o.vrsta}`)}
        </span>
        {naslov}
        <span className="ml-auto shrink-0 text-xs text-slate-500">{relativniCas(o.created_at)}</span>
      </div>
      <p className="mt-1.5 text-sm text-slate-300">
        {t('igralci.uradno.odDne', { datum: kratekDatum(o.od) })}
        {' · '}
        {o.vrnitev
          ? t('igralci.uradno.vrnitevDne', { datum: kratekDatum(o.vrnitev) })
          : t('igralci.uradno.vrnitevNeznana')}
      </p>
      {o.opomba && (
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-200">{o.opomba}</p>
      )}
      {o.status === 'ni_drzalo' && o.ni_drzalo_datum && (
        <p className="mt-1 text-sm font-semibold text-rose-300">
          {t('igralci.uradno.niDrzalo', { datum: kratekDatum(o.ni_drzalo_datum) })}
        </p>
      )}
      {o.status === 'zaprto' && o.zaprto_at && (
        <p className="mt-1 text-sm text-gnl-300">
          {t('igralci.uradno.zaprto', { datum: kratekDatum(o.zaprto_at) })}
        </p>
      )}
      {naZapri && o.status === 'odprto' && (
        <button onClick={naZapri} disabled={dela} className="gumb-tih mt-2 text-sm disabled:opacity-50">
          {t('igralci.uradno.spetNared')}
        </button>
      )}
    </li>
  )
}

interface Stanje {
  lastnik: boolean
  opomini: number
  najvec: number
  blokiran: boolean
  sezona: string | null
}

/**
 * Stran igralca: uradne odsotnosti te osebe (vse njene vrstice) in, za
 * lastnika, stanje opominov, "Spet sem nared" in obrazec za novo.
 */
export default function UradneOdsotnostiIgralca({ igralecId }: { igralecId: number }) {
  const { session } = useAuth()
  const uid = session?.user.id ?? null
  const [seznam, setSeznam] = useState<UradnaOdsotnost[]>([])
  const [stanje, setStanje] = useState<Stanje | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)
  const [vrsta, setVrsta] = useState<VrstaUradne>('poskodba')
  const [od, setOd] = useState(danes())
  const [vrnitev, setVrnitev] = useState('')
  const [opomba, setOpomba] = useState('')

  const nalozi = useCallback(async () => {
    // Glavna vrstica pove, katere vrstice so ista oseba (povezani igralci).
    const { data: p } = await supabase
      .from('potrjeni_igralci')
      .select('glavni_player_id')
      .eq('player_id', igralecId)
      .maybeSingle()
    const glavni = p?.glavni_player_id ?? null
    if (glavni == null) {
      setSeznam([])
      setStanje(null)
      return
    }
    const [{ data: s }, { data: st }] = await Promise.all([
      supabase
        .from('uradne_odsotnosti_view')
        .select('*')
        .eq('glavni_player_id', glavni)
        .order('created_at', { ascending: false })
        .limit(20),
      uid
        ? supabase.rpc('stanje_uradne_odsotnosti', { p_player_id: igralecId })
        : Promise.resolve({ data: null }),
    ])
    setSeznam((s ?? []) as UradnaOdsotnost[])
    const vrstica = Array.isArray(st) ? st[0] : null
    setStanje(vrstica ? (vrstica as Stanje) : null)
  }, [igralecId, uid])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  const lastnik = !!stanje?.lastnik
  if (!lastnik && seznam.length === 0) return null

  const odprta = seznam.find((o) => o.moje && o.status === 'odprto' && jeAktivna(o))

  async function zapri(id: number) {
    setNapaka(null)
    setDela(true)
    const { error } = await supabase.rpc('zapri_uradno_odsotnost', { p_id: id })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    window.dispatchEvent(new Event(EKIPA_SHRANJENA))
    await nalozi()
  }

  async function objavi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNapaka(null)
    setDela(true)
    const { error } = await supabase.rpc('objavi_uradno_odsotnost', {
      p_player_id: igralecId,
      p_vrsta: vrsta,
      p_od: od || undefined,
      p_vrnitev: vrnitev || undefined,
      p_opomba: opomba.trim() || undefined,
    })
    setDela(false)
    if (error) return setNapaka(prevediNapako(error.message))
    window.dispatchEvent(new Event(EKIPA_SHRANJENA))
    setOpomba('')
    setVrnitev('')
    await nalozi()
  }

  return (
    <section className="space-y-2" aria-label={t('igralci.uradno.naslov')}>
      <h2 className="mb-2 text-base font-bold text-slate-100">{t('igralci.uradno.naslov')}</h2>

      {seznam.length > 0 && (
        <ul className="space-y-2">
          {seznam.map((o) => (
            <VrsticaUradne
              key={o.id}
              odsotnost={o}
              naZapri={o.moje ? () => void zapri(o.id) : undefined}
              dela={dela}
            />
          ))}
        </ul>
      )}

      {lastnik && stanje && (
        <div className="kartica space-y-2 p-3 text-sm">
          <p className="text-slate-400">{t('igralci.uradno.opis')}</p>
          <p className={stanje.opomini > 0 ? 'font-semibold text-amber-200' : 'text-slate-300'}>
            {t('igralci.uradno.opomini', {
              sezona: stanje.sezona ?? '',
              n: stanje.opomini,
              najvec: stanje.najvec,
            })}
          </p>
          {stanje.blokiran ? (
            <p className="text-rose-300">{t('igralci.uradno.blokiran', { sezona: stanje.sezona ?? '' })}</p>
          ) : odprta ? (
            <p className="text-sky-200">{t('igralci.uradno.imasOdprto')}</p>
          ) : (
            <form onSubmit={objavi} className="space-y-2">
              <fieldset>
                <legend className="text-xs text-slate-400">{t('igralci.uradno.vrsta')}</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {VRSTE_URADNE.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVrsta(v)}
                      aria-pressed={vrsta === v}
                      className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        vrsta === v
                          ? 'bg-gnl-500 text-slate-950'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span aria-hidden="true">{IKONA_URADNE[v]}</span> {t(`igralci.uradno.vrste.${v}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs text-slate-400">
                  {t('igralci.uradno.od')}
                  <input
                    type="date"
                    value={od}
                    onChange={(e) => setOd(e.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  {t('igralci.uradno.vrnitev')}
                  <input
                    type="date"
                    value={vrnitev}
                    min={od || undefined}
                    onChange={(e) => setVrnitev(e.target.value)}
                    placeholder={t('igralci.uradno.neznano')}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                  />
                  {!vrnitev && <span className="mt-0.5 block text-[11px] text-slate-500">{t('igralci.uradno.neznano')}</span>}
                </label>
              </div>
              <label className="block text-xs text-slate-400">
                {t('igralci.uradno.opomba')}
                <input
                  value={opomba}
                  onChange={(e) => setOpomba(e.target.value)}
                  maxLength={NAJVEC_OPOMBA}
                  placeholder={t('igralci.uradno.opombaPrimer')}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                />
              </label>
              <p className="text-[11px] text-slate-400">{t('igralci.uradno.pravilo')}</p>
              <button type="submit" disabled={dela} className="gumb-glavni w-full sm:w-auto">
                {dela ? t('igralci.uradno.objavljam') : t('igralci.uradno.objavi')}
              </button>
            </form>
          )}
        </div>
      )}

      {napaka && <p className="text-sm text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>}
    </section>
  )
}
