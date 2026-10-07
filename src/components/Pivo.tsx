// Gumb "Časti pivo" (naslovnica in noga vsake strani). SLFF je brezplačen in brez oglasov; pivo le
// pomaga pokriti strežnik in domeno in na igro ne vpliva.
//
// Samo povezava: brez skripte in gradnika Buy Me a Coffee, torej brez tujih
// piškotkov. `/pivo` preusmeri Caddy (scripts/hetzner/Caddyfile) na
// buymeacoffee.com/slff, `src` pa doda kot utm_medium, da se vidi, od kod klik.
// Klik šteje lijak_dnevno (admin, razdelek lijaka), nakup sporoči bmc-pivo na Discord.
//
// V mobilni aplikaciji gumba ni: trgovini za plačila v aplikaciji dovolita le
// svoje plačilne poti in zunanja povezava za donacije je pogost razlog zavrnitve.
import { jeNativno } from '../lib/platforma'
import { zabeleziKorak } from '../lib/lijak'
import { t } from '../i18n'

export default function Pivo({ src }: { src: string }) {
  if (jeNativno()) return null
  return (
    <a
      href={`/pivo?src=${encodeURIComponent(src)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => zabeleziKorak('pivo')}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gnl-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      <span aria-hidden>🍺</span>
      {t('aplikacija.pivo.gumb')}
    </a>
  )
}
