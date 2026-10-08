// Stiki s klubi: komu je kdo pisal in kaj je klub odgovoril.
//
// Klubom pišemo trije, zato mora vsak videti, kaj je že poslano, preden
// klubu piše — da isti klub ne dobi istega maila od dveh ljudi. "+ mail"
// zabeleži poslan mail (ali odgovor kluba); stanje se premakne samo
// (nov → poslano → opomnik → odgovoril), ročno nastavljenega (sodeluje,
// ne želi …) ne povozi. Glej migracijo `klub_stiki`.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/baza.types'

type Stik = Database['public']['Tables']['klub_stik']['Row']
type Posta = Database['public']['Tables']['klub_stik_posta']['Row']

const STANJA: [string, string, string][] = [
  ['nov', 'nov', 'bg-white/5 text-slate-300'],
  ['ni_maila', 'ni maila', 'bg-white/5 text-slate-500'],
  ['poslano', 'poslano', 'bg-sky-500/15 text-sky-200'],
  ['opomnik', 'opomnik', 'bg-indigo-500/15 text-indigo-200'],
  ['odgovoril', 'odgovoril', 'bg-amber-500/15 text-amber-200'],
  ['sodeluje', 'sodeluje', 'bg-gnl-500/25 text-gnl-200'],
  ['ne_zeli', 'ne želi', 'bg-rose-500/15 text-rose-200'],
  ['napacen_mail', 'napačen mail', 'bg-rose-500/10 text-rose-300'],
]
const VRSTE: [string, string][] = [
  ['prvi', 'prvi mail'],
  ['opomnik', 'opomnik'],
  ['odgovor', 'odgovor kluba'],
  ['klic', 'klic / sporočilo'],
  ['drugo', 'drugo'],
]
const NA_STRAN = 100

const datum = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '—'

const VNOS = 'rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm'

