// Predstavitveno pismo klubom nove lige (in pozdrav prvim igralcem).
//
// Uporaba:
//   RESEND_API_KEY=... node scripts/posli-predstavitev.mjs --seznam <pot.tsv>
//   ... --skupina lj|ce|igralci   (katero skupino pošiljamo; privzeto vse)
//   ... --test moj@naslov.si      (eno samo pismo nase, za pogled)
//   ... --posli                   (brez tega samo izpiše, komu bi šlo)
//
// Naslovov NI v tej datoteki in naj jih tudi ne bo: med njimi so zasebni
// gmaili funkcionarjev, repozitorij pa je javen. Seznam je navadna TSV
// datoteka zunaj gita:
//
//   skupina<TAB>klub<TAB>naslov
//   lj<TAB>NK Kolpa<TAB>info@nk-kolpa.si
//
// Pošilja prek Resenda, enako kot `posli-opomnik`. Vsak klub dobi svoje
// pismo (ne skupni Bcc) — klubu, ki je v kopiji dvajsetih drugih, se ne
// odgovarja. Odgovori gredo na info@slff.eu, ker je noreply@ tu napačen:
// pri tem pismu odgovor izrecno želimo.
import { readFileSync } from 'node:fs'

const arg = (ime, privzeto = null) => {
  const i = process.argv.indexOf(`--${ime}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : privzeto
}
const posli = process.argv.includes('--posli')
const test = arg('test')
const skupina = arg('skupina')
const seznam = arg('seznam', 'scripts/.naslovi.tsv')

const KLJUC = process.env.RESEND_API_KEY
if (!KLJUC && posli) {
  console.error('Manjka RESEND_API_KEY (isti kot pri edge funkciji posli-opomnik).')
  process.exit(1)
}
const OD = process.env.EMAIL_FROM ?? 'SLFF <info@slff.eu>'
const ODGOVOR = 'info@slff.eu'

// --- besedila ---------------------------------------------------------------

const klubsko = (zveza, liga, uvod) => ({
  zadeva: `SLFF — fantasy nogomet za ${liga}`,
  besedilo: `Spoštovani,

smo skupina ljubiteljev nogometa, ki vodi SLFF (slff.eu) — fantasy nogometno
igro za lige medobčinskih nogometnih zvez. ${uvod}
To pomeni, da sta v igri tudi vaš klub in vaša igralska zasedba.

Kako deluje: navijač si sestavi svojo ekipo iz resničnih igralcev lige in zbira
točke glede na to, kaj ti igralci naredijo na resničnih tekmah — gole, asistence,
čiste mreže. Točke računamo iz uradnih zapisnikov, objavljenih na spletni strani
${zveza}.

Dve stvari, ki naj bosta povedani naravnost:

  * Igra je brezplačna in brez denarnih vložkov.
  * Projekt je ljubiteljski in ni povezan z ${zveza}, NZS ali s klubi.
    Vodimo ga navijači, ne zveza.

Če se vam zdi zanimivo, bi nam zelo pomagalo, če povezavo delite z igralci,
navijači ali na klubskih kanalih. Fantasy liga zaživi šele, ko v njej igra
dovolj ljudi.

    https://slff.eu

Če česa ne želite — na primer, da ne prikazujemo grba vašega kluba — nam pišite
na info@slff.eu in to takoj uredimo. Prav tako, če opazite napako v zasedbi ali
podatkih o igralcih.

Lep pozdrav,
SLFF — Sunday League Fantasy Football
slff.eu · info@slff.eu`,
})

const BESEDILA = {
  lj: klubsko(
    'MNZ Ljubljana',
    '1. in 2. ligo MNZ Ljubljana',
    'Doslej smo pokrivali gorenjske lige, letos pa smo dodali še 1. in 2. člansko ligo MNZ Ljubljana.',
  ),
  ce: klubsko(
    'MNZ Celje',
    'Medobčinsko člansko ligo MNZ Celje',
    'Doslej smo pokrivali gorenjske in ljubljanske lige, pravkar pa smo odprli še Medobčinsko člansko ligo MNZ Celje.',
  ),
  igralci: {
    zadeva: 'Hvala, ker si med prvimi v ljubljanski ligi',
    besedilo: `Živjo,

ljubljanski ligi sta na SLFF komaj dober dan stari in tvoja ekipa "{EKIPA}"
je med prvimi v njej. Hvala, da si jo sestavil/a.

Odkrito: zaenkrat nas je v ljubljanskih ligah še zelo malo, zato je lestvica
bolj prazna, kot bi si želeli. Če poznaš koga — soigralce, klubske kolege,
družbo, ki spremlja ligo — jih povabi zraven. Fantasy postane zabaven šele,
ko je konkurenca.

    https://slff.eu

In še prošnja: ligo smo odprli pred kratkim, zato so napake mogoče. Če opaziš
manjkajočega igralca, čudno ceno, tekmo brez točk ali karkoli, kar ne izgleda
prav, nam napiši na info@slff.eu. Takšne stvari najhitreje najdemo prek vas,
ki dejansko igrate.

Lep pozdrav,
SLFF — Sunday League Fantasy Football
slff.eu · info@slff.eu`,
  },
}

// --- prejemniki -------------------------------------------------------------

let vrstice
try {
  vrstice = readFileSync(seznam, 'utf8').split(/\r?\n/)
} catch {
  console.error(`Seznama ni: ${seznam}\nPričakujem TSV: skupina<TAB>klub<TAB>naslov`)
  process.exit(1)
}

const prejemniki = vrstice
  .map((v) => v.trim())
  .filter((v) => v && !v.startsWith('#'))
  .map((v) => {
    const [skup, ime, naslov] = v.split('\t').map((s) => s?.trim())
    return { skupina: skup, ime, naslov }
  })
  .filter((p) => p.naslov?.includes('@'))
  .filter((p) => !skupina || p.skupina === skupina)

if (!prejemniki.length) {
  console.error('Noben prejemnik ne ustreza.')
  process.exit(1)
}

// --- pošiljanje -------------------------------------------------------------

const pocakaj = (ms) => new Promise((r) => setTimeout(r, ms))

async function posljiEnega({ naslov, ime, skupina: s }) {
  const predloga = BESEDILA[s]
  if (!predloga) throw new Error(`neznana skupina "${s}"`)
  const besedilo = predloga.besedilo.replace('{EKIPA}', ime ?? '')
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KLJUC}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: OD,
      to: [naslov],
      reply_to: ODGOVOR,
      subject: predloga.zadeva,
      text: besedilo,
    }),
  })
  const odg = await r.json()
  if (!r.ok) throw new Error(odg.message ?? `HTTP ${r.status}`)
  return odg.id
}

if (test) {
  const s = skupina ?? 'lj'
  console.log(`Testno pismo (skupina ${s}) na ${test} …`)
  if (!posli) { console.log('Brez --posli ne pošljem.'); process.exit(0) }
  console.log('  →', await posljiEnega({ naslov: test, ime: 'Testna ekipa', skupina: s }))
  process.exit(0)
}

console.log(`\nPrejemnikov: ${prejemniki.length}${skupina ? ` (skupina ${skupina})` : ''}`)
for (const p of prejemniki) console.log(`  ${(p.skupina ?? '?').padEnd(8)} ${(p.ime ?? '').padEnd(30)} ${p.naslov}`)

if (!posli) {
  console.log('\nTo je le načrt. Za pošiljanje dodaj --posli')
  process.exit(0)
}

let poslano = 0
const napake = []
for (const p of prejemniki) {
  try {
    const id = await posljiEnega(p)
    console.log(`  ✓ ${p.naslov} (${id})`)
    poslano++
  } catch (e) {
    console.log(`  ✗ ${p.naslov}: ${e.message}`)
    napake.push(`${p.naslov}: ${e.message}`)
  }
  await pocakaj(600) // Resend prenese ~2 na sekundo
}

console.log(`\nPoslanih: ${poslano} / ${prejemniki.length}`)
if (napake.length) {
  console.log('Napake:')
  for (const n of napake) console.log(`  ! ${n}`)
  process.exit(1)
}
