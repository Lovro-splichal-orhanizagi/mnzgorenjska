import { useCallback, useEffect, useState } from 'react'
import { supabase, type IzdelekAdmin, type Kategorija, type RazlicicaAdmin } from '../baza'
import { cena, t } from '../besede'
import { Nalaganje } from '../seja'

// Zavihek Izdelki v /admin. Zaloga obstoječe različice se spreminja le za
// razliko (zaloga_dodaj), da prodaja med urejanjem ne izgine.

const KATEGORIJE: Kategorija[] = ['oblacila', 'dodatki', 'dom', 'nalepke']
const VRSTE_SLIK = ['image/jpeg', 'image/png', 'image/webp']
const NAJVEC_SLIKA = 5 * 1024 * 1024

/** "25", "25,5", "25.00", "25 €" → centi; neveljavno ali ≤ 0 → null. */
export function vCente(s: string): number | null {
  const m = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(s.trim().replace(/\s*€$/, ''))
  if (!m) return null
  const c = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return c > 0 ? c : null
}

/** Ime datoteke za pot v shrambi: male črke, brez šumnikov in presledkov. */
export const varnoIme = (ime: string): string =>
  ime.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-').replace(/^[-.]+|-+$/g, '').slice(-80) || 'slika'

const celo = (s: string): number | null => (/^[+-]?\d{1,7}$/.test(s.trim()) ? Number(s) : null)

export function AdminIzdelki({ zavrnjen }: { zavrnjen: () => void }) {
  const [izdelki, setIzdelki] = useState<IzdelekAdmin[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [nov, setNov] = useState(false)

  const osvezi = useCallback(async () => {
    const { data, error } = await supabase.rpc('trgovina_admin_izdelki')
    if (error?.code === '42501') return zavrnjen()
    setNapaka(error ? error.message : null)
    setIzdelki((data as unknown as IzdelekAdmin[] | null) ?? [])
  }, [zavrnjen])

  useEffect(() => void osvezi(), [osvezi])

  if (izdelki === null) return <Nalaganje />
  return (
    <div className="space-y-3">
      {napaka && <p className="opozorilo">{napaka}</p>}
      {izdelki.map((i) => (
        <details key={i.id} className="kartica p-4">
          <summary className="flex cursor-pointer flex-wrap items-center gap-2">
            <span className="font-bold">{i.ime_sl}</span>
            <span className="text-sm text-slate-500">{i.slug}</span>
            <span className={`znacka ring-1 ${i.aktiven ? 'bg-gnl-400/15 text-gnl-300 ring-gnl-400/30' : 'bg-slate-400/15 text-slate-300 ring-slate-400/30'}`}>
              {t(i.aktiven ? 'admin.aktiven' : 'admin.neaktiven')}
            </span>
            <span className="text-sm text-slate-400">{t('admin.zalogaSkupaj', { n: i.razlicice.reduce((a, r) => a + r.zaloga, 0) })}</span>
          </summary>
          <div className="mt-4 space-y-6">
            <PoljaIzdelka i={i} osvezi={osvezi} />
            <Slike i={i} osvezi={osvezi} />
            <div className="space-y-2">
              <h3 className="font-bold">{t('admin.razlicice')}</h3>
              {i.razlicice.map((r) => <Razlicica key={r.id} r={r} izdelekId={i.id} osvezi={osvezi} />)}
              <Razlicica key={`nova-${i.razlicice.length}`} izdelekId={i.id} osvezi={osvezi} />
            </div>
          </div>
        </details>
      ))}
      {nov ? (
        <div className="kartica space-y-3 p-4">
          <h3 className="font-bold">{t('admin.novIzdelek')}</h3>
          <PoljaIzdelka osvezi={async () => { setNov(false); await osvezi() }} />
        </div>
      ) : (
        <button type="button" className="gumb-tih" onClick={() => setNov(true)}>{t('admin.novIzdelek')}</button>
      )}
    </div>
  )
}

function Polje({ oznaka, children }: { oznaka: string; children: React.ReactNode }) {
  return <label className="block text-sm text-slate-400">{oznaka}<div className="mt-1">{children}</div></label>
}

function PoljaIzdelka({ i, osvezi }: { i?: IzdelekAdmin; osvezi: () => Promise<void> }) {
  const [p, setP] = useState({
    slug: i?.slug ?? '', ime_sl: i?.ime_sl ?? '', ime_en: i?.ime_en ?? '', opis_sl: i?.opis_sl ?? '', opis_en: i?.opis_en ?? '',
    kategorija: i?.kategorija ?? 'oblacila', tax_code: i?.tax_code ?? 'txcd_99999999', pismo: i?.pismo ?? false,
    aktiven: i?.aktiven ?? false, vrstni_red: String(i?.vrstni_red ?? 0),
  })
  const [sporocilo, setSporocilo] = useState<{ ok: boolean; s: string } | null>(null)
  const nastavi = (k: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setP({ ...p, [k]: e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function shrani() {
    const red = celo(p.vrstni_red)
    if (red === null) return setSporocilo({ ok: false, s: t('admin.napacnoStevilo') })
    // Slike se shranjujejo posebej (Slike), zato jih tu ni.
    const { error } = await supabase.rpc('trgovina_admin_shrani_izdelek', {
      p: { ...(i ? { id: i.id } : {}), slug: p.slug.trim(), ime_sl: p.ime_sl.trim(), ime_en: p.ime_en.trim(), opis_sl: p.opis_sl,
        opis_en: p.opis_en, kategorija: p.kategorija, tax_code: p.tax_code.trim(), pismo: p.pismo, aktiven: p.aktiven, vrstni_red: red },
    })
    setSporocilo(error ? { ok: false, s: error.message } : { ok: true, s: t('admin.shranjeno') })
    if (!error) await osvezi()
  }

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void shrani() }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Polje oznaka={t('admin.p.slug')}><input required pattern="[a-z0-9-]+" value={p.slug} onChange={nastavi('slug')} className="polje w-full" /></Polje>
        <Polje oznaka={t('admin.p.imeSl')}><input required value={p.ime_sl} onChange={nastavi('ime_sl')} className="polje w-full" /></Polje>
        <Polje oznaka={t('admin.p.imeEn')}><input required value={p.ime_en} onChange={nastavi('ime_en')} className="polje w-full" /></Polje>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Polje oznaka={t('admin.p.opisSl')}><textarea rows={3} value={p.opis_sl} onChange={nastavi('opis_sl')} className="polje w-full" /></Polje>
        <Polje oznaka={t('admin.p.opisEn')}><textarea rows={3} value={p.opis_en} onChange={nastavi('opis_en')} className="polje w-full" /></Polje>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Polje oznaka={t('admin.p.kategorija')}>
          <select value={p.kategorija} onChange={nastavi('kategorija')} className="polje">
            {KATEGORIJE.map((k) => <option key={k} value={k}>{t(`kategorija.${k}`)}</option>)}
          </select>
        </Polje>
        <Polje oznaka={t('admin.p.taxCode')}><input required value={p.tax_code} onChange={nastavi('tax_code')} className="polje w-40" /></Polje>
        <Polje oznaka={t('admin.p.vrstniRed')}><input inputMode="numeric" value={p.vrstni_red} onChange={nastavi('vrstni_red')} className="polje w-20" /></Polje>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.pismo} onChange={nastavi('pismo')} />{t('admin.p.pismo')}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.aktiven} onChange={nastavi('aktiven')} />{t('admin.aktiven')}</label>
        <button className="gumb-glavni">{t('admin.shrani')}</button>
      </div>
      {sporocilo && <p className={sporocilo.ok ? 'uspeh' : 'opozorilo'}>{sporocilo.s}</p>}
    </form>
  )
}

