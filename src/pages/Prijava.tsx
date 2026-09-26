import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { napakaPrijave, varnaPot } from '../lib/prijava'
import { t } from '../i18n'

type Nacin = 'prijava' | 'registracija' | 'pozabljeno'

export default function Prijava() {
  const { session } = useAuth()
  const navigate = useNavigate()
  // Kam po prijavi: povabilo v mini ligo pošlje človeka sem in ga hoče nazaj.
  // Sprejmemo samo notranjo pot, da povezava ne more voditi drugam.
  const [params] = useSearchParams()
  const nazajParam = varnaPot(params.get('nazaj'))
  const nazaj = nazajParam ?? '/my-team'
  const [nacin, setNacin] = useState<Nacin>('prijava')
  const [email, setEmail] = useState('')
  const [geslo, setGeslo] = useState('')
  const [ime, setIme] = useState('')
  const [napaka, setNapaka] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [posiljam, setPosiljam] = useState(false)
  const naslov =
    nacin === 'registracija'
      ? t('racun.prijava.naslovRegistracija')
      : nacin === 'pozabljeno'
        ? t('racun.prijava.naslovPozabljeno')
        : t('racun.prijava.naslovPrijava')
  useNaslov(naslov)

  // Prijava z Googlom: Supabase preusmeri na Google in nazaj; nov uporabnik
  // dobi profil iz Googlovega imena (glej handle_new_user). Ista pot velja za
  // prijavo in registracijo, zato je gumb v obeh nacinih.
  async function zGooglom() {
    setNapaka(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${nazaj}` },
    })
    // Dokler Google v Supabase ni vklopljen, vrne "provider is not enabled";
    // to uporabniku ne pove nic, zato ga usmerimo na e-posto.
    if (error)
      setNapaka(
        /not enabled/i.test(error.message)
          ? t('racun.prijava.googleNiNaVoljo')
          : napakaPrijave(error.message),
      )
  }

  async function poslji(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNapaka(null)
    setSporocilo(null)
    setPosiljam(true)

    // Ponastavitev gesla pošlje povezavo na e-pošto; uporabnik se vrne na
    // /novo-geslo, kjer vpiše novo.
    if (nacin === 'pozabljeno') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/novo-geslo`,
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
              data: { display_name: ime || email.split('@')[0] },
              emailRedirectTo: `${window.location.origin}${nazaj}`,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password: geslo })

    setPosiljam(false)
    if (error) return setNapaka(napakaPrijave(error.message))
    if (nacin === 'registracija')
      return setSporocilo(t('racun.prijava.racunUstvarjen'))
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
            onClick={zGooglom}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-4 py-2.5 font-semibold text-slate-900 hover:bg-slate-100"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
              <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            {t('racun.prijava.zGooglom')}
          </button>
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
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
          />
        </label>
        {nacin !== 'pozabljeno' && (
          <label className="block text-sm text-slate-400">
            {t('racun.prijava.geslo')}
            <input
              type="password"
              required
              minLength={6}
              value={geslo}
              onChange={(e) => setGeslo(e.target.value)}
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
      </form>

      <div className="flex flex-col gap-1">
        <button
          onClick={() => {
            setNacin(nacin === 'registracija' ? 'prijava' : 'registracija')
            setNapaka(null)
            setSporocilo(null)
          }}
          className="text-left text-sm text-gnl-300 hover:underline"
        >
          {nacin === 'registracija'
            ? t('racun.prijava.zeImasRacun')
            : t('racun.prijava.nimasRacuna')}
        </button>
        {nacin !== 'pozabljeno' ? (
          <button
            onClick={() => {
              setNacin('pozabljeno')
              setNapaka(null)
              setSporocilo(null)
            }}
            className="text-left text-sm text-slate-400 hover:underline"
          >
            {t('racun.prijava.pozabljenoGeslo')}
          </button>
        ) : (
          <button
            onClick={() => {
              setNacin('prijava')
              setNapaka(null)
              setSporocilo(null)
            }}
            className="text-left text-sm text-slate-400 hover:underline"
          >
            {t('racun.prijava.nazajNaPrijavo')}
          </button>
        )}
      </div>
    </div>
  )
}
