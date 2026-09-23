import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { mnozina, EKIPE } from '../lib/pomozno'
import {
  kodaJeVeljavna,
  ocistiKodo,
  pozabiVabilo,
  shraniVabilo,
} from '../lib/miniLige'

interface Liga {
  id: number
  name: string
  owner_name: string | null
  ekip: number
}

interface Ekipa {
  id: number
  name: string
  competition_short: string | null
}

/**
 * Povabilo v mini ligo: slff.eu/l/KODA.
 *
 * Ena stran, ki ve, kaj človeku manjka, in ga pelje samo čez to:
 *   - ni prijavljen  -> prijava, nato nazaj sem
 *   - nima ekipe     -> sestavi ekipo; ob shranitvi se vstop dokonča sam
 *   - ima ekipo      -> en gumb
 * Kodo si zapomni v localStorage, ker se človek po prijavi ali sestavljanju
 * ne vrne prek pogovora, iz katerega je prišel.
 */
export default function VstopVMiniLigo() {
  const { koda: surova } = useParams()
  const koda = ocistiKodo(surova ?? '')
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [liga, setLiga] = useState<Liga | null | undefined>(undefined)
  // null = še se nalaga; brez tega bi za hip pisalo "potrebuješ ekipo" tudi
  // človeku, ki jih ima pet.
  const [ekipe, setEkipe] = useState<Ekipa[] | null>(null)
  const [zEkipo, setZEkipo] = useState<number | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  const veljavna = kodaJeVeljavna(koda)
  const uporabnikId = session?.user.id
  useNaslov(liga ? `Povabilo: ${liga.name}` : 'Povabilo v mini ligo')

  useEffect(() => {
    if (!veljavna) {
      setLiga(null)
      return
    }
    let veljavno = true
    supabase
      .rpc('mini_liga_po_kodi', { p_koda: koda })
      .then(({ data }) => {
        if (!veljavno) return
        const l = (Array.isArray(data) ? data[0] : data) as Liga | undefined
        setLiga(l ?? null)
        if (l) shraniVabilo(koda)
      })
    return () => {
      veljavno = false
    }
  }, [koda, veljavna])

  useEffect(() => {
    if (!uporabnikId) {
      setEkipe([])
      return
    }
    setEkipe(null)
    let veljavno = true
    supabase
      .from('fantasy_teams')
      .select('id, name, competitions(short_name)')
      .eq('owner_id', uporabnikId)
      .then(({ data }) => {
        if (!veljavno) return
        const seznam: Ekipa[] = (data ?? []).map((e) => ({
          id: e.id as number,
          name: (e.name as string) ?? '',
          competition_short:
            (e as { competitions?: { short_name?: string | null } }).competitions?.short_name ??
            null,
        }))
        setEkipe(seznam)
        setZEkipo((prej) => prej ?? seznam[0]?.id ?? null)
      })
    return () => {
      veljavno = false
    }
  }, [uporabnikId])

  async function pridruzi() {
    if (zEkipo == null) return
    setNapaka(null)
    setDela(true)
    const { data, error } = await supabase.rpc('pridruzi_mini_ligi', {
      p_koda: koda,
      p_ekipa: zEkipo,
    })
    setDela(false)
    if (error) return setNapaka(error.message)
    const izid = Array.isArray(data) ? data[0] : data
    pozabiVabilo()
    navigate(`/mini-lige?liga=${izid?.mini_liga_id ?? ''}&vstop=${izid?.dodano ? 'nov' : 'ze'}`)
  }

  if (loading || liga === undefined)
    return <p className="animiraj-utrip text-slate-400">Nalaganje …</p>

  if (!veljavna || liga === null)
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-black naslov">Te mini lige ni</h1>
        <p className="kartica p-4 text-sm text-slate-400">
          Povezava je nepopolna ali je liga izbrisana. Prosi, naj ti pošljejo novo, ali si{' '}
          <Link to="/mini-lige" className="text-gnl-300 hover:underline">
            ustvari svojo
          </Link>
          .
        </p>
      </div>
    )

  const glava = (
    <div className="kartica space-y-1 p-5">
      <p className="text-xs text-slate-500">Povabilo v mini ligo</p>
      <h1 className="text-2xl font-black naslov">{liga.name}</h1>
      <p className="text-sm text-slate-400">
        {liga.owner_name ? `Ustvaril ${liga.owner_name}` : 'Mini liga'} ·{' '}
        {mnozina(liga.ekip, EKIPE)}
      </p>
    </div>
  )

  if (!session)
    return (
      <div className="mx-auto max-w-md space-y-4">
        {glava}
        <p className="text-sm text-slate-400">
          Prijavi se ali si ustvari račun. Po prijavi te vrnemo sem in vstopiš z enim klikom.
        </p>
        <Link
          to={povezavaNaPrijavo(`/l/${koda}`)}
          className="gumb-glavni block w-full text-center"
        >
          Prijava ali registracija
        </Link>
      </div>
    )

  if (ekipe === null)
    return (
      <div className="mx-auto max-w-md space-y-4">
        {glava}
        <p className="animiraj-utrip text-sm text-slate-400">Nalaganje tvojih ekip …</p>
      </div>
    )

  if (ekipe.length === 0)
    return (
      <div className="mx-auto max-w-md space-y-4">
        {glava}
        <p className="text-sm text-slate-400">
          Za mini ligo potrebuješ ekipo. Sestavi jo — traja minuto — in ob shranitvi si
          samodejno v ligi.
        </p>
        <Link to="/moja-ekipa" className="gumb-glavni block w-full text-center">
          Sestavi ekipo
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-md space-y-4">
      {glava}
      {ekipe.length > 1 && (
        <label className="block text-sm text-slate-400">
          S katero ekipo?
          <select
            value={zEkipo ?? ''}
            onChange={(e) => setZEkipo(Number(e.target.value))}
            className="mt-1 w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none ring-1 ring-white/10"
          >
            {ekipe.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.competition_short ? ` · ${e.competition_short}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      <button onClick={pridruzi} disabled={dela} className="gumb-glavni w-full">
        {dela ? 'Vstopam …' : `Pridruži se z ekipo ${ekipe.find((e) => e.id === zEkipo)?.name ?? ''}`}
      </button>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
    </div>
  )
}
