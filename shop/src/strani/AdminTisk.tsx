import { useCallback, useEffect, useState } from 'react'
import { opisPersonalizacije, supabase, type PostavkaTiska, type Serija, type SerijaPovzetek } from '../baza'
import { datum, t } from '../besede'
import { celicaCsv, oblikaSvg } from '../personalizacija'
import { Nalaganje } from '../seja'

// Zavihek "Za tisk": plačane personalizirane postavke (za_tisk) → serija →
// izvoz za tiskarno (CSV in SVG za vsako postavko) → "Poslano tiskarni" →
// "Natisnjeno" (postavke natisnjeno; naročilo gre med "Za pakiranje").
// ponytail: brez ZIP (ni knjižnice): CSV in SVG se preneseta vsak posebej.

/** serija-<id>.csv: ločilo ;, BOM za Excel, vsaka celica v narekovajih. */
export function csvSerije(s: Serija): string {
  const glava = [t('admin.tisk.oznaka'), t('admin.tisk.postavka'), t('admin.tisk.sku'), t('admin.tisk.izdelek'), t('admin.tisk.kolicina'),
    t('admin.tisk.besedilo'), t('admin.tisk.stevilka'), 'SVG']
  const vrstice = s.postavke.map((p) => [p.javna_oznaka, p.postavka_id, p.sku, p.ime, p.kolicina,
    p.personalizacija?.ime ?? null, p.personalizacija?.stevilka ?? null, imeSvg(p)])
  return `﻿${[glava, ...vrstice].map((v) => v.map(celicaCsv).join(';')).join('\r\n')}\r\n`
}

const imeSvg = (p: PostavkaTiska): string => `${p.javna_oznaka}-${p.postavka_id}.svg`
export const svgPostavke = (p: PostavkaTiska): string => oblikaSvg(p.personalizacija?.ime ?? null, p.personalizacija?.stevilka ?? null)