function Slike({ i, osvezi }: { i: IzdelekAdmin; osvezi: () => Promise<void> }) {
  const [napaka, setNapaka] = useState<string | null>(null)
  const [poteka, setPoteka] = useState(false)

  async function shrani(slike: string[]) {
    const { error } = await supabase.rpc('trgovina_admin_shrani_izdelek', { p: { id: i.id, slike } })
    setNapaka(error ? error.message : null)
    if (!error) await osvezi()
  }

  async function nalozi(d: File) {
    if (!VRSTE_SLIK.includes(d.type) || d.size > NAJVEC_SLIKA) return setNapaka(t('admin.slikaNapacna'))
    setPoteka(true)
    const pot = `${i.slug}/${Date.now()}-${varnoIme(d.name)}`
    const { error } = await supabase.storage.from('trgovina').upload(pot, d, { contentType: d.type })
    if (error) setNapaka(error.message)
    else await shrani([...i.slike, supabase.storage.from('trgovina').getPublicUrl(pot).data.publicUrl])
    setPoteka(false)
  }

  // Odstranjena slika ostane v shrambi; iz izdelka gre le naslov.
  const premakni = (od: number, k: number) => {
    const s = [...i.slike]
    ;[s[od], s[k]] = [s[k], s[od]]
    void shrani(s)
  }

  return (
    <div className="space-y-2">
      <h3 className="font-bold">{t('admin.slike')}</h3>
      <div className="flex flex-wrap gap-3">
        {i.slike.map((url, n) => (
          <div key={url} className="w-28 space-y-1 text-xs">
            <img src={url} alt={t('izdelek.slika', { n: n + 1 })} className="h-28 w-28 rounded-lg object-cover" />
            <div className="flex gap-1">
              <button type="button" className="gumb-tih px-2 py-0.5" disabled={n === 0} onClick={() => premakni(n, n - 1)} aria-label={t('admin.slikaLevo')}>←</button>
              <button type="button" className="gumb-tih px-2 py-0.5" disabled={n === i.slike.length - 1} onClick={() => premakni(n, n + 1)} aria-label={t('admin.slikaDesno')}>→</button>
              <button type="button" className="gumb-tih px-2 py-0.5" onClick={() => void shrani(i.slike.filter((_, k) => k !== n))}>{t('admin.odstrani')}</button>
            </div>
          </div>
        ))}
      </div>
      <label className="block text-sm text-slate-400">
        {t('admin.dodajSliko')}
        <input type="file" accept={VRSTE_SLIK.join(',')} disabled={poteka} className="mt-1 block text-sm"
          onChange={(e) => { const d = e.target.files?.[0]; e.target.value = ''; if (d) void nalozi(d) }} />
      </label>
      {napaka && <p className="opozorilo">{napaka}</p>}
    </div>
  )
}

