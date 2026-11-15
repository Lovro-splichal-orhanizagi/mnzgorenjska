// Prenosi tekem v živo (SLF-477): vrsta za pregled, prepovedi in merilo.
//
// Stikalo `prenosi`: 0 nihče, 1 admin in preizkuševalci, 2 vsi. Prenos, ki
// ga prijavita 2 različna uporabnika, je skrit, dokler ga admin ne pokaže ali
// skrije za vedno; prenos brez imena kluba v naslovu je viden, a v vrsti kot
// »nepreverjen«. Prepoved velja za uporabnika in (izbirno) njegov YouTube
// kanal; dokler velja, so skriti vsi njuni prenosi in posnetki.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { naYoutubu } from '../../lib/prenosi'
import { Link } from '../Povezava'

interface Vrstica {
  id: string
  match_id: number
  tekma: string
  video_id: string
  kanal_id: string
  kanal_ime: string
  naslov: string
  user_id: string
  uporabnik: string | null
  stanje: string
  gledalcev: number | null
  zacetek: string
  created_at: string
  nepreverjeno: boolean
  skrit: boolean
  skrit_prijave: boolean
  pregledan_at: string | null
  prepovedan: boolean
  prijav: number
  prijave: { razlog: string; opomba: string | null }[]
  ogledov: number
  vpisov: number
}

interface Prepoved {
  id: number
  uporabnik: string | null
  kanal_id: string | null
  kanal_ime: string | null
  do_: string | null
  razlog: string
  created_at: string
  velja: boolean
}

const STIKALO = [
  ['0', 'Izklopljeno (nihče)'],
  ['1', 'Preizkus (admin in preizkuševalci)'],
  ['2', 'V živo (vsi)'],
] as const

const FILTRI = [
  ['pregled', 'Za pregled'],
  ['zivo', 'V živo'],
  ['danes', 'Vsi danes'],
  ['vsi', 'Vsi'],
] as const

const RAZLOGI: Record<string, string> = {
  ni_tekma: 'To ni ta tekma',
  neprimerno: 'Neprimerna vsebina',
  gledalci: 'Snema gledalce/otroke',
  spam: 'Oglas ali spam',
  drugo: 'Drugo',
}

const cas = (d: string) => new Date(d).toLocaleString('sl-SI', { dateStyle: 'short', timeStyle: 'short' })

