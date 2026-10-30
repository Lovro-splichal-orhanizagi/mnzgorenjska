// Anketa "kaj bi plačal" (SLF-211): kliče `posli-opomnik` z vrsto
// `anketa-placila`. Naslovi ostanejo v edge funkciji; odgovor nosi le državo,
// jezik, dneve in dejanja ter odtis kohorte, zato ga smemo izpisati (dnevniki
// delovnih tokov so javni).
//
// Uporaba:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/anketa-placila.mjs        # suho
//   ... SUHO=false KOHORTA=<odtis iz suhega teka> node scripts/anketa-placila.mjs           # pošlje do 10
const BASE = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !SERVICE) { console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

// Suho je PRIVZETO; pošiljanje mora biti izrecna izbira.
const suho = String(process.env.SUHO ?? 'true').toLowerCase() !== 'false'
const kohorta = (process.env.KOHORTA ?? '').trim()
if (!suho && !/^[0-9a-f]{12}$/.test(kohorta)) {
  console.error('Pošiljanje zahteva KOHORTA (12 znakov) iz potrjenega suhega teka.')
  process.exit(1)
}

const o = await fetch(`${BASE}/functions/v1/posli-opomnik`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ vrsta: 'anketa-placila', suho, ...(suho ? {} : { kohorta, najvec_poslati: 10 }) }),
})
const izid = await o.json().catch(() => ({}))
console.log(JSON.stringify(izid, null, 2))
if (!o.ok) process.exit(1)
if (izid.predogled) {
  const po = {}
  for (const r of izid.predogled) po[r.drzava ?? '?'] = (po[r.drzava ?? '?'] ?? 0) + 1
  console.log('Po državah:', Object.entries(po).map(([d, n]) => `${d} ${n}`).join(', '))
  const brez = izid.predogled.filter((r) => !r.prevod).length
  if (brez) console.log(`Brez prevoda (dobijo angleščino): ${brez}`)
}
if (!suho && izid.napak) process.exit(1)
