// Le to, kar rabi sledenjeNapak.ts: dinamični uvoz celotnega @sentry/browser
// bi v kos potegnil še replay, povratne informacije in sledenje (~420 kB).
export { captureException, init } from '@sentry/browser'
