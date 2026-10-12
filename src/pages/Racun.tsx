// Nastavitve računa (/account): profil (ime, avatar), klub, jezik in država,
// obvestila, zasebnost, geslo in izbris računa.
//
// Izbris: trgovini (App Store, Google Play) zahtevata, da ga uporabnik najde in
// izvede sam; Google Play ta naslov (slff.eu/account) navede tudi v opisu
// aplikacije. Brisanje opravi `izbrisi_moj_racun` v bazi. Pravila imena in
// avatarja preveri baza (migracija 20261012081100), glej `src/lib/profil.ts`.
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from '../components/Povezava'
import Avatar from '../components/Avatar'
import Grb from '../components/Grb'
import IzbiraJezika from '../components/IzbiraJezika'
import IzbiraDrzave from '../components/IzbiraDrzave'
import NastavitveObvestil from '../components/NastavitveObvestil'
import { UpravljanjeNarocnine } from '../components/PreverjeniProfil'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'
import { izvor } from '../lib/platforma'
import {
  BARVE_AVATARJA,
  IKONE_AVATARJA,
  napakaIzBaze,
  naslednjaSpremembaImena,
  pocistiIme,
  preveriImeProfila,
  type IkonaAvatarja,
  type NapakaImena,
} from '../lib/profil'
import { datum, t, tx } from '../i18n'

interface Profil {
  display_name: string
  display_name_changed_at: string | null
  avatar_barva: number | null
  avatar_ikona: string | null
  javni_profil: boolean
  navijam_team_id: number | null
}

interface Klub {
  id: number
  ime: string
  kratko: string | null
  grb: string | null
  drzava?: string | null
  liga?: string | null
}

const NAPAKE_IMENA: Record<NapakaImena, () => string> = {
  dolzina: () => t('racun.nastavitve.napake.dolzina'),
  znaki: () => t('racun.nastavitve.napake.znaki'),
  rezervirano: () => t('racun.nastavitve.napake.rezervirano'),
  neprimerno: () => t('racun.nastavitve.napake.neprimerno'),
  prepogosto: () => t('racun.nastavitve.napake.prepogosto'),
  zasedeno: () => t('racun.nastavitve.napake.zasedeno'),
}

const IME_IKONE: Record<IkonaAvatarja, () => string> = {
  zoga: () => t('racun.nastavitve.ikone.zoga'),
  gol: () => t('racun.nastavitve.ikone.gol'),
  pokal: () => t('racun.nastavitve.ikone.pokal'),
  copat: () => t('racun.nastavitve.ikone.copat'),
  rokavice: () => t('racun.nastavitve.ikone.rokavice'),
  dres: () => t('racun.nastavitve.ikone.dres'),
  zastavica: () => t('racun.nastavitve.ikone.zastavica'),
  navijac: () => t('racun.nastavitve.ikone.navijac'),
}

function Razdelek({ naslov, children }: { naslov: string; children: ReactNode }) {
  return (
    <section className="kartica space-y-3 p-4">
      <h2 className="text-lg font-bold">{naslov}</h2>
      {children}
    </section>
  )
}

export default function Racun() {
  const { session, loading } = useAuth()
  useNaslov(t('racun.nastavitve.naslov'))

  if (loading) return <p className="text-slate-400">{t('racun.nastavitve.nalagam')}</p>

  if (!session)
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-black naslov">{t('racun.nastavitve.naslov')}</h1>
        <p className="text-slate-300">
          {tx('racun.nastavitve.moraPrijava', {}, {
            prijava: (v) => (
              <Link to={povezavaNaPrijavo('/account')} className="text-gnl-300 underline">
                {v}
              </Link>
            ),
          })}
        </p>
      </div>
    )

  return <Nastavitve uporabnikId={session.user.id} email={session.user.email ?? ''} zGeslom={imaGeslo(session.user)} />
}

/** Ali se uporabnik prijavlja z e-pošto in geslom (ne le z Googlom/Applom). */
function imaGeslo(user: { identities?: { provider: string }[] | null; app_metadata?: { provider?: string } }) {
  if (user.identities?.length) return user.identities.some((i) => i.provider === 'email')
  return user.app_metadata?.provider === 'email'
}

