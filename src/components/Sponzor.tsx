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
//
// Sponzor s sliko (`slika_url`) dobi pasico: fotografija zgoraj (na sirsem
// zaslonu levo), pod njo ime, vrstica in poziv. Brez slike ostane kartica.
//
// Mest je vec (`Polozaj`); kateri sponzor je kje, nastavi admin
// (`sponsors.mesta`). Na domaci strani in pod lestvico je pasica, na
// delovnih straneh (Moja ekipa, Rezultati, Igralci) nizka kartica, da ne
// porine vsebine navzdol.
//
// Prikaz se steje, ko je mesto vsaj do polovice na zaslonu — enkrat na
// obisk strani. Mesto na dnu strani bi sicer stelo vsem, tudi tistim, ki
// do njega nikoli ne pridejo, in sponzor bi dobil napihnjene stevilke.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTekmovanje } from '../lib/tekmovanje'
import { t } from '../i18n'

/**
 * Naslov iz baze gre v `href`; `javascript:` ali `data:` bi se ob kliku
 * izvedel na naši domeni. Dovolimo le http(s).
 */
function varenNaslov(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

interface Mesto {
  id: number
  name: string
  logo_url: string | null
  url: string
  claim: string | null
  doseg: string
  slika_url: string | null
}

/** Slika je pot na nasi strani (/sponzorji/x.jpg) ali http(s) naslov. */
function varnaSlika(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/') && !url.startsWith('//')) return url
  return varenNaslov(url)
}

/**
 * Zapis prikaza ali klika. Poizvedba Supabase se izvede sele ob `then` —
 * `void supabase.rpc(…)` je ne poslje nikoli. Tako so stevci do oktobra 2026
 * ostali na nic, ceprav je bil sponzor na strani.
 */
function zabelezi(sponzor: number, liga: number, mesto: Polozaj, klik: boolean) {
  supabase
    .rpc('zabelezi_sponzorja', {
      p_sponsor_id: sponzor,
      p_competition_id: liga,
      p_klik: klik,
      p_mesto: mesto,
    })
    .then(
      () => {},
      () => {},
    )
}

export type Polozaj = 'domov' | 'lestvica' | 'moja_ekipa' | 'rezultati' | 'igralci'

const PASICA: Polozaj[] = ['domov', 'lestvica']

export default function Sponzor({ kje }: { kje: Polozaj }) {
  const { id: ligaId } = useTekmovanje()
  const [mesto, setMesto] = useState<Mesto | null>(null)
  const povezava = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    setMesto(null)
    if (!ligaId) return
    let veljavno = true
    ;(async () => {
      const { data } = await supabase.rpc('sponzorji_za', {
        p_competition_id: ligaId,
        p_mesto: kje,
      })
      if (!veljavno) return
      setMesto(((data ?? []) as Mesto[])[0] ?? null)
    })()
    return () => {
      veljavno = false
    }
  }, [ligaId, kje])

  // Prikaz: enkrat, ko je mesto vsaj do polovice vidno.
  const sponzorId = mesto?.id
  useEffect(() => {
    const el = povezava.current
    if (!sponzorId || !ligaId || !el) return
    if (typeof IntersectionObserver === 'undefined') {
      zabelezi(sponzorId, ligaId, kje, false)
      return
    }
    const opazovalec = new IntersectionObserver(
      (vnosi) => {
        if (vnosi.some((v) => v.isIntersecting)) {
          zabelezi(sponzorId, ligaId, kje, false)
          opazovalec.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    opazovalec.observe(el)
    return () => opazovalec.disconnect()
  }, [sponzorId, ligaId, kje])

  const naslov = varenNaslov(mesto?.url)
  if (!mesto || !naslov) return null

  const klik = () => {
    if (ligaId) zabelezi(mesto.id, ligaId, kje, true)
  }
  const slika = varnaSlika(mesto.slika_url)

  if (slika && PASICA.includes(kje))
    return (
      <a
        ref={povezava}
        href={naslov}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={klik}
        className="kartica kartica-hover block overflow-hidden no-underline sm:flex"
      >
        <img
          src={slika}
          alt=""
          loading="lazy"
          className="aspect-[43/24] w-full object-cover object-left-bottom sm:aspect-auto sm:w-2/5 sm:shrink-0"
        />
        <span className="flex min-w-0 flex-col justify-center gap-1 p-3 sm:p-4">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {t('aplikacija.sponzor.oznaka')}
          </span>
          <span className="flex items-center gap-2 font-bold text-slate-100">
            {mesto.logo_url && (
              <img
                src={mesto.logo_url}
                alt=""
                className="h-6 w-6 shrink-0 object-contain"
                loading="lazy"
              />
            )}
            {mesto.name}
          </span>
          {mesto.claim && <span className="text-sm text-slate-300">{mesto.claim}</span>}
          <span className="mt-1 text-sm font-semibold text-gnl-300">
            {t('aplikacija.sponzor.obisci')}
          </span>
        </span>
      </a>
    )

  // Nizka kartica: sliko pasice (ce je) kot sliciko, sicer logotip.
  const sliciko = slika ?? mesto.logo_url
  return (
    <a
      ref={povezava}
      href={naslov}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={klik}
      className="kartica kartica-hover flex items-center gap-3 p-3 no-underline"
    >
      {sliciko && (
        <img
          src={sliciko}
          alt=""
          className={`shrink-0 rounded-lg ${
            slika ? 'h-12 w-20 object-cover object-left-bottom' : 'h-10 w-10 object-contain'
          }`}
          loading="lazy"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs uppercase tracking-wide text-slate-400">
          {t('aplikacija.sponzor.oznaka')}
        </span>
        <span className="block truncate font-semibold text-slate-200">{mesto.name}</span>
        {mesto.claim && (
          <span className="line-clamp-2 block text-sm text-slate-400">{mesto.claim}</span>
        )}
      </span>
      <span className="hidden shrink-0 text-sm font-semibold text-gnl-300 sm:inline">
        {t('aplikacija.sponzor.obisci')}
      </span>
    </a>
  )
}
