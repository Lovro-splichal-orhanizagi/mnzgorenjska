import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SKUPINE, supabase, type Zadetek } from '../baza'
import { napaka, stevilo, t, type Kljuc } from '../besede'
import { Nalaganje, useSeja } from '../seja'

const RAVNI = ['vse', 'ista_ali_nizja', 'nizja'] as const
const STRAN = 25
const NAJVEC = 200 // baza vrne največ prvih 200

/** Filtri iz naslova; neznano ali pokvarjeno pade na privzeto (naslov lahko kdo prilepi). */
function filtri(q: URLSearchParams) {
  const m = Number(q.get('min'))
  return {
    skupina: SKUPINE.find((s) => s === q.get('skupina')),
    raven: RAVNI.find((r) => r === q.get('raven')) ?? 'vse',
    regije: (q.get('regije') ?? '').split(',').map(Number).filter((n) => Number.isSafeInteger(n) && n > 0),
    min: Number.isFinite(m) ? Math.min(Math.max(0, Math.round(m)), 100000) : 0,
    odprti: q.get('odprti') === '1',
  }
}

/** Enovrstična utemeljitev: razvrstitev in prednosti, brez negativnih oznak (spec 2). */
export function utemeljitev(z: Pick<Zadetek, 'percentil' | 'skupina' | 'minute' | 'delez_minut' | 'goli_90_pri_nas'>): string {
  const deli = [
    t('iskanje.razlog', {
      percentil: Math.round(z.percentil),
      skupina: t(`skupinaMed.${z.skupina}` as Kljuc),
      minute: z.minute,
      delez: Math.round(z.delez_minut * 100),
    }),
  ]
  if (z.goli_90_pri_nas != null && z.goli_90_pri_nas > 0) deli.push(t('iskanje.goli', { goli: stevilo(z.goli_90_pri_nas, 2) }))
  return deli.join(' · ')
}

/** Pod tem zaupanjem (malo minut ali delni zapisniki) pokaži nevtralno opombo o količini podatkov. */
export const MALO_PODATKOV = 0.5

