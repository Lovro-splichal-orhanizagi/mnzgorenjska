// Uvozi razpored tekoče sezone: kroge z datumi in tekme brez rezultata.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/uvoz-razporeda.mjs --liga 1601
//   ... --tekmovanje mladinci   (mladinska liga; brez tega člani)
//   ... --pisi        (dejansko zapiše; brez tega samo pokaže, kaj bi naredil)
//   ... --dovoli-manj-klubov  (klub je res odstopil: deaktiviraj kljub manj klubom)
//   SUPABASE_URL=...  (za projekt v oblaku; sicer vzame VITE_SUPABASE_URL iz .env)
//
// Zapisniki nastanejo šele po odigrani tekmi, zato brez razporeda baza ne ve
// za noben prihodnji krog — igra pa rok potrebuje vnaprej. Razpored da kroge z
// datumi; rezultate in statistiko pozneje doda `uvoz-zapisnikov.mjs`.
//
// Rok kroga stoji `competitions.rok_pomak_ur` pred prvo tekmo, kadar uro
// poznamo; sicer ob 10:00 na dan prve tekme (glej `rokKroga`).
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tekmovanje as najdiTekmovanje, sifraLige } from './tekmovanje.mjs'
import { viraZa } from './viri/index.mjs'
import { mapaKlubov } from './klubi.mjs'
import { sifra } from './viri/zapisniki.mjs'
import { razcleniRazpored, sezonaIz } from './razpored.mjs'
import { rokKroga } from './razporedi.mjs'
import { vseVrstice } from './strani.mjs'

const PREDPOMNILNIK = 'scripts/.predpomnilnik'

