// End-to-end preverjanje proti bazi: registracija, RLS, glasovanje o
// asistencah in pozicijah, točkovanje iz zapisnikov in lestvica.
//
// Zahteva uvožene zapisnike (node scripts/uvoz-zapisnikov.mjs).
//
// Vsak `.limit(1)` mora imeti tudi `.order(...)`. Brez njega Postgres vrne
// poljubno vrstico in test dobi ob vsakem zagonu drugega igralca ali krog —
// enkrat pade, drugič ne, koda pa je ves čas ista.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

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
          const vrednost = v.slice(i + 1).trim()
          return [v.slice(0, i).trim(), /^(['"]).*\1$/.test(vrednost)
            ? vrednost.slice(1, -1) : vrednost]
        }),
    )
  } catch {
    return {}
  }
}

const env = izEnv()
const BASE = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ??
  env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ??
  env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
let lokalna = false
try {
  const naslov = new URL(BASE)
  lokalna = ['http:', 'https:'].includes(naslov.protocol) &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(naslov.hostname) &&
    !naslov.username && !naslov.password
} catch { /* Napačen naslov zavrnemo pred prvim zahtevkom. */ }
if (!lokalna) {
  console.error('E2E spreminja testne podatke: dovoljen je samo lokalni Supabase URL.')
  process.exit(1)
}
if (!ANON || !SERVICE) {
  console.error('Manjka javni ali SUPABASE_SERVICE_ROLE_KEY ključ (okolje ali .env).')
  process.exit(1)
}

const fresh = () => createClient(BASE, ANON, { auth: { persistSession: false } })
// Uporabniške poti preverjamo z javnim ključem; servis ureja interne operacije
// in povrne samo podatke, ki jih je ta zagon izrecno spremenil.
const admin = createClient(BASE, SERVICE, { auth: { persistSession: false } })
const zahtevaj = async (opis, poizvedba) => {
  const { data, error } = await poizvedba
  if (error) throw new Error(`${opis}: ${error.message}`)
  return data
}

