import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import { opisPersonalizacije, supabase, type NarociloAdmin, type PostavkaNarocila } from '../baza'
import { cena, datum, t, type Kljuc } from '../besede'
import { Nalaganje, useSeja } from '../seja'
import { AdminBoni } from './AdminBoni'
import { AdminIzdelki } from './AdminIzdelki'
import { AdminMotivi } from './AdminMotivi'
import { AdminTisk } from './AdminTisk'

// /admin: pakiranje in odpošiljanje naročil, katalog. Pravice preveri baza
// (trgovina.le_admin); kdor ni admin, dobi insufficient_privilege (42501).

type Zavihek = 'pakiranje' | 'tisk' | 'poslano' | 'izdelki' | 'motivi' | 'boni'
type Tisk = { vrsta: 'nalepka' | 'dobavnica'; n: NarociloAdmin }

const ZAVIHKI: [Zavihek, Kljuc][] = [
  ['pakiranje', 'admin.zavihek.pakiranje'],
  ['tisk', 'admin.zavihek.tisk'],
  ['poslano', 'admin.zavihek.poslano'],
  ['izdelki', 'admin.zavihek.izdelki'],
  ['motivi', 'admin.zavihek.motivi'],
  ['boni', 'admin.zavihek.boni'],
]

/** Postavke v paketu: brez darilnih bonov (e-pošta) in značk (svoj tok narocila_znack). */
export const vPaketu = (n: NarociloAdmin): PostavkaNarocila[] =>
  n.postavke.filter((p) => !p.digitalni && p.personalizacija?.vrsta !== 'znacka')

/** Za pakiranje je naročilo, ko je v paketu kaj in je vse na zalogi ali natisnjeno. */
export const zaPakiranje = (n: NarociloAdmin): boolean => {
  const p = vPaketu(n)
  return p.length > 0 && p.every((x) => x.stanje_tiska === null || x.stanje_tiska === 'natisnjeno')
}

/** Zasebna stran: iskalnik je ne indeksira (Caddy doda še X-Robots-Tag). */
export function useNoindex() {
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex'
    document.head.appendChild(m)
    return () => m.remove()
  }, [])
}

export function Admin() {
  const { seja, nalaga } = useSeja()
  const [zavihek, setZavihek] = useState<Zavihek>('pakiranje')
  const [ni, setNi] = useState(false)
  const zavrnjen = useCallback(() => setNi(true), [])
  useNoindex()

  if (nalaga) return <Nalaganje />
  if (!seja) return <Navigate to="/login?next=/admin" replace />
  if (ni) return <p className="opozorilo max-w-xl">{t('admin.niAdmin')}</p>
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black naslov">{t('admin.naslov')}</h1>
      <nav className="flex flex-wrap gap-1 text-sm">
        {ZAVIHKI.map(([z, k]) => (
          <button key={z} type="button" onClick={() => setZavihek(z)}
            className={z === zavihek ? 'rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-gnl-300' : 'rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5'}>
            {t(k)}
          </button>
        ))}
      </nav>
      {zavihek === 'izdelki' ? <AdminIzdelki zavrnjen={zavrnjen} />
        : zavihek === 'motivi' ? <AdminMotivi zavrnjen={zavrnjen} />
        : zavihek === 'tisk' ? <AdminTisk zavrnjen={zavrnjen} />
        : zavihek === 'boni' ? <AdminBoni zavrnjen={zavrnjen} token={seja.access_token} />
        : <Narocila key={zavihek} stanje={zavihek === 'pakiranje' ? 'placano' : 'poslano'} zavrnjen={zavrnjen} token={seja.access_token} />}
    </div>
  )
}

