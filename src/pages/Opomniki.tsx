// Opomniki po e-pošti — edina nastavitev računa, ki jo uporabnik ureja sam.
// Privzeto so vklopljeni; `profiles.brez_opomnikov` je zapisan nikalno, da
// novi profili brez vrednosti dobivajo opomnike.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useNaslov } from '../lib/naslov'
import { povezavaNaPrijavo } from '../lib/prijava'

const profili = () => supabase.from('profiles')

export default function Opomniki() {
  const { session, loading } = useAuth()
  const uporabnik = session?.user.id ?? null
  const [posiljaj, setPosiljaj] = useState<boolean | null>(null)
  const [shranjujem, setShranjujem] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [shranjeno, setShranjeno] = useState(false)
  useNaslov('Opomniki')

  useEffect(() => {
    if (!uporabnik) return
    let veljavno = true
    setNapaka(null)
    profili()
      .select('brez_opomnikov')
      .eq('id', uporabnik)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!veljavno) return
        if (error) return setNapaka('Nastavitve ni bilo mogoče naložiti.')
        setPosiljaj(!data?.brez_opomnikov)
      })
    return () => {
      veljavno = false
    }
  }, [uporabnik])

  async function preklopi() {
    if (!uporabnik || posiljaj == null) return
    const novo = !posiljaj
    setShranjujem(true)
    setNapaka(null)
    setShranjeno(false)
    const { error } = await profili()
      .update({ brez_opomnikov: !novo })
      .eq('id', uporabnik)
    setShranjujem(false)
    if (error) return setNapaka('Shranjevanje ni uspelo. Poskusi znova.')
    setPosiljaj(novo)
    setShranjeno(true)
  }

  if (loading) return <p className="text-slate-400">Nalagam …</p>

  if (!session)
    return (
      <div className="max-w-md space-y-3">
        <h1 className="text-3xl font-black naslov">Opomniki</h1>
        <p className="text-slate-300">
          Za urejanje opomnikov se moraš{' '}
          <Link to={povezavaNaPrijavo('/opomniki')} className="text-gnl-300 underline">
            prijaviti
          </Link>
          .
        </p>
      </div>
    )

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-3xl font-black naslov">Opomniki</h1>
      <p className="text-sm text-slate-400">
        Pred rokom kroga ti pošljemo kratko sporočilo na {session.user.email}, da ne
        pozabiš urediti ekipe.
      </p>

      <label className="kartica flex cursor-pointer items-center justify-between gap-4 p-4">
        <span className="font-semibold">Pošiljaj mi opomnike po e-pošti</span>
        <input
          type="checkbox"
          role="switch"
          checked={posiljaj ?? false}
          disabled={posiljaj == null || shranjujem}
          onChange={preklopi}
          aria-checked={posiljaj ?? false}
          className="h-5 w-5 shrink-0 accent-emerald-500"
        />
      </label>

      {posiljaj == null && !napaka && <p className="text-sm text-slate-400">Nalagam …</p>}
      {shranjujem && <p className="text-sm text-slate-400">Shranjujem …</p>}
      {shranjeno && !shranjujem && (
        <p className="text-sm text-gnl-300">
          {posiljaj ? 'Opomniki so vklopljeni.' : 'Opomnikov ti ne bomo več pošiljali.'}
        </p>
      )}
      {napaka && <p className="text-sm text-rose-400">{napaka}</p>}
    </div>
  )
}