export default function KlubiStiki() {
  const [stiki, setStiki] = useState<Stik[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [drzava, setDrzava] = useState('')
  const [stanje, setStanje] = useState('')
  const [iskanje, setIskanje] = useState('')
  const [prikazanih, setPrikazanih] = useState(NA_STRAN)
  const [odprt, setOdprt] = useState<number | null>(null)
  const [posta, setPosta] = useState<Posta[]>([])
  const [mail, setMail] = useState({ vrsta: 'prvi', zadeva: '', poslal: '', opomba: '' })
  const [nov, setNov] = useState<{ klub: string; drzava: string; liga_slug: string; email: string; kontakt: string } | null>(null)
  const [delam, setDelam] = useState(false)

  const nalozi = useCallback(async () => {
    const { data, error } = await supabase
      .from('klub_stik')
      .select('*')
      .order('drzava')
      .order('klub')
      .range(0, 4999)
    if (error) return setNapaka(error.message)
    setStiki(data ?? [])
  }, [])

  useEffect(() => {
    nalozi()
    // Kdo pošilja: privzeto prikazno ime prijavljenega admina.
    supabase.auth.getUser().then(({ data }) => {
      const ime = (data.user?.user_metadata?.display_name as string | undefined) ?? data.user?.email ?? ''
      setMail((m) => ({ ...m, poslal: m.poslal || ime }))
    })
  }, [nalozi])

  const filtrirani = useMemo(() => {
    const q = iskanje.trim().toLowerCase()
    return (stiki ?? []).filter(
      (s) =>
        (!drzava || s.drzava === drzava) &&
        (!stanje || s.stanje === stanje) &&
        (!q || [s.klub, s.email, s.liga_slug, s.odgovorni, s.opomba].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [stiki, drzava, stanje, iskanje])

  const poStanju = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of stiki ?? []) if (!drzava || s.drzava === drzava) m.set(s.stanje, (m.get(s.stanje) ?? 0) + 1)
    return m
  }, [stiki, drzava])

  async function shrani(s: Stik, sprememba: Pick<Partial<Stik>, 'stanje' | 'odgovorni' | 'opomba'>) {
    setNapaka(null)
    setStiki((v) => v?.map((x) => (x.id === s.id ? { ...x, ...sprememba } : x)) ?? v)
    const { error } = await supabase.from('klub_stik').update(sprememba).eq('id', s.id)
    if (error) {
      setNapaka(error.message)
      await nalozi()
    }
  }

  async function odpri(s: Stik) {
    if (odprt === s.id) return setOdprt(null)
    setOdprt(s.id)
    setPosta([])
    const { data, error } = await supabase
      .from('klub_stik_posta')
      .select('*')
      .eq('stik_id', s.id)
      .order('poslano_at', { ascending: false })
    if (error) return setNapaka(error.message)
    setPosta(data ?? [])
  }

  async function zabelezi(s: Stik) {
    setDelam(true)
    setNapaka(null)
    const { error } = await supabase.from('klub_stik_posta').insert({
      stik_id: s.id,
      vrsta: mail.vrsta,
      zadeva: mail.zadeva.trim() || null,
      poslal: mail.poslal.trim() || null,
      opomba: mail.opomba.trim() || null,
    })
    setDelam(false)
    if (error) return setNapaka(error.message)
    setMail((m) => ({ ...m, zadeva: '', opomba: '' }))
    await nalozi()
    setOdprt(null)
    await odpri(s)
  }

  async function dodaj() {
    if (!nov?.klub.trim()) return
    setDelam(true)
    setNapaka(null)
    const email = nov.email.trim() || null
    const { error } = await supabase.from('klub_stik').insert({
      klub: nov.klub.trim(),
      drzava: nov.drzava,
      liga_slug: nov.liga_slug.trim() || null,
      email,
      kontakt: nov.kontakt.trim() || null,
      stanje: email ? 'nov' : 'ni_maila',
    })
    setDelam(false)
    if (error)
      return setNapaka(error.code === '23505' ? 'Ta naslov je že na seznamu — poišči ga zgoraj.' : error.message)
    setNov(null)
    await nalozi()
  }

  if (stiki === null && !napaka) return null

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">
          Stiki s klubi
          <span className="ml-2 text-xs font-normal text-slate-500">
            {stiki?.length ?? 0} klubov · kdo je komu pisal
          </span>
        </h2>
        <button onClick={() => setNov(nov ? null : { klub: '', drzava: drzava || 'SI', liga_slug: '', email: '', kontakt: '' })} className="gumb-tih text-xs">
          {nov ? 'prekliči' : '+ klub'}
        </button>
      </div>

      {nov && (
        <div className="grid gap-2 rounded-xl bg-white/5 p-3 sm:grid-cols-3">
          <input value={nov.klub} onChange={(e) => setNov({ ...nov, klub: e.target.value })} placeholder="Klub" className={VNOS} />
          <select value={nov.drzava} onChange={(e) => setNov({ ...nov, drzava: e.target.value })} className={VNOS}>
            <option value="SI">SI</option>
            <option value="SK">SK</option>
            <option value="HR">HR</option>
          </select>
          <input value={nov.liga_slug} onChange={(e) => setNov({ ...nov, liga_slug: e.target.value })} placeholder="Liga (npr. hr-mz-1mnl)" className={VNOS} />
          <input value={nov.email} onChange={(e) => setNov({ ...nov, email: e.target.value })} placeholder="E-naslov" className={VNOS} />
          <input value={nov.kontakt} onChange={(e) => setNov({ ...nov, kontakt: e.target.value })} placeholder="Kontaktna oseba / telefon" className={VNOS} />
          <button onClick={dodaj} disabled={delam || !nov.klub.trim()} className="gumb-glavni text-sm disabled:opacity-50">
            Dodaj
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select value={drzava} onChange={(e) => { setDrzava(e.target.value); setPrikazanih(NA_STRAN) }} className={VNOS}>
          <option value="">Vse države</option>
          <option value="SI">Slovenija</option>
          <option value="SK">Slovaška</option>
          <option value="HR">Hrvaška</option>
        </select>
        <input
          value={iskanje}
          onChange={(e) => { setIskanje(e.target.value); setPrikazanih(NA_STRAN) }}
          placeholder="Išči klub, naslov, ligo, opombo …"
          className={`${VNOS} min-w-0 flex-1`}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStanje('')}
          className={`rounded-full px-2 py-0.5 text-xs ${!stanje ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'}`}
        >
          vsa
        </button>
        {STANJA.map(([k, ime, barva]) => (
          <button
            key={k}
            onClick={() => setStanje(stanje === k ? '' : k)}
            aria-pressed={stanje === k}
            className={`rounded-full px-2 py-0.5 text-xs ${barva} ${stanje === k ? 'ring-1 ring-white/40' : ''}`}
          >
            {ime} {poStanju.get(k) ?? 0}
          </button>
        ))}
      </div>

      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}

      <ul className="divide-y divide-white/5 text-sm">
        {filtrirani.slice(0, prikazanih).map((s) => (
          <li key={s.id} className="space-y-1.5 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-semibold">{s.klub}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {s.drzava}
                  {s.liga_slug ? ` · ${s.liga_slug}` : ''}
                </span>
                {s.team_id && (
                  <a
                    href={`/club/${s.team_id}${s.liga_slug ? `?t=${s.liga_slug}` : ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs text-gnl-300 hover:underline"
                  >
                    stran kluba
                  </a>
                )}
                <div className="truncate text-xs text-slate-400">
                  {s.email ? <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a> : 'brez naslova'}
                  {s.kontakt ? ` · ${s.kontakt}` : ''}
                </div>
              </div>
              <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                {s.mailov} {s.mailov === 1 ? 'mail' : 'mailov'} · zadnji {datum(s.zadnji_mail_at)}
              </span>
              <select
                value={s.stanje}
                onChange={(e) => shrani(s, { stanje: e.target.value })}
                className={`rounded-full border-0 px-2 py-0.5 text-xs ${STANJA.find(([k]) => k === s.stanje)?.[2] ?? ''}`}
              >
                {STANJA.map(([k, ime]) => (
                  <option key={k} value={k}>{ime}</option>
                ))}
              </select>
              <button onClick={() => odpri(s)} className="gumb-tih shrink-0 text-xs">
                {odprt === s.id ? 'zapri' : '+ mail'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                defaultValue={s.odgovorni ?? ''}
                onBlur={(e) => e.target.value !== (s.odgovorni ?? '') && shrani(s, { odgovorni: e.target.value || null })}
                placeholder="Kdo ga ima"
                className={`${VNOS} w-32 text-xs`}
              />
              <input
                defaultValue={s.opomba ?? ''}
                onBlur={(e) => e.target.value !== (s.opomba ?? '') && shrani(s, { opomba: e.target.value || null })}
                placeholder="Opomba (odgovor, dogovor …)"
                className={`${VNOS} min-w-0 flex-1 text-xs`}
              />
            </div>
            {odprt === s.id && (
              <div className="space-y-2 rounded-xl bg-white/5 p-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <select value={mail.vrsta} onChange={(e) => setMail({ ...mail, vrsta: e.target.value })} className={VNOS}>
                    {VRSTE.map(([k, ime]) => (
                      <option key={k} value={k}>{ime}</option>
                    ))}
                  </select>
                  <input value={mail.zadeva} onChange={(e) => setMail({ ...mail, zadeva: e.target.value })} placeholder="Zadeva" className={`${VNOS} sm:col-span-2`} />
                  <input value={mail.poslal} onChange={(e) => setMail({ ...mail, poslal: e.target.value })} placeholder="Kdo" className={VNOS} />
                  <input value={mail.opomba} onChange={(e) => setMail({ ...mail, opomba: e.target.value })} placeholder="Opomba" className={`${VNOS} sm:col-span-3`} />
                  <button onClick={() => zabelezi(s)} disabled={delam} className="gumb-glavni text-sm disabled:opacity-50">
                    Zabeleži
                  </button>
                </div>
                {posta.length === 0 ? (
                  <p className="text-xs text-slate-500">Še nič zabeleženega.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-slate-300">
                    {posta.map((p) => (
                      <li key={p.id}>
                        <span className="tabular-nums text-slate-500">{datum(p.poslano_at)}</span>{' '}
                        <span className="font-semibold">{VRSTE.find(([k]) => k === p.vrsta)?.[1] ?? p.vrsta}</span>
                        {p.poslal ? ` · ${p.poslal}` : ''}
                        {p.zadeva ? ` · ${p.zadeva}` : ''}
                        {p.opomba ? <span className="text-slate-400"> · {p.opomba}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {filtrirani.length > prikazanih && (
        <button onClick={() => setPrikazanih((n) => n + NA_STRAN)} className="gumb-tih w-full text-xs">
          Pokaži več ({filtrirani.length - prikazanih})
        </button>
      )}
      {filtrirani.length === 0 && <p className="text-sm text-slate-500">Ni klubov za ta izbor.</p>}
    </section>
  )
}
