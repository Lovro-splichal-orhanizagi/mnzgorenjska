import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { povezavaNaPrijavo } from '../lib/prijava'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/useAuth'
import { t, tx, datum } from '../i18n'

// Anonimni klepet — sporočila so javna, avtor pa skrit za psevdonimom, ki se
// deterministično izpelje iz user_id, tako da ista oseba vedno "govori" kot
// isti psevdonim (npr. "Modri Napadalec 42"). Prijavljen mora biti, da lahko
// objavi (proti spam-u), a njegovega imena nihče ne vidi.

/** Sporocilo v klepetu — vrstica tabele `chat_messages`. */
export interface Sporocilo {
  id: number
  // Za neprijavljenega je `null`: `auth.uid()` je prazen in primerjava
  // ne da ne true ne false. Oboje pomeni "ni moje".
  je_moje: boolean | null
  content: string
  alias: string
  created_at: string
}

const PRIDEVNIKI = [
  'Modri', 'Rdeči', 'Zeleni', 'Rumeni', 'Črni', 'Beli', 'Srebrni', 'Zlati',
  'Hitri', 'Divji', 'Tihi', 'Ognjeni', 'Ledeni', 'Nočni', 'Jutranji',
  'Železni', 'Bakreni', 'Sončni', 'Nebeški', 'Brezčutni',
]
const SAMOSTALNIKI = [
  'Vratar', 'Branilec', 'Vezist', 'Napadalec', 'Kapetan', 'Sodnik', 'Trener',
  'Navijač', 'Strelec', 'Podajalec', 'Rezervist', 'Vekar', 'Junak', 'Volk',
  'Orel', 'Zmaj', 'Bik', 'Konj', 'Sokol', 'Ris',
]

function stringHash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return Math.abs(h)
}

export function psevdonim(userId?: string | null): string {
  if (!userId) return t('aplikacija.klepet.gost')
  const h = stringHash(userId)
  const p = PRIDEVNIKI[h % PRIDEVNIKI.length]
  const s = SAMOSTALNIKI[Math.floor(h / PRIDEVNIKI.length) % SAMOSTALNIKI.length]
  const st = h % 100
  return `${p} ${s} ${st}`
}

function relativniCas(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return t('aplikacija.klepet.zdaj')
  if (s < 3600) return t('aplikacija.klepet.minut', { n: Math.floor(s / 60) })
  if (s < 86400) return t('aplikacija.klepet.ur', { n: Math.floor(s / 3600) })
  if (s < 604800) return t('aplikacija.klepet.dni', { n: Math.floor(s / 86400) })
  return datum(iso, {
    day: 'numeric',
    month: 'numeric',
  })
}

