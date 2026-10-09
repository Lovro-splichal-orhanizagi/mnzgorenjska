// Povezava na Facebook stran SLFF v nogi vsake strani: obiskovalec vidi, da za
// igro stojijo ljudje, in nas lahko všečka. Samo povezava, brez Facebookovega
// gradnika, torej brez tujih piškotkov. V aplikaciji ostane (ni plačilo).
import { t } from '../i18n'

const FACEBOOK = 'https://www.facebook.com/profile.php?id=61594859747409'

export default function Facebook() {
  return (
    <a
      href={FACEBOOK}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gnl-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-[#1877F2]">
        <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
      </svg>
      {t('aplikacija.noga.facebook')}
    </a>
  )
}
