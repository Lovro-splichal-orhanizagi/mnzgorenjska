import { supabase, type NarociloAdmin } from '../baza'
import { t } from '../besede'

// Skupno zavihkom naročil (Admin, AdminVsaNarocila): naslovnik in poslano.

/** Sledilna številka → poslano in mail kupcu. Vrne napako ali null. */
export async function oznaciPoslano(id: number, sledilna: string, token: string): Promise<string | null> {
  const { error } = await supabase.rpc('trgovina_admin_poslano', { p_narocilo: id, p_sledilna: sledilna })
  if (error) return error.message
  const posta = await supabase.functions.invoke('trgovina-posta', {
    body: { vrsta: 'poslano', narocilo_id: id },
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!posta.error) return null
  // Razlog je v telesu odgovora (FunctionsHttpError.context), sporočilo je vedno splošno.
  const ctx = (posta.error as { context?: Response }).context
  const telo = (await ctx?.json?.().catch(() => null)) as { error?: string } | null
  return t('admin.mailNi', { napaka: telo?.error ?? posta.error.message })
}

export function Naslovnik({ n }: { n: NarociloAdmin }) {
  const a = n.naslov
  return (
    <div>
      <p className="font-bold">{a?.name ?? n.ime}</p>
      {a?.line1 && <p>{a.line1}</p>}
      {a?.line2 && <p>{a.line2}</p>}
      <p>{[a?.postal_code, a?.city].filter(Boolean).join(' ')}</p>
      {a?.country && a.country !== 'SI' && <p className="font-bold uppercase">{drzavaZaPosto(a.country)}</p>}
    </div>
  )
}

// Država na pošiljki v tujino po angleško, kot jo bere vsaka pošta.
const POSTA_DRZAVE = new Intl.DisplayNames(['en'], { type: 'region' })
const drzavaZaPosto = (koda: string): string => POSTA_DRZAVE.of(koda) ?? koda