function Nastavitve({ uporabnikId, email, zGeslom }: { uporabnikId: string; email: string; zGeslom: boolean }) {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [klub, setKlub] = useState<Klub | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let veljavno = true
    supabase
      .from('profiles')
      .select('display_name, display_name_changed_at, avatar_barva, avatar_ikona, javni_profil, navijam_team_id')
      .eq('id', uporabnikId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (!veljavno) return
        if (error || !data) return setNapaka(t('racun.nastavitve.napakaNalaganja'))
        setProfil(data)
        if (data.navijam_team_id != null) {
          const { data: k } = await supabase
            .from('teams')
            .select('id, name, short_name, logo_url')
            .eq('id', data.navijam_team_id)
            .maybeSingle()
          if (veljavno && k) setKlub({ id: k.id, ime: k.name, kratko: k.short_name, grb: k.logo_url })
        }
      })
    return () => {
      veljavno = false
    }
  }, [uporabnikId])

  /** Posodobi stolpce profila in lokalno stanje; vrne napako baze ali null. */
  async function shrani(sprememba: Partial<Profil>) {
    const { error } = await supabase.from('profiles').update(sprememba).eq('id', uporabnikId)
    if (!error) setProfil((p) => (p ? { ...p, ...sprememba } : p))
    return error
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-black naslov">{t('racun.nastavitve.naslov')}</h1>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
      {!profil && !napaka && <p className="text-slate-400">{t('racun.nastavitve.nalagam')}</p>}

      {profil && (
        <>
          <RazdelekProfil uporabnikId={uporabnikId} profil={profil} shrani={shrani} osveziIme={(p) => setProfil(p)} />
          <RazdelekKlub
            klub={klub}
            nastavi={async (k) => {
              const error = await shrani({ navijam_team_id: k?.id ?? null })
              if (!error) setKlub(k)
              return error
            }}
          />
        </>
      )}

      <Razdelek naslov={t('racun.nastavitve.jezikNaslov')}>
        <p className="text-sm text-slate-400">{t('racun.nastavitve.jezikOpis')}</p>
        <IzbiraJezika className="flex flex-wrap items-center" />
        <IzbiraDrzave className="flex flex-wrap items-center" />
      </Razdelek>

      <Razdelek naslov={t('racun.nastavitve.obvestilaNaslov')}>
        <NastavitveObvestil vgrajeno />
      </Razdelek>

      {profil && (
        <Razdelek naslov={t('racun.nastavitve.zasebnostNaslov')}>
          <Stikalo
            oznaka={t('racun.nastavitve.javniProfil')}
            opis={t('racun.nastavitve.javniProfilOpis')}
            vklopljeno={profil.javni_profil}
            shrani={(v) => shrani({ javni_profil: v })}
          />
        </Razdelek>
      )}

      <UpravljanjeNarocnine />
      <RazdelekPrijava email={email} zGeslom={zGeslom} />
      <RazdelekIzbris email={email} />
    </div>
  )
}

function Stikalo({
  oznaka,
  opis,
  vklopljeno,
  shrani,
}: {
  oznaka: string
  opis: string
  vklopljeno: boolean
  shrani: (v: boolean) => Promise<unknown>
}) {
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState(false)
  return (
    <>
      <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block font-semibold">{oznaka}</span>
          <span className="block text-sm text-slate-400">{opis}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={vklopljeno}
          aria-checked={vklopljeno}
          disabled={dela}
          onChange={async () => {
            setDela(true)
            setNapaka(false)
            const error = await shrani(!vklopljeno)
            setNapaka(Boolean(error))
            setDela(false)
          }}
          className="h-6 w-6 shrink-0 accent-emerald-500"
        />
      </label>
      {napaka && <p className="text-sm text-rose-400">{t('racun.nastavitve.napakaShranjevanja')}</p>}
    </>
  )
}

type Shrani = (sprememba: Partial<Profil>) => Promise<{ hint?: string; code?: string; message: string } | null>

