import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import type { Database } from './baza.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn(
    'Manjkata VITE_SUPABASE_URL in/ali VITE_SUPABASE_ANON_KEY. Kopiraj .env.example v .env in ju izpolni.',
  )
}

// Varovalka pred razvojem na produkciji: `npm run dev` naj teče proti
// lokalnemu stacku (`npx supabase start`), sicer testni klik briše prave
// podatke. Produkcijski build sme na produkcijo — tam je to pravilno.
if (import.meta.env.DEV && url && !/127\.0\.0\.1|localhost/.test(url)) {
  console.warn(
    `⚠️  Razvojni strežnik je priklopljen na ODDALJENO bazo (${url}).\n` +
      '   Za lokalno delo poženi `npx supabase start` in v .env.local nastavi\n' +
      '   VITE_SUPABASE_URL=http://127.0.0.1:54321',
  )
}

// Mobilna aplikacija se prijavi po PKCE: povratna povezava `eu.slff.app://auth`
// nosi le kodo, ki jo zamenja samo ta naprava (NativnePovezave). Žetonov v
// povezavi bi ji lahko podtaknil kdorkoli, druga aplikacija z isto shemo pa
// bi jih lahko prestregla. Splet ostane pri implicitnem toku.
// storageKey je pripet na ime Supabase projekta: supabase-js ga sicer izpelje
// iz naslova, in prehod na api.slff.eu bi vse odjavil (docs/migracija-hetzner.md).
export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    flowType: Capacitor.isNativePlatform() ? 'pkce' : 'implicit',
    storageKey: 'sb-cobtigdsmlftvpfqtnas-auth-token',
  },
})
