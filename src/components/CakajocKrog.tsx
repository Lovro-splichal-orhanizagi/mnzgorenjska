import { t } from '../i18n'

/** Unresolved dismissals affect the entire fantasy round, including substitutions. */
export default function CakajocKrog() {
  return <div role="status" className="space-y-2 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-sm text-amber-200"><span className="text-2xl font-black">—</span><p>{t('tekme.kartoni.krogCaka')}</p></div>
}
