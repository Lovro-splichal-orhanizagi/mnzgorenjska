import { useEffect, useState } from 'react'
import { opisPersonalizacije, STANJA_NAROCILA, supabase, type NarociloAdmin, type NarociloPodrobno, type StanjeNarocila, type VsaNarocila } from '../baza'
import { cena, datum, t } from '../besede'
import { Nalaganje } from '../seja'
import { Naslovnik, oznaciPoslano } from './narocilo'

// Zavihek "Vsa naročila": filter po stanju s števci, iskanje, strani, podrobnosti
// z zgodovino in ročnimi prehodi. Dovoljene prehode preveri baza
// (trgovina_admin_nastavi_stanje); poslano gre prek sledilne (trgovina_admin_poslano + mail).

const NA_STRAN = 50

type Cilj = 'placano' | 'v_izdelavi' | 'poslano' | 'dostavljeno' | 'preklicano'

/** Prehodi, ki jih vmesnik ponudi (zrcalo baze). */
export const PREHODI: Partial<Record<StanjeNarocila, Cilj[]>> = {
  placano: ['v_izdelavi', 'poslano', 'preklicano'],
  v_izdelavi: ['placano', 'poslano', 'preklicano'],
  poslano: ['dostavljeno'],
}

export const BARVA_STANJA: Record<StanjeNarocila, string> = {
  caka_placilo: 'bg-slate-400/10 text-slate-400 ring-slate-400/20',
  placano: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
  v_izdelavi: 'bg-sky-400/15 text-sky-200 ring-sky-400/30',
  poslano: 'bg-gnl-400/15 text-gnl-300 ring-gnl-400/30',
  dostavljeno: 'bg-emerald-400/20 text-emerald-200 ring-emerald-400/40',
  preklicano: 'bg-slate-400/15 text-slate-300 ring-slate-400/30',
  vrnjeno: 'bg-rose-400/15 text-rose-200 ring-rose-400/30',
  poteklo: 'bg-slate-400/10 text-slate-500 ring-slate-400/20',
}

const jeStanje = (s: string): s is StanjeNarocila => (STANJA_NAROCILA as readonly string[]).includes(s)

export function ZnackaStanja({ stanje }: { stanje: string }) {
  return jeStanje(stanje)
    ? <span className={`znacka ring-1 ${BARVA_STANJA[stanje]}`}>{t(`admin.stanje.${stanje}`)}</span>
    : <span className="znacka ring-1">{stanje}</span>
}

/** Plačilo v Stripe Dashboardu; način pove predpona seje (cs_test_ / cs_live_). */
export function stripePovezava(pi: string, checkout: string | null): { url: string; znanNacin: boolean } {
  const test = Boolean(checkout?.startsWith('cs_test_'))
  return {
    url: `https://dashboard.stripe.com/${test ? 'test/' : ''}payments/${encodeURIComponent(pi)}`,
    znanNacin: test || Boolean(checkout?.startsWith('cs_live_')),
  }
}

export const povzetekPostavk = (n: NarociloAdmin): string => n.postavke.map((p) => `${p.kolicina} × ${p.ime}`).join(', ')