let fails = 0
const ok = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`)
  if (!cond) fails++
}

const stamp = `${process.argv[2] ?? 'e2e'}.${Date.now().toString(36)}.${process.pid}`
const users = []
const pospravljanje = []
const testneEkipe = []

// --- 0. predpogoji ---------------------------------------------------------
const anon = fresh()

// Pragova bereva iz baze, ne iz konstante v testu: asistenca in pozicija ju
// imata različna in se dasta spremeniti brez posega v kodo.
const { data: nastavitve } = await anon.from('settings').select('key, value')
const nastavitev = (kljuc, privzeto) =>
  Number((nastavitve ?? []).find((n) => n.key === kljuc)?.value ?? privzeto)
const nastavitveLige = await zahtevaj('nastavitve članske lige', anon.from('competition_settings')
  .select('key, value').eq('competition_id', 1))
const nastavitevLige = (kljuc, privzeto) =>
  Number(nastavitveLige.find((n) => n.key === kljuc)?.value ?? nastavitev(kljuc, privzeto))
const PRAG_ASISTENCE = nastavitevLige('prag_glasov_asistenca', 3)
const PRAG_POZICIJE = nastavitevLige('prag_glasov_pozicija', 5)
const PRAG = Math.max(2, PRAG_ASISTENCE, PRAG_POZICIJE) // toliko testnih glasovalcev
const { count: stTekem } = await anon
  .from('matches')
  .select('id', { count: 'exact', head: true })
if (!stTekem) {
  console.error(
    'V bazi ni tekem. Najprej poženi: node scripts/uvoz-zapisnikov.mjs --liga 1502',
  )
  process.exit(1)
}

// --- 1. registracija -------------------------------------------------------
try {
for (let n = 1; n <= PRAG; n++) {
  const c = fresh()
  const email = `test${n}.${stamp}@example.com`
  const { data, error } = await c.auth.signUp({
    email,
    password: 'geslo123',
    options: { data: { display_name: `Tester ${n}` } },
  })
  if (error) {
    throw new Error(`signup ${email}: ${error.message}`)
  }
  if (!data.user?.id || data.user.identities?.length === 0)
    throw new Error('Registracija ni ustvarila novega testnega uporabnika.')
  users.push({ c, id: data.user.id, email })
  if (!data.session) throw new Error('Lokalna registracija zahteva takojšnjo prijavo brez potrjevanja e-pošte.')
}
ok(`registracija ${PRAG} uporabnikov`, users.length === PRAG)

const { data: profil } = await users[0].c
  .from('profiles')
  .select('display_name')
  .eq('id', users[0].id)
  .maybeSingle()
ok('trigger ustvari profil', profil?.display_name === 'Tester 1')

// --- 2. javno branje -------------------------------------------------------
const { data: javniIgralci } = await anon
  .from('player_overview')
  .select('id, full_name, value')
  .eq('competition_id', 1)
  .eq('active', true)
  .order('id')
  .limit(5)
ok('anonimni vidi igralce', javniIgralci?.length === 5)

const { data: javneTekme } = await anon.from('matches').select('id').order('id').limit(3)
ok('anonimni vidi tekme', javneTekme?.length === 3)

// --- 3. glasovanje o asistenci ---------------------------------------------
const u = users[0]
// Glasovanje o asistenci se zapre z naslednjim krogom (migracija
// 20260922170000), zato gol iščemo med tekmami, ki so ŠE ODPRTE — sicer bi
// RLS glas zavrnil in test bi padel na pravilnem vedenju.
const { data: odprte } = await u.c
  .from('match_assist_status')
  .select('match_id')
  .eq('competition_id', 1)
  .eq('glasovanje_odprto', true)
  .gt('brez_asistence', 0)
  .order('match_id')
const odprtiIdji = (odprte ?? []).map((t) => t.match_id)
const { data: gol } = await u.c
  .from('goals')
  .select('id, match_id, team_id, scorer_id, assist_player_id, assist_confirmed_at, assist_none_confirmed_at')
  .in('match_id', odprtiIdji.length ? odprtiIdji : [-1])
  .eq('is_own_goal', false)
  // Enajstmetrovka in avtogol asistence nimata in sta že zaklenjena, prav tako
  // gol, o katerem je skupnost odločila, da podajalca ni — o teh ni glasovanja.
  .eq('is_penalty', false)
  .is('assist_player_id', null)
  .is('assist_none_confirmed_at', null)
  .order('id')
  .limit(1)
  .single()
ok('najden gol brez asistence', Boolean(gol))
if (!gol)
  throw new Error(
    'Potreben je neodločen gol v članski ligi, na tekmi z odprtim glasovanjem.',
  )
pospravljanje.push(['povrnitev asistence', () => admin.from('goals').update({
  assist_player_id: gol.assist_player_id,
  assist_confirmed_at: gol.assist_confirmed_at,
  assist_none_confirmed_at: gol.assist_none_confirmed_at,
}).eq('id', gol.id)])

const { data: soigralci } = await u.c
  .from('appearances')
  .select('player_id')
  .eq('match_id', gol.match_id)
  .eq('team_id', gol.team_id)
  .neq('player_id', gol.scorer_id)
  .gt('minutes_played', 0)
  .order('player_id')
  .limit(2)
if (soigralci?.length !== 2) throw new Error('Gol potrebuje dva soigralca z nastopom.')
const podajalec = soigralci[0].player_id
const drugi = soigralci[1].player_id

// prvi glasovi (pod pragom)
for (let n = 0; n < PRAG_ASISTENCE - 1; n++) {
  const { error } = await users[n].c
    .from('assist_votes')
    .insert({ goal_id: gol.id, voter_id: users[n].id, player_id: podajalec })
  if (error) ok(`glas ${n + 1}`, false, error.message)
}
const { data: podPragom } = await anon
  .from('goals')
  .select('assist_player_id')
  .eq('id', gol.id)
  .single()
ok(
  `pri ${PRAG_ASISTENCE - 1} glasovih asistenca še ni potrjena`,
  podPragom.assist_player_id === null,
)

// zadnji glas doseže prag
await users[PRAG_ASISTENCE - 1].c.from('assist_votes').insert({
  goal_id: gol.id,
  voter_id: users[PRAG_ASISTENCE - 1].id,
  player_id: podajalec,
})
const { data: nadPragom } = await anon
  .from('goals')
  .select('assist_player_id, assist_confirmed_at')
  .eq('id', gol.id)
  .single()
ok(
  `pri ${PRAG_ASISTENCE} glasovih se asistenca potrdi`,
  nadPragom.assist_player_id === podajalec,
  `${nadPragom.assist_player_id}`,
)

// --- 4. RLS pri glasovanju --------------------------------------------------
const { error: eTujGlas } = await users[1].c
  .from('assist_votes')
  .insert({ goal_id: gol.id, voter_id: users[0].id, player_id: drugi })
ok('RLS: ne morem glasovati v tujem imenu', Boolean(eTujGlas), eTujGlas?.code)

const { count: mojihGlasov } = await users[1].c
  .from('assist_votes')
  .select('id', { count: 'exact', head: true })
  .eq('voter_id', users[1].id)
ok('vsak uporabnik ima svoj glas', mojihGlasov === 1)

// --- 5. asistenca prinese točke ---------------------------------------------
const { data: nastopPodajalca } = await anon
  .from('appearance_points')
  .select('assists, points, position')
  .eq('match_id', gol.match_id)
  .eq('player_id', podajalec)
  .single()
ok(
  'potrjena asistenca se pripiše nastopu',
  nastopPodajalca.assists === 1,
  `assists=${nastopPodajalca.assists}`,
)

// --- 6. glasovanje o poziciji ------------------------------------------------
// Brez pozicije ni več nikogar — vsak igralec ima vsaj ugibanje iz statistike,
// sicer ga ne bi bilo mogoče postaviti na igrišče. Glasovanje mora zato znati
// popraviti prav ugibanje.
const { data: brezPozicije } = await u.c
  .from('players')
  .select('id, full_name, position, position_source')
  .eq('position_source', 'ugibanje')
  .eq('competition_id', 1)
  .eq('active', true)
  .order('id')
  .limit(1)
  .single()
ok('najden igralec z ugibano pozicijo', Boolean(brezPozicije))
if (!brezPozicije) throw new Error('Potreben je aktiven igralec z ugibano pozicijo.')
pospravljanje.push(['povrnitev ugibane pozicije', () => admin.from('players').update({
  position: brezPozicije.position, position_source: brezPozicije.position_source,
}).eq('id', brezPozicije.id)])

// Glasujemo za pozicijo, ki je različna od ugibanja, da je popravek razviden.
const novaPozicija = brezPozicije?.position === 'MID' ? 'DEF' : 'MID'

// Prag pozicije ni fiksen: močan statistični prior ga zniža (adaptivni_prag).
// Test mora zato vprašati bazo, koliko glasov je v TEM primeru dovolj.
const { data: pragPozicije } = await anon.rpc('adaptivni_prag', {
  p_player_id: brezPozicije.id,
  p_position: novaPozicija,
})
const PRAG_TEGA = Math.min(PRAG_POZICIJE, Number(pragPozicije ?? PRAG_POZICIJE))

for (let n = 0; n < PRAG_TEGA - 1; n++)
  await users[n].c
    .from('position_votes')
    .insert({
      player_id: brezPozicije.id,
      voter_id: users[n].id,
      position: novaPozicija,
    })
const { data: pozPod } = await anon
  .from('players')
  .select('position, position_source')
  .eq('id', brezPozicije.id)
  .single()
ok(
  `pri ${PRAG_TEGA - 1} glasovih pozicija še ni potrjena`,
  pozPod.position_source === 'ugibanje',
  pozPod.position_source,
)

await users[PRAG_TEGA - 1].c.from('position_votes').insert({
  player_id: brezPozicije.id,
  voter_id: users[PRAG_TEGA - 1].id,
  position: novaPozicija,
})

// Glas sam pozicije ne premakne več — zbrane se uveljavijo enkrat na teden,
// da se liga med tednom ne spreminja pod prsti. Do takrat igralec čaka.
const { data: cakajoci } = await anon
  .from('pozicije_v_cakanju')
  .select('player_id, izglasovana')
  .eq('player_id', brezPozicije.id)
  .maybeSingle()
ok(
  'ob dosezenem pragu pozicija caka na tedensko uveljavitev',
  cakajoci?.izglasovana === novaPozicija,
  `${cakajoci?.izglasovana ?? 'ni v cakanju'}`,
)

const { data: pred } = await anon
  .from('players')
  .select('position_source')
  .eq('id', brezPozicije.id)
  .single()
ok(
  'do uveljavitve pozicija ostane nespremenjena',
  pred.position_source === 'ugibanje',
  pred.position_source,
)

await zahtevaj('uveljavitev izbrane pozicije', admin.rpc('potrdi_pozicijo', {
  p_player_id: brezPozicije.id,
}))
const { data: pozNad } = await anon
  .from('players')
  .select('position, position_source')
  .eq('id', brezPozicije.id)
  .single()
ok(
  `po tedenski uveljavitvi se ugibanje popravi`,
  pozNad.position === novaPozicija && pozNad.position_source === 'glasovanje',
  `${pozNad.position}/${pozNad.position_source}`,
)

// Pozicija odloča, koliko je vreden gol in ohranjena mreža, zato se morajo
// točke osvežiti takoj — sicer lestvica do naslednjega uvoza kaže stanje,
// kakršno je bilo, ko je pozicijo poznal samo vratar.
//
// Osvežijo se le SVEŽI krogi. `preracunaj_igralca` ima okno (privzeto 14 dni,
// migracija 20260902110000): kar je starejše, je zgodovina in se ne premika za
// nazaj. Primerjamo zato samo kroge znotraj okna — sicer je izid odvisen od
// tega, kako star je naključno izbrani igralec, in test je muhast.
const OKNO_DNI = 14
const mejaOkna = new Date(Date.now() - OKNO_DNI * 86400000)
  .toISOString()
  .slice(0, 10)
const { data: sveziKrogi } = await anon
  .from('rounds')
  .select('id, played_on')
const vOknu = new Set(
  (sveziKrogi ?? [])
    .filter((r) => r.played_on == null || r.played_on >= mejaOkna)
    .map((r) => r.id),
)

const { data: izNastopov } = await anon
  .from('appearance_points')
  .select('round_id, points')
  .eq('player_id', brezPozicije.id)
const { data: izLestvice } = await anon
  .from('player_scores')
  .select('round_id, points')
  .eq('player_id', brezPozicije.id)
const vsota = (v) =>
  (v ?? [])
    .filter((x) => vOknu.has(x.round_id))
    .reduce((s, x) => s + Number(x.points ?? 0), 0)
ok(
  'točke sledijo potrjeni poziciji (sveži krogi)',
  Math.abs(vsota(izNastopov) - vsota(izLestvice)) < 0.01,
  `player_scores ${vsota(izLestvice)} proti nastopom ${vsota(izNastopov)}`,
)

// --- 7. vratar iz zapisnika ni odvisen od glasovanja ------------------------
const { data: vratar } = await anon
  .from('players')
  .select('id, position, position_source')
  .eq('position_source', 'zapisnik')
  .order('id')
  .limit(1)
  .single()
ok(
  'vratarja določi zapisnik, ne glasovanje',
  vratar?.position === 'GK',
  `${vratar?.position}`,
)

// --- 8. točkovanje po pravilih -----------------------------------------------
// 90 minut + brez prejetega gola za vratarja = 2 + 4 = 6
const { data: vratarCS } = await anon
  .from('appearance_points')
  .select('points, minutes_played, clean_sheet, goals, assists, goals_conceded')
  .eq('position', 'GK')
  .eq('clean_sheet', true)
  .eq('minutes_played', 90)
  .eq('goals', 0)
  .eq('assists', 0)
  .order('player_id')
  .order('round_id')
  .limit(1)
  .single()
ok(
  'vratar 90 min brez prejetega gola = 6 točk',
  Number(vratarCS?.points) === 6,
  `${vratarCS?.points}`,
)

// prejeti goli: -1 za vsaka 2
//
// Nastop mora biti CIST: brez avtogola, kartona in zgresene enajstmetrovke.
// Vsak od teh nosi svoje tocke in bi racunico spodaj podrl — natanko to se je
// zgodilo, ko je izbrani vratar dosegel avtogol (-2) in je test padel, ceprav
// je bilo tockovanje pravilno. Te stolpce ima `appearances`, ne
// `appearance_points`, zato izberemo tam in sele nato pogledamo tocke.
const { data: cistiNastopi } = await anon
  .from('appearances')
  .select('id, goals_conceded, own_goals, yellow_cards, red_cards, penalties_missed, penalties_saved')
  .eq('minutes_played', 90)
  .eq('own_goals', 0)
  .eq('yellow_cards', 0)
  .eq('red_cards', 0)
  .eq('penalties_missed', 0)
  .eq('penalties_saved', 0)
  .gte('goals_conceded', 2)
  .order('id')
  .limit(50)

let vratarPrejeti = null
for (const a of cistiNastopi ?? []) {
  const { data: tocke } = await anon
    .from('appearance_points')
    .select('points, goals_conceded, goals, assists, position, clean_sheet')
    .eq('appearance_id', a.id)
    .maybeSingle()
  if (
    tocke &&
    tocke.position === 'GK' &&
    tocke.clean_sheet === false &&
    Number(tocke.goals) === 0 &&
    Number(tocke.assists) === 0
  ) {
    vratarPrejeti = tocke
    break
  }
}

if (vratarPrejeti) {
  const pricakovano = 2 - Math.floor(vratarPrejeti.goals_conceded / 2)
  ok(
    'vratar: -1 za vsaka 2 prejeta gola',
    Number(vratarPrejeti.points) === pricakovano,
    `prejetih ${vratarPrejeti.goals_conceded} -> ${vratarPrejeti.points}, pričakovano ${pricakovano}`,
  )
} else {
  console.log('OPOMBA  ni cistega vratarskega nastopa s 2+ prejetimi goli — preskoceno')
}

// --- 9. fantasy ekipa in proračun --------------------------------------------
const { data: ekipa, error: eEkipa } = await u.c
  .from('fantasy_teams')
  .insert({ owner_id: u.id, competition_id: 1, name: `Ekipa ${stamp}` })
  .select('id, budget')
  .single()
ok('ustvari fantasy ekipo', !eEkipa, eEkipa?.message)
if (!ekipa) throw new Error('Fantasy ekipa ni bila ustvarjena.')
testneEkipe.push(ekipa.id)
ok('ekipa ima privzet proračun', Number(ekipa?.budget) === 100)

const { data: poceni } = await u.c
  .from('player_overview')
  .select('id, value, team_id')
  .eq('competition_id', 1)
  .eq('active', true)
  .order('value')
  .order('id')
  .limit(400)

const izbrani = []
const naKlub = {}
for (const p of poceni) {
  if (izbrani.length >= 15) break
  if ((naKlub[p.team_id] ?? 0) >= 3) continue
  naKlub[p.team_id] = (naKlub[p.team_id] ?? 0) + 1
  izbrani.push({
    player_id: p.id,
    is_starter: izbrani.length < 11,
  })
}
const { error: eNabor } = await u.c.rpc('shrani_ekipo', {
  p_team_id: ekipa.id, p_roster: izbrani,
})
ok('shrani nabor 15 igralcev prek RPC', !eNabor && izbrani.length === 15, eNabor?.message)

const { data: proracun } = await u.c
  .from('fantasy_team_budget')
  .select('spent, remaining, budget')
  .eq('fantasy_team_id', ekipa.id)
  .single()
ok(
  'proračun se sešteje',
  Math.abs(Number(proracun.budget) - Number(proracun.spent) - Number(proracun.remaining)) < 0.01,
  `${proracun.spent} porabljeno, ${proracun.remaining} ostane`,
)

// --- 10. RLS na ekipi ---------------------------------------------------------
await users[1].c
  .from('fantasy_teams')
  .update({ name: 'ugrabljeno' })
  .eq('id', ekipa.id)
const { data: poNapadu } = await anon
  .from('fantasy_teams')
  .select('name')
  .eq('id', ekipa.id)
  .single()
ok(
  'RLS: tujec ne more preimenovati ekipe',
  poNapadu.name === `Ekipa ${stamp}`,
  poNapadu.name,
)

// --- 11. lestvica ---------------------------------------------------------------
// Krog mora imeti rok, ki je RES mimo. Samo `.order('number')` je premalo:
// stevilko 1 ima vsaka sezona, zato je test prej zadel arhivski krog, ki roka
// sploh nima (`deadline_at is null`) — in predpostavka spodaj ni drzala.
const { data: krog } = await anon
  .from('rounds')
  .select('id, lineups_locked_at')
  .eq('competition_id', 1)
  .not('deadline_at', 'is', null)
  .lt('deadline_at', new Date().toISOString())
  .order('deadline_at', { ascending: false })
  .order('id')
  .limit(1)
  .single()
ok('najden krog s pretecenim rokom', Boolean(krog?.id))
if (!krog) throw new Error('Potreben je članski krog s pretečenim rokom.')
await zahtevaj('servisni preračun kroga', admin.rpc('recompute_round_scores', {
  p_round_id: krog.id,
}))

// Nova ekipa nima pravice do zgodovinskih točk. Zaklepa in posnetkov drugih
// ekip ne spreminjamo; dejanski zajem postave preizkusi izolirani test 11c.
const ucinkovita = await zahtevaj('zgodovinska postava', u.c.rpc('ucinkovita_postava', {
  p_team: ekipa.id,
  p_round: krog.id,
}))
ok('brez posnetka pretekli krog ne prinese postave', ucinkovita?.length === 0)
const pricakovanaVsota = 0

const { data: lestvica } = await anon
  .from('fantasy_team_standings')
  .select('team_name, owner_name, total_points')
  .eq('fantasy_team_id', ekipa.id)
  .order('total_points', { ascending: false })
const moja = lestvica.find((l) => l.team_name === `Ekipa ${stamp}`)
ok(
  'nova ekipa nima točk iz preteklih krogov',
  Math.abs(Number(moja?.total_points) - pricakovanaVsota) < 0.01,
  `${moja?.total_points} (pričakovano ${pricakovanaVsota.toFixed(2)})`,
)
ok('lestvica pokaže lastnika', moja?.owner_name === 'Tester 1', moja?.owner_name)

// --- 11a. glasovanje o poziciji ne razbije tujega kadra ---------------------
// Kvota kadra se meri po poziciji OB NAKUPU. Ko skupnost igralca prestavi z
// enega mesta na drugo, kader ostane veljaven — sicer bi lastnik brez svoje
// krivde v tistem krogu dobil nič točk.
{
  const kvota = { GK: 2, DEF: 5, MID: 5, FWD: 3 }
  const { data: naVoljo } = await anon
    .from('player_overview')
    .select('id, position, position_source, team_id, value')
    .eq('competition_id', 1)
    .eq('active', true)
    .not('position', 'is', null)
    .order('value')
    .order('id')
    .limit(400)

  const kader = []
  const naKlub = {}
  const naPoz = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  for (const p of naVoljo ?? []) {
    if (naPoz[p.position] >= kvota[p.position]) continue
    if ((naKlub[p.team_id] ?? 0) >= 3) continue
    naKlub[p.team_id] = (naKlub[p.team_id] ?? 0) + 1
    naPoz[p.position]++
    kader.push(p)
  }
  ok(
    'sestavljen veljaven kader 2-5-5-3',
    kader.length === 15,
    `${naPoz.GK}-${naPoz.DEF}-${naPoz.MID}-${naPoz.FWD}`,
  )

  if (kader.length === 15) {
    // Prvih 11 mora biti veljavna postava: vratar, 4 branilci, 4 vezisti, 2 napadalca.
    const vrsta = (poz, n) => kader.filter((p) => p.position === poz).slice(0, n)
    const prvih = [
      ...vrsta('GK', 1),
      ...vrsta('DEF', 4),
      ...vrsta('MID', 4),
      ...vrsta('FWD', 2),
    ].map((p) => p.id)

    let klop = 0
    const { error: eShrani } = await u.c.rpc('shrani_ekipo', {
      p_team_id: ekipa.id,
      p_roster: kader.map((p, i) => ({
        player_id: p.id,
        is_starter: prvih.includes(p.id),
        is_captain: p.id === prvih[5],
        is_vice: p.id === prvih[6],
        bench_order: prvih.includes(p.id) ? null : ++klop,
      })),
    })
    ok('shrani_ekipo sprejme veljaven kader', !eShrani, eShrani?.message)

    const { data: predGlasom } = await u.c.rpc('roster_je_veljaven', {
      p_team_id: ekipa.id,
    })
    ok('kader je veljaven', predGlasom === true)

    // Skupnost prestavi enega branilca med napadalce.
    const branilec = kader.find((p) => p.position === 'DEF')
    pospravljanje.push(['povrnitev branilca', () => admin.from('players').update({
      position: branilec.position, position_source: branilec.position_source,
    }).eq('id', branilec.id)])
    await admin
      .from('players')
      .update({ position: 'FWD', position_source: 'glasovanje' })
      .eq('id', branilec.id)

    const { data: poGlasu } = await u.c.rpc('roster_je_veljaven', {
      p_team_id: ekipa.id,
    })
    ok(
      'sprememba pozicije NE razbije kadra',
      poGlasu === true,
      poGlasu ? '' : 'kader je postal neveljaven',
    )

    // Kader bereva s servisnim klientom: odkar tekoci kader ni vec javen,
    // ga anonimni ne vidi — tu naju zanima stanje v bazi, ne pravica.
    const { data: mesto } = await admin
      .from('fantasy_roster')
      .select('buy_position')
      .eq('fantasy_team_id', ekipa.id)
      .eq('player_id', branilec.id)
      .maybeSingle()
    ok(
      'mesto v kadru ostane, kot je bilo ob nakupu',
      mesto?.buy_position === 'DEF',
      `${mesto?.buy_position}`,
    )

    await admin
      .from('players')
      .update({ position: branilec.position, position_source: branilec.position_source })
      .eq('id', branilec.id)
  }
}

// --- 11c. prestopi med resnično zaklenjenima testnima krogoma ---------------
// Ločena neaktivna liga prepreči zajem postav drugih uporabnikov. Roki so
// najprej v prihodnosti; po shranjevanju jih servis premakne na čas shranitve.
{
  const izvor = await zahtevaj('država in vir testne lige', anon.from('competitions')
    .select('country_id, source').eq('id', 1).single())
  const liga = await zahtevaj('ustvarjanje testne lige', admin.from('competitions').insert({
    slug: `e2e-prestopi-${stamp}`, name: `E2E prestopi ${stamp}`,
    short_name: 'E2E', active: false, country_id: izvor.country_id, source: izvor.source,
  }).select('id').single())
  pospravljanje.push(['brisanje testne lige', () => admin.from('competitions').delete().eq('id', liga.id)])
  const klubi = await zahtevaj('klubi za testni kader', anon.from('teams')
    .select('id').order('id').limit(5))
  if (klubi.length !== 5) throw new Error('Za testni kader je potrebnih pet klubov.')

  const pozicije = ['GK', 'GK', ...Array(5).fill('DEF'), ...Array(5).fill('MID'), ...Array(3).fill('FWD')]
  const podatki = pozicije.map((position, i) => ({
    competition_id: liga.id, team_id: klubi[i % 5].id,
    first_name: 'E2E', last_name: `${stamp}-${i}`,
    full_name: `E2E ${stamp}-${i}`, position, position_source: 'admin',
    active: true, value: 4.5,
  }))
  // Dva nova napadalca zamenjata igralca istih klubov, zato kvote ostanejo.
  for (const i of [13, 14]) podatki.push({
    ...podatki[i], last_name: `${stamp}-nov-${i}`, full_name: `E2E ${stamp}-nov-${i}`,
  })
  const igralci = await zahtevaj('ustvarjanje testnih igralcev', admin.from('players')
    .insert(podatki).select('id, full_name, position'))
  const poImenu = new Map(igralci.map((p) => [p.full_name, p]))
  const osnovni = podatki.slice(0, 15).map((p) => poImenu.get(p.full_name))
  const nova = podatki.slice(15).map((p) => poImenu.get(p.full_name))
  const testna = await zahtevaj('testna ekipa za prestope', u.c.from('fantasy_teams')
    .insert({ owner_id: u.id, competition_id: liga.id, name: `Prestopi ${stamp}` })
    .select('id').single())
  testneEkipe.push(testna.id)
  const krogi = await zahtevaj('prihodnja testna kroga', admin.from('rounds').insert(
    [2, 3].map((number) => ({
      competition_id: liga.id, season: `e2e-${stamp}`, number,
      deadline_at: new Date(Date.now() + 86400000).toISOString(),
    })),
  ).select('id, number'))
  krogi.sort((a, b) => a.number - b.number)

  const zacetnikov = { GK: 1, DEF: 4, MID: 4, FWD: 2 }
  let klop = 0
  const nabor = osnovni.map((p, i) => {
    const prvi = zacetnikov[p.position]-- > 0
    return {
      player_id: p.id, is_starter: prvi, is_captain: i === 7, is_vice: i === 8,
      bench_order: prvi ? null : ++klop,
    }
  })
  const shrani = (kader) => zahtevaj('shranitev testnega kadra', u.c.rpc('shrani_ekipo', {
    p_team_id: testna.id, p_roster: kader,
  }))
  const zakleni = async (krogId) => {
    const stanje = await zahtevaj('čas shranitve testne ekipe', admin.from('fantasy_teams')
      .select('roster_updated_at').eq('id', testna.id).single())
    await zahtevaj('iztek testnega roka', admin.from('rounds')
      .update({ deadline_at: stanje.roster_updated_at }).eq('id', krogId))
    return zahtevaj('zaklep testnega kroga', admin.rpc('zakleni_krog', { p_round_id: krogId }))
  }

  await shrani(nabor)
  const prezgodaj = await zahtevaj('poskus pred rokom', admin.rpc('zakleni_krog', {
    p_round_id: krogi[0].id,
  }))
  ok('pred rokom se testni krog ne zaklene', prezgodaj === 0)
  ok('prvi zaklep zajame vseh 15 igralcev', await zakleni(krogi[0].id) === 15)
  const prviPrestop = await zahtevaj('prestopi prvega posnetka', anon.from('fantasy_transfers')
    .select('transfers').eq('fantasy_team_id', testna.id).eq('round_id', krogi[0].id).maybeSingle())
  ok('prvi posnetek sezone nima prestopne kazni', prviPrestop === null)

  const noviNabor = nabor.map((p, i) => i >= 13 ? { ...p, player_id: nova[i - 13].id } : p)
  await shrani(noviNabor)
  ok('drugi zaklep zajame vseh 15 igralcev', await zakleni(krogi[1].id) === 15)
  const prestop = await zahtevaj('izračun prestopov', anon.from('fantasy_transfers')
    .select('transfers, free_transfers, penalty')
    .eq('fantasy_team_id', testna.id).eq('round_id', krogi[1].id).maybeSingle())
  ok('prestopi se štejejo glede na prejšnji zaklenjeni krog', prestop?.transfers === 2,
    `${prestop?.transfers ?? 'ni zapisa'} prestopov`)
  const prosti = nastavitev('prosti_prestopi', 3)
  const kazen = Math.max(0, 2 - prosti) * nastavitev('kazen_prestopa', 4)
  ok('prestopna kazen sledi nastavljenim brezplačnim prestopom',
    prestop?.free_transfers === prosti && Number(prestop?.penalty) === kazen,
    `kazen ${prestop?.penalty}, pričakovano ${kazen}`)
  const ponovitev = await zahtevaj('ponovljeni zaklep', admin.rpc('zakleni_krog', {
    p_round_id: krogi[1].id,
  }))
  ok('ponovljeni zaklep ne zajame nove postave', ponovitev === 0)
}

// --- 11b. borza se premakne samo za odigran krog ----------------------------
// Cena se sme premakniti šele, ko je krog res odigran, in samo takrat. Uvožen
// arhiv prejšnje sezone ima točke po krogih; če bi ga borza obračunala, bi
// cene čez noč poskočile za formo, ki je v izhodiščni ceni že upoštevana.
{
  const preveriBorzo = async (opis, krog) => {
    // Brez tega je manjkajoc krog videti kot uspeh: trditev tiho izgine in
    // test ostane zelen, ceprav ni nicesar preveril. Prav tako se je borzna
    // napaka skrivala — ob ponovnem zagonu je bila cena ze premaknjena.
    if (!krog) {
      ok(`borza: obstaja krog za preizkus (${opis})`, false, 'takega kroga ni')
      return
    }
    const { data, error } = await admin.rpc('preracunaj_cene', {
      p_round_id: krog.id,
    })
    ok(
      `borza ne premakne cen: ${opis}`,
      !error && (data ?? []).length === 0,
      error?.message ?? `${(data ?? []).length} premikov`,
    )
  }

  // Krog prejšnje sezone — arhiv, ki je le izhodišče za ceno.
  const { data: sezone } = await anon
    .from('rounds')
    .select('season')
    .eq('competition_id', 1)
    .order('season', { ascending: false })
  const zadnja = sezone?.[0]?.season
  const { data: arhivski } = await anon
    .from('rounds')
    .select('id, season, number')
    .eq('competition_id', 1)
    .neq('season', zadnja)
    .order('season')
    .order('number')
    .order('id')
    .limit(1)
    .maybeSingle()
  await preveriBorzo('krog prejšnje sezone', arhivski)

  // Krog, ki še ni bil odigran — torej NOBENA njegova tekma ni uvožena.
  // "Vsaj ena tekma brez zapisnika" ni isto: tak krog je delno odigran in
  // borza ga po migraciji 20260916140000 obračuna za klube, ki zapisnik že
  // imajo. Tu nas zanima krog, v katerem se še ni igralo nič.
  const { data: vsiKrogi } = await anon
    .from('rounds')
    .select('id, number, matches(imported_at)')
    .eq('competition_id', 1)
    .eq('season', zadnja)
    .order('number')
  const neodigran = (vsiKrogi ?? []).find(
    (r) => r.matches.length > 0 && r.matches.every((m) => !m.imported_at),
  )
  await preveriBorzo('neodigran krog', neodigran)

  // Delno uvozen krog ima svoj preizkus v scripts/preizkus-borze.sql, ki si
  // tako stanje SESTAVI. Tu bi ga bilo treba poiskati med uvozenimi podatki —
  // preizkus, ki stanje samo isce, pa je zelen tudi takrat, ko ga slucajno ni.
}

// --- 12. dve ligi ostaneta ločeni ------------------------------------------
// Isti uporabnik ima lahko ekipo v vsaki ligi, mladinca pa v člansko ekipo ne
// more postaviti. Brez tega bi se ligi na tihem pomešali že ob prvem prestopu.
let mladinec = null
let ekipaM = null
{
  const { data: mladinci } = await anon
    .from('competitions')
    .select('id')
    .eq('slug', 'mladinci')
    .maybeSingle()

  const { data: ekipaMlad, error: eEkipaM } = await u.c
    .from('fantasy_teams')
    .insert({
      owner_id: u.id,
      competition_id: mladinci.id,
      name: `Mladinci ${stamp}`,
    })
    .select('id, competition_id')
    .single()
  ekipaM = ekipaMlad
  if (ekipaM) testneEkipe.push(ekipaM.id)
  ok('ista oseba ima ekipo v obeh ligah', !eEkipaM, eEkipaM?.message)

  const { data: nekKlub } = await anon
    .from('teams')
    .select('id')
    .order('id')
    .limit(1)
    .single()
  const { data: novMladinec } = await admin
    .from('players')
    .insert({
      competition_id: mladinci.id,
      team_id: nekKlub.id,
      full_name: `Testni Mladinec ${stamp}`,
      last_name: 'Testni',
      first_name: `Mladinec ${stamp}`,
      position: 'MID',
      position_source: 'admin',
    })
    .select('id')
    .single()
  mladinec = novMladinec
  if (!mladinec) throw new Error('Testni mladinec ni bil ustvarjen.')
  pospravljanje.push(['brisanje testnega mladinca', () => admin.from('players').delete().eq('id', mladinec.id)])

  const { error: eTujec } = await u.c.rpc('shrani_ekipo', {
    p_team_id: ekipa.id,
    p_roster: [{ player_id: mladinec.id, is_starter: true }],
  })
  ok('mladinec ne more v člansko ekipo', Boolean(eTujec), eTujec?.message)

  const { count: seVednoNabor } = await admin
    .from('fantasy_roster')
    .select('player_id', { count: 'exact', head: true })
    .eq('fantasy_team_id', ekipa.id)
  ok('zavrnjeno shranjevanje pusti kader pri miru', seVednoNabor === 15)

  // Tekoci kader tuje ekipe ni javen. Do migracije 20260916090000 ga je z
  // anonimnim kljucem lahko prebral kdorkoli, ceprav ga vmesnik ni kazal.
  const { count: tujKader } = await anon
    .from('fantasy_roster')
    .select('player_id', { count: 'exact', head: true })
    .eq('fantasy_team_id', ekipa.id)
  ok('tekoci kader tuje ekipe ni javen', !tujKader, `${tujKader} vrstic`)
}

} catch (error) {
  ok('izvedba E2E', false, error.message)
} finally {
  // Najprej odstranimo samo glasove novih testnih uporabnikov, nato povrnemo
  // izbrane izvorne podatke. Tudi izjema sredi testa mora pustiti bazo čisto.
  const cisti = async (opis, poizvedba) => {
    try { await zahtevaj(opis, poizvedba) }
    catch (error) { ok(opis, false, error.message) }
  }
  for (const usr of users) {
    await cisti('brisanje testnih glasov asistenc', admin.from('assist_votes').delete().eq('voter_id', usr.id))
    await cisti('brisanje testnih glasov pozicij', admin.from('position_votes').delete().eq('voter_id', usr.id))
  }
  for (const id of testneEkipe)
    await cisti('brisanje testne ekipe', admin.from('fantasy_teams').delete().eq('id', id))
  for (const [opis, opravilo] of pospravljanje.reverse()) {
    try { await cisti(opis, opravilo()) }
    catch (error) { ok(opis, false, error.message) }
  }
  for (const usr of users) {
    await cisti('brisanje testnega audita asistenc', admin.from('assist_votes_deleted').delete().eq('voter_id', usr.id))
    await cisti('brisanje testnega audita pozicij', admin.from('position_votes_deleted').delete().eq('voter_id', usr.id))
    await cisti('brisanje testnega uporabnika', admin.auth.admin.deleteUser(usr.id))
  }
  if (testneEkipe.length) {
    const { data, error } = await anon.from('fantasy_teams').select('id').in('id', testneEkipe)
    ok('testne ekipe so pospravljene', !error && data?.length === 0, error?.message)
  }
}

console.log(`\n${fails === 0 ? 'VSE OK' : fails + ' NAPAK'}`)
process.exit(fails === 0 ? 0 : 1)
