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

export function Iskanje() {
  const { klub } = useSeja()
  const [q, setQ] = useSearchParams()
  const [zveze, setZveze] = useState<{ id: number; name: string }[]>([])
  const drzava = klub?.country_id
  const f = filtri(q)

  useEffect(() => {
    if (!drzava) return
    void supabase
      .from('federations')
      .select('id, name')
      .eq('country_id', drzava)
      .order('name')
      .then(({ data }) => setZveze(data ?? []))
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
      <h1 className="text-xl font-semibold">{t('iskanje.naslov')}</h1>
      <form key={`filtri?${iskanje}`} onSubmit={isci} className="grid gap-4 rounded border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          {t('iskanje.pozicija')}
          <select name="skupina" defaultValue={f.skupina ?? ''} className="rounded border border-slate-300 px-2 py-1">
            <option value="">{t('iskanje.vse')}</option>
            {SKUPINE.map((s) => (
              <option key={s} value={s}>{t(`skupina.${s}` as Kljuc)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('iskanje.raven')}
          <select name="raven" defaultValue={f.raven} className="rounded border border-slate-300 px-2 py-1">
            {RAVNI.map((r) => (
              <option key={r} value={r}>{t(`iskanje.raven.${r}` as Kljuc)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('iskanje.minMinut')}
          <input name="min" type="number" min={0} defaultValue={f.min} className="rounded border border-slate-300 px-2 py-1" />
        </label>
        <label className="flex items-center gap-2 self-end">
          <input type="checkbox" name="odprti" defaultChecked={f.odprti} />
          {t('iskanje.odprti')}
        </label>
        {zveze.length > 1 && (
          <fieldset className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
            <legend className="mb-1">{t('iskanje.regije')}</legend>
            {zveze.map((z) => (
              <label key={z.id} className="flex items-center gap-1">
                <input type="checkbox" name="regije" value={z.id} defaultChecked={f.regije.includes(z.id)} />
                {z.name}
              </label>
            ))}
          </fieldset>
        )}
        <button className="justify-self-start rounded bg-slate-900 px-4 py-2 text-white sm:col-span-2 lg:col-span-4">{t('iskanje.isci')}</button>
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

  useEffect(() => {
    const f = filtri(new URLSearchParams(iskanje))
    let velja = true
    setStanje('nalaga')
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
          setStanje('konec')
          return
        }
        const nove = data ?? []
        setVrstice((prej) => (od === 0 ? nove : [...prej, ...nove]))
        setStanje(nove.length < STRAN || od + STRAN >= NAJVEC ? 'konec' : 'ok')
      })
    return () => {
      velja = false
    }
  }, [iskanje, od])

  if (napakaI && vrstice.length === 0) return <p className="text-red-700">{napakaI}</p>
  if (stanje !== 'nalaga' && vrstice.length === 0) return <p className="text-slate-500">{t('iskanje.prazno')}</p>
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {vrstice.map((z) => (
          <li key={z.player_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
            <Link to={`/player/${z.player_id}`} className="font-medium hover:underline">{z.ime}</Link>
            <span className="text-sm text-slate-600">{z.klub} · {z.liga}</span>
            {z.odprt_za_prestop && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t('iskanje.odprt')}</span>}
            <span className="w-full text-sm text-slate-700">{utemeljitev(z)}</span>
          </li>
        ))}
      </ul>
      {stanje === 'nalaga' && <Nalaganje />}
      {napakaI && <p className="text-red-700">{napakaI}</p>}
      {stanje === 'ok' && (
        <button type="button" onClick={() => setOd(od + STRAN)} className="rounded border border-slate-300 px-3 py-1 text-sm">
          {t('iskanje.vec')}
        </button>
      )}
    </div>
  )
}
