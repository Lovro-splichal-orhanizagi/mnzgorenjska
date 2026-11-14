// Promocijski mail "Preverjen profil" (SLF-383) prek edge funkcije
// `posli-opomnik` (vrsta `promo-preverjen`) s service ključem. Izpiše le
// odgovor funkcije: števila po državah, jezikih in razlogih, nikoli naslovov
// ali imen.
//
//   AKCIJA=predogled node scripts/promo-preverjen.mjs     # suhi tek (privzeto)
//   AKCIJA=paket ...                                      # zamrzne do 20 prejemnikov
//   AKCIJA=vzorec ...                                     # vse jezike na info@slff.eu
//   AKCIJA=poslji PAKET_ID=1 ODOBRIL=Lovro ODOBRITEV=https://discord.com/channels/… OSNUTEK_SHA=… ...
//
// `poslji` pošlje le paket, ki ga je človek (Lovro, Nejc ali Luka) odobril
// skupaj z osnutkom (`osnutek_sha` iz predogleda); funkcija ob vsakem
// prejemniku še enkrat preveri pravila.

const BASE = process.env.SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !SERVICE) { console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const akcija = process.env.AKCIJA || 'predogled'
const telo = { vrsta: 'promo-preverjen', akcija }
if (akcija === 'poslji') {
  Object.assign(telo, {
    paket_id: Number(process.env.PAKET_ID),
    odobril: process.env.ODOBRIL,
    odobritev: process.env.ODOBRITEV,
    osnutek_sha: process.env.OSNUTEK_SHA,
  })
}

async function klic() {
  const r = await fetch(`${BASE}/functions/v1/posli-opomnik`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(telo),
  })
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
  console.log(JSON.stringify(j, null, 2))
  if (!r.ok) process.exit(1)
  return j
}

// Funkcija pošlje največ 10 na klic; paket (do 20) dokonča v največ treh klicih.
let j = await klic()
for (let i = 0; akcija === 'poslji' && i < 2 && j.ostalo_v_paketu > 0 && j.poslano > 0; i++) j = await klic()