function Narocila({ stanje, zavrnjen, token }: { stanje: 'placano' | 'poslano'; zavrnjen: () => void; token: string }) {
  const [narocila, setNarocila] = useState<NarociloAdmin[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [tisk, setTisk] = useState<Tisk | null>(null)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase.rpc('trgovina_admin_narocila', { p_stanje: stanje })
    if (error?.code === '42501') return zavrnjen()
    setNapaka(error ? error.message : null)
    const vsa = (data as unknown as NarociloAdmin[] | null) ?? []
    // Za pakiranje najstarejše najprej (tako vrne baza), poslana najnovejša najprej.
    setNarocila(stanje === 'poslano' ? [...vsa].reverse() : vsa.filter(zaPakiranje))
  }, [stanje, zavrnjen])

  useEffect(() => void nalozi(), [nalozi])

  useEffect(() => {
    if (!tisk) return
    const konec = () => setTisk(null)
    addEventListener('afterprint', konec)
    const id = setTimeout(() => print(), 50)
    return () => {
      clearTimeout(id)
      removeEventListener('afterprint', konec)
    }
  }, [tisk])

  if (narocila === null) return <Nalaganje />
  return (
    <div className="space-y-4">
      {napaka && <p className="opozorilo">{napaka}</p>}
      {stanje === 'placano' && <p className="text-sm text-slate-500">{t('admin.zaPakiranjeOpomba')}</p>}
      {narocila.length === 0 && <p className="kartica p-5 text-slate-400">{t('admin.prazno')}</p>}
      {narocila.map((n) => (
        <KarticaNarocila key={n.id} n={n} token={token} poslano={stanje === 'poslano'} natisni={(vrsta) => setTisk({ vrsta, n })} osvezi={nalozi} />
      ))}
      {tisk && createPortal(
        <div className="tisk">{tisk.vrsta === 'nalepka' ? <Nalepka n={tisk.n} /> : <Dobavnica n={tisk.n} />}</div>,
        document.body,
      )}
    </div>
  )
}

function KarticaNarocila({ n, token, poslano, natisni, osvezi }: {
  n: NarociloAdmin
  token: string
  poslano: boolean
  natisni: (vrsta: Tisk['vrsta']) => void
  osvezi: () => Promise<void>
}) {
  const [sledilna, setSledilna] = useState(n.sledilna ?? '')
  const [poteka, setPoteka] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)

  async function poslji() {
    setPoteka(true)
    setSporocilo(null)
    const { error } = await supabase.rpc('trgovina_admin_poslano', { p_narocilo: n.id, p_sledilna: sledilna })
    if (error) {
      setSporocilo(error.message)
      setPoteka(false)
      return
    }
    const posta = await supabase.functions.invoke('trgovina-posta', {
      body: { vrsta: 'poslano', narocilo_id: n.id },
      headers: { Authorization: `Bearer ${token}` },
    })
    setPoteka(false)
    if (posta.error) {
      // Razlog je v telesu odgovora (FunctionsHttpError.context), sporočilo je vedno splošno.
      const ctx = (posta.error as { context?: Response }).context
      const telo = (await ctx?.json?.().catch(() => null)) as { error?: string } | null
      setSporocilo(t('admin.mailNi', { napaka: telo?.error ?? posta.error.message }))
      return
    }
    await osvezi()
  }

  return (
    <article className="kartica space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-lg font-black tracking-widest">{n.javna_oznaka}</p>
        <p className="text-sm text-slate-400">
          {datum(n.placano_at ?? n.created_at)}{n.poslano_at && ` · ${t('narocila.poslano', { datum: datum(n.poslano_at) })}`}
        </p>
      </div>
      {n.manjka > 0 && (
        <p className="znacka bg-rose-500 px-3 py-1 text-sm text-white">{t('admin.manjka', { n: n.manjka })}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm">
          <Naslovnik n={n} />
          {n.email && <p className="mt-1 text-slate-400">{n.email}</p>}
          {n.dostava_kljuc && <p className="text-slate-400">{t('admin.dostava', { kljuc: n.dostava_kljuc })}</p>}
        </div>
        <ul className="divide-y divide-white/5 text-sm">
          {n.postavke.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 py-1">
              <span>
                <b>{p.kolicina} ×</b> {p.ime} <span className="text-slate-500">{p.sku}</span>
                {p.personalizacija && <span className="block text-xs font-semibold uppercase text-gnl-200">{opisPersonalizacije(p.personalizacija)}</span>}
              </span>
              <span className="tabular-nums text-slate-400">{cena((p.cena + p.doplacilo) * p.kolicina)}</span>
            </li>
          ))}
          {n.znesek_skupaj !== null && (
            <li className="flex justify-between gap-3 py-1 font-bold">
              <span>{t('narocila.skupaj')}</span><span className="tabular-nums">{cena(n.znesek_skupaj)}</span>
            </li>
          )}
        </ul>
      </div>
      {sporocilo && <p className="opozorilo">{sporocilo}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="gumb-tih" onClick={() => natisni('nalepka')}>{t('admin.natisniNalepko')}</button>
        <button type="button" className="gumb-tih" onClick={() => natisni('dobavnica')}>{t('admin.natisniDobavnico')}</button>
        <span className="flex-1" />
        <input value={sledilna} onChange={(e) => setSledilna(e.target.value)} placeholder={t('admin.sledilna')} aria-label={t('admin.sledilna')} className="polje w-48" />
        <button type="button" className="gumb-glavni" disabled={poteka || !sledilna.trim() || (poslano && sledilna.trim() === (n.sledilna ?? ''))} onClick={() => void poslji()}>
          {poslano ? t('admin.popraviSledilno') : t('admin.poslano')}
        </button>
      </div>
    </article>
  )
}

