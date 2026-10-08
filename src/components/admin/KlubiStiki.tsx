// Stiki s klubi: komu je kdo pisal, kaj točno je klub dobil in kaj je odgovoril.
//
// Klubom pišemo trije, zato mora vsak videti, kaj je že poslano, preden
// klubu piše — da isti klub ne dobi istega maila od dveh ljudi.
//
// Klub ima lahko več naslovov (vrstica `klub_stik` na naslov); tu so
// združeni po klubu. "+ mail" zabeleži poslan mail (z besedilom) ali odgovor
// kluba; stanje naslova se premakne samo (nov → poslano → opomnik →
// odgovoril), ročno nastavljenega (sodeluje, ne želi …) ne povozi. Glej
// migraciji `klub_stiki` in `klub_stik_vsebina`.
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
const barvaStanja = (k: string) => STANJA.find(([s]) => s === k)?.[2] ?? ''
const imeStanja = (k: string) => STANJA.find(([s]) => s === k)?.[1] ?? k
// Stanje kluba je "najdlje prišlo" stanje njegovih naslovov.
const VRSTNI_RED = ['sodeluje', 'ne_zeli', 'odgovoril', 'opomnik', 'poslano', 'nov', 'napacen_mail', 'ni_maila']

const VRSTE: [string, string][] = [
  ['prvi', 'prvi mail'],
  ['opomnik', 'opomnik'],
  ['odgovor', 'odgovor kluba'],
  ['klic', 'klic / sporočilo'],
  ['drugo', 'drugo'],
]
const NA_STRAN = 60

const datum = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '—'

const VNOS = 'rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm'

interface Klub {
  kljuc: string
  klub: string
  drzava: string
  liga_slug: string | null
  team_id: number | null
  naslovi: Stik[]
  mailov: number
  zadnji: string | null
  stanje: string
}

const kljucKluba = (s: Pick<Stik, 'team_id' | 'drzava' | 'klub'>) =>
  s.team_id ? `t${s.team_id}` : `${s.drzava}:${s.klub.trim().toLowerCase()}`

type NovStik = { klub: string; drzava: string; liga_slug: string; email: string; kontakt: string; team_id: number | null }

