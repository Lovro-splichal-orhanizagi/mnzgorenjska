/// <reference types="vite/client" />

// Okoljske spremenljivke, ki jih pozna vmesnik. Samo `VITE_` predpona pride
// v brskalnik — skrivni ključi (sb_secret_…, SUPABASE_SERVICE_ROLE_KEY) sem
// NE sodijo, ker bi končali v javnem bundlu.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Umami (statistika obiska); brez njega se skripta ne naloži. */
  readonly VITE_UMAMI_ID?: string
  /** "1": na slff.eu API na istem izvoru (Caddy), glej lib/supabase.ts. */
  readonly VITE_API_ISTI_IZVOR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
