import { useCallback, useEffect, useState } from 'react'
import { supabase, type IzdelekAdmin, type MotivKataloga } from '../baza'
import { t } from '../besede'
import { Nalaganje } from '../seja'
import { barveMotiva, imaPredlogo, svgCone } from './Konfigurator'
import { primeriMotiva } from './Personalizirano'

// Zavihek "Motivi": vklop, vrstni red, doplačilo po nosilcu in primeri
// (trgovina_admin_motivi / trgovina_admin_shrani_motiv). Polja in sheme ureja
// migracija (predloga mora imeti njihova mesta); primere preveri baza.

/** Element trgovina_admin_motivi(). */
export interface MotivAdmin extends Omit<MotivKataloga, 'izdelki'> {
  id: number
  aktiven: boolean
  vrstni_red: number
  doplacila: { izdelek_id: number; slug: string; doplacilo: number }[]
}

/** "8", "8,50", "0" → centi; prazno → null (motiva ni na izdelku); neveljavno → undefined. */
export function doplaciloIz(s: string): number | null | undefined {
  const v = s.trim().replace(/\s*€$/, '')
  if (v === '') return null
  const m = /^(\d{1,4})(?:[.,](\d{1,2}))?$/.exec(v)
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0')) : undefined
}

const vEvre = (c: number | undefined): string => (c === undefined ? '' : (c / 100).toFixed(2).replace(/\.00$/, ''))

export function AdminMotivi({ zavrnjen }: { zavrnjen: () => void }) {
  const [motivi, setMotivi] = useState<MotivAdmin[] | null>(null)
  const [nosilci, setNosilci] = useState<IzdelekAdmin[]>([])
  const [napaka, setNapaka] = useState<string | null>(null)

  const osvezi = useCallback(async () => {
    const [a, b] = await Promise.all([supabase.rpc('trgovina_admin_motivi'), supabase.rpc('trgovina_admin_izdelki')])
    if (a.error?.code === '42501' || b.error?.code === '42501') return zavrnjen()
    setNapaka(a.error?.message ?? b.error?.message ?? null)
    setMotivi((a.data as unknown as MotivAdmin[] | null) ?? [])
    setNosilci(((b.data as unknown as IzdelekAdmin[] | null) ?? []).filter((i) => i.po_narocilu && i.postopek && !i.digitalni))
  }, [zavrnjen])

  useEffect(() => void osvezi(), [osvezi])

  if (motivi === null) return <Nalaganje />
  return (
    <div className="space-y-3">
      {napaka && <p className="opozorilo">{napaka}</p>}
      {motivi.length === 0 && <p className="kartica p-5 text-slate-400">{t('admin.motivi.prazno')}</p>}
      {motivi.map((m) => <KarticaMotiva key={m.id} m={m} nosilci={nosilci} osvezi={osvezi} />)}
    </div>
  )
}

