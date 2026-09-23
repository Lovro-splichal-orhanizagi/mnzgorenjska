// Opomnik uporabnikom, ki v ligi še nimajo veljavne ekipe, in opozorilo
// tistim, katerih ekipa se ob roku ne bo zaklenila.
//
// Kliče edge funkcijo `posli-opomnik` s service ključem — ta pot obstaja
// prav zato, da opomnika ni treba prožiti z gumbom. Ključ ostane v GitHubu,
// `RESEND_API_KEY` pa v Supabase, kjer je že bil; nove skrivnosti ni.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/posli-opomnike.mjs        # suho
//   ... SUHO=false node scripts/posli-opomnike.mjs                       # pošlje
//   ... VRSTA=opozorilo node scripts/posli-opomnike.mjs                  # opozorila
//
// Opomnik gre vsem brez ekipe (353 ljudi) in je zato ročna odločitev.
// Opozorilo gre samo tistim, ki ekipo IMAJO in se jim ne bo zaklenila — to
// je nekaj ljudi na krog in teče po urniku.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

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

// Suho je PRIVZETO. Pošiljanje pošte resničnim ljudem mora biti izrecna
// izbira, ne privzeta posledica zagona.
const suho = String(process.env.SUHO ?? 'true').toLowerCase() !== 'false'
const vrsta = process.env.VRSTA === 'opozorilo' ? 'opozorilo' : 'opomnik'

// Varovalka za opozorila. Opozorilo naslavlja napako posameznika, zato jih je
// obicajno nekaj na ligo. Ce jih je nenadoma cel kup, to skoraj gotovo ni
// dvajset ljudi, ki bi vsak zase pokvaril svojo ekipo — verjetneje je uvoz
// deaktiviral cel klub ali prestavil pol lige. Takrat je napaka nasa in
// posiljanje pomote dvajsetim ljudem je ne popravi.
const NAJVEC_NA_LIGO = Number(process.env.NAJVEC_NA_LIGO ?? 25)
const dni = Number(process.env.DNI ?? 2)

const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })
const { data: lige, error } = await db
  .from('competitions')
  .select('id, slug, name')
  .eq('active', true)
  .order('sort_order')
if (error) { console.error(`Lig ni bilo mogoče prebrati: ${error.message}`); process.exit(1) }

console.log(
  `${vrsta === 'opozorilo' ? 'OPOZORILA (ekipa se ne bo zaklenila)' : 'OPOMNIKI (ni ekipe)'} — ` +
    (suho ? 'SUHI TEK, pošte ne pošiljam.\n' : 'POŠILJAM pošto.\n'),
)

let skupaj = 0
let padlo = 0
for (const liga of lige ?? []) {
  const odgovor = await fetch(`${BASE}/functions/v1/posli-opomnik`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    // Mejo preveri funkcija PRED prvim mailom; prej smo jo preverjali sele
    // po odgovoru, ko je bila posta ze poslana.
    body: JSON.stringify({
      competition_id: liga.id, suho, vrsta, dni,
      ...(vrsta === 'opozorilo' ? { najvec: NAJVEC_NA_LIGO } : {}),
    }),
  })
  const izid = await odgovor.json().catch(() => ({}))
  if (odgovor.status === 409) {
    console.error(
      `  ${liga.slug.padEnd(14)} USTAVLJENO: ${izid.kandidati_stevilo ?? '?'} kandidatov (meja ${NAJVEC_NA_LIGO}).` +
        ' Toliko hkrati pomeni napako pri uvozu, ne pri uporabnikih. Nic ni bilo poslano.',
    )
    padlo++
    continue
  }
  if (!odgovor.ok) {
    console.log(`  ${liga.slug.padEnd(14)} NAPAKA ${odgovor.status}: ${izid.error ?? ''}`)
    padlo++
    continue
  }
  const n = izid.kandidati_stevilo ?? 0
  // Suhi tek ne posilja, zato ga funkcija ne ustavi; mejo pa vseeno pokazemo,
  // da se vidi, katera liga bi se ob pravem zagonu ustavila.
  if (vrsta === 'opozorilo' && n > NAJVEC_NA_LIGO && suho) {
    console.error(
      `  ${liga.slug.padEnd(14)} BI USTAVILO: ${n} kandidatov (meja ${NAJVEC_NA_LIGO}).`,
    )
  }
  // Pravi zagon nad mejo, ki ga funkcija NI ustavila: objavljena je stara
  // razlicica brez `najvec` in je sporocila ze poslala. Ustaviti ne moremo
  // vec, zagon pa mora biti rdec, da se opazi.
  if (vrsta === 'opozorilo' && n > NAJVEC_NA_LIGO && !suho) {
    console.error(
      `::error::${liga.slug}: ${n} kandidatov nad mejo ${NAJVEC_NA_LIGO}, funkcija pa ni ustavila ` +
        'posiljanja — objavljena je stara razlicica brez `najvec`. Objavi funkcijo znova.',
    )
    padlo++
  }
  skupaj += n
  console.log(
    `  ${liga.slug.padEnd(14)} kandidatov ${String(n).padStart(4)}` +
      (suho ? '' : ` · poslano ${izid.poslano ?? 0}, preskočeno ${izid.preskoceno ?? 0}`),
  )
}

console.log(`\nSkupaj kandidatov: ${skupaj}`)
if (padlo) {
  console.error(`Lig z napako: ${padlo}`)
  process.exit(1)
}
