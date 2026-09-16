// Javi na Discord, da je zagon padel.
//
// Preverba podatkov meri, ali so uvozeni podatki pravilni. Ne more pa videti,
// da uvoza sploh ni bilo: 15. in 16. septembra je uvoz padel na tekmi, ki se
// ni bila odigrana, snl3-zahod se dva dni ni osvezila — podatki v bazi pa so
// bili ves cas brezhibni in vse preverbe tihe. Dva rdeca zagona sta cakala v
// GitHubu, kjer ju ni nihce videl.
//
// Zato vsak urnikov zagon ob padcu poklice to skripto.
//
//   node scripts/javi-napako.mjs "Uvoz zapisnikov"
const naslov = process.argv[2] ?? 'Zagon'
const webhook = process.env.DISCORD_WEBHOOK

const streznik = process.env.GITHUB_SERVER_URL ?? 'https://github.com'
const repo = process.env.GITHUB_REPOSITORY
const zagon = process.env.GITHUB_RUN_ID
const povezava = repo && zagon ? `${streznik}/${repo}/actions/runs/${zagon}` : null

if (!webhook) {
  // Brez webhooka ne moremo javiti, a zagona zaradi tega ne razglasimo za
  // uspesnega — sporocilo gre vsaj v dnevnik.
  console.error(`${naslov} je padel, DISCORD_WEBHOOK pa ni nastavljen.`)
  process.exit(0)
}

const besedilo =
  `🔴 **${naslov} je padel**\n` +
  (povezava ? `${povezava}\n` : '') +
  '_Podatki v bazi so lahko videti v redu — uvoza preprosto ni bilo._'

try {
  const odgovor = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: besedilo.slice(0, 1900) }),
  })
  console.log(odgovor.ok ? 'Javljeno na Discord.' : `Discord: HTTP ${odgovor.status}`)
} catch (e) {
  console.error(`Discord ni dosegljiv: ${e.message}`)
}
// Sam javljalec ne sme podreti zagona — ta je ze padel iz drugega razloga.
process.exit(0)
