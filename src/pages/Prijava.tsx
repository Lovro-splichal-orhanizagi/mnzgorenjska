import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { napakaPrijave, varnaPot } from '../lib/prijava'
import { IkonaGoogle, prijavaSPonudnikom } from '../components/GumbGoogle'
import { predlogEposte } from '../lib/eposta'
import { jezik, t } from '../i18n'
import { useTekmovanje } from '../lib/tekmovanje'
import { JEZIK_DRZAVE } from '../lib/drzava'
import { Capacitor } from '@capacitor/core'
import { izvor } from '../lib/platforma'
import { dogodek } from '../lib/analitika'

type Nacin = 'prijava' | 'registracija' | 'pozabljeno'

export default function Prijava() {
  const { session } = useAuth()
  const { drzava } = useTekmovanje()
  const jezikPoste = jezik() === 'en' ? (JEZIK_DRZAVE[drzava] ?? 'sl') : jezik()
  const navigate = useNavigate()
  // Kam po prijavi: povabilo v mini ligo pošlje človeka sem in ga hoče nazaj.
  // Sprejmemo samo notranjo pot, da povezava ne more voditi drugam.
  const [params] = useSearchParams()
  const nazajParam = varnaPot(params.get('nazaj'))
  const nazaj = nazajParam ?? '/my-team'
  // `?nacin=registracija`: Shrani na Moji ekipi brez računa odpre registracijo.
  const [nacin, setNacin] = useState<Nacin>(() =>
    params.get('nacin') === 'registracija' ? 'registracija' : 'prijava',
  )
  // Glava ima na /login "Začni brezplačno" in "Prijava": klik na drugo na isti
  // strani zamenja le poizvedbo, zato način sledi naslovu.
  const nacinVNaslovu = params.get('nacin') === 'registracija' ? 'registracija' : 'prijava'
  useEffect(() => {
    setNacin(nacinVNaslovu)
    setNapaka(null)
    setSporocilo(null)
    setPotrditevZnova(false)
  }, [nacinVNaslovu])
  const [email, setEmail] = useState('')
  // Predlog domene ("gmail.con" → "gmail.com") se pokaže, ko uporabnik zapusti
  // polje, da med tipkanjem ne utripa. Oddaje ne ustavi.
  const [emailZapuscen, setEmailZapuscen] = useState(false)
  const predlog = emailZapuscen ? predlogEposte(email) : null
  const [geslo, setGeslo] = useState('')
  const [ime, setIme] = useState('')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [posiljam, setPosiljam] = useState(false)
  // Nepotrjen e-naslov: gumb za nov potrditveni mail (7.–8. 10. 2026 so šli
  // ven prazni). Po kliku 60 s premora, ker GoTrue omeji maile na uro.
  const [potrditevZnova, setPotrditevZnova] = useState(false)
  const [premor, setPremor] = useState(false)
  const naslov =
    nacin === 'registracija'
      ? t('racun.prijava.naslovRegistracija')
      : nacin === 'pozabljeno'
        ? t('racun.prijava.naslovPozabljeno')
        : t('racun.prijava.naslovPrijava')
  useNaslov(naslov)

  // Prijava z Googlom ali Applom (skupna pot v GumbGoogle.tsx). Ista pot velja
  // za prijavo in registracijo, zato sta gumba v obeh načinih.
  async function zPonudnikom(provider: 'google' | 'apple') {
    setNapaka(null)
    setNapaka(await prijavaSPonudnikom(provider, nazaj))
  }

  // GoTrue ne pošlje istemu naslovu dveh mailov v 60 s, zato premor teče tudi
  // takoj po registraciji (prvi mail je pravkar odšel).
  function zacniPremor() {
    setPremor(true)
    setTimeout(() => setPremor(false), 60_000)
  }

  async function posljiPotrditevZnova() {
    zacniPremor()
    setNapaka(null)
    setSporocilo(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${izvor()}${nazaj}` },
    })
    if (error) return setNapaka(napakaPrijave(error.message))
    setSporocilo(t('racun.prijava.potrditevPoslanaZnova'))
  }

  async function poslji(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNapaka(null)
    setSporocilo(null)
    setPotrditevZnova(false)
    setPosiljam(true)

    // Ponastavitev gesla pošlje povezavo na e-pošto; uporabnik se vrne na
    // /novo-geslo, kjer vpiše novo.
    if (nacin === 'pozabljeno') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${izvor()}/novo-geslo`,
      })
      setPosiljam(false)
      if (error) return setNapaka(napakaPrijave(error.message))
      return setSporocilo(t('racun.prijava.poslanaPonastavitev'))
    }

    const { error } =
      nacin === 'registracija'
        ? await supabase.auth.signUp({
            email,
            password: geslo,
            options: {
              // `jezik` izbere jezik potrditvenega maila in poznejše
              // ponastavitve gesla (predloge v supabase/templates/).
              // Pošta je le slovenska in slovaška: angleški obiskovalec dobi
              // jezik države lige, ki jo gleda.
              data: { display_name: ime || email.split('@')[0], jezik: jezikPoste },
              emailRedirectTo: `${izvor()}${nazaj}`,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password: geslo })

    setPosiljam(false)
    if (error) {
      setPotrditevZnova(/email not confirmed/i.test(error.message))
      return setNapaka(napakaPrijave(error.message))
    }
    if (nacin === 'registracija') {
      dogodek('registracija', { nacin: 'eposta' })
      setPotrditevZnova(true)
      zacniPremor()
      return setSporocilo(t('racun.prijava.racunUstvarjen'))
    }
    navigate(nazaj)
  }

  // Prijavljen uporabnik, ki ga je sem poslala stran z `?nazaj=`, nima tu
  // ničesar za početi — pošljemo ga naravnost tja, kamor je bil namenjen.
  if (session && nazajParam) return <Navigate to={nazajParam} replace />
  if (session)
    return (
      <p className="text-slate-300">
        {t('racun.prijava.prijavljenKot', { email: session.user.email })}
      </p>
    )

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-3xl font-black naslov">
        {naslov}
      </h1>

      {nacin !== 'pozabljeno' && (
        <>
          <button
            type="button"
            onClick={() => zPonudnikom('google')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-2.5 font-semibold text-slate-900 hover:bg-slate-100"
          >
            <IkonaGoogle />
            {t('racun.prijava.zGooglom')}
          </button>
          {/* Apple je zahteva App Stora (ob Googlu mora biti tudi Apple); splet
              in Android imata Google in e-pošto. */}
          {Capacitor.getPlatform() === 'ios' && (
          <button
            type="button"
            onClick={() => zPonudnikom('apple')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-black px-4 py-2.5 font-semibold text-white hover:bg-slate-900"
          >
            <svg aria-hidden="true" width="16" height="18" viewBox="0 0 814 1000" fill="currentColor">
              <path d="M788 341c-6 4-108 62-108 190 0 149 130 201 134 202-1 3-21 72-69 142-43 62-88 123-156 123s-86-39-164-39c-77 0-104 41-167 41s-106-57-156-127C44 791 0 671 0 556c0-184 120-282 238-282 63 0 115 41 155 41 38 0 97-44 168-44 27 0 124 3 188 94zM554 169c29-35 50-83 50-131 0-7-1-14-2-19-48 2-104 32-138 71-27 30-51 78-51 127 0 7 1 15 2 17 3 1 8 1 13 1 43 0 96-29 126-66z" />
            </svg>
            {t('racun.prijava.zApplom')}
          </button>
          )}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            {t('racun.prijava.aliZEposto')}
            <span className="h-px flex-1 bg-white/10" />
          </div>
        </>
      )}

      <form onSubmit={poslji} className="space-y-3">
        {nacin === 'registracija' && (
          <label className="block text-sm text-slate-400">
            {t('racun.prijava.prikaznoIme')}
            <input
              value={ime}
              onChange={(e) => setIme(e.target.value)}
              autoComplete="nickname"
              autoCapitalize="words"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
        )}
        <label className="block text-sm text-slate-400">
          {t('racun.prijava.eposta')}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailZapuscen(true)}
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={nacin === 'pozabljeno' ? 'send' : 'next'}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>
        {predlog && (
          <button
            type="button"
            onClick={() => setEmail(predlog)}
            className="-mt-1 block min-h-[44px] text-left text-sm text-amber-300 hover:underline"
          >
            {t('racun.prijava.predlogEposte', { eposta: predlog })}
          </button>
        )}
        {nacin !== 'pozabljeno' && (
          <label className="block text-sm text-slate-400">
            {t('racun.prijava.geslo')}
            <input
              type="password"
              required
              minLength={6}
              value={geslo}
              onChange={(e) => setGeslo(e.target.value)}
              autoComplete={nacin === 'registracija' ? 'new-password' : 'current-password'}
              enterKeyHint="go"
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
        )}
        <button
          type="submit"
          disabled={posiljam}
          className="gumb-glavni w-full"
        >
          {posiljam
            ? t('racun.prijava.posiljam')
            : nacin === 'registracija'
              ? t('racun.prijava.ustvariRacun')
              : nacin === 'pozabljeno'
                ? t('racun.prijava.posljiPovezavo')
                : t('racun.prijava.gumbPrijava')}
        </button>
        {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
        {sporocilo && <p className="text-sm text-gnl-300">{sporocilo}</p>}
        {/* Preklop načina pobriše napako in sporočilo, s tem skrije tudi gumb. */}
        {potrditevZnova && (napaka || sporocilo) && (
          <button
            type="button"
            onClick={posljiPotrditevZnova}
            disabled={premor}
            className="gumb-tih min-h-11 w-full py-3 text-sm text-gnl-300 disabled:opacity-50"
          >
            {t('racun.prijava.posljiPotrditevZnova')}
          </button>
        )}
      </form>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            setNacin(nacin === 'registracija' ? 'prijava' : 'registracija')
            setNapaka(null)
            setSporocilo(null)
          }}
          className="gumb-tih min-h-11 w-full py-3 text-sm text-gnl-300"
        >
          {nacin === 'registracija'
            ? t('racun.prijava.zeImasRacun')
            : t('racun.prijava.nimasRacuna')}
        </button>
        {nacin !== 'pozabljeno' ? (
          <button
            type="button"
            onClick={() => {
              setNacin('pozabljeno')
              setNapaka(null)
              setSporocilo(null)
            }}
            className="min-h-11 py-3 text-left text-sm text-slate-400 hover:underline"
          >
            {t('racun.prijava.pozabljenoGeslo')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNacin('prijava')
              setNapaka(null)
              setSporocilo(null)
            }}
            className="min-h-11 py-3 text-left text-sm text-slate-400 hover:underline"
          >
            {t('racun.prijava.nazajNaPrijavo')}
          </button>
        )}
      </div>
    </div>
  )
}
