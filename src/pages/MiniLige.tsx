import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { formatirajTocke } from '../lib/pomozno'
import {
  ocistiKodo,
  zakajNiVeljavna,
  razvrstiMini,
  vecLig,
  besediloVabila,
  DOLZINA_KODE,
  type MiniVrstica,
} from '../lib/miniLige'

const MEDALJE = ['🥇', '🥈', '🥉']

interface MojaLiga {
  id: number
  name: string
  code: string
  owner_id: string
}

interface MojaEkipa {
  id: number
  name: string
  competition_short: string | null
}

/**
 * Mini lige — zasebno tekmovanje med znanci.
 *
 * Javna liga postane igriva šele, ko se napolni; mini liga deluje pri vsaki
 * gostoti. Namenoma gre čez lige: pridružiš se z eno svojo ekipo, ne glede na
 * to, katero tekmovanje igra.
 */
export default function MiniLige() {
  const { session } = useAuth()
  const [lige, setLige] = useState<MojaLiga[]>([])
  const [ekipe, setEkipe] = useState<MojaEkipa[]>([])
  const [izbrana, setIzbrana] = useState<number | null>(null)
  const [lestvica, setLestvica] = useState<MiniVrstica[]>([])
  const [imeNove, setImeNove] = useState('')
  const [koda, setKoda] = useState('')
  const [zEkipo, setZEkipo] = useState<number | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [nalaganje, setNalaganje] = useState(true)
  const [dela, setDela] = useState(false)

  const naloziSvoje = useCallback(async () => {
    if (!session) {
      setNalaganje(false)
      return
    }
    const { data: mojeEkipe } = await supabase
      .from('fantasy_teams')
      .select('id, name, competitions(short_name)')
      .eq('owner_id', session.user.id)
    const seznam: MojaEkipa[] = (mojeEkipe ?? []).map((e) => ({
      id: e.id as number,
      name: (e.name as string) ?? '',
      competition_short:
        (e as { competitions?: { short_name?: string | null } }).competitions?.short_name ?? null,
    }))
    setEkipe(seznam)
    setZEkipo((prej) => prej ?? seznam[0]?.id ?? null)

    // Mini lige, v katerih je katera od mojih ekip, in tiste, ki jih imam v lasti.
    const idji = seznam.map((e) => e.id)
    const { data: clanstva } = idji.length
      ? await supabase.from('mini_liga_clani').select('mini_liga_id').in('fantasy_team_id', idji)
      : { data: [] as { mini_liga_id: number }[] }
    const ligaIdji = [...new Set((clanstva ?? []).map((c) => c.mini_liga_id))]
    const { data: moje } = await supabase
      .from('mini_lige')
      .select('id, name, code, owner_id')
      .or(
        [
          `owner_id.eq.${session.user.id}`,
          ligaIdji.length ? `id.in.(${ligaIdji.join(',')})` : null,
        ]
          .filter(Boolean)
          .join(','),
      )
      .order('created_at')
    const ml = (moje as MojaLiga[]) ?? []
    setLige(ml)
    setIzbrana((prej) => prej ?? ml[0]?.id ?? null)
    setNalaganje(false)
  }, [session])

  useEffect(() => {
    void naloziSvoje()
  }, [naloziSvoje])

  useEffect(() => {
    if (izbrana == null) {
      setLestvica([])
      return
    }
    let veljavno = true
    ;(async () => {
      const { data } = await supabase
        .from('mini_liga_lestvica')
        .select(
          'fantasy_team_id, team_name, owner_name, total_points, rounds_played, points_per_round, competition_short, federation_short',
        )
        .eq('mini_liga_id', izbrana)
      if (veljavno) setLestvica((data as MiniVrstica[]) ?? [])
    })()
    return () => {
      veljavno = false
    }
  }, [izbrana, sporocilo])

  const urejena = useMemo(() => razvrstiMini(lestvica), [lestvica])
  const kaziLigo = useMemo(() => vecLig(lestvica), [lestvica])
  const trenutna = lige.find((l) => l.id === izbrana) ?? null

  async function ustvari() {
    setNapaka(null)
    setSporocilo(null)
    const ime = imeNove.trim()
    if (ime.length < 2) return setNapaka('Ime mini lige naj ima vsaj 2 znaka.')
    setDela(true)
    // Ekipo podamo ze ob ustvarjanju: brez tega bi se moral clovek v svojo
    // ligo pridruziti s svojo kodo, kar je videti kot okvara.
    const { data, error } = await supabase.rpc('ustvari_mini_ligo', {
      p_ime: ime,
      // RPC pricakuje `number | undefined`; `null` pomeni "brez ekipe".
      p_ekipa: zEkipo ?? undefined,
    })
    setDela(false)
    if (error) return setNapaka(error.message)
    const nova = Array.isArray(data) ? data[0] : data
    setImeNove('')
    setSporocilo(`Mini liga "${ime}" je ustvarjena. Koda: ${nova?.code}`)
    await naloziSvoje()
    if (nova?.id) setIzbrana(nova.id as number)
  }

  async function pridruzi() {
    setNapaka(null)
    setSporocilo(null)
    const razlog = zakajNiVeljavna(koda)
    if (razlog) return setNapaka(razlog)
    if (zEkipo == null) return setNapaka('Najprej si sestavi ekipo v kateri od lig.')
    setDela(true)
    const { data, error } = await supabase.rpc('pridruzi_mini_ligi', {
      p_koda: ocistiKodo(koda),
      p_ekipa: zEkipo,
    })
    setDela(false)
    if (error) return setNapaka(error.message)
    const izid = Array.isArray(data) ? data[0] : data
    setKoda('')
    // "Pridruzen." ob ekipi, ki je bila clan ze prej, je potrditev brez
    // ucinka — lestvica se ne spremeni in videti je kot okvara.
    setSporocilo(
      izid?.dodano ? 'Pridružen.' : 'Ta ekipa je v tej mini ligi že od prej.',
    )
    await naloziSvoje()
    if (izid?.mini_liga_id) setIzbrana(izid.mini_liga_id as number)
  }

  if (!session)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black naslov sm:text-3xl">Mini lige</h1>
        <p className="kartica p-6 text-center text-slate-400">
          Za mini ligo se je treba prijaviti.
        </p>
      </div>
    )
  if (nalaganje) return <p className="animiraj-utrip text-slate-400">Nalaganje …</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black naslov sm:text-3xl">Mini lige</h1>
        <p className="mt-1 text-sm text-slate-400">
          Zasebno tekmovanje med znanci. Ekipe so lahko iz različnih lig.
        </p>
      </div>

      {napaka && <p className="kartica p-3 text-sm text-rose-400">{napaka}</p>}
      {sporocilo && <p className="kartica p-3 text-sm text-gnl-300">{sporocilo}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="kartica space-y-2 p-4">
          <h2 className="font-bold">Ustvari</h2>
          <input
            value={imeNove}
            onChange={(e) => setImeNove(e.target.value)}
            placeholder="Ime mini lige"
            maxLength={40}
            className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
          />
          {ekipe.length > 1 && (
            <select
              value={zEkipo ?? ''}
              onChange={(e) => setZEkipo(Number(e.target.value))}
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
            >
              {ekipe.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.competition_short ? ` · ${e.competition_short}` : ''}
                </option>
              ))}
            </select>
          )}
          <button onClick={ustvari} disabled={dela} className="gumb-glavni w-full text-sm">
            Ustvari mini ligo
          </button>
        </section>

        <section className="kartica space-y-2 p-4">
          <h2 className="font-bold">Pridruži se</h2>
          <input
            value={koda}
            onChange={(e) => setKoda(e.target.value)}
            placeholder={`Koda (${DOLZINA_KODE} znakov)`}
            maxLength={12}
            className="w-full rounded-lg bg-white/5 px-3 py-2 font-mono text-sm uppercase outline-none ring-1 ring-white/10"
          />
          {ekipe.length > 1 && (
            <select
              value={zEkipo ?? ''}
              onChange={(e) => setZEkipo(Number(e.target.value))}
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-white/10"
            >
              {ekipe.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.competition_short ? ` · ${e.competition_short}` : ''}
                </option>
              ))}
            </select>
          )}
          <button onClick={pridruzi} disabled={dela} className="gumb-glavni w-full text-sm">
            Pridruži se
          </button>
        </section>
      </div>

      {lige.length === 0 ? (
        <p className="kartica p-6 text-center text-slate-400">
          Nisi še v nobeni mini ligi. Ustvari svojo in povabi znance s kodo.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {lige.map((l) => (
              <button
                key={l.id}
                onClick={() => setIzbrana(l.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  izbrana === l.id
                    ? 'bg-gnl-500/20 text-gnl-200 ring-1 ring-gnl-400/40'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>

          {trenutna && (
            <div className="kartica flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="text-slate-400">
                Koda za povabilo:{' '}
                <span className="font-mono font-black text-gnl-300">{trenutna.code}</span>
              </span>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(
                    besediloVabila(trenutna.name, trenutna.code, window.location.origin),
                  )
                  setSporocilo('Povabilo kopirano.')
                }}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300"
              >
                Kopiraj povabilo
              </button>
            </div>
          )}

          {urejena.length === 0 ? (
            <p className="kartica p-6 text-center text-slate-400">
              V tej mini ligi še ni nobene ekipe.
            </p>
          ) : (
            <ul className="space-y-1">
              {urejena.map((v) => (
                <li
                  key={v.fantasy_team_id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
                >
                  <span className="w-7 shrink-0 text-center text-sm font-black text-slate-500">
                    {v.mesto <= 3 ? MEDALJE[v.mesto - 1] : v.mesto}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{v.team_name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {v.owner_name}
                      {kaziLigo && v.competition_short ? ` · ${v.competition_short}` : ''}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-black tabular-nums text-gnl-300">
                      {formatirajTocke(v.total_points)}
                    </div>
                    <div className="text-[11px] text-slate-500">{v.rounds_played ?? 0} krogov</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