function prenesi(ime: string, vsebina: string, tip: string) {
  const url = URL.createObjectURL(new Blob([vsebina], { type: tip }))
  const a = Object.assign(document.createElement('a'), { href: url, download: ime })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AdminTisk({ zavrnjen }: { zavrnjen: () => void }) {
  const [za, setZa] = useState<PostavkaTiska[] | null>(null)
  const [serije, setSerije] = useState<SerijaPovzetek[]>([])
  const [izbrane, setIzbrane] = useState<Set<number>>(new Set())
  const [serija, setSerija] = useState<Serija | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [poteka, setPoteka] = useState(false)

  const nalozi = useCallback(async () => {
    const [a, b] = await Promise.all([supabase.rpc('trgovina_admin_za_tisk'), supabase.rpc('trgovina_admin_serije')])
    if (a.error?.code === '42501' || b.error?.code === '42501') return zavrnjen()
    setNapaka(a.error?.message ?? b.error?.message ?? null)
    setZa((a.data as unknown as PostavkaTiska[] | null) ?? [])
    setSerije((b.data as unknown as SerijaPovzetek[] | null) ?? [])
    setIzbrane(new Set())
  }, [zavrnjen])

  useEffect(() => void nalozi(), [nalozi])

  async function klic(f: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
    setPoteka(true)
    setNapaka(null)
    const { data, error } = await f()
    setPoteka(false)
    if (error) return setNapaka(error.message)
    setSerija(data as Serija)
    void nalozi()
  }

  if (za === null) return <Nalaganje />
  if (serija) {
    return (
      <div className="space-y-4">
        <button type="button" className="povezava text-sm" onClick={() => setSerija(null)}>← {t('admin.tisk.nazaj')}</button>
        <PogledSerije s={serija} />
        {napaka && <p className="opozorilo">{napaka}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="gumb-tih" onClick={() => prenesi(`serija-${serija.id}.csv`, csvSerije(serija), 'text/csv;charset=utf-8')}>{t('admin.tisk.csv')}</button>
          <button type="button" className="gumb-tih" onClick={() => serija.postavke.forEach((p, n) => setTimeout(() => prenesi(imeSvg(p), svgPostavke(p), 'image/svg+xml'), n * 300))}>
            {t('admin.tisk.vsiSvg')}
          </button>
          <span className="flex-1" />
          <button type="button" className="gumb-tih" disabled={poteka || Boolean(serija.poslana_at)}
            onClick={() => void klic(() => supabase.rpc('trgovina_admin_serija_stanje', { p_id: serija.id, p_stanje: 'poslana' }))}>
            {t('admin.tisk.poslano')}
          </button>
          <button type="button" className="gumb-glavni" disabled={poteka || Boolean(serija.natisnjena_at)}
            onClick={() => void klic(() => supabase.rpc('trgovina_admin_serija_stanje', { p_id: serija.id, p_stanje: 'natisnjena' }))}>
            {t('admin.tisk.natisnjeno')}
          </button>
        </div>
      </div>
    )
  }

  const preklopi = (id: number) => setIzbrane((s) => {
    const n = new Set(s)
    if (!n.delete(id)) n.add(id)
    return n
  })

  return (
    <div className="space-y-6">
      {napaka && <p className="opozorilo">{napaka}</p>}
      <section className="space-y-3">
        {za.length === 0 ? <p className="kartica p-5 text-slate-400">{t('admin.tisk.prazno')}</p> : (
          <ul className="kartica divide-y divide-white/5">
            {za.map((p) => (
              <li key={p.postavka_id}>
                <label className="flex items-center gap-3 p-3 text-sm">
                  <input type="checkbox" checked={izbrane.has(p.postavka_id)} onChange={() => preklopi(p.postavka_id)} />
                  <span className="font-mono">{p.javna_oznaka}</span>
                  <span className="flex-1"><b>{p.kolicina} ×</b> {p.ime} <span className="text-slate-500">{p.sku}</span></span>
                  <span className="font-semibold uppercase text-gnl-200">{opisPersonalizacije(p.personalizacija)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="gumb-glavni" disabled={poteka || izbrane.size === 0}
          onClick={() => void klic(() => supabase.rpc('trgovina_admin_nova_serija', { p_postavke: [...izbrane] }))}>
          {t('admin.tisk.novaSerija', { n: izbrane.size })}
        </button>
      </section>
      {serije.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t('admin.tisk.serije')}</h2>
          <ul className="kartica divide-y divide-white/5 text-sm">
            {serije.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                <b>{t('admin.tisk.serija', { id: s.id })}</b>
                <span className="text-slate-400">{t('admin.tisk.postavk', { n: s.postavk })} · {stanjeSerije(s)}</span>
                <span className="flex-1" />
                <button type="button" className="gumb-tih" onClick={() => void klic(() => supabase.rpc('trgovina_admin_serija', { p_id: s.id }))}>{t('admin.tisk.odpri')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const stanjeSerije = (s: Pick<SerijaPovzetek, 'created_at' | 'poslana_at' | 'natisnjena_at'>): string =>
  s.natisnjena_at ? t('admin.tisk.natisnjena', { datum: datum(s.natisnjena_at) })
    : s.poslana_at ? t('admin.tisk.poslana', { datum: datum(s.poslana_at) })
    : t('admin.tisk.ustvarjena', { datum: datum(s.created_at) })

/** Serija s predogledom vsake oblike (ista SVG kot v izvozu). */
export function PogledSerije({ s }: { s: Serija }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">{t('admin.tisk.serija', { id: s.id })} <span className="text-sm font-normal text-slate-400">{stanjeSerije(s)}</span></h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {s.postavke.map((p) => (
          <li key={p.postavka_id} className="kartica space-y-2 p-3 text-sm">
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPostavke(p))}`} alt={opisPersonalizacije(p.personalizacija)}
              className="aspect-square w-full rounded-lg bg-white" />
            <p><span className="font-mono">{p.javna_oznaka}</span> · <b>{p.kolicina} ×</b> {p.ime}</p>
            <p className="text-slate-500">{p.sku}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