function Naslovnik({ n }: { n: NarociloAdmin }) {
  const a = n.naslov
  return (
    <div>
      <p className="font-bold">{a?.name ?? n.ime}</p>
      {a?.line1 && <p>{a.line1}</p>}
      {a?.line2 && <p>{a.line2}</p>}
      <p>{[a?.postal_code, a?.city].filter(Boolean).join(' ')}</p>
      {a?.country && a.country !== 'SI' && <p className="font-bold uppercase">{drzavaZaPosto(a.country)}</p>}
    </div>
  )
}

// Država na pošiljki v tujino po angleško, kot jo bere vsaka pošta.
const POSTA_DRZAVE = new Intl.DisplayNames(['en'], { type: 'region' })
const drzavaZaPosto = (koda: string): string => POSTA_DRZAVE.of(koda) ?? koda

const posiljatelj = (): string[] => t('admin.tisk.naslovPosiljatelja').split('\n')

/** Nalepka 100 × 150 mm. */
export function Nalepka({ n }: { n: NarociloAdmin }) {
  return (
    <div style={{ width: '100mm', height: '150mm', padding: '6mm', boxSizing: 'border-box', fontFamily: 'sans-serif', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <style>{'@page { size: 100mm 150mm; margin: 0 }'}</style>
      <div style={{ fontSize: '9pt', lineHeight: 1.3 }}>
        <div style={{ fontWeight: 700 }}>{t('admin.tisk.posiljatelj')}</div>
        {posiljatelj().map((v) => <div key={v}>{v}</div>)}
      </div>
      <div style={{ marginTop: 'auto', marginBottom: 'auto', fontSize: '15pt', lineHeight: 1.35, border: '0.5mm solid #000', padding: '5mm' }}>
        <div style={{ fontSize: '9pt', fontWeight: 700 }}>{t('admin.tisk.prejemnik')}</div>
        <Naslovnik n={n} />
      </div>
      <div style={{ fontSize: '9pt', fontFamily: 'monospace' }}>{n.javna_oznaka}</div>
    </div>
  )
}

/** Dobavnica A4: kaj je v paketu. */
export function Dobavnica({ n }: { n: NarociloAdmin }) {
  return (
    <div style={{ padding: '15mm', fontFamily: 'sans-serif', color: '#000', fontSize: '11pt', lineHeight: 1.4 }}>
      <style>{'@page { size: A4; margin: 0 }'}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10mm' }}>
        <div>{posiljatelj().map((v) => <div key={v}>{v}</div>)}<div>info@slff.eu</div></div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18pt', fontWeight: 700 }}>{t('admin.tisk.dobavnica')}</div>
          <div style={{ fontFamily: 'monospace' }}>{n.javna_oznaka}</div>
          <div>{datum(n.placano_at ?? n.created_at)}</div>
        </div>
      </div>
      <div style={{ marginTop: '12mm' }}>
        <div style={{ fontWeight: 700 }}>{t('admin.tisk.prejemnik')}</div>
        <Naslovnik n={n} />
      </div>
      <table style={{ marginTop: '10mm', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '0.3mm solid #000', textAlign: 'left' }}>
            <th>{t('admin.tisk.kolicina')}</th><th>{t('admin.tisk.izdelek')}</th><th>{t('admin.tisk.sku')}</th>
          </tr>
        </thead>
        <tbody>
          {vPaketu(n).map((p) => (
            <tr key={p.id} style={{ borderBottom: '0.2mm solid #999' }}>
              <td style={{ padding: '2mm 0' }}>{p.kolicina}</td>
              <td>{p.ime}{p.personalizacija && <div style={{ fontSize: '9pt' }}>{opisPersonalizacije(p.personalizacija)}</div>}</td><td>{p.sku}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: '12mm' }}>{t('admin.tisk.hvala')}</p>
    </div>
  )
}
