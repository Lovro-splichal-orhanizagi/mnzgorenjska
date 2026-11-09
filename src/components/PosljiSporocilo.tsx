// Gumb "Pošlji sporočilo" na profilu potrjenega igralca. Kdo sme pisati,
// odloči baza (`sporocila_sme_pisati`): preverjen komurkoli, ostali le
// preverjenim. Nepreverjenemu, ki piše nepreverjenemu, pokažemo, kako do
// tega; ostali razlogi (mladinec, izklop, blokada, lasten profil) gumb skrijejo.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from './Povezava'
import { supabase } from '../lib/supabase'
import { razlogNapake, smePisati, type Razlog } from '../lib/sporocila'
import { t } from '../i18n'

export default function PosljiSporocilo({ igralecId, prijava }: { igralecId: number; prijava: string }) {
  const navigate = useNavigate()
  const [razlog, setRazlog] = useState<Razlog | null | undefined>(undefined)
  const [dela, setDela] = useState(false)
  const [napaka, setNapaka] = useState<string | null>(null)

  useEffect(() => {
    let velja = true
    setRazlog(undefined)
    void smePisati(igralecId).then((r) => velja && setRazlog(r))
    return () => {
      velja = false
    }
  }, [igralecId])

  const gumb = 'gumb-tih inline-flex min-h-11 items-center gap-2 px-4 text-sm'
  if (razlog === undefined) return null
  if (razlog === 'prijava')
    return (
      <Link to={prijava} className={gumb}>
        {t('igralci.sporocila.posljiPrijava')}
      </Link>
    )
  if (razlog === 'preverjen')
    return (
      <p className="text-xs text-slate-400">
        {t('igralci.sporocila.leVerjenim')}{' '}
        <Link to="/verified" className="text-sky-300 underline">
          {t('igralci.sporocila.kakoDoPreverjenega')}
        </Link>
      </p>
    )
  if (razlog !== null) return null

  async function zacni() {
    setDela(true)
    setNapaka(null)
    const { data, error } = await supabase.rpc('sporocila_zacni', { p_player_id: igralecId })
    setDela(false)
    if (error || data == null) return setNapaka(razlogNapake(error))
    navigate(`/messages?p=${data}`)
  }

  return (
    <div className="space-y-1">
      <button type="button" className={gumb} onClick={zacni} disabled={dela}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M4 5h16v11H8l-4 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {t('igralci.sporocila.poslji')}
      </button>
      {napaka && <p className="text-xs text-red-300" role="alert">{napaka}</p>}
    </div>
  )
}
