// Gumb "Časti pivo" (naslovnica in noga vsake strani). Igra je brezplačna (plačljiva je le neobvezna
// značka preverjenega igralca); pivo le pomaga pokriti strežnik in domeno in na igro ne vpliva.
//
// Samo povezava: brez skripte in gradnika Buy Me a Coffee, torej brez tujih
// piškotkov. `/pivo` preusmeri Caddy (scripts/hetzner/Caddyfile) na
// buymeacoffee.com/slff, `src` pa doda kot utm_medium, da se vidi, od kod klik.
// Prikaz (gumb vsaj pol viden) in klik šteje lijak_dnevno skupaj in po `src`
// (admin, razdelek lijaka), nakup sporoči bmc-pivo na Discord.
//
// V mobilni aplikaciji gumba ni: trgovini za plačila v aplikaciji dovolita le
// svoje plačilne poti in zunanja povezava za donacije je pogost razlog zavrnitve.
import { useEffect, useRef } from 'react'
import { jeNativno } from '../lib/platforma'
import { zabeleziPivo, type PivoVir } from '../lib/lijak'
import { t } from '../i18n'
import { utisajPivoOkno } from './PivoOkno'

export default function Pivo({ src }: { src: PivoVir }) {
  const gumb = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    const el = gumb.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (e) => {
        if (!e.some((v) => v.isIntersecting)) return
        zabeleziPivo('pivo_prikaz', src)
        io.disconnect()
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [src])

  if (jeNativno()) return null
  return (
    <a
      ref={gumb}
      href={`/pivo?src=${encodeURIComponent(src)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        zabeleziPivo('pivo', src)
        utisajPivoOkno(60)
      }}
      className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-200/60 transition hover:from-amber-200 hover:to-amber-400 hover:shadow-amber-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gnl-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      <span aria-hidden className="animiraj-pivo inline-block text-base group-hover:[animation-duration:0.8s]">🍺</span>
      {t('aplikacija.pivo.gumb')}
    </a>
  )
}