export function AdminVsaNarocila({ zavrnjen, token }: { zavrnjen: () => void; token: string }) {
  const [stanje, setStanje] = useState<StanjeNarocila | null>(null)
  const [vnos, setVnos] = useState('')
  const [iskanje, setIskanje] = useState('')
  const [od, setOd] = useState(0)
  const [osvezi, setOsvezi] = useState(0)
  const [rezultat, setRezultat] = useState<VsaNarocila | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [izbrano, setIzbrano] = useState<number | null>(null)

  useEffect(() => {
    const id = setTimeout(() => {
      setIskanje(vnos.trim())
      setOd(0)
    }, 300)
    return () => clearTimeout(id)
  }, [vnos])

  useEffect(() => {
    let zivo = true
    void supabase.rpc('trgovina_admin_vsa_narocila', { p_stanje: stanje ?? undefined, p_iskanje: iskanje || undefined, p_od: od, p_koliko: NA_STRAN })
      .then(({ data, error }) => {
        if (!zivo) return
        if (error?.code === '42501') return zavrnjen()
        setNapaka(error ? error.message : null)
        setRezultat((data as unknown as VsaNarocila | null) ?? { skupaj: 0, stanja: {}, narocila: [] })
      })
    return () => { zivo = false }
  }, [stanje, iskanje, od, osvezi, zavrnjen])

  if (rezultat === null) return <Nalaganje />
  const vseh = Object.values(rezultat.stanja).reduce((a, b) => a + (b ?? 0), 0)
  const izberi = (s: StanjeNarocila | null) => {
    setStanje(s)
    setOd(0)
  }
  return (
    <div className="space-y-4">
      {napaka && <p className="opozorilo">{napaka}</p>}
      <div className="flex flex-wrap gap-1.5 text-sm">
        {[null, ...STANJA_NAROCILA].map((s) => (
          <button key={s ?? 'vsa'} type="button" onClick={() => izberi(s)} aria-pressed={s === stanje}
            className={`rounded-full px-3 py-1 ring-1 ${s === stanje ? 'bg-white/15 font-semibold text-white ring-white/30' : 'text-slate-400 ring-white/10 hover:bg-white/5'}`}>
            {s ? t(`admin.stanje.${s}`) : t('admin.vsa.vsa')} <span className="tabular-nums text-slate-500">{s ? rezultat.stanja[s] ?? 0 : vseh}</span>
          </button>
        ))}
      </div>
      <input type="search" value={vnos} onChange={(e) => setVnos(e.target.value)} placeholder={t('admin.vsa.isci')}
        aria-label={t('admin.vsa.isci')} className="polje w-full max-w-md" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {izbrano !== null && (
          <div className="lg:order-2">
            <Podrobnosti key={izbrano} id={izbrano} token={token} zavrnjen={zavrnjen} zapri={() => setIzbrano(null)}
              spremenjeno={() => setOsvezi((x) => x + 1)} />
          </div>
        )}
        <div className={`space-y-2 lg:order-1 ${izbrano === null ? 'lg:col-span-2' : ''}`}>
          {rezultat.narocila.length === 0 && <p className="kartica p-5 text-slate-400">{t('admin.prazno')}</p>}
          {rezultat.narocila.map((n) => (
            <button key={n.id} type="button" onClick={() => setIzbrano(n.id)}
              className={`kartica block w-full p-4 text-left text-sm hover:bg-white/5 ${n.id === izbrano ? 'ring-1 ring-gnl-400/50' : ''}`}>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-black tracking-widest">{n.javna_oznaka}</span>
                <ZnackaStanja stanje={n.stanje} />
              </span>
              <span className="mt-1 flex flex-wrap justify-between gap-2 text-slate-400">
                <span>{datum(n.created_at)} · {n.ime ?? n.email ?? t('admin.vsa.gost')}</span>
                {n.znesek_skupaj !== null && <span className="tabular-nums text-slate-200">{cena(n.znesek_skupaj)}</span>}
              </span>
              <span className="mt-1 block truncate text-slate-500">{povzetekPostavk(n)}</span>
            </button>
          ))}
          {rezultat.skupaj > NA_STRAN && (
            <div className="flex items-center justify-between gap-2 text-sm text-slate-400">
              <button type="button" className="gumb-tih" disabled={od === 0} onClick={() => setOd(Math.max(od - NA_STRAN, 0))}>{t('admin.vsa.prejsnja')}</button>
              <span>{t('admin.vsa.stran', { od: od + 1, do: Math.min(od + NA_STRAN, rezultat.skupaj), skupaj: rezultat.skupaj })}</span>
              <button type="button" className="gumb-tih" disabled={od + NA_STRAN >= rezultat.skupaj} onClick={() => setOd(od + NA_STRAN)}>{t('admin.vsa.naslednja')}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Podrobnosti({ id, token, zavrnjen, zapri, spremenjeno }: {
  id: number
  token: string
  zavrnjen: () => void
  zapri: () => void
  spremenjeno: () => void
}) {
  const [n, setN] = useState<NarociloPodrobno | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let zivo = true
    void supabase.rpc('trgovina_admin_narocilo', { p_id: id }).then(({ data, error }) => {
      if (!zivo) return
      if (error?.code === '42501') return zavrnjen()
      setNapaka(error ? error.message : null)
      setN(data as unknown as NarociloPodrobno | null)
    })
    return () => { zivo = false }
  }, [id, zavrnjen])

  if (!n) return napaka ? <p className="opozorilo">{napaka}</p> : <Nalaganje />
  const stripe = n.stripe_payment_intent ? stripePovezava(n.stripe_payment_intent, n.stripe_checkout_id) : null
  return (
    <article className="kartica space-y-4 p-5 text-sm lg:sticky lg:top-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-lg font-black tracking-widest">{n.javna_oznaka}</p>
        <span className="flex items-center gap-2">
          <ZnackaStanja stanje={n.stanje} />
          <button type="button" className="gumb-tih" onClick={zapri}>{t('admin.vsa.zapri')}</button>
        </span>
      </div>
      <p className="text-slate-400">
        {t('narocila.naroceno', { datum: datum(n.placano_at ?? n.created_at) })}
        {n.poslano_at && ` · ${t('narocila.poslano', { datum: datum(n.poslano_at) })}`}
      </p>
      {napaka && <p className="opozorilo">{napaka}</p>}
      {n.manjka > 0 && <p className="znacka bg-rose-500 px-3 py-1 text-white">{t('admin.manjka', { n: n.manjka })}</p>}

      <ul className="divide-y divide-white/5">
        {n.postavke.map((p) => (
          <li key={p.id} className="flex justify-between gap-3 py-1">
            <span>
              <b>{p.kolicina} ×</b> {p.ime} <span className="text-slate-500">{p.sku}</span>
              {p.personalizacija && <span className="block text-xs font-semibold uppercase text-gnl-200">{opisPersonalizacije(p.personalizacija)}</span>}
            </span>
            <span className="tabular-nums text-slate-400">{cena((p.cena + p.doplacilo) * p.kolicina)}</span>
          </li>
        ))}
        {n.znesek_dostava !== null && (
          <li className="flex justify-between gap-3 py-1 text-slate-400"><span>{t('narocila.postnina')}</span><span className="tabular-nums">{cena(n.znesek_dostava)}</span></li>
        )}
        {(n.znesek_popust ?? 0) > 0 && (
          <li className="flex justify-between gap-3 py-1 text-slate-400"><span>{t('admin.vsa.popust')}</span><span className="tabular-nums">−{cena(n.znesek_popust ?? 0)}</span></li>
        )}
        {n.znesek_skupaj !== null && (
          <li className="flex justify-between gap-3 py-1 font-bold"><span>{t('narocila.skupaj')}</span><span className="tabular-nums">{cena(n.znesek_skupaj)}</span></li>
        )}
        {n.znesek_ddv !== null && (
          <li className="flex justify-between gap-3 py-1 text-slate-500"><span>{t('admin.vsa.ddv')}</span><span className="tabular-nums">{cena(n.znesek_ddv)}</span></li>
        )}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-slate-500">{t('admin.vsa.naslov')}</p>
          <Naslovnik n={n} />
          {n.email && <p className="mt-1 text-slate-400">{n.email}</p>}
          {n.dostava_kljuc && <p className="text-slate-400">{t('admin.dostava', { kljuc: n.dostava_kljuc })}</p>}
        </div>
        <div className="space-y-1">
          {n.sledilna && <p>{t('narocila.sledilna', { st: n.sledilna })}</p>}
          {stripe && (
            <p>
              <a href={stripe.url} target="_blank" rel="noreferrer" className="text-gnl-300 underline">{t('admin.vsa.stripe')}</a>
              {!stripe.znanNacin && <span className="block text-xs text-slate-500">{t('admin.vsa.stripeNacin')}</span>}
            </p>
          )}
        </div>
      </div>

      <Dejanja n={n} token={token} spremeni={(novo) => {
        setN(novo)
        spremenjeno()
      }} />

      <div>
        <p className="text-xs uppercase text-slate-500">{t('admin.vsa.zgodovina')}</p>
        {n.zgodovina.length === 0 ? <p className="text-slate-500">{t('admin.vsa.brezZgodovine')}</p> : (
          <ol className="mt-1 space-y-1">
            {n.zgodovina.map((z, i) => (
              <li key={i} className="text-slate-400">
                <span className="text-slate-500">{datum(z.created_at)}</span>{' '}
                {z.iz && <>{jeStanje(z.iz) ? t(`admin.stanje.${z.iz}`) : z.iz} → </>}
                <b className="text-slate-200">{jeStanje(z.v) ? t(`admin.stanje.${z.v}`) : z.v}</b>
                {' · '}{z.admin_id ? z.admin ?? z.admin_id.slice(0, 8) : t('admin.vsa.samodejno')}
                {z.opomba && <span className="block pl-4 text-slate-300">{z.opomba}</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  )
}

function Dejanja({ n, token, spremeni }: { n: NarociloPodrobno; token: string; spremeni: (n: NarociloPodrobno) => void }) {
  const [izbira, setIzbira] = useState<Cilj | null>(null)
  const [opomba, setOpomba] = useState('')
  const [sledilna, setSledilna] = useState('')
  const [poteka, setPoteka] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [vracilo, setVracilo] = useState(false)
  const moznosti = jeStanje(n.stanje) ? PREHODI[n.stanje] ?? [] : []
  const stripe = n.stripe_payment_intent ? stripePovezava(n.stripe_payment_intent, n.stripe_checkout_id) : null

  async function potrdi() {
    if (!izbira) return
    setPoteka(true)
    setSporocilo(null)
    if (izbira === 'poslano') {
      const napaka = await oznaciPoslano(n.id, sledilna, token)
      const { data } = await supabase.rpc('trgovina_admin_narocilo', { p_id: n.id })
      setPoteka(false)
      setSporocilo(napaka)
      if (data) spremeni(data as unknown as NarociloPodrobno)
      if (!napaka) setIzbira(null)
      return
    }
    const { data, error } = await supabase.rpc('trgovina_admin_nastavi_stanje', { p_id: n.id, p_stanje: izbira, p_opomba: opomba.trim() || undefined })
    setPoteka(false)
    if (error) return setSporocilo(error.message)
    const novo = data as unknown as NarociloPodrobno
    setVracilo(Boolean(novo.vracilo_potrebno))
    setIzbira(null)
    setOpomba('')
    spremeni(novo)
  }

  return (
    <div className="space-y-2">
      {vracilo && (
        <p className="opozorilo">
          {t('admin.vsa.vraciloPotrebno')}{' '}
          {stripe && <a href={stripe.url} target="_blank" rel="noreferrer" className="underline">{t('admin.vsa.stripe')}</a>}
        </p>
      )}
      {sporocilo && <p className="opozorilo">{sporocilo}</p>}
      {moznosti.length > 0 && (
        <>
          <p className="text-xs uppercase text-slate-500">{t('admin.vsa.dejanja')}</p>
          <div className="flex flex-wrap gap-2">
            {moznosti.map((s) => (
              <button key={s} type="button" className={s === izbira ? 'gumb-glavni' : 'gumb-tih'} onClick={() => setIzbira(s === izbira ? null : s)}>
                {t(`admin.vsa.v.${s}`)}
              </button>
            ))}
          </div>
        </>
      )}
      {izbira && (
        <div className="space-y-2 rounded-lg bg-white/5 p-3">
          {izbira === 'preklicano' && (
            <p className="text-amber-200">{t('admin.vsa.vraciloOpozorilo')}</p>
          )}
          {izbira === 'poslano' ? (
            <input value={sledilna} onChange={(e) => setSledilna(e.target.value)} placeholder={t('admin.sledilna')} aria-label={t('admin.sledilna')} className="polje w-full" />
          ) : (
            <textarea value={opomba} onChange={(e) => setOpomba(e.target.value)} maxLength={500} rows={2}
              placeholder={t('admin.vsa.opomba')} aria-label={t('admin.vsa.opomba')} className="polje w-full" />
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="gumb-glavni" disabled={poteka || (izbira === 'poslano' && !sledilna.trim())} onClick={() => void potrdi()}>
              {t('admin.vsa.potrdi', { stanje: t(`admin.stanje.${izbira}`) })}
            </button>
            <button type="button" className="gumb-tih" onClick={() => setIzbira(null)}>{t('admin.vsa.nazaj')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