export default function KlubiStiki() {
  const [stiki, setStiki] = useState<Stik[] | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [drzava, setDrzava] = useState('')
  const [stanje, setStanje] = useState('')
  const [iskanje, setIskanje] = useState('')
  const [prikazanih, setPrikazanih] = useState(NA_STRAN)
  const [odprt, setOdprt] = useState<number | null>(null)
  const [posta, setPosta] = useState<Posta[]>([])
  const [mail, setMail] = useState({ vrsta: 'prvi', zadeva: '', telo: '', poslal: '', opomba: '' })
  const [nov, setNov] = useState<NovStik | null>(null)
  const [delam, setDelam] = useState(false)
  const [uvozeno, setUvozeno] = useState<string | null>(null)

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

  const klubi = useMemo(() => {
    const m = new Map<string, Klub>()
    for (const s of stiki ?? []) {
      const k = kljucKluba(s)
      const g = m.get(k) ?? {
        kljuc: k, klub: s.klub, drzava: s.drzava, liga_slug: s.liga_slug, team_id: s.team_id,
        naslovi: [], mailov: 0, zadnji: null, stanje: 'ni_maila',
      }
      g.naslovi.push(s)
      g.mailov += s.mailov
      if (s.zadnji_mail_at && (!g.zadnji || s.zadnji_mail_at > g.zadnji)) g.zadnji = s.zadnji_mail_at
      if (VRSTNI_RED.indexOf(s.stanje) < VRSTNI_RED.indexOf(g.stanje)) g.stanje = s.stanje
      g.liga_slug ??= s.liga_slug
      m.set(k, g)
    }
    return [...m.values()]
  }, [stiki])

  const filtrirani = useMemo(() => {
    const q = iskanje.trim().toLowerCase()
    return klubi.filter(
      (g) =>
        (!drzava || g.drzava === drzava) &&
        (!stanje || g.stanje === stanje) &&
        (!q ||
          g.klub.toLowerCase().includes(q) ||
          g.liga_slug?.toLowerCase().includes(q) ||
          g.naslovi.some((s) => [s.email, s.odgovorni, s.opomba, s.kontakt].some((v) => v?.toLowerCase().includes(q)))),
    )
  }, [klubi, drzava, stanje, iskanje])

  const poStanju = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of klubi) if (!drzava || g.drzava === drzava) m.set(g.stanje, (m.get(g.stanje) ?? 0) + 1)
    return m
  }, [klubi, drzava])

  async function shrani(s: Stik, sprememba: Pick<Partial<Stik>, 'stanje' | 'odgovorni' | 'opomba'>) {
    setNapaka(null)
    setStiki((v) => v?.map((x) => (x.id === s.id ? { ...x, ...sprememba } : x)) ?? v)
    const { error } = await supabase.from('klub_stik').update(sprememba).eq('id', s.id)
    if (error) {
      setNapaka(error.message)
      await nalozi()
    }
  }

  async function naloziPosto(id: number) {
    const { data, error } = await supabase
      .from('klub_stik_posta')
      .select('*')
      .eq('stik_id', id)
      .order('poslano_at', { ascending: false })
    if (error) return setNapaka(error.message)
    setPosta(data ?? [])
  }

  async function odpri(s: Stik) {
    if (odprt === s.id) return setOdprt(null)
    setOdprt(s.id)
    setPosta([])
    await naloziPosto(s.id)
  }

  async function zabelezi(s: Stik) {
    setDelam(true)
    setNapaka(null)
    const { error } = await supabase.from('klub_stik_posta').insert({
      stik_id: s.id,
      za: s.email,
      vrsta: mail.vrsta,
      zadeva: mail.zadeva.trim() || null,
      telo: mail.telo.trim() || null,
      poslal: mail.poslal.trim() || null,
      opomba: mail.opomba.trim() || null,
    })
    setDelam(false)
    if (error) return setNapaka(error.message)
    setMail((m) => ({ ...m, zadeva: '', telo: '', opomba: '' }))
    await nalozi()
    await naloziPosto(s.id)
  }

  async function dodaj() {
    if (!nov?.klub.trim()) return
    setDelam(true)
    setNapaka(null)
    const email = nov.email.trim() || null
    const { error } = await supabase.from('klub_stik').insert({
      klub: nov.klub.trim(),
      drzava: nov.drzava,
      team_id: nov.team_id,
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

  // Uvoz poslanih mailov iz JSON datoteke (ko pošiljamo v paketu, npr. iz
  // Claude Code). Datoteka ne gre v git — naslovi klubov niso za javni repo.
  // Vrstica: { klub, drzava, liga_slug?, email, vir_url?, kontakt?, opomba?,
  //   stanje?, posta: [{ poslano_at, vrsta?, zadeva?, telo?, poslal?, gmail_nit? }] }
  // Naslov, ki je že na seznamu, se ne podvoji; mail z isto nitjo Gmaila se
  // ne vpiše dvakrat, zato je ponoven uvoz iste datoteke varen.
  async function uvozi(datoteka: File) {
    setDelam(true)
    setNapaka(null)
    try {
      const vrstice = JSON.parse(await datoteka.text()) as (NovStik & {
        vir_url?: string; opomba?: string; stanje?: string
        posta?: { poslano_at: string; vrsta?: string; zadeva?: string; telo?: string; poslal?: string; gmail_nit?: string }[]
      })[]
      const poNaslovu = new Map((stiki ?? []).filter((s) => s.email).map((s) => [s.email!.toLowerCase(), s]))
      let novih = 0
      let mailov = 0
      for (const v of vrstice) {
        const email = v.email.trim()
        let s = poNaslovu.get(email.toLowerCase())
        if (!s) {
          const { data, error } = await supabase
            .from('klub_stik')
            .insert({
              klub: v.klub, drzava: v.drzava, liga_slug: v.liga_slug || null, email,
              kontakt: v.kontakt || null, vir_url: v.vir_url || null, opomba: v.opomba || null,
            })
            .select()
            .single()
          if (error) throw new Error(`${v.klub}: ${error.message}`)
          s = data
          poNaslovu.set(email.toLowerCase(), s)
          novih++
        }
        const { data: ze } = await supabase.from('klub_stik_posta').select('gmail_nit').eq('stik_id', s.id)
        const zeNiti = new Set((ze ?? []).map((p) => p.gmail_nit))
        const nove = (v.posta ?? []).filter((p) => !p.gmail_nit || !zeNiti.has(p.gmail_nit))
        if (nove.length) {
          const { error } = await supabase.from('klub_stik_posta').insert(
            nove.map((p) => ({
              stik_id: s!.id, za: email, poslano_at: p.poslano_at, vrsta: p.vrsta ?? 'prvi',
              zadeva: p.zadeva ?? null, telo: p.telo ?? null, poslal: p.poslal ?? null, gmail_nit: p.gmail_nit ?? null,
            })),
          )
          if (error) throw new Error(`${v.klub}: ${error.message}`)
          mailov += nove.length
        }
        // Stanje iz datoteke (npr. napacen_mail ob vrnjenem mailu) za sprožilcem pošte.
        if (v.stanje) await supabase.from('klub_stik').update({ stanje: v.stanje }).eq('id', s.id)
      }
      await nalozi()
      setUvozeno(`Uvoženo: ${novih} novih naslovov, ${mailov} mailov.`)
    } catch (e) {
      setNapaka(`Uvoz ni uspel: ${(e as Error).message}`)
      await nalozi()
    } finally {
      setDelam(false)
    }
  }

  const novZa = (g?: Klub): NovStik => ({
    klub: g?.klub ?? '', drzava: g?.drzava ?? (drzava || 'SI'), liga_slug: g?.liga_slug ?? '',
    email: '', kontakt: '', team_id: g?.team_id ?? null,
  })

  if (stiki === null && !napaka) return null

  const obrazec = nov && (
    <div className="grid gap-2 rounded-xl bg-white/5 p-3 sm:grid-cols-3">
      <input value={nov.klub} onChange={(e) => setNov({ ...nov, klub: e.target.value })} placeholder="Klub" className={VNOS} />
      <select value={nov.drzava} onChange={(e) => setNov({ ...nov, drzava: e.target.value })} className={VNOS}>
        <option value="SI">SI</option>
        <option value="SK">SK</option>
        <option value="HR">HR</option>
        <option value="CZ">CZ</option>
      </select>
      <input value={nov.liga_slug} onChange={(e) => setNov({ ...nov, liga_slug: e.target.value })} placeholder="Liga (npr. hr-mz-1mnl)" className={VNOS} />
      <input value={nov.email} onChange={(e) => setNov({ ...nov, email: e.target.value })} placeholder="E-naslov" className={VNOS} />
      <input value={nov.kontakt} onChange={(e) => setNov({ ...nov, kontakt: e.target.value })} placeholder="Kontaktna oseba / telefon" className={VNOS} />
      <div className="flex gap-2">
        <button onClick={dodaj} disabled={delam || !nov.klub.trim()} className="gumb-glavni flex-1 text-sm disabled:opacity-50">
          Dodaj
        </button>
        <button onClick={() => setNov(null)} className="gumb-tih text-xs">prekliči</button>
      </div>
    </div>
  )

  return (
    <section className="kartica space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">
          Stiki s klubi
          <span className="ml-2 text-xs font-normal text-slate-500">
            {klubi.length} klubov · {stiki?.length ?? 0} naslovov · {(stiki ?? []).reduce((v, s) => v + s.mailov, 0)} mailov
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <label className={`gumb-tih cursor-pointer text-xs ${delam ? 'opacity-50' : ''}`}>
            {delam ? 'Uvažam …' : 'Uvozi poslane maile'}
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              disabled={delam}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) uvozi(f)
              }}
            />
          </label>
          {!nov && (
            <button onClick={() => setNov(novZa())} className="gumb-tih text-xs">
              + klub
            </button>
          )}
        </div>
      </div>

      {uvozeno && <p className="text-sm text-gnl-300">{uvozeno}</p>}

      {nov && !nov.team_id && !klubi.some((g) => g.klub === nov.klub && nov.klub) && obrazec}

      <div className="flex flex-wrap items-center gap-2">
        <select value={drzava} onChange={(e) => { setDrzava(e.target.value); setPrikazanih(NA_STRAN) }} className={VNOS}>
          <option value="">Vse države</option>
          <option value="SI">Slovenija</option>
          <option value="SK">Slovaška</option>
          <option value="HR">Hrvaška</option>
          <option value="CZ">Češka</option>
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
          vsi klubi
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

      <ul className="divide-y divide-white/10 text-sm">
        {filtrirani.slice(0, prikazanih).map((g) => (
          <li key={g.kljuc} className="space-y-2 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-semibold">{g.klub}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {g.drzava}
                  {g.liga_slug ? ` · ${g.liga_slug}` : ''}
                </span>
                {g.team_id && (
                  <a
                    href={`/club/${g.team_id}${g.liga_slug ? `?t=${g.liga_slug}` : ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs text-gnl-300 hover:underline"
                  >
                    stran kluba
                  </a>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                {g.mailov} {g.mailov === 1 ? 'mail' : 'mailov'} · zadnji {datum(g.zadnji)}
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${barvaStanja(g.stanje)}`}>{imeStanja(g.stanje)}</span>
              <button onClick={() => setNov(novZa(g))} className="shrink-0 text-xs text-slate-500 hover:text-slate-300">
                + naslov
              </button>
            </div>
            {nov && nov.team_id === g.team_id && nov.klub === g.klub && obrazec}

            <ul className="space-y-2 border-l border-white/10 pl-3">
              {g.naslovi.map((s) => (
                <li key={s.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1 truncate text-xs text-slate-300">
                      {s.email ? <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a> : 'brez naslova'}
                      {s.kontakt ? <span className="text-slate-500"> · {s.kontakt}</span> : null}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                      {s.mailov} · {datum(s.zadnji_mail_at)}
                    </span>
                    <select
                      value={s.stanje}
                      onChange={(e) => shrani(s, { stanje: e.target.value })}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs ${barvaStanja(s.stanje)}`}
                    >
                      {STANJA.map(([k, ime]) => (
                        <option key={k} value={k}>{ime}</option>
                      ))}
                    </select>
                    <button onClick={() => odpri(s)} className="gumb-tih shrink-0 text-xs">
                      {odprt === s.id ? 'zapri' : 'maili'}
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
                    <div className="space-y-3 rounded-xl bg-white/5 p-3">
                      {posta.length === 0 ? (
                        <p className="text-xs text-slate-500">Še nič zabeleženega.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs text-slate-300">
                          {posta.map((p) => (
                            <li key={p.id}>
                              <details>
                                <summary className="cursor-pointer">
                                  <span className="tabular-nums text-slate-500">{datum(p.poslano_at)}</span>{' '}
                                  <span className="font-semibold">{VRSTE.find(([k]) => k === p.vrsta)?.[1] ?? p.vrsta}</span>
                                  {p.poslal ? ` · ${p.poslal}` : ''}
                                  {p.zadeva ? ` · ${p.zadeva}` : ''}
                                </summary>
                                <div className="mt-1 space-y-1 pl-4">
                                  {p.za && <div className="text-slate-500">za: {p.za}</div>}
                                  {p.opomba && <div className="text-slate-400">{p.opomba}</div>}
                                  {p.telo ? (
                                    <pre className="whitespace-pre-wrap rounded-lg bg-slate-900 p-2 font-sans text-slate-300">{p.telo}</pre>
                                  ) : (
                                    !p.gmail_nit && <div className="text-slate-500">Besedilo ni shranjeno.</div>
                                  )}
                                  {p.gmail_nit && (
                                    <a
                                      href={`https://mail.google.com/mail/u/0/#all/${p.gmail_nit}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-gnl-300 hover:underline"
                                    >
                                      odpri nit v Gmailu
                                    </a>
                                  )}
                                </div>
                              </details>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-4">
                        <select value={mail.vrsta} onChange={(e) => setMail({ ...mail, vrsta: e.target.value })} className={VNOS}>
                          {VRSTE.map(([k, ime]) => (
                            <option key={k} value={k}>{ime}</option>
                          ))}
                        </select>
                        <input value={mail.zadeva} onChange={(e) => setMail({ ...mail, zadeva: e.target.value })} placeholder="Zadeva" className={`${VNOS} sm:col-span-2`} />
                        <input value={mail.poslal} onChange={(e) => setMail({ ...mail, poslal: e.target.value })} placeholder="Kdo" className={VNOS} />
                        <textarea
                          value={mail.telo}
                          onChange={(e) => setMail({ ...mail, telo: e.target.value })}
                          placeholder="Besedilo maila (ali odgovora kluba)"
                          rows={4}
                          className={`${VNOS} sm:col-span-4`}
                        />
                        <input value={mail.opomba} onChange={(e) => setMail({ ...mail, opomba: e.target.value })} placeholder="Opomba" className={`${VNOS} sm:col-span-3`} />
                        <button onClick={() => zabelezi(s)} disabled={delam} className="gumb-glavni text-sm disabled:opacity-50">
                          Zabeleži
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
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