function RazdelekProfil({
  uporabnikId,
  profil,
  shrani,
  osveziIme,
}: {
  uporabnikId: string
  profil: Profil
  shrani: Shrani
  osveziIme: (p: Profil) => void
}) {
  const [ime, setIme] = useState(profil.display_name)
  const [stanje, setStanje] = useState<'mir' | 'dela' | 'ok'>('mir')
  const [napaka, setNapaka] = useState<string | null>(null)
  const naslednjic = naslednjaSpremembaImena(profil.display_name_changed_at)
  const cisto = pocistiIme(ime)
  const spremenjeno = cisto !== profil.display_name

  async function shraniIme() {
    const koda = preveriImeProfila(cisto)
    if (koda) return setNapaka(NAPAKE_IMENA[koda]())
    setStanje('dela')
    setNapaka(null)
    // Čas spremembe zapiše baza; preberemo ga nazaj za omejitev 7 dni.
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: cisto })
      .eq('id', uporabnikId)
      .select('display_name, display_name_changed_at, avatar_barva, avatar_ikona, javni_profil, navijam_team_id')
      .maybeSingle()
    if (error || !data) {
      setStanje('mir')
      const k = napakaIzBaze(error)
      return setNapaka(k ? NAPAKE_IMENA[k]() : t('racun.nastavitve.napakaShranjevanja'))
    }
    osveziIme(data)
    setIme(data.display_name)
    setStanje('ok')
  }

  async function avatar(sprememba: Partial<Profil>) {
    setNapaka(null)
    const error = await shrani(sprememba)
    if (error) setNapaka(t('racun.nastavitve.napakaShranjevanja'))
  }

  return (
    <Razdelek naslov={t('racun.nastavitve.profilNaslov')}>
      <div className="flex items-center gap-3">
        <Avatar id={uporabnikId} ime={cisto || profil.display_name} barva={profil.avatar_barva} ikona={profil.avatar_ikona} velikost={56} />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{profil.display_name}</div>
          <Link to={`/u/${uporabnikId}`} className="text-sm text-gnl-300 underline">
            {t('racun.nastavitve.mojProfil')}
          </Link>
        </div>
      </div>

      <form
        className="space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          void shraniIme()
        }}
      >
        <label htmlFor="prikazno-ime" className="block text-sm font-semibold">
          {t('racun.nastavitve.prikaznoIme')}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="prikazno-ime"
            value={ime}
            maxLength={40}
            autoComplete="nickname"
            disabled={naslednjic != null}
            onChange={(e) => {
              setIme(e.target.value)
              setStanje('mir')
              setNapaka(null)
            }}
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 text-slate-100 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!spremenjeno || stanje === 'dela' || naslednjic != null}
            className="gumb-glavni min-h-[44px] px-4 text-sm disabled:opacity-50"
          >
            {stanje === 'dela' ? t('racun.nastavitve.shranjujem') : t('racun.nastavitve.shraniIme')}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {naslednjic
            ? t('racun.nastavitve.imeNaslednjic', { datum: datum(naslednjic, { day: 'numeric', month: 'long' }) })
            : t('racun.nastavitve.imeOpis')}
        </p>
        {stanje === 'ok' && <p className="text-sm text-gnl-300">{t('racun.nastavitve.shranjeno')}</p>}
      </form>

      <div className="space-y-2">
        <div className="text-sm font-semibold">{t('racun.nastavitve.avatar')}</div>
        <p className="text-xs text-slate-400">{t('racun.nastavitve.avatarOpis')}</p>
        <div role="radiogroup" aria-label={t('racun.nastavitve.barva')} className="flex flex-wrap gap-1.5">
          {BARVE_AVATARJA.map((barva, n) => (
            <button
              key={barva}
              type="button"
              role="radio"
              aria-checked={profil.avatar_barva === n}
              aria-label={t('racun.nastavitve.barvaN', { n: n + 1 })}
              onClick={() => void avatar({ avatar_barva: n })}
              className={`h-11 w-11 rounded-full ring-offset-2 ring-offset-slate-900 ${
                profil.avatar_barva === n ? 'ring-2 ring-white' : 'ring-1 ring-white/20'
              }`}
              style={{ backgroundColor: barva }}
            />
          ))}
        </div>
        <div role="radiogroup" aria-label={t('racun.nastavitve.slika')} className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={profil.avatar_ikona == null}
            onClick={() => void avatar({ avatar_ikona: null })}
            className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${
              profil.avatar_ikona == null ? 'bg-gnl-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {t('racun.nastavitve.zacetnice')}
          </button>
          {(Object.keys(IKONE_AVATARJA) as IkonaAvatarja[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={profil.avatar_ikona === k}
              aria-label={IME_IKONE[k]()}
              title={IME_IKONE[k]()}
              onClick={() => void avatar({ avatar_ikona: k })}
              className={`h-11 w-11 rounded-lg text-xl ${
                profil.avatar_ikona === k ? 'bg-gnl-500/30 ring-2 ring-gnl-300' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {IKONE_AVATARJA[k]}
            </button>
          ))}
        </div>
      </div>
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
    </Razdelek>
  )
}

function RazdelekKlub({
  klub,
  nastavi,
}: {
  klub: Klub | null
  nastavi: (k: Klub | null) => Promise<unknown>
}) {
  const [iskanje, setIskanje] = useState('')
  const [zadetki, setZadetki] = useState<Klub[] | null>(null)
  const [napaka, setNapaka] = useState(false)

  // Iskanje z zamikom: ne kliče baze ob vsaki črki.
  useEffect(() => {
    const q = iskanje.trim()
    if (q.length < 2) {
      setZadetki(null)
      return
    }
    let veljavno = true
    const cas = setTimeout(() => {
      supabase.rpc('isci_klube', { iskanje: q, omejitev: 10 }).then(({ data }) => {
        if (veljavno) setZadetki((data ?? []).map((k) => ({ ...k })))
      })
    }, 250)
    return () => {
      veljavno = false
      clearTimeout(cas)
    }
  }, [iskanje])

  async function izberi(k: Klub | null) {
    setNapaka(false)
    const error = await nastavi(k)
    if (error) return setNapaka(true)
    setIskanje('')
    setZadetki(null)
  }

  return (
    <Razdelek naslov={t('racun.nastavitve.klubNaslov')}>
      <p className="text-sm text-slate-400">{t('racun.nastavitve.klubOpis')}</p>
      {klub ? (
        <div className="flex items-center gap-3">
          <Grb ime={klub.ime} kratko={klub.kratko} logo={klub.grb} velikost={32} />
          <Link to={`/club/${klub.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-gnl-300">
            {klub.ime}
          </Link>
          <button type="button" onClick={() => void izberi(null)} className="gumb-tih min-h-[44px] px-3 text-sm">
            {t('racun.nastavitve.klubOdstrani')}
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-400">{t('racun.nastavitve.klubBrez')}</p>
      )}
      <input
        type="search"
        value={iskanje}
        onChange={(e) => setIskanje(e.target.value)}
        placeholder={t('racun.nastavitve.klubIsci')}
        aria-label={t('racun.nastavitve.klubIsci')}
        className="min-h-[44px] w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-slate-100"
      />
      {zadetki && zadetki.length === 0 && (
        <p className="text-sm text-slate-400">{t('racun.nastavitve.klubNiZadetkov')}</p>
      )}
      {zadetki && zadetki.length > 0 && (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-lg ring-1 ring-white/10">
          {zadetki.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => void izberi(k)}
                className="flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
              >
                <Grb ime={k.ime} kratko={k.kratko} logo={k.grb} velikost={24} />
                <span className="min-w-0 flex-1 truncate font-semibold">{k.ime}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {[k.liga, k.drzava].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {napaka && <p className="text-sm text-rose-400">{t('racun.nastavitve.napakaShranjevanja')}</p>}
    </Razdelek>
  )
}

function RazdelekPrijava({ email, zGeslom }: { email: string; zGeslom: boolean }) {
  const [stanje, setStanje] = useState<'mir' | 'dela' | 'ok' | 'napaka'>('mir')

  // Ista pot kot "Pozabljeno geslo" na prijavi: povezava na /novo-geslo.
  async function posljiPovezavo() {
    setStanje('dela')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${izvor()}/novo-geslo` })
    setStanje(error ? 'napaka' : 'ok')
  }

  return (
    <Razdelek naslov={t('racun.nastavitve.prijavaNaslov')}>
      <p className="text-sm text-slate-300">{t('racun.nastavitve.prijavljenZ', { email })}</p>
      {zGeslom && (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">{t('racun.nastavitve.gesloOpis')}</p>
          <button
            type="button"
            onClick={() => void posljiPovezavo()}
            disabled={stanje === 'dela' || stanje === 'ok'}
            className="gumb-tih min-h-[44px] px-3 text-sm disabled:opacity-60"
          >
            {stanje === 'dela' ? t('racun.nastavitve.shranjujem') : t('racun.nastavitve.geslo')}
          </button>
          {stanje === 'ok' && <p className="text-sm text-gnl-300">{t('racun.nastavitve.gesloPoslano', { email })}</p>}
          {stanje === 'napaka' && <p className="text-sm text-rose-400">{t('racun.nastavitve.gesloNapaka')}</p>}
        </div>
      )}
      <p className="text-sm text-slate-400">
        {tx('racun.nastavitve.eposta', {}, {
          eposta: (v) => (
            <a href="mailto:info@slff.eu" className="text-gnl-300 underline">
              {v}
            </a>
          ),
        })}
      </p>
    </Razdelek>
  )
}

function RazdelekIzbris({ email }: { email: string }) {
  const navigate = useNavigate()
  const [potrjujem, setPotrjujem] = useState(false)
  const [brisem, setBrisem] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)

  async function izbrisi() {
    setBrisem(true)
    setNapaka(null)
    const { error } = await supabase.rpc('izbrisi_moj_racun')
    if (error) {
      setBrisem(false)
      return setNapaka(t('racun.izbris.napaka', { napaka: error.message }))
    }
    // Uporabnika ni več; lokalno sejo počistimo brez klica strežnika.
    await supabase.auth.signOut({ scope: 'local' })
    navigate('/', { replace: true })
  }

  return (
    <Razdelek naslov={t('racun.izbris.naslov')}>
      <p className="text-sm text-slate-300">{t('racun.izbris.opis', { email })}</p>
      {!potrjujem ? (
        <button type="button" onClick={() => setPotrjujem(true)} className="gumb-tih px-3 py-2 text-sm text-rose-300">
          {t('racun.izbris.gumb')}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={izbrisi}
            disabled={brisem}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60"
          >
            {brisem ? t('racun.izbris.brisem') : t('racun.izbris.potrdi')}
          </button>
          <button type="button" onClick={() => setPotrjujem(false)} disabled={brisem} className="gumb-tih px-3 py-2 text-sm">
            {t('racun.izbris.preklici')}
          </button>
        </div>
      )}
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
    </Razdelek>
  )
}
