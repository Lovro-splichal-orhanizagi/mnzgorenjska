// Dnevno poročilo o poslani pošti za včeraj — na Discord (#reports).
//
// Dva vira: pošta klubom (`klub_stik_posta`, prvi mail in opomnik; pošiljatelj
// je `poslal`, država `klub_stik.drzava`) in sistemska pošta uporabnikom
// (`email_log`, le kanal e-pošte, vedno noreply@; država iz lige). Prevzem
// profila zapiše v oba, zato je pri klubih le `prvi`/`opomnik`.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/dnevno-porocilo-poste.mjs
//   ... --discord        pošlje na Discord (sicer samo izpiše)
//   ... --dan 2026-10-19 drug dan namesto včerajšnjega
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { vseVrstice } from './strani.mjs'

function izEnv() {
  try {
    const v = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      v.split('\n').map((s) => s.trim())
        .filter((s) => s.includes('=') && !s.startsWith('#'))
        .map((s) => [s.slice(0, s.indexOf('=')).trim(), s.slice(s.indexOf('=') + 1).trim()]),
    )
  } catch { return {} }
}

const env = izEnv()
const BASE = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) { console.error('Manjka SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })
const discord = process.argv.includes('--discord')
const webhook = process.env.DISCORD_WEBHOOK_REPORTS ?? env.DISCORD_WEBHOOK_REPORTS

/** UTC trenutek lokalne polnoči v Ljubljani za dan `YYYY-MM-DD`. */
function polnoc(dan) {
  const utc = Date.parse(`${dan}T00:00:00Z`)
  const lokalno = new Date(utc).toLocaleString('sv-SE', { timeZone: 'Europe/Ljubljana' })
  return new Date(utc - (Date.parse(`${lokalno.replace(' ', 'T')}Z`) - utc))
}

const i = process.argv.indexOf('--dan')
const dan = i > 0
  ? process.argv[i + 1]
  : new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Ljubljana' })
const od = polnoc(dan).toISOString()
const naslednji = new Date(Date.parse(`${dan}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
const do_ = polnoc(naslednji).toISOString()

// Seštevek po ključu, od največjega navzdol.
const prestej = (vrstice, kljuc) => Object.entries(
  vrstice.reduce((a, v) => ({ ...a, [kljuc(v)]: (a[kljuc(v)] ?? 0) + 1 }), {}),
).sort((a, b) => b[1] - a[1])
const vrsta = (pari) => pari.map(([k, n]) => `${k} ${n}`).join(' · ') || '—'
// "Luka (luka@slff.eu)" → "luka@slff.eu"; ročni vpis ostane, kot je.
const naslov = (poslal) => poslal?.match(/\(([^)]+@[^)]+)\)/)?.[1] ?? poslal ?? 'neznan'

let klubi, uporabniki, lige
try {
  klubi = await vseVrstice((a, b) => db.from('klub_stik_posta')
    .select('id, vrsta, poslal, klub_stik!inner(drzava)')
    .in('vrsta', ['prvi', 'opomnik'])
    .gte('poslano_at', od).lt('poslano_at', do_)
    .order('id').range(a, b))
  uporabniki = await vseVrstice((a, b) => db.from('email_log')
    .select('id, vrsta, competition_id, napaka')
    .neq('kanal', 'push')
    .not('vrsta', 'in', '(test,prevzem-test)')
    .gte('poslano_at', od).lt('poslano_at', do_)
    .order('id').range(a, b))
  ;({ data: lige } = await db.from('competitions_view').select('id, country_code'))
} catch (e) {
  console.error(e.message)
  if (discord && webhook) await fetch(webhook, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `🔴 **Poročila o pošti za ${dan} ni bilo mogoče sestaviti**\n\`${e.message}\``.slice(0, 1900) }),
  }).catch(() => {})
  process.exit(1)
}

const drzavaLige = new Map((lige ?? []).map((l) => [l.id, l.country_code]))
const poslani = uporabniki.filter((u) => !u.napaka)
const napake = uporabniki.length - poslani.length

const besedilo = [
  `📬 **Pošta ${dan}** — skupaj **${klubi.length + poslani.length}**`,
  '',
  `**Klubom: ${klubi.length}**`,
  `Pošiljatelj: ${vrsta(prestej(klubi, (k) => naslov(k.poslal)))}`,
  `Država: ${vrsta(prestej(klubi, (k) => k.klub_stik.drzava))}`,
  `Vrsta: ${vrsta(prestej(klubi, (k) => k.vrsta))}`,
  '',
  `**Uporabnikom (noreply@): ${poslani.length}**${napake ? ` · ⚠ ${napake} neuspelih` : ''}`,
  `Država: ${vrsta(prestej(poslani, (u) => drzavaLige.get(u.competition_id) ?? 'brez lige'))}`,
  `Vrsta: ${vrsta(prestej(poslani, (u) => u.vrsta))}`,
].join('\n')

console.log(besedilo)

if (discord) {
  if (!webhook) { console.log('\nDISCORD_WEBHOOK_REPORTS ni nastavljen — ne pošiljam.'); process.exit(0) }
  const odgovor = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Discord zavrne sporočilo, daljše od 2000 znakov.
    body: JSON.stringify({ content: besedilo.slice(0, 1900) }),
  })
  console.log(odgovor.ok ? '\nPoslano na Discord.' : `\nDiscord: HTTP ${odgovor.status}`)
  if (!odgovor.ok) process.exit(1)
}