/** Brez `r`: nova različica z začetno zalogo. */
function Razlicica({ r, izdelekId, osvezi }: { r?: RazlicicaAdmin; izdelekId: number; osvezi: () => Promise<void> }) {
  const [p, setP] = useState({
    oznaka_sl: r?.oznaka_sl ?? '', oznaka_en: r?.oznaka_en ?? '', sku: r?.sku ?? '',
    cena: r ? (r.cena / 100).toFixed(2) : '', teza_g: String(r?.teza_g ?? 0), aktivna: r?.aktivna ?? true, zaloga: '0',
  })
  const [sporocilo, setSporocilo] = useState<{ ok: boolean; s: string } | null>(null)
  const nastavi = (k: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setP({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function shrani() {
    const c = vCente(p.cena)
    const teza = celo(p.teza_g)
    const zaloga = celo(p.zaloga)
    if (c === null) return setSporocilo({ ok: false, s: t('admin.napacnaCena') })
    if (teza === null || teza < 0 || zaloga === null || (!r && zaloga < 0)) return setSporocilo({ ok: false, s: t('admin.napacnoStevilo') })
    const polja = { oznaka_sl: p.oznaka_sl.trim(), oznaka_en: p.oznaka_en.trim(), sku: p.sku.trim(), cena: c, teza_g: teza, aktivna: p.aktivna }
    const { error } = await supabase.rpc('trgovina_admin_shrani_razlicico', {
      p: r ? { id: r.id, ...polja, zaloga_dodaj: zaloga } : { izdelek_id: izdelekId, ...polja, zaloga },
    })
    setSporocilo(error ? { ok: false, s: error.message } : { ok: true, s: t('admin.shranjeno') })
    if (error) return
    if (r) setP({ ...p, zaloga: '0' })
    await osvezi()
  }

  return (
    <form className={`rounded-xl border p-3 ${r ? 'border-white/10' : 'border-dashed border-white/20'}`} onSubmit={(e) => { e.preventDefault(); void shrani() }}>
      {!r && <p className="mb-2 text-sm font-semibold text-slate-300">{t('admin.novaRazlicica')}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <Polje oznaka={t('admin.r.oznakaSl')}><input required value={p.oznaka_sl} onChange={nastavi('oznaka_sl')} className="polje w-32" /></Polje>
        <Polje oznaka={t('admin.r.oznakaEn')}><input required value={p.oznaka_en} onChange={nastavi('oznaka_en')} className="polje w-32" /></Polje>
        <Polje oznaka={t('admin.r.sku')}><input required value={p.sku} onChange={nastavi('sku')} className="polje w-32" /></Polje>
        <Polje oznaka={t('admin.r.cena')}><input required inputMode="decimal" value={p.cena} onChange={nastavi('cena')} className="polje w-24" /></Polje>
        <Polje oznaka={t('admin.r.teza')}><input inputMode="numeric" value={p.teza_g} onChange={nastavi('teza_g')} className="polje w-20" /></Polje>
        <Polje oznaka={r ? t('admin.r.dodaj') : t('admin.r.zacetna')}>
          <input inputMode="numeric" value={p.zaloga} onChange={nastavi('zaloga')} className="polje w-20" />
        </Polje>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={p.aktivna} onChange={nastavi('aktivna')} />{t('admin.r.aktivna')}</label>
        <button className="gumb-tih">{r ? t('admin.shrani') : t('admin.dodaj')}</button>
      </div>
      {r && (
        <p className="mt-2 text-sm text-slate-400">
          {t('admin.r.stanje', { zaloga: r.zaloga, voljo: r.na_voljo, cena: cena(r.cena) })}
        </p>
      )}
      {sporocilo && <p className={`mt-2 ${sporocilo.ok ? 'uspeh' : 'opozorilo'}`}>{sporocilo.s}</p>}
    </form>
  )
}
