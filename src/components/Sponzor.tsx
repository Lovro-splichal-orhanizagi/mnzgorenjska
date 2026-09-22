// Sponzorsko mesto.
//
// Nic se ne prikaze, dokler v nastavitvah `sponzorji_vidni` ni 1 — do takrat
// funkcija `sponzorji_za` vrne prazno in ta komponenta nic. Mesto je torej
// ze na strani, a ga ni videti; vklop je stikalo v adminu, ne nova objava.
//
// Sponzor pride iz nase baze: brez tuje skripte, brez piskotka, brez pasice o
// privolitvi. Stran o zasebnosti zato ostane resnicna.
//
// Oznaka "Sponzor" je vedno vidna. Placano mesto, ki je videti kot vsebina,
// je prevara — tudi kadar je sponzor domaci klub.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTekmovanje } from '../lib/tekmovanje'

interface Mesto {
  id: number
  name: string
  logo_url: string | null
  url: string
  claim: string | null
  doseg: string
}

export default function Sponzor() {
  const { id: ligaId } = useTekmovanje()
  const [mesto, setMesto] = useState<Mesto | null>(null)

  useEffect(() => {
    if (!ligaId) return
    let veljavno = true
    ;(async () => {
      const { data } = await supabase.rpc('sponzorji_za', { p_competition_id: ligaId })
      if (!veljavno) return
      const prvi = ((data ?? []) as Mesto[])[0] ?? null
      setMesto(prvi)
      // Prikaz stejemo takoj, klik pa ob kliku; oboje kot dnevni sestevek.
      if (prvi)
        void supabase.rpc('zabelezi_sponzorja', {
          p_sponsor_id: prvi.id,
          p_competition_id: ligaId ?? undefined,
          p_klik: false,
        })
    })()
    return () => {
      veljavno = false
    }
  }, [ligaId])

  if (!mesto) return null

  return (
    <a
      href={mesto.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() =>
        void supabase.rpc('zabelezi_sponzorja', {
          p_sponsor_id: mesto.id,
          p_competition_id: ligaId ?? undefined,
          p_klik: true,
        })
      }
      className="kartica kartica-hover flex items-center gap-3 p-3 no-underline"
    >
      {mesto.logo_url && (
        <img
          src={mesto.logo_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-contain"
          loading="lazy"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs uppercase tracking-wide text-slate-500">
          Sponzor
        </span>
        <span className="block truncate font-semibold text-slate-200">{mesto.name}</span>
        {mesto.claim && (
          <span className="block truncate text-sm text-slate-400">{mesto.claim}</span>
        )}
      </span>
    </a>
  )
}