/** CSV iz naloženih vrstic, prenos v brskalniku. Celica, ki se začne z =+-@, dobi ' (vbrizg formul v Excel). */
export function prenesiCsv(ime: string, vrstice: (string | number)[][]): void {
  const celica = (x: string | number) => {
    const v = typeof x === 'string' && /^[=+\-@]/.test(x) ? `'${x}` : String(x)
    return /[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }
  const csv = '\ufeff' + vrstice.map((r) => r.map(celica).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = ime
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function Iskanje() {
  const { klub } = useSeja()
  const [q, setQ] = useSearchParams()
  const [zveze, setZveze] = useState<{ id: number; name: string }[]>([])
  const [napakaZ, setNapakaZ] = useState<string | null>(null)
  const drzava = klub?.country_id
  const f = filtri(q)

  useEffect(() => {
    if (!drzava) return
    void supabase
      .from('federations')
      .select('id, name')
      .eq('country_id', drzava)
      .order('name')
      .then(({ data, error }) => {
        setZveze(data ?? [])
        setNapakaZ(error ? napaka(error) : null)
      })
  }, [drzava])

  function isci(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const podatki = new FormData(e.currentTarget)
    const novo = new URLSearchParams()
    const skupina = String(podatki.get('skupina') ?? '')
    const raven = String(podatki.get('raven') ?? 'vse')
    const min = Number(podatki.get('min') ?? 0)
    const regije = podatki.getAll('regije').map(String)
    if (skupina) novo.set('skupina', skupina)
    if (raven !== 'vse') novo.set('raven', raven)
    if (min > 0) novo.set('min', String(min))
    if (regije.length) novo.set('regije', regije.join(','))
    if (podatki.get('odprti')) novo.set('odprti', '1')
    setQ(novo)
  }

  const iskanje = q.toString()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black naslov sm:text-3xl">{t('iskanje.naslov')}</h1>
      <form key={`filtri?${iskanje}`} onSubmit={isci} className="kartica grid gap-4 p-5 text-sm text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          {t('iskanje.pozicija')}
          <select name="skupina" defaultValue={f.skupina ?? ''} className="polje">
            <option value="">{t('iskanje.vse')}</option>
            {SKUPINE.map((s) => (
              <option key={s} value={s}>{t(`skupina.${s}` as Kljuc)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('iskanje.raven')}
          <select name="raven" defaultValue={f.raven} className="polje">
            {RAVNI.map((r) => (
              <option key={r} value={r}>{t(`iskanje.raven.${r}` as Kljuc)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('iskanje.minMinut')}
          <input name="min" type="number" min={0} defaultValue={f.min} className="polje" />
        </label>
        <label className="flex items-center gap-2 self-end py-2 text-slate-200">
          <input type="checkbox" name="odprti" defaultChecked={f.odprti} className="accent-gnl-400" />
          {t('iskanje.odprti')}
        </label>
        {zveze.length > 1 && (
          <fieldset className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
            <legend className="mb-1">{t('iskanje.regije')}</legend>
            {zveze.map((z) => (
              <label key={z.id} className="flex items-center gap-1.5 text-slate-200">
                <input type="checkbox" name="regije" value={z.id} defaultChecked={f.regije.includes(z.id)} className="accent-gnl-400" />
                {z.name}
              </label>
            ))}
          </fieldset>
        )}
        {napakaZ && <p className="opozorilo sm:col-span-2 lg:col-span-4">{napakaZ}</p>}
        <button className="gumb-glavni justify-self-start sm:col-span-2 lg:col-span-4">{t('iskanje.isci')}</button>
      </form>
      <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
      <Rezultati key={iskanje} iskanje={iskanje} />
    </div>
  )
}

function Rezultati({ iskanje }: { iskanje: string }) {
  const [od, setOd] = useState(0)
  const [vrstice, setVrstice] = useState<Zadetek[]>([])
  const [stanje, setStanje] = useState<'nalaga' | 'ok' | 'konec'>('nalaga')
  const [napakaI, setNapakaI] = useState<string | null>(null)
  // Ponovni poskus iste strani po napaki: od ostane, poskus sproži nov klic.
  const [poskus, setPoskus] = useState(0)

  useEffect(() => {
    const f = filtri(new URLSearchParams(iskanje))
    let velja = true
    setStanje('nalaga')
    setNapakaI(null)
    void supabase
      .rpc('scout_isci', {
        p_skupina: f.skupina,
        p_raven: f.raven,
        p_regije: f.regije,
        p_min_minut: f.min,
        p_samo_odprti: f.odprti,
        p_od: od,
      })
      .then(({ data, error }) => {
        if (!velja) return
        if (error) {
          setNapakaI(napaka(error))
          setStanje('ok')
          return
        }
        const nove = data ?? []
        // Nov model med stranema premakne vrstni red: istega igralca ne pokaži dvakrat.
        setVrstice((prej) => {
          if (od === 0) return nove
          const ze = new Set(prej.map((z) => z.player_id))
          return [...prej, ...nove.filter((z) => !ze.has(z.player_id))]
        })
        setStanje(nove.length < STRAN || od + STRAN >= NAJVEC ? 'konec' : 'ok')
      })
    return () => {
      velja = false
    }
  }, [iskanje, od, poskus])

  if (napakaI && vrstice.length === 0)
    return (
      <div className="space-y-3">
        <p className="opozorilo">{napakaI}</p>
        <button type="button" onClick={() => setPoskus(poskus + 1)} className="gumb-tih text-sm">{t('napaka.znova')}</button>
      </div>
    )
  if (stanje !== 'nalaga' && vrstice.length === 0) return <p className="kartica p-5 text-center text-slate-400">{t('iskanje.prazno')}</p>
  return (
    <div className="space-y-3">
      <ul className="kartica divide-y divide-white/5 overflow-hidden">
        {vrstice.map((z) => (
          <li key={z.player_id}>
            <Link to={`/player/${z.player_id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-white/5">
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-100">{z.ime}</span>
                  <span className={`znacka poz-${z.skupina}`} title={t(`skupina.${z.skupina}` as Kljuc)}>{t(`poz.${z.skupina}` as Kljuc)}</span>
                  {z.odprt_za_prestop && <span className="znacka-odprt">{t('iskanje.odprt')}</span>}
                  {z.zaupanje < MALO_PODATKOV && <span className="znacka bg-white/10 text-slate-300" title={t('iskanje.maloPodatkovOpis')}>{t('iskanje.maloPodatkov')}</span>}
                </span>
                <span className="block text-xs text-slate-400">{z.klub} · {z.liga}</span>
                <span className="block text-sm text-slate-300" title={z.goli_90_pri_nas ? t('iskanje.goliOpis') : undefined}>{utemeljitev(z)}</span>
              </span>
              <span className="shrink-0 cursor-help text-right" title={t('iskanje.percentilOpis')}>
                <span className="block text-2xl font-black tabular-nums text-gnl-300">{Math.round(z.percentil)}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('iskanje.percentil')}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {stanje === 'nalaga' && <Nalaganje />}
      {napakaI && <p className="opozorilo">{napakaI}</p>}
      <div className="flex flex-wrap gap-2">
        {stanje === 'ok' && (
          <button type="button" onClick={() => (napakaI ? setPoskus(poskus + 1) : setOd(od + STRAN))} className="gumb-tih text-sm">
            {napakaI ? t('napaka.znova') : t('iskanje.vec')}
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            prenesiCsv('scout-iskanje.csv', [
              [t('klub.st.ime'), t('klub.st.poz'), t('igralec.st.klub'), t('igralec.st.liga'), t('iskanje.percentil'), t('igralec.st.minute'), t('igralec.st.delez'), t('igralec.st.goliPriNas'), t('iskanje.odprt')],
              ...vrstice.map((z) => [z.ime, t(`poz.${z.skupina}` as Kljuc), z.klub, z.liga, Math.round(z.percentil), z.minute, Math.round(z.delez_minut * 100), z.goli_90_pri_nas == null ? '' : Number(z.goli_90_pri_nas.toFixed(2)), z.odprt_za_prestop ? 1 : 0]),
            ])
          }
          className="gumb-tih text-sm"
        >
          {t('iskanje.csv')}
        </button>
      </div>
    </div>
  )
}
