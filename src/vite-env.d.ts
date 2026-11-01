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
  /** Bugsink DSN (https://<ključ>@slff.eu/n/<projekt>); brez njega sledenja napak ni. Ključ je javen (le sprejem). */
  readonly VITE_NAPAKE_DSN?: string
  /** Okolje v Bugsinku: production (privzeto) ali staging. */
  readonly VITE_NAPAKE_OKOLJE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