function izEnv() {
  try {
    const vsebina = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      vsebina
        .split(String.fromCharCode(10))
        .map((v) => v.trim())
        .filter((v) => v.includes('=') && !v.startsWith('#'))
        .map((v) => {
          const i = v.indexOf('=')
          return [v.slice(0, i).trim(), v.slice(i + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const env = izEnv()
const BASE =
  process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.error('Manjka SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const arg = (ime, privzeto = null) => {
  const i = process.argv.indexOf(`--${ime}`)
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : privzeto
}
const pisi = process.argv.includes('--pisi')
const dovoliManjKlubov = process.argv.includes('--dovoli-manj-klubov')
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

const tekmovanje = await najdiTekmovanje(db, arg('tekmovanje', 'clani'))
const vir = viraZa(tekmovanje)
const liga = arg('liga', sifraLige(tekmovanje, '1601'))
// Isti pomak kot pri delegiranju: mladinci igrajo zgodaj, zato imajo krajsega.
const pomakUr = Number(arg('pomak', null) ?? tekmovanje.rok_pomak_ur ?? 6)
console.log(`Tekmovanje: ${tekmovanje.name} (liga ${liga})`)

// Razpored se VEDNO prenese svez; predpomnilnik je le rezerva, ce vir pade.
//
// Doslej je veljalo "ce datoteka obstaja, jo vrni" — in ker GitHub Actions
// predpomnilnik hrani med zagoni, se je razpored prebral z vira natanko
// enkrat, 9. septembra. Vse, kar se je od takrat spremenilo pri viru,
// prestavljena tekma Termit Moravce : Vir (11. 9. -> 14. 11.) in umaknjena
// Gorica : Galeb Ankaran, do nas ni nikoli prislo. Preverba je tekmi stiri
// dni javljala kot "ni uvozena", borza je zaradi njiju zadrzala dva kroga.
//
// Zapisniki so drugacni: odigrana tekma se ne spremeni, zato zanje
// predpomnilnik velja (in `zapisnikSvez` poskrbi za prezgodaj zajete).
// Razpored pa je ziv dokument do konca sezone.
async function prenesi(url, ime) {
  const pot = `${PREDPOMNILNIK}/${vir.ime}/${ime}`
  try {
    const odgovor = await fetch(url)
    if (!odgovor.ok) throw new Error(`${odgovor.status} ${url}`)
    const html = await odgovor.text()
    // Ločeno po viru: šifre lig in dokumentov so last spletišča, ne sistema,
    // in dve zvezi bi si lahko delili isto ime datoteke.
    mkdirSync(`${PREDPOMNILNIK}/${vir.ime}`, { recursive: true })
    writeFileSync(pot, html)
    return html
  } catch (e) {
    if (!existsSync(pot)) throw e
    console.log(`  vir ni dosegljiv (${e.message}) — uporabim zadnji shranjeni razpored`)
    return readFileSync(pot, 'utf8')
  }
}

// --- razčlenitev razporeda --------------------------------------------------
const url = vir.naslovRazporeda(liga)
console.log(`Berem razpored: ${url}`)
// Sifra lige gre v IME datoteke, vsebuje pa lahko `/` (Lendava:
// `2026-27/mnl-lendava-26-27`). Brez ociscenja postane pot v mapo, ki je ni,
// in uvoz pade z ENOENT sele po tem, ko je razpored ze prenesen.
const html = await prenesi(url, `razpored-${sifra(liga)}.html`)

// Stari CMS (Kranj, Ljubljana, Celje) postavi stran kot eno veliko tabelo:
// naslov kroga ("1. krog  29.08.26"), pod njim pa vrstice "datum" in
// "Domači : Gostje". Zato beremo kar zaporedje besedila.
//
// Ostalih pet zvez piše vsaka po svoje in nobena ne loči ekip z dvopičjem;
// splošni razčlenjevalnik jim vrne NIČ krogov. Zato lahko vir prinese svojega
// (`scripts/razporedi.mjs`).
// Razclenjevalnik dobi OBOJE: vrstice besedila in surov HTML. Zveze na
// starem CMS-u berejo zaporedje vrstic, NZS pa tabelo, v kateri ima krog svoj
// stolpec — iz golega besedila se stolpci ne dajo lociti. Stari
// razclenjevalniki drugi argument preprosto prezrejo.
// Vir, pri katerem je razpored ostranjen, si ga pobere sam; ostali berejo
// eno stran, kakor doslej.
const razclenit = vir.razcleniRazpored ?? razcleniRazpored
const veljavni = vir.razporedVseStrani
  ? await vir.razporedVseStrani(liga, prenesi)
  : razclenit(vir.vBesedilo(html), html)

console.log(`Najdenih krogov: ${veljavni.length}`)
if (!veljavni.length) {
  console.error('Razporeda ni bilo mogoče razbrati — se je stran spremenila?')
  process.exit(1)
}

const prviDatum = veljavni[0].tekme.find((t) => t.datum)?.datum
const sezona = sezonaIz(prviDatum)
console.log(`Sezona: ${sezona}`)
for (const k of veljavni.slice(0, 3))
  console.log(
    `  ${k.stevilka}. krog (${k.tekme[0].datum}): ${k.tekme.length} tekem, npr. ${k.tekme[0].domaci} : ${k.tekme[0].gostje}`,
  )
console.log(`  … skupaj ${veljavni.reduce((v, k) => v + k.tekme.length, 0)} tekem`)

if (!pisi) {
  console.log('\nTo je le predlog. Za zapis v bazo dodaj --pisi')
  process.exit(0)
}

// --- zapis ------------------------------------------------------------------
// Razpored in zapisniki isti klub pišejo različno, zato ga iščemo po ključu iz
// `klubi.mjs` — sicer bi ob vsakem uvozu nastal dvojnik.
// Po straneh, urejeno, brez povoza obstoječega ključa; vzdevki le za klube
// tega vira (glej `mapaKlubov`).
const klubi = await mapaKlubov(db, vir) // ključ kluba -> id

async function klubId(ime) {
  const kljuc = vir.kljucKluba(ime)
  if (klubi.has(kljuc)) return klubi.get(kljuc)

  const polnoIme = ime.trim()
  // Klub s tem imenom morda že obstaja, le ključ ga ni našel (vzdevek kluba,
  // ki v ligah tega vira še nima igralcev). Ime je unikatno znotraj države,
  // zato bi vstavljanje padlo — raje ga vzamemo.
  let poImenuQ = db.from('teams').select('id').eq('name', polnoIme)
  if (tekmovanje.country_id != null) poImenuQ = poImenuQ.eq('country_id', tekmovanje.country_id)
  const { data: poImenu } = await poImenuQ.order('id').limit(1)
  if (poImenu?.length) {
    klubi.set(kljuc, poImenu[0].id)
    return poImenu[0].id
  }
  const { data, error } = await db
    .from('teams')
    // `country_id` je obvezen: ime kluba je unikatno znotraj drzave, ne
    // globalno. Brez njega vstavljanje pade — in nov klub se pojavi ob
    // vsakem novem zapisniku, ne le ob prvem uvozu.
    .insert({
      name: polnoIme,
      short_name: vir.kratkoIme(polnoIme),
      country_id: tekmovanje.country_id,
    })
    .select('id')
    .single()
  if (error) throw new Error(`klub ${polnoIme}: ${error.message}`)
  console.log(`  nov klub: ${polnoIme}`)
  klubi.set(kljuc, data.id)
  return data.id
}

let novihKrogov = 0
let novihTekem = 0
let prestavljenih = 0
const letosnjiKlubi = new Set()

for (const k of veljavni) {
  const datumKroga = k.tekme.map((t) => t.datum).filter(Boolean).sort()[0]
  // Ura PRVE tekme tega dne, ne prve v seznamu: krog se lahko začne v soboto
  // ob 17.30 in nadaljuje v nedeljo ob 10h, rok pa mora biti pred obema.
  const uraKroga = k.tekme
    .filter((t) => t.datum === datumKroga && t.ura)
    .map((t) => t.ura)
    .sort()[0]
  const rok = rokKroga(datumKroga, uraKroga, pomakUr)

  const { data: obstoj } = await db
    .from('rounds')
    .select('id')
    .eq('competition_id', tekmovanje.id)
    .eq('season', sezona)
    .eq('number', k.stevilka)
    .maybeSingle()

  let krogId = obstoj?.id
  if (!krogId) {
    const { data, error } = await db
      .from('rounds')
      .insert({
        competition_id: tekmovanje.id,
        season: sezona,
        number: k.stevilka,
        played_on: datumKroga,
        deadline_at: rok,
      })
      .select('id')
      .single()
    if (error) {
      console.log(`  krog ${k.stevilka}: ${error.message}`)
      continue
    }
    krogId = data.id
    novihKrogov++
  } else {
    // Datum se lahko prestavi; rok mu sledi, dokler krog še ni zaklenjen.
    // Zaklenjenemu krogu roka ne premikamo: posnetki postav so ze zajeti in
    // premaknjen rok bi obetal urejanje, ki ga ni vec.
    const { error: eRok } = await db
      .from('rounds')
      .update({ played_on: datumKroga, deadline_at: rok })
      .eq('id', krogId)
      .is('lineups_locked_at', null)
    if (eRok) {
      console.error(`  krog ${k.stevilka}: rok ni posodobljen — ${eRok.message}`)
      process.exitCode = 1
    }
  }

  for (const t of k.tekme) {
    const domaciId = await klubId(t.domaci)
    const gostjeId = await klubId(t.gostje)
    letosnjiKlubi.add(domaciId)
    letosnjiKlubi.add(gostjeId)

    // Pred vstavljanjem preverimo obstoj z .limit(1) namesto .maybeSingle().
    // Prej: .maybeSingle() ob najdbi >1 vrstice vrne napako in `data`=null,
    // kar je koda razumela kot "tekme še ni" in vsakič vstavila še eno kopijo.
    // Tak scenarij se je zgodil po združitvi klubov z različnim zapisom
    // imena (Bled-Bohinj). Zdaj beremo array in preverjamo dolžino, tako da
    // je funkcija odporna tudi na že obstoječe podvojene vrstice.
    const { data: obstojTekme } = await db
      .from('matches')
      .select('id, played_on, imported_at')
      .eq('round_id', krogId)
      .eq('home_team_id', domaciId)
      .eq('away_team_id', gostjeId)
      .limit(1)
    if (obstojTekme && obstojTekme.length > 0) {
      // Tekma ze obstaja — a datum se lahko spremeni. Prestavljena tekma
      // (Termit Moravce : Vir, 11. 9. -> 14. 11.) je pri nas obdrzala stari
      // datum, preverba jo je stiri dni zapored javljala kot "ni uvozena",
      // borza pa je zaradi nje zadrzala cel krog. Datum popravimo SAMO, dokler
      // tekma ni uvozena: odigrana tekma ima pravi datum iz zapisnika.
      const obstojeca = obstojTekme[0]
      if (!obstojeca.imported_at && t.datum && obstojeca.played_on !== t.datum) {
        const { error } = await db
          .from('matches')
          .update({ played_on: t.datum })
          .eq('id', obstojeca.id)
        if (error) console.log(`  tekma ${t.domaci} : ${t.gostje}: ${error.message}`)
        else {
          console.log(`  prestavljena: ${t.domaci} : ${t.gostje}  ${obstojeca.played_on} -> ${t.datum}`)
          prestavljenih++
        }
      }
      continue
    }

    const { error } = await db.from('matches').insert({
      round_id: krogId,
      home_team_id: domaciId,
      away_team_id: gostjeId,
      played_on: t.datum,
      source_url: url,
    })
    if (error) console.log(`  tekma ${t.domaci} : ${t.gostje}: ${error.message}`)
    else novihTekem++
  }
}

console.log(`\nNovih krogov: ${novihKrogov}, novih tekem: ${novihTekem}, prestavljenih: ${prestavljenih}`)

// --- kdo letos sploh igra ---------------------------------------------------
// Razpored pove, kateri klubi so v ligi. Igralci klubov, ki jih letos ni,
// ne smejo ostati na trgu — sicer jih kdo kupi in do konca sezone ne dobi
// nobene točke. Pri mladincih to ni izjema, ampak pravilo: vsako leto ena
// generacija odide med člane, kakšen klub pa ekipe sploh ne prijavi.
// Varovalo: razpored z MANJ klubi, kot jih ima ta sezona v bazi že tekem,
// je najverjetneje okrnjena stran (vir je vrnil pol razporeda), ne odstop.
// Brez varovala bi deaktivirali igralce celih klubov in izbrisali njihove
// tekme. Izhodišče so klubi TEKEM te sezone, ne `competition_teams` — ta
// pogled šteje klube z aktivnimi igralci, torej ravno tiste, ki jih
// deaktivacija izklaplja (po uvozu arhiva so to tudi izpadli klubi), in bi
// deaktivacijo za vedno blokiral. Sezona brez tekem v bazi ne blokira.
// Kadar je klub res odstopil, zagon ponovi z `--dovoli-manj-klubov`.
let smemoDeaktivirati = letosnjiKlubi.size > 0
if (smemoDeaktivirati) {
  try {
    const tekmeSezone = await vseVrstice((od, do_) =>
      db
        .from('matches')
        .select('id, home_team_id, away_team_id, rounds!inner(season, competition_id)')
        .eq('rounds.competition_id', tekmovanje.id)
        .eq('rounds.season', sezona)
        .order('id')
        .range(od, do_),
    )
    const vBazi = new Set(tekmeSezone.flatMap((m) => [m.home_team_id, m.away_team_id]))
    // Po vstavljanju zgoraj baza vsebuje vse klube razporeda, zato je
    // "manj klubov" isto kot "v bazi je klub, ki ga razpored nima".
    if (vBazi.size > letosnjiKlubi.size && !dovoliManjKlubov) {
      console.error(
        `::warning::Razpored ima ${letosnjiKlubi.size} klubov, tekme te sezone v bazi pa ${vBazi.size}. ` +
          'Deaktivacijo igralcev in brisanje tekem preskočim. Če je klub res ' +
          'odstopil, poženi znova z --dovoli-manj-klubov.',
      )
      process.exitCode = 1
      smemoDeaktivirati = false
    }
  } catch (e) {
    console.error(`Tekem sezone ni mogoče prebrati (${e.message}) — deaktivacijo preskočim.`)
    process.exitCode = 1
    smemoDeaktivirati = false
  }
}

if (smemoDeaktivirati) {
  const seznam = [...letosnjiKlubi]
  const { count: deaktiviranih, error: eDeakt } = await db
    .from('players')
    .update({ active: false }, { count: 'exact' })
    .eq('competition_id', tekmovanje.id)
    .eq('active', true)
    .not('team_id', 'in', `(${seznam.join(',')})`)
  if (eDeakt) {
    console.error(`  deaktivacija: ${eDeakt.message}`)
    process.exitCode = 1
  }

  // Igralci klubov, ki letos igrajo, se vrnejo med aktivne (klub se je vrnil
  // v ligo, igralec je prestopil iz kluba zunaj lige). Ročno umaknjeni ostanejo
  // neaktivni: `popravki-igralcev.mjs` in poznavalec lige (`oznaci_odhod_igralca`)
  // nastavita `odsel_at`, deaktivacija uvoza pa ne — po tem ju ločimo. Takega
  // igralca obudi samo nastop (sprožilec na appearances).
  const { count: vrnjenih, error: eVrni } = await db
    .from('players')
    .update({ active: true }, { count: 'exact' })
    .eq('competition_id', tekmovanje.id)
    .eq('active', false)
    .is('odsel_at', null)
    .in('team_id', seznam)
  if (eVrni) {
    console.error(`  vračanje med aktivne: ${eVrni.message}`)
    process.exitCode = 1
  }
  console.log(
    `Klubov v tej sezoni: ${seznam.length}; ` +
      `deaktiviranih igralcev zunaj lige: ${deaktiviranih ?? 0}, ` +
      `vrnjenih med aktivne: ${vrnjenih ?? 0}`,
  )

  // Klub, ki ga v razporedu ni vec, je iz lige odstopil (Gorica, Primorska
  // liga, september 2026). Njegovi igralci so ze deaktivirani — njegove
  // NEODIGRANE tekme pa so ostale in vsaka je "tekma brez zapisnika": preverba
  // jo javlja, borza zaradi nje zadrzi krog. Odigranih se ne dotaknemo —
  // rezultat, ki je bil, ostane.
  const { data: krogiSezone } = await db
    .from('rounds')
    .select('id')
    .eq('competition_id', tekmovanje.id)
    .eq('season', sezona)
  const krogIdji = (krogiSezone ?? []).map((r) => r.id)
  if (krogIdji.length) {
    const { data: fantomske } = await db
      .from('matches')
      .select('id, home_team_id, away_team_id')
      .in('round_id', krogIdji)
      .is('imported_at', null)
    const zaBrisanje = (fantomske ?? []).filter(
      (m) => !letosnjiKlubi.has(m.home_team_id) || !letosnjiKlubi.has(m.away_team_id),
    )
    if (zaBrisanje.length) {
      const { error } = await db
        .from('matches')
        .delete()
        .in('id', zaBrisanje.map((m) => m.id))
      if (error) console.log(`  brisanje tekem odstopljenih klubov: ${error.message}`)
      else console.log(`Odstranjenih neodigranih tekem klubov, ki jih v ligi ni več: ${zaBrisanje.length}`)
    }
  }
}