function Stanje({ v }: { v: Vrstica }) {
  const [besedilo, slog] = v.prepovedan
    ? ['PREPOVEDAN', 'bg-rose-900/60 text-rose-200']
    : v.skrit
      ? ['SKRIT', 'bg-slate-700 text-slate-200']
      : v.skrit_prijave
        ? [`SKRIT · ${v.prijav} PRIJAVI`, 'bg-amber-800/60 text-amber-200']
        : v.stanje === 'v_zivo'
          ? ['● V ŽIVO', 'bg-rose-500 text-white']
          : v.stanje === 'izbrisan'
            ? ['IZBRISAN NA YT', 'bg-slate-700 text-slate-300']
            : ['POSNETEK', 'bg-slate-700 text-slate-200']
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${slog}`}>{besedilo}</span>
      {v.nepreverjeno && <span className="rounded-md bg-sky-900/60 px-2 py-0.5 text-xs font-bold text-sky-200">NEPREVERJENO</span>}
    </span>
  )
}

function OknoPrepovedi({ v, zapri, potrjeno }: { v: Vrstica; zapri: () => void; potrjeno: () => void }) {
  const [zaVedno, setZaVedno] = useState(false)
  const [do_, setDo] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
  const [razlog, setRazlog] = useState('')
  const [kanal, setKanal] = useState(true)
  const [napaka, setNapaka] = useState<string | null>(null)
  const potrdi = async () => {
    const { error } = await supabase.rpc('admin_prenosi_prepovej', {
      p_user: v.user_id,
      p_kanal: kanal ? v.kanal_id : null,
      p_do: zaVedno ? null : new Date(`${do_}T23:59:59`).toISOString(),
      p_razlog: razlog,
    })
    if (error) setNapaka(error.message)
    else potrjeno()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur" onClick={(e) => e.target === e.currentTarget && zapri()}>
      <div role="dialog" aria-modal="true" className="kartica w-full max-w-md space-y-3 p-5 text-sm">
        <h2 className="text-lg font-bold">Prepovej prenašanje</h2>
        <p>
          <strong>{v.uporabnik ?? v.user_id}</strong> · YouTube kanal <strong>{v.kanal_ime}</strong>
        </p>
        <p className="text-slate-400">Uporabnik ne bo mogel dodati prenosa na nobeni tekmi. Njegovi dosedanji prenosi in posnetki se skrijejo.</p>
        <label className="flex items-center gap-3 rounded-xl border border-slate-700 p-3">
          <input type="radio" checked={!zaVedno} onChange={() => setZaVedno(false)} />
          Do datuma
          <input type="date" value={do_} onChange={(e) => setDo(e.target.value)} className="ml-auto rounded-lg border border-white/15 bg-slate-900 px-2 py-1" />
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-700 p-3">
          <input type="radio" checked={zaVedno} onChange={() => setZaVedno(true)} />
          Za vedno
        </label>
        <label className="block space-y-1">
          <span className="font-semibold">Razlog (uporabnik ga vidi)</span>
          <input value={razlog} onChange={(e) => setRazlog(e.target.value.slice(0, 300))} className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2" />
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-1" checked={kanal} onChange={(e) => setKanal(e.target.checked)} />
          Prepovej tudi YouTube kanal {v.kanal_ime} (nov račun z istim kanalom ne bo mogel prenašati)
        </label>
        {napaka && <p className="text-rose-400">{napaka}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="gumb-tih" onClick={zapri}>Prekliči</button>
          <button type="button" className="gumb-glavni bg-rose-500 disabled:opacity-50" disabled={!razlog.trim()} onClick={() => void potrdi()}>
            Prepovej prenašanje
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Prenosi() {
  const [stikalo, setStikalo] = useState<string | null>(null)
  const [push, setPush] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTRI)[number][0]>('pregled')
  const [vrstice, setVrstice] = useState<Vrstica[]>([])
  const [prepovedi, setPrepovedi] = useState<Prepoved[]>([])
  const [prepovej, setPrepovej] = useState<Vrstica | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  const nalozi = useCallback(async () => {
    const [s, p, v, pr] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'prenosi').maybeSingle(),
      supabase.from('settings').select('value').eq('key', 'prenosi_push').maybeSingle(),
      supabase.rpc('admin_prenosi', { p_filter: filter }),
      supabase.rpc('admin_prenosi_prepovedi'),
    ])
    setStikalo(s.data ? String(s.data.value) : null)
    setPush(p.data ? String(p.data.value) : null)
    setNapaka(v.error?.message ?? pr.error?.message ?? null)
    setVrstice((v.data ?? []) as Vrstica[])
    setPrepovedi((pr.data ?? []) as Prepoved[])
  }, [filter])

  useEffect(() => {
    void nalozi()
  }, [nalozi])

  const izvedi = async (klic: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await klic
    if (error) setNapaka(error.message)
    await nalozi()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Prenosi v živo</h2>
      <p className="text-sm text-slate-400">
        Navijači prilepijo povezavo YouTube prenosa na stran tekme. Dovoljeno le v ligah s seznama{' '}
        <code>prenosi_tekmovanja</code> (MNZ lige članov), nikoli na mladinskih. Dve prijavi skrijeta prenos do tvoje odločitve.
      </p>

      <div className="kartica flex flex-wrap items-center gap-3 p-3 text-sm">
        <span className="font-semibold">Stikalo prenosov:</span>
        {STIKALO.map(([v, oznaka]) => (
          <label key={v} className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="stikalo-prenosov"
              checked={stikalo === v}
              onChange={() => void izvedi(supabase.from('settings').update({ value: v }).eq('key', 'prenosi'))}
            />
            {oznaka}
          </label>
        ))}
        <span className="w-full text-xs text-slate-500">
          Obvestila »tekma je v živo«: {push === '1' ? 'vklopljena' : 'izklopljena (besedilo še ni odobreno)'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTRI.map(([v, oznaka]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} className={`rounded-lg px-3 py-1.5 text-sm ${filter === v ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {oznaka}
          </button>
        ))}
      </div>

      {napaka && <p className="text-rose-400">{napaka}</p>}
      {vrstice.length === 0 && <p className="text-sm text-slate-400">Ni prenosov.</p>}

      <div className="space-y-3">
        {vrstice.map((v) => (
          <div key={v.id} className="kartica grid gap-3 p-4 text-sm md:grid-cols-[10rem_1fr_1fr_1fr_auto] md:items-center">
            <Stanje v={v} />
            <div>
              <Link to={`/match/${v.match_id}`} className="font-semibold hover:text-gnl-300">{v.tekma}</Link>
              <p className="text-slate-400">dodan {cas(v.created_at)} · začetek {cas(v.zacetek)}</p>
            </div>
            <div>
              <p className="font-semibold">{v.uporabnik ?? '—'}</p>
              <a href={naYoutubu(v.video_id)} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-gnl-300">
                {v.kanal_ime} · ▶ odpri na YouTubu
              </a>
              <p className="truncate text-xs text-slate-500" title={v.naslov}>{v.naslov}</p>
            </div>
            <div className="text-slate-300">
              {v.prijave.length
                ? v.prijave.map((p, i) => (
                    <p key={i}>
                      »{RAZLOGI[p.razlog] ?? p.razlog}«{p.opomba ? `: ${p.opomba}` : ''}
                    </p>
                  ))
                : '—'}
              <p className="text-xs text-slate-500">{v.ogledov} gledalcev · {v.vpisov} prijav med prenosom</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {(v.skrit || v.skrit_prijave || v.nepreverjeno || (v.prijav > 0 && !v.pregledan_at)) && (
                <button type="button" className="gumb-tih text-xs" onClick={() => void izvedi(supabase.rpc('admin_prenos_odloci', { p_id: v.id, p_akcija: 'pokazi' }))}>
                  Pokaži
                </button>
              )}
              {!v.skrit && (
                <button type="button" className="gumb-tih text-xs" onClick={() => void izvedi(supabase.rpc('admin_prenos_odloci', { p_id: v.id, p_akcija: 'skrij' }))}>
                  {v.skrit_prijave ? 'Skrij za vedno' : 'Skrij'}
                </button>
              )}
              {!v.prepovedan && (
                <button type="button" className="rounded-xl border border-rose-500/60 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10" onClick={() => setPrepovej(v)}>
                  Prepovej prenašanje
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <h3 className="pt-4 text-lg font-bold">Prepovedi</h3>
      {prepovedi.length === 0 && <p className="text-sm text-slate-400">Ni prepovedi.</p>}
      <div className="space-y-2">
        {prepovedi.map((p) => (
          <div key={p.id} className={`kartica flex flex-wrap items-center gap-3 p-3 text-sm ${p.velja ? '' : 'opacity-50'}`}>
            <span className="font-semibold">{p.uporabnik ?? '—'}</span>
            {p.kanal_id && <span className="text-slate-400">kanal {p.kanal_ime ?? p.kanal_id}</span>}
            <span>{p.do_ ? `do ${cas(p.do_)}` : 'za vedno'}</span>
            <span className="text-slate-400">»{p.razlog}«</span>
            {p.velja && (
              <button type="button" className="gumb-tih ml-auto text-xs" onClick={() => void izvedi(supabase.rpc('admin_prenosi_preklici', { p_id: p.id }))}>
                Prekliči
              </button>
            )}
          </div>
        ))}
      </div>

      {prepovej && (
        <OknoPrepovedi
          v={prepovej}
          zapri={() => setPrepovej(null)}
          potrjeno={() => {
            setPrepovej(null)
            void nalozi()
          }}
        />
      )}
    </div>
  )
}
