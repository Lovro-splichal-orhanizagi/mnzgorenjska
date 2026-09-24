import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { deliVabilo, privzetoImeLige } from '../lib/miniLige'
import { t } from '../i18n'

interface Liga {
  id: number
  name: string
  code: string
}

/**
 * Kartica po shranjeni ekipi: povabi soigralce v mini ligo.
 *
 * Če je ekipa že v kakšni, deli povabilo vanjo. Če ni, en klik ustvari ligo
 * s privzetim imenom in takoj odpre list za deljenje — brez tipkanja imena,
 * brez obiska strani Mini lige. To je trenutek, ko človek hoče tekmeca.
 */
export default function PovabiSoigralce({
  ekipaId,
  naZapri,
}: {
  ekipaId: number
  naZapri: () => void
}) {
  const { session } = useAuth()
  const [liga, setLiga] = useState<Liga | null | undefined>(undefined)
  const [vzdevek, setVzdevek] = useState<string | null>(null)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [dela, setDela] = useState(false)

  useEffect(() => {
    let veljavno = true
    ;(async () => {
      const [{ data: clanstva }, { data: profil }] = await Promise.all([
        supabase
          .from('mini_liga_clani')
          .select('mini_liga_id')
          .eq('fantasy_team_id', ekipaId)
          .limit(1),
        session
          ? supabase.from('profiles').select('display_name').eq('id', session.user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!veljavno) return
      setVzdevek((profil?.display_name as string | null) ?? null)
      const ligaId = clanstva?.[0]?.mini_liga_id
      if (!ligaId) return setLiga(null)
      const { data: l } = await supabase
        .from('mini_lige')
        .select('id, name, code')
        .eq('id', ligaId)
        .maybeSingle()
      if (veljavno) setLiga((l as Liga | null) ?? null)
    })()
    return () => {
      veljavno = false
    }
  }, [ekipaId, session])

  function povej(izid: Awaited<ReturnType<typeof deliVabilo>>) {
    setSporocilo(
      izid === 'deljeno'
        ? t('lestvice.miniLige.poslano')
        : izid === 'kopirano'
          ? t('lestvice.miniLige.kopirano')
          : izid === 'preklicano'
            ? null
            : t('lestvice.miniLige.neuspeloPovezava'),
    )
  }

  async function povabi() {
    setDela(true)
    let l = liga ?? null
    if (!l) {
      const ime = privzetoImeLige(vzdevek)
      const { data, error } = await supabase.rpc('ustvari_mini_ligo', {
        p_ime: ime,
        p_ekipa: ekipaId,
      })
      if (error) {
        setDela(false)
        return setSporocilo(error.message)
      }
      const nova = Array.isArray(data) ? data[0] : data
      l = { id: nova?.id as number, name: ime, code: nova?.code as string }
      setLiga(l)
    }
    setDela(false)
    povej(await deliVabilo(l.name, l.code))
  }

  if (liga === undefined) return null

  return (
    <div className="kartica relative space-y-2 border-gnl-400/30 bg-gnl-500/10 p-4">
      <button
        onClick={naZapri}
        aria-label={t('skupno.zapri')}
        className="absolute right-2 top-2 rounded-lg px-2 py-0.5 text-slate-500 hover:bg-white/5 hover:text-slate-200"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <h2 className="font-bold text-gnl-200">
        {liga
          ? t('lestvice.povabiSoigralce.naslovLiga', { ime: liga.name })
          : t('lestvice.povabiSoigralce.naslovNova')}
      </h2>
      <p className="text-sm text-slate-300">
        {liga
          ? t('lestvice.povabiSoigralce.opisLiga')
          : t('lestvice.povabiSoigralce.opisNova')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={povabi} disabled={dela} className="gumb-glavni text-sm">
          {dela
            ? t('lestvice.povabiSoigralce.trenutek')
            : liga
              ? t('lestvice.povabiSoigralce.deliPovabilo')
              : t('lestvice.povabiSoigralce.ustvariInPovabi')}
        </button>
        <Link to="/mini-lige" className="text-sm text-slate-400 hover:text-slate-200">
          {t('lestvice.povabiSoigralce.miniLige')}
        </Link>
      </div>
      {sporocilo && <p className="text-sm text-gnl-300">{sporocilo}</p>}
    </div>
  )
}
