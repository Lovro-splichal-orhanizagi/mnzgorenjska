// Po uvozu zapisnikov: uradne odsotnosti potrjenih igralcev, ki niso držale.
//
// Če je igralec (katerakoli njegova vrstica) po zapisniku igral med odprto
// uradno odsotnostjo, jo `preveri_uradne_odsotnosti()` (migracija
// 20261012135100) označi "ni_drzalo" in to je opomin osebi. Brez vpliva na
// točke in cene. Isto preverbo vsako uro kliče tudi pg_cron (rezerva).
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/preveri-uradne-odsotnosti.mjs
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !SERVICE) {
  console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })
const { data, error } = await db.rpc('preveri_uradne_odsotnosti')
if (error) {
  console.error(`Preverba uradnih odsotnosti ni uspela: ${error.message}`)
  process.exit(1)
}
console.log(`Uradne odsotnosti: novih "ni držalo": ${data ?? 0}`)