export default function Klepet() {
  const { session } = useAuth()
  const [sporocila, setSporocila] = useState<Sporocilo[]>([])
  const [besedilo, setBesedilo] = useState('')
  const [posiljam, setPosiljam] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const mojPsev = psevdonim(session?.user?.id)
  const { pathname, search } = useLocation()

  useEffect(() => {
    let preklican = false
    async function nalozi() {
      // Beremo pogled, ne tabele: `user_id` ne zapusti baze, sicer bi se
      // dalo psevdonim prek `fantasy_teams.owner_id` pripisati ekipi.
      const { data, error } = await supabase
        .from('klepet_sporocila')
        .select('id, content, alias, created_at, je_moje')
        .order('created_at', { ascending: false })
        .limit(30)
      if (preklican) return
      // Najnovejse zgoraj: to je knjiga zelja, ne pogovor v zivo — kdor
      // pride, hoce videti zadnji odgovor, ne prvega sporocila iz avgusta.
      // Lastno sporocilo, poslano med branjem, ostane: branje ga se ne
      // pozna, naslednje ga prinese.
      if (error) setNapaka(error.message)
      else
        setSporocila((prej) => {
          const nova = (data ?? []) as Sporocilo[]
          const znana = new Set(nova.map((s) => s.id))
          const mejaCasa = nova[nova.length - 1]?.created_at ?? ''
          const manjkajoca = prej.filter(
            (s) => s.je_moje && !znana.has(s.id) && s.created_at >= mejaCasa,
          )
          return manjkajoca.length
            ? [...nova, ...manjkajoca].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            : nova
        })
    }
    nalozi()
    // Vsakih 20 s osveži — realtime bi bil boljši, a to zadošča za začetek.
    // Skrit zavihek ne sprašuje; ko se vrneš, se osveži takoj.
    const id = setInterval(() => {
      if (!document.hidden) nalozi()
    }, 20000)
    const vidnost = () => {
      if (!document.hidden) nalozi()
    }
    document.addEventListener('visibilitychange', vidnost)
    return () => {
      preklican = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', vidnost)
    }
  }, [])

  async function posljem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!session) return setNapaka(t('aplikacija.klepet.morasSePrijaviti'))
    const vsebina = besedilo.trim()
    if (!vsebina) return
    if (vsebina.length > 500)
      return setNapaka(t('aplikacija.klepet.predolgo'))
    setPosiljam(true)
    setNapaka(null)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ user_id: session.user.id, content: vsebina, alias: mojPsev })
      .select('id, content, alias, created_at')
      .single()
    setPosiljam(false)
    if (error) return setNapaka(error.message)
    if (data) setSporocila((prej) => [{ ...data, je_moje: true }, ...prej.filter((s) => s.id !== data.id)])
    setBesedilo('')
  }

  async function izbrisi(id: number) {
    if (!confirm(t('aplikacija.klepet.izbrisiVprasanje'))) return
    const { error } = await supabase.from('chat_messages').delete().eq('id', id)
    if (error) return setNapaka(error.message)
    setSporocila((prej) => prej.filter((s) => s.id !== id))
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/15 via-slate-950/70 to-gnl-500/10 p-4 shadow-lg shadow-fuchsia-500/10 sm:p-5">
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden="true" className="text-2xl">💬</span>
          <h2 className="text-xl font-black text-fuchsia-100 sm:text-2xl">
            {t('aplikacija.klepet.naslov')}
          </h2>
          <span className="znacka bg-white/10 text-[10px] text-slate-300">
            {t('aplikacija.klepet.anonimno')}
          </span>
        </div>
        <p className="text-sm text-slate-200">
          {tx('aplikacija.klepet.uvod', {}, {
            krepko: (b) => <strong className="text-fuchsia-200">{b}</strong>,
          })}
        </p>
        {session ? (
          <p className="text-xs text-slate-400">
            {tx('aplikacija.klepet.prikazesKot', { ime: mojPsev }, {
              ime: (b) => <strong className="text-fuchsia-200">{b}</strong>,
            })}
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            {t('aplikacija.klepet.zaPisanje')}
          </p>
        )}
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl bg-slate-950/40 p-2">
        {sporocila.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            {t('aplikacija.klepet.bodiPrvi')}
          </p>
        ) : (
          sporocila.map((s) => {
            const mojeSporocilo = s.je_moje
            return (
              <div
                key={s.id}
                className={`rounded-lg p-2 text-sm ${
                  mojeSporocilo
                    ? 'ml-6 bg-gnl-500/10 ring-1 ring-gnl-400/30'
                    : 'mr-6 bg-white/5'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-bold text-gnl-300">{s.alias}</span>
                  <span className="text-slate-500">
                    {relativniCas(s.created_at)}
                    {mojeSporocilo && (
                      <button
                        onClick={() => izbrisi(s.id)}
                        className="ml-2 text-slate-500 hover:text-rose-400"
                        title={t('aplikacija.klepet.izbrisi')}
                        aria-label={t('aplikacija.klepet.izbrisi')}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-slate-200">
                  {s.content}
                </p>
              </div>
            )
          })
        )}
      </div>

      {session ? (
        <form onSubmit={posljem} className="flex gap-2">
          <input
            value={besedilo}
            onChange={(e) => setBesedilo(e.target.value)}
            placeholder={t('aplikacija.klepet.napisi')}
            maxLength={500}
            className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={posiljam || !besedilo.trim()}
            className="gumb-glavni px-4 py-2 text-sm"
          >
            {t('aplikacija.klepet.poslji')}
          </button>
        </form>
      ) : (
        <p className="text-center text-xs text-slate-500">
          {tx('aplikacija.klepet.zaObjavo', {}, {
            prijava: (b) => (
              <Link
                to={povezavaNaPrijavo(pathname + search)}
                className="underline hover:text-gnl-300"
              >
                {b}
              </Link>
            ),
          })}
        </p>
      )}

      {napaka && (
        <p className="text-xs text-rose-400">{t('skupno.napaka', { sporocilo: napaka })}</p>
      )}
    </section>
  )
}