export function KarticaMotiva({ m, nosilci, osvezi }: { m: MotivAdmin; nosilci: IzdelekAdmin[]; osvezi: () => Promise<void> }) {
  // Nosilci in izdelki, na katerih motiv že je (tudi če niso več nosilci: odstraniti se sme vedno).
  const izdelki = [...nosilci.map((i) => ({ id: i.id, slug: i.slug })),
    ...m.doplacila.filter((d) => !nosilci.some((i) => i.id === d.izdelek_id)).map((d) => ({ id: d.izdelek_id, slug: d.slug }))]
  const zacetno = (id: number) => vEvre(m.doplacila.find((d) => d.izdelek_id === id)?.doplacilo)
  const [aktiven, setAktiven] = useState(m.aktiven)
  const [red, setRed] = useState(String(m.vrstni_red))
  const [dopl, setDopl] = useState<Record<number, string>>(() => Object.fromEntries(izdelki.map((i) => [i.id, zacetno(i.id)])))
  const [primeri, setPrimeri] = useState(() => JSON.stringify(m.primeri, null, 2))
  const [sporocilo, setSporocilo] = useState<{ ok: boolean; s: string } | null>(null)

  const p = primeriMotiva(m, m.doplacila[0]?.slug)[0]!
  const risba = svgCone(m.slug, p.polja, barveMotiva(m, p.polja, p.shema), m.cona)
  const svg = Array.isArray(risba) ? risba[0] : risba

  async function shrani() {
    if (!/^[+-]?\d{1,7}$/.test(red.trim())) return setSporocilo({ ok: false, s: t('admin.napacnoStevilo') })
    let pr: unknown
    try { pr = JSON.parse(primeri) } catch { pr = null }
    if (!Array.isArray(pr)) return setSporocilo({ ok: false, s: t('admin.motivi.napacenJson') })
    const doplacila: { izdelek_id: number; doplacilo: number | null }[] = []
    for (const i of izdelki) {
      const v = dopl[i.id] ?? ''
      if (v.trim() === zacetno(i.id)) continue // nespremenjeno: ne pošljemo (izdelek morda ni več nosilec)
      const c = doplaciloIz(v)
      if (c === undefined) return setSporocilo({ ok: false, s: t('admin.motivi.napacnoDoplacilo') })
      doplacila.push({ izdelek_id: i.id, doplacilo: c })
    }
    const { error } = await supabase.rpc('trgovina_admin_shrani_motiv', {
      p: { id: m.id, aktiven, vrstni_red: Number(red), primeri: pr, doplacila },
    })
    setSporocilo(error ? { ok: false, s: error.message } : { ok: true, s: t('admin.shranjeno') })
    if (!error) await osvezi()
  }

  return (
    <details className="kartica p-4">
      <summary className="flex cursor-pointer flex-wrap items-center gap-3">
        <span className="grid h-20 w-16 place-items-center overflow-hidden rounded-lg bg-slate-900 ring-1 ring-white/10">
          {svg && <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="" className="h-full w-full object-contain p-1" />}
        </span>
        <span className="font-bold">{m.ime_sl}</span>
        <span className="text-sm text-slate-500">{m.slug}</span>
        <span className={`znacka ring-1 ${m.aktiven ? 'bg-gnl-400/15 text-gnl-300 ring-gnl-400/30' : 'bg-slate-400/15 text-slate-300 ring-slate-400/30'}`}>
          {t(m.aktiven ? 'admin.aktiven' : 'admin.neaktiven')}
        </span>
      </summary>
      <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); void shrani() }}>
        {!imaPredlogo(m.slug) && <p className="opozorilo">{t('admin.motivi.brezPredloge')}</p>}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={aktiven} onChange={(e) => setAktiven(e.target.checked)} />{t('admin.aktiven')}</label>
          <label className="block text-sm text-slate-400">{t('admin.p.vrstniRed')}
            <input inputMode="numeric" value={red} onChange={(e) => setRed(e.target.value)} className="polje mt-1 block w-20" />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm text-slate-400">{t('admin.motivi.doplacila')}</legend>
          <div className="flex flex-wrap gap-3">
            {izdelki.map((i) => (
              <label key={i.id} className="block text-sm text-slate-300">{i.slug}
                <input inputMode="decimal" value={dopl[i.id] ?? ''} onChange={(e) => setDopl({ ...dopl, [i.id]: e.target.value })} className="polje mt-1 block w-24" />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm text-slate-400">{t('admin.motivi.primeri')}
          <textarea rows={8} spellCheck={false} value={primeri} onChange={(e) => setPrimeri(e.target.value)} className="polje mt-1 w-full font-mono text-xs" />
        </label>
        <button className="gumb-glavni">{t('admin.shrani')}</button>
        {sporocilo && <p className={sporocilo.ok ? 'uspeh' : 'opozorilo'}>{sporocilo.s}</p>}
      </form>
    </details>
  )
}
