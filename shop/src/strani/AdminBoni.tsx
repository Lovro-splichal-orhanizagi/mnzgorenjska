import { useCallback, useEffect, useState } from 'react'
import { supabase, type Bon } from '../baza'
import { cena, datum, t } from '../besede'
import { Nalaganje } from '../seja'
import { vCente } from './AdminIzdelki'

// Zavihek "Boni": izdani darilni boni (le zadnji 4 znaki kode) in nova
// promocijska koda za Scout ali preverjene (Edge Function trgovina-boni).
// Koda se pokaže enkrat in ostane le v stanju te strani.

export interface ZahtevaBona {
  za: 'scout' | 'preverjen'
  odstotek?: number
  znesek?: number
  uporab: number
  do: string
}

/** Vnos obrazca → telo za trgovina-boni ali null (ista pravila preveri funkcija). */
export function zahtevaBona(za: ZahtevaBona['za'], vrsta: 'odstotek' | 'znesek', vrednost: string, uporab: string, doDne: string): ZahtevaBona | null {
  const u = /^\d{1,4}$/.test(uporab.trim()) ? Number(uporab) : 0
  if (u < 1 || u > 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(doDne)) return null
  if (vrsta === 'odstotek') {
    const o = /^\d{1,3}$/.test(vrednost.trim()) ? Number(vrednost) : 0
    return o >= 1 && o <= 100 ? { za, odstotek: o, uporab: u, do: doDne } : null
  }
  const c = vCente(vrednost)
  return c ? { za, znesek: c, uporab: u, do: doDne } : null
}

export function AdminBoni({ zavrnjen, token }: { zavrnjen: () => void; token: string }) {
  const [boni, setBoni] = useState<Bon[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [za, setZa] = useState<ZahtevaBona['za']>('scout')
  const [vrsta, setVrsta] = useState<'odstotek' | 'znesek'>('odstotek')
  const [vrednost, setVrednost] = useState('')
  const [uporab, setUporab] = useState('1')
  const [doDne, setDoDne] = useState('')
  const [koda, setKoda] = useState<string | null>(null)
  const [poteka, setPoteka] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('trgovina_admin_boni')
    if (error?.code === '42501') return zavrnjen()
    setNapaka(error ? error.message : null)
    setBoni((data as unknown as Bon[] | null) ?? [])
  }, [zavrnjen])

  useEffect(() => void nalozi(), [nalozi])

  const zahteva = zahtevaBona(za, vrsta, vrednost, uporab, doDne)

  async function ustvari() {
    if (!zahteva) return
    setPoteka(true)
    setNapaka(null)
    setKoda(null)
    const { data, error } = await supabase.functions.invoke<{ koda?: string }>('trgovina-boni', {
      body: zahteva,
      headers: { Authorization: `Bearer ${token}` },
    })
    setPoteka(false)
    if (error || !data?.koda) {
      const ctx = (error as { context?: Response } | null)?.context
      const telo = (await ctx?.json?.().catch(() => null)) as { error?: string } | null
      setNapaka(t('admin.boni.napaka', { napaka: telo?.error ?? error?.message ?? '?' }))
      return
    }
    setKoda(data.koda)
    setVrednost('')
  }

  if (boni === null) return <Nalaganje />
  return (
    <div className="space-y-6">
      {napaka && <p className="opozorilo">{napaka}</p>}
      <section className="kartica space-y-4 p-5">
        <h2 className="text-lg font-bold">{t('admin.boni.nov')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-400">
            <span>{t('admin.boni.za')}</span>
            <select value={za} onChange={(e) => setZa(e.target.value as ZahtevaBona['za'])} className="polje w-full">
              <option value="scout">{t('admin.boni.scout')}</option>
              <option value="preverjen">{t('admin.boni.preverjen')}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-400">
            <span>{t('admin.boni.vrednost')}</span>
            <div className="flex gap-2">
              <select value={vrsta} onChange={(e) => setVrsta(e.target.value as 'odstotek' | 'znesek')} className="polje">
                <option value="odstotek">{t('admin.boni.odstotek')}</option>
                <option value="znesek">{t('admin.boni.znesek')}</option>
              </select>
              <input value={vrednost} onChange={(e) => setVrednost(e.target.value)} inputMode="decimal" className="polje w-full" aria-label={t('admin.boni.vrednost')} />
            </div>
          </label>
          <label className="space-y-1 text-sm text-slate-400">
            <span>{t('admin.boni.uporab')}</span>
            <input value={uporab} onChange={(e) => setUporab(e.target.value)} inputMode="numeric" className="polje w-full" />
          </label>
          <label className="space-y-1 text-sm text-slate-400">
            <span>{t('admin.boni.do')}</span>
            <input type="date" value={doDne} onChange={(e) => setDoDne(e.target.value)} className="polje w-full" />
          </label>
        </div>
        {!zahteva && (vrednost || doDne) && <p className="text-xs text-slate-500">{t('admin.boni.napacno')}</p>}
        <button type="button" className="gumb-glavni" disabled={poteka || !zahteva} onClick={() => void ustvari()}>{t('admin.boni.ustvari')}</button>
        {koda && <p className="uspeh select-all font-mono">{t('admin.boni.ustvarjena', { koda })}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">{t('admin.boni.izdani')}</h2>
        {boni.length === 0 ? <p className="kartica p-5 text-slate-400">{t('admin.boni.prazno')}</p> : (
          <ul className="kartica divide-y divide-white/5 text-sm">
            {boni.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
                <span className="font-mono">{t('admin.boni.koda', { konec: b.koda_konec })}</span>
                <b className="tabular-nums">{cena(b.znesek)}</b>
                <span className="text-slate-400">{t('admin.boni.velja', { datum: datum(b.velja_do) })}</span>
                <span className={b.porabljeno_at ? 'text-slate-500' : 'text-gnl-300'}>
                  {b.porabljeno_at ? t('admin.boni.porabljen', { datum: datum(b.porabljeno_at) }) : t('admin.boni.neporabljen')}
                </span>
                <span className="flex-1" />
                <span className="font-mono text-slate-500">{b.javna_oznaka}</span>
                {b.email && <span className="text-slate-500">{b.email}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
