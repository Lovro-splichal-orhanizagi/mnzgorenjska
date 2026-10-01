// Hišne ekipe: ekipe, ki jih odkrito vodi SLFF, da lige z eno samo ekipo
// niso prazne. Lastnik vseh je en sistemski profil "SLFF" (hisa@slff.eu,
// brez prijave, brez pošte). V ligi štejejo kot vsaka druga ekipa; izbranost
// igralcev, državna lestvica, e-pošta in mini lige jih ne vidijo (migracija
// 20260930130000).
//
// Kader vsake ekipe sestavi ta skripta (15 igralcev, 100 M, največ 3 iz
// kluba, kvote in postava po src/lib/pravila.ts), shrani pa ga baza sama:
// RPC `ustvari_hisno_ekipo` pokliče `shrani_ekipo` kot sistemski lastnik in
// zavrne vse, kar `roster_je_veljaven` ne sprejme.
//
// Uporaba (servisni ključ; brez --pisi je samo načrt):
//   node scripts/hisne-ekipe.mjs                       # vse aktivne lige SK
//   node scripts/hisne-ekipe.mjs --liga sk-za-1trieda  # ena liga (tudi neaktivna)
//   node scripts/hisne-ekipe.mjs --na-ligo 10 --razpon 2 --pisi
//   node scripts/hisne-ekipe.mjs --odstrani [--liga …] --pisi
//
// Ciljno število ekipe v ligi je `na-ligo ± razpon`, izbrano iz šifre lige —
// ponoven zagon da isto število in le dopolni, kar manjka. Točke hišne ekipe
// zbirajo od prvega kroga, ki se zaklene po nastanku; nazaj ne.
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { MAX_IZ_KLUBA, POZICIJE, PRORACUN, STEVILO_PRVIH, VELIKOST_EKIPE } from '../src/lib/pravila.ts'
import { vseVrstice } from './strani.mjs'

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
const BASE = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.error('Manjka SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const pisi = process.argv.includes('--pisi')
const odstrani = process.argv.includes('--odstrani')
const arg = (ime, privzeto = null) => {
  const i = process.argv.indexOf('--' + ime)
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : privzeto
}
const DRZAVA = String(arg('drzava', 'SK')).toUpperCase()
const LIGA = arg('liga')
const NA_LIGO = Number(arg('na-ligo', '10'))
const RAZPON = Number(arg('razpon', '2'))
if (!Number.isInteger(NA_LIGO) || !Number.isInteger(RAZPON) || NA_LIGO - RAZPON < 0 || NA_LIGO + RAZPON > 40) {
  console.error('--na-ligo in --razpon morata biti celi števili, cilj med 0 in 40.')
  process.exit(1)
}

const SISTEM_EMAIL = 'hisa@slff.eu'
// Brez imena: hišna ekipa v lestvici nima vrstice lastnika (ne "SLFF" ne
// izmišljene osebe). `display_name` je obvezen, zato prazen niz.
const SISTEM_IME = ''

const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

// ---------------------------------------------------------------------------
// Imena: igrive, izmišljene slovaške ekipe krajevnega nogometa. Nobeno ni ime
// resničnega kluba; v ligi se ne ponovijo.
// ---------------------------------------------------------------------------
const IMENA = [
  'Žilinskí vlci', 'FC Kolo', 'Tatranskí orli', 'Považskí sokoli', 'Kysucké medvede',
  'Oravskí rysi', 'Liptovskí jelene', 'Turčianski býci', 'Hronskí bobri', 'Fatranskí kamzíci',
  'Váhoví pstruhovia', 'FC Halušky', 'Bryndzové komando', 'Oštiepok United', 'Dedinská garda',
  'Kopačky z pivnice', 'FC Zlatá lopta', 'Nedeľní hrdinovia', 'Sobotní kanonieri', 'FC Posledná minúta',
  'FK Tretí polčas', 'Striedačka Stars', 'Lavička Boys', 'FC Kopaná', 'Deviataci z dediny',
  'FK Stará garda', 'Rozhodca nevidel', 'Offside tím', 'FC Brána dokorán', 'FC Klobása',
  'Kapustnica FC', 'Lokše United', 'Pirohy Športing', 'FC Fujavica', 'Beskydskí lišiaci',
  'Malofatranskí jastrabi', 'Javorinskí kamzíci', 'Chočskí orli', 'Kriváňski sokoli', 'Veľkofatranskí rysi',
  'Dolnozemskí kohúti', 'Záhorácki kohúti', 'Myjavskí jazvci', 'Bystrické včely', 'Kremnickí zlatokopi',
  'Štiavnickí permoníci', 'Detvianski fujaristi', 'Podtatranskí svišti', 'Spišskí havrani', 'Šarišskí capovia',
  'Zemplínski jazvci', 'Gemerské vydry', 'Novohradskí sysli', 'Hontianski bociani', 'Tekovské lastovičky',
  'Ponitrianski škorci', 'Kopaničiarski ježkovia', 'FC Rohový kop', 'FC Za bránou', 'AFK Pokutový kop',
  'FC Hlavička', 'Nožnička tím', 'FC Guľovačka', 'Kanonieri spod kostola', 'FC Päťka',
  'Strelci od potoka', 'FC Dlhá lopta', 'Krčmoví taktici', 'Taktici z lavičky', 'FC Nula-nula',
  'Remízoví králi', 'FC Blato', 'Hrdinovia z ihriska', 'FC Pažiť', 'Zelený trávnik FC',
  'FC Ľadové nohy', 'Rýchle kopačky', 'FC Priateľák', 'Futbaloví nadšenci', 'FC Pohodári',
  'Dunajskí kormoráni', 'Ipeľskí sumci', 'Nitrianske čajky', 'FC Tri body', 'Kopec United',
]

// Slovenske lige: enako igrive, izmišljene, brez imen resničnih klubov.
const IMENA_SI = [
  'Gorenjski volkovi', 'FK Kranjska klobasa', 'Štajerski petelini', 'Prekmurske štorklje', 'Primorski galebi',
  'Dolenjski cvičkarji', 'Koroški medvedi', 'Notranjski risi', 'Posavski sulci', 'Savinjski hmeljarji',
  'Pohorski divjaki', 'Kraški burjači', 'Zasavski knapi', 'Belokranjske breze', 'Haloški vinogradniki',
  'FC Nedeljski junaki', 'Sobotni strelci', 'FC Zadnja minuta', 'NK Tretji polčas', 'Klop FC',
  'FC Rezervisti', 'Ofsajd ekipa', 'Sodnik ni videl', 'FC Prečka', 'NK Vratnica',
  'Kopačke iz kleti', 'FC Potica', 'Štruklji United', 'NK Kremšnita', 'Žganci FC',
  'Prleški gibanjci', 'FC Prekmurska gibanica', 'Idrijski žlikrofi', 'NK Kislo zelje', 'FC Pršut',
  'Vaška garda', 'Stara garda', 'FC Gasilci', 'NK Kmečki turizem', 'Veterani s klopi',
  'FC Zlata žoga', 'Dvanajsti igralec', 'FC Enajstmetrovka', 'NK Kotiček', 'FC Podaja',
  'Asistenti FC', 'FC Kapetan', 'NK Rdeči karton', 'Rumeni karton United', 'FC Podaljšek',
  'Travnik Boys', 'FC Umetna trava', 'NK Blatno igrišče', 'Mreža FC', 'FC Prvi dotik',
  'NK Protinapad', 'FC Visoki pritisk', 'Libero FC', 'NK Desetka', 'FC Devetka',
  'Nedeljska liga', 'FC Pivo po tekmi', 'NK Kafe pa kremšnita', 'Čevapčiči FC', 'FC Burek',
  'Kranjski orli', 'Triglavski gamsi', 'Soški postrvi', 'Blejski labodi', 'Ljubljanski barjani',
  'Mariborski medvedki', 'Celjski vitezi', 'Ptujski kurenti', 'Novomeški cvički', 'Koprski mornarji',
  'Murski sulci', 'Dravski splavarji', 'Savski brodarji', 'Kamniški planinci', 'Ribniški suhorobarji',
]

// Postave v mejah POZICIJE (vratar 1, branilci 3–5, vezisti 2–5, napadalci 1–3).
const POSTAVE = [
  [4, 4, 2], [4, 3, 3], [3, 5, 2], [3, 4, 3], [5, 3, 2], [4, 5, 1], [5, 4, 1],
].filter(([d, m, f]) =>
  1 + d + m + f === STEVILO_PRVIH &&
  d >= POZICIJE.DEF.min && d <= POZICIJE.DEF.max &&
  m >= POZICIJE.MID.min && m <= POZICIJE.MID.max &&
  f >= POZICIJE.FWD.min && f <= POZICIJE.FWD.max)

// Slogi: kako ekipa tehta točke, točke na milijon in minute (zanesljivost).
const SLOGI = {
  zvezde: [0.7, 0.1, 0.2],
  vrednost: [0.2, 0.6, 0.2],
  zanesljivi: [0.3, 0.1, 0.6],
  mesano: [0.45, 0.3, 0.25],
}

// ---------------------------------------------------------------------------
// Ponovljiv naključni generator: isti vhod, isti načrt (suhi tek = zapis).
// ---------------------------------------------------------------------------
function hash(niz) {
  let h = 2166136261
  for (const c of niz) h = Math.imul(h ^ c.codePointAt(0), 16777619)
  return h >>> 0
}
function generator(seme) {
  let a = hash(seme)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function premesaj(seznam, rnd) {
  const s = [...seznam]
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[s[i], s[j]] = [s[j], s[i]]
  }
  return s
}

// Cilj je VSE ekipe v ligi (prave + hišne), ne le hišne: liga, v kateri že
// igra dovolj ljudi, ne dobi nobene, majhna se napolni. Z `--po-velikosti` se
// cilj ravna po številu klubov (večja liga, več ekip), sicer je `na-ligo`.
// Odmik ± razpon je iz šifre lige, da ponovni zagon le dopolni.
const PO_VELIKOSTI = process.argv.includes('--po-velikosti')
const ciljZaLigo = (slug, klubov) => {
  const osnova = PO_VELIKOSTI ? Math.max(NA_LIGO - 2, Math.round(klubov * 1.3)) : NA_LIGO
  return Math.min(40, osnova + (hash('cilj:' + slug) % (2 * RAZPON + 1)) - RAZPON)
}
const denar = (x) => Math.round(x * 10) / 10

// ---------------------------------------------------------------------------
// Sestava kadra
// ---------------------------------------------------------------------------

/**
 * Sestavi kader iz nabora igralcev lige. `izbranost` pove, koliko hišnih
 * ekip lige igralca že ima — tak igralec je manj verjeten, da si ekipe niso
 * podobne kot jajce jajcu.
 */
function sestaviKader(nabor, rnd, izbranost) {
  const [d, m, f] = POSTAVE[Math.floor(rnd() * POSTAVE.length)]
  const imeSloga = Object.keys(SLOGI)[Math.floor(rnd() * Object.keys(SLOGI).length)]
  const [wT, wV, wM] = SLOGI[imeSloga]
  const zacetni = { GK: 1, DEF: d, MID: m, FWD: f }

  const ocena = new Map()
  const ocenaKlopi = new Map()
  for (const p of nabor) {
    const o = (wT * p.nT + wV * p.nV + wM * p.nM + 0.02) *
      (0.75 + rnd() * 0.5) * Math.pow(0.8, izbranost.get(p.id) ?? 0)
    ocena.set(p.id, o)
    // Klop: poceni in vsaj malo igra — kot pri ljudeh.
    ocenaKlopi.set(p.id, (0.35 * o + 0.65 * p.poceni) * (0.8 + rnd() * 0.4))
  }

  const izbrani = []
  const klubi = new Map()
  let porabljeno = 0

  // Najcenejša možna dopolnitev preostalih mest (brez omejitve kluba) —
  // spodnja meja, da drag začetni izbor ne pusti klopi brez denarja.
  const rezerva = (manjka, brez) => {
    let vsota = 0
    for (const [poz, n] of Object.entries(manjka)) {
      if (n <= 0) continue
      const cene = nabor
        .filter((p) => p.position === poz && !brez.has(p.id))
        .map((p) => p.value)
        .sort((a, b) => a - b)
      if (cene.length < n) return Infinity
      for (let i = 0; i < n; i++) vsota += cene[i]
    }
    return vsota
  }
  const manjka = { GK: 2, DEF: 5, MID: 5, FWD: 3 }
  const manjkaZacetnih = { ...zacetni }

  const vzemi = (p, zacetni_) => {
    izbrani.push({ ...p, is_starter: zacetni_ })
    klubi.set(p.team_id, (klubi.get(p.team_id) ?? 0) + 1)
    porabljeno += p.value
    manjka[p.position]--
    if (zacetni_) manjkaZacetnih[p.position]--
  }
  const ze = () => new Set(izbrani.map((p) => p.id))
  const gre = (p, vzeti) => {
    if (vzeti.has(p.id) || (klubi.get(p.team_id) ?? 0) >= MAX_IZ_KLUBA) return false
    const po = { ...manjka, [p.position]: manjka[p.position] - 1 }
    vzeti.add(p.id)
    const r = rezerva(po, vzeti)
    vzeti.delete(p.id)
    return porabljeno + p.value + r <= PRORACUN + 1e-9
  }

  // Najprej prva enajsterica: vsakič najboljši še možni igralec katerekoli
  // pozicije, ki v postavi še manjka.
  while (Object.values(manjkaZacetnih).some((n) => n > 0)) {
    const vzeti = ze()
    const kandidat = nabor
      .filter((p) => manjkaZacetnih[p.position] > 0)
      .sort((a, b) => ocena.get(b.id) - ocena.get(a.id))
      .find((p) => gre(p, vzeti))
    if (!kandidat) return null
    vzemi(kandidat, true)
  }
  // Nato klop.
  while (Object.values(manjka).some((n) => n > 0)) {
    const vzeti = ze()
    const kandidat = nabor
      .filter((p) => manjka[p.position] > 0)
      .sort((a, b) => ocenaKlopi.get(b.id) - ocenaKlopi.get(a.id))
      .find((p) => gre(p, vzeti))
    if (!kandidat) return null
    vzemi(kandidat, false)
  }

  // Kapetan je navadno najboljši strelec točk, včasih drugi; namestnik naslednji.
  const prvi = izbrani.filter((p) => p.is_starter).sort((a, b) => b.tocke - a.tocke || b.minute - a.minute)
  const k = rnd() < 0.3 && prvi.length > 1 ? 1 : 0
  const kapetan = prvi[k]
  const namestnik = prvi.find((p) => p !== kapetan)

  // Klop: rezervni vratar prvi, nato igralci v polju po oceni.
  const klop = izbrani.filter((p) => !p.is_starter)
  const vrstniKlop = [
    ...klop.filter((p) => p.position === 'GK'),
    ...klop.filter((p) => p.position !== 'GK').sort((a, b) => ocena.get(b.id) - ocena.get(a.id)),
  ]

  const kader = izbrani.map((p) => ({
    player_id: p.id,
    is_starter: p.is_starter,
    is_captain: p === kapetan,
    is_vice: p === namestnik,
    bench_order: p.is_starter ? null : vrstniKlop.indexOf(p) + 1,
  }))
  return { kader, igralci: izbrani, postava: `${d}-${m}-${f}`, slog: imeSloga, cena: denar(porabljeno) }
}

/** Neodvisna preverba po pravilih; vrne seznam napak. */
function preveri({ kader, igralci, cena }) {
  const napake = []
  const poId = new Map(igralci.map((p) => [p.id, p]))
  if (kader.length !== VELIKOST_EKIPE) napake.push(`${kader.length} igralcev`)
  if (new Set(kader.map((k) => k.player_id)).size !== kader.length) napake.push('podvojen igralec')
  for (const [poz, pr] of Object.entries(POZICIJE)) {
    const vse = igralci.filter((p) => p.position === poz).length
    const prvi = kader.filter((k) => k.is_starter && poId.get(k.player_id).position === poz).length
    if (vse !== pr.kader) napake.push(`${poz} ${vse}/${pr.kader}`)
    if (prvi < pr.min || prvi > pr.max) napake.push(`${poz} v postavi ${prvi}`)
  }
  if (kader.filter((k) => k.is_starter).length !== STEVILO_PRVIH) napake.push('postava ni 11')
  if (kader.filter((k) => k.is_captain).length !== 1) napake.push('kapetan')
  if (kader.filter((k) => k.is_vice).length !== 1) napake.push('namestnik')
  if (kader.some((k) => (k.is_captain || k.is_vice) && !k.is_starter)) napake.push('kapetan na klopi')
  const klop = kader.filter((k) => !k.is_starter).map((k) => k.bench_order).sort()
  if (klop.join() !== '1,2,3,4') napake.push('vrstni red klopi')
  const gkKlop = kader.find((k) => !k.is_starter && poId.get(k.player_id).position === 'GK')
  if (gkKlop?.bench_order !== 1) napake.push('rezervni vratar ni prvi na klopi')
  const poKlubu = new Map()
  for (const p of igralci) poKlubu.set(p.team_id, (poKlubu.get(p.team_id) ?? 0) + 1)
  if (Math.max(...poKlubu.values()) > MAX_IZ_KLUBA) napake.push('preveč iz kluba')
  if (cena > PRORACUN + 1e-9) napake.push(`cena ${cena}`)
  return napake
}

// ---------------------------------------------------------------------------
// Podatki
// ---------------------------------------------------------------------------

async function lige() {
  let q = db
    .from('competitions_view')
    .select('id, slug, short_name, name, active, country_code')
    .order('sort_order', { nullsFirst: false })
    .order('id')
  if (LIGA) q = q.eq('slug', LIGA)
  else q = q.eq('country_code', DRZAVA)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  if (LIGA && !data?.length) throw new Error(`Lige ${LIGA} ni.`)
  // Brez --liga le aktivne; odstranjevanje pa počisti vse lige države.
  return (data ?? []).filter((l) => LIGA || odstrani || l.active)
}

async function hisneEkipe(ligaId) {
  const { data, error } = await db
    .from('fantasy_teams')
    .select('id, name, owner_id, competition_id')
    .eq('competition_id', ligaId)
    .eq('hisna', true)
    .order('id')
  if (error) throw new Error(error.message)
  return data ?? []
}

async function naborLige(ligaId, sezona) {
  const igralci = await vseVrstice((od, do_) =>
    db.from('players')
      .select('id, full_name, team_id, position, value')
      .eq('competition_id', ligaId)
      .eq('active', true)
      // Klub je izstopil iz lige: igralec ne bo vec igral, shrani_ekipo ga zavrne.
      .is('izstopil_at', null)
      .not('position', 'is', null)
      .order('id')
      .range(od, do_),
  )
  const stat = await vseVrstice((od, do_) =>
    db.from('player_season_stats')
      .select('player_id, minutes, points')
      .eq('competition_id', ligaId)
      .eq('season', sezona)
      .order('player_id')
      .range(od, do_),
  )
  const poIgralcu = new Map(stat.map((s) => [s.player_id, s]))
  // Samo igralci, ki letos igrajo; kjer jih je premalo, še ostali aktivni.
  let nabor = igralci
    .map((p) => ({
      ...p,
      value: Number(p.value),
      tocke: Number(poIgralcu.get(p.id)?.points ?? 0),
      minute: Number(poIgralcu.get(p.id)?.minutes ?? 0),
    }))
  const igrajo = nabor.filter((p) => p.minute > 0)
  const dovolj = Object.entries(POZICIJE).every(([poz, pr]) =>
    new Set(igrajo.filter((p) => p.position === poz).map((p) => p.team_id)).size * MAX_IZ_KLUBA >= pr.kader * 2 &&
    igrajo.filter((p) => p.position === poz).length >= pr.kader * 3)
  if (dovolj) nabor = igrajo

  const maxT = Math.max(1, ...nabor.map((p) => p.tocke))
  const maxV = Math.max(0.01, ...nabor.map((p) => Math.max(0, p.tocke) / p.value))
  const maxM = Math.max(1, ...nabor.map((p) => p.minute))
  const minC = Math.min(...nabor.map((p) => p.value))
  const maxC = Math.max(...nabor.map((p) => p.value))
  for (const p of nabor) {
    p.nT = Math.max(0, p.tocke) / maxT
    p.nV = Math.max(0, p.tocke) / p.value / maxV
    p.nM = p.minute / maxM
    p.poceni = maxC > minC ? 1 - (p.value - minC) / (maxC - minC) : 1
  }
  return { nabor, samoLetosnji: dovolj }
}

async function sistemskiLastnik() {
  // Najprej prek obstoječe hišne ekipe, nato po e-naslovu.
  const { data: ena } = await db
    .from('fantasy_teams').select('owner_id').eq('hisna', true).order('id').limit(1)
  if (ena?.length) return ena[0].owner_id
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    const u = data.users.find((x) => x.email?.toLowerCase() === SISTEM_EMAIL)
    if (u) return u.id
    if (data.users.length < 1000) return null
  }
}

async function zagotoviLastnika() {
  let id = await sistemskiLastnik()
  if (!id) {
    if (!pisi) return null
    const { data, error } = await db.auth.admin.createUser({
      email: SISTEM_EMAIL,
      email_confirm: true,
      // Geslo, ki ga nihče ne pozna: v račun se ne prijavlja nihče.
      password: randomBytes(32).toString('base64url'),
      user_metadata: { display_name: SISTEM_IME, sistemski: true },
    })
    if (error) throw new Error(`Sistemskega uporabnika ni bilo mogoče ustvariti: ${error.message}`)
    id = data.user.id
    console.log(`Ustvarjen sistemski uporabnik ${SISTEM_EMAIL} (${id}).`)
  }
  if (pisi) {
    const { error } = await db
      .from('profiles')
      .update({ display_name: SISTEM_IME, brez_opomnikov: true })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
  return id
}

// ---------------------------------------------------------------------------
// Odstranjevanje
// ---------------------------------------------------------------------------

async function odstraniVse(seznam) {
  let skupaj = 0
  for (const l of seznam) {
    const ekipe = await hisneEkipe(l.id)
    if (!ekipe.length) continue
    console.log(`  ${l.slug.padEnd(22)} ${ekipe.length} hišnih: ${ekipe.map((e) => e.name).join(', ')}`)
    if (ekipe.some((e) => e.competition_id !== l.id)) throw new Error('Ekipa iz druge lige — ustavljam.')
    skupaj += ekipe.length
    if (!pisi) continue
    const { data, error } = await db.rpc('odstrani_hisne_ekipe', { p_ids: ekipe.map((e) => e.id) })
    if (error) throw new Error(`${l.slug}: ${error.message}`)
    if (data !== ekipe.length) throw new Error(`${l.slug}: izbrisanih ${data}, pričakovanih ${ekipe.length}.`)
  }
  console.log(pisi ? `\nOdstranjenih ${skupaj} hišnih ekip.` : `\nOdstranil bi ${skupaj} hišnih ekip (dodaj --pisi).`)
}

// ---------------------------------------------------------------------------
// Glavni tok
// ---------------------------------------------------------------------------

const seznam = await lige()
console.log(
  `${pisi ? 'ZAPIS' : 'NAČRT (brez --pisi)'} · ${BASE} · ` +
  `${LIGA ? `liga ${LIGA}` : `država ${DRZAVA}`} · ${seznam.length} lig`,
)

if (odstrani) {
  await odstraniVse(seznam)
  process.exit(0)
}

const { data: sezona, error: napakaSezone } = await db.rpc('tekoca_sezona')
if (napakaSezone) throw new Error(napakaSezone.message)
console.log(`Cilj ${PO_VELIKOSTI ? '≈1,3 × klubov (najmanj ' + (NA_LIGO - 2) + ')' : NA_LIGO} ± ${RAZPON} ekip na ligo (prave + hišne), sezona ${sezona}.\n`)

const lastnik = await zagotoviLastnika()
if (!lastnik) console.log(`(sistemski uporabnik ${SISTEM_EMAIL} še ne obstaja — ustvaril bi ga)\n`)

let novih = 0
let napak = 0
for (const l of seznam) {
  const obstojece = await hisneEkipe(l.id)
  const { count: vseh, error: eV } = await db
    .from('fantasy_teams').select('id', { count: 'exact', head: true }).eq('competition_id', l.id)
  if (eV) throw new Error(eV.message)
  const { count: klubov, error: eKl } = await db
    .from('competition_teams').select('team_id', { count: 'exact', head: true }).eq('competition_id', l.id)
  if (eKl) throw new Error(eKl.message)
  const pravih = (vseh ?? 0) - obstojece.length
  const cilj = ciljZaLigo(l.slug, klubov ?? 0)
  const dodati = Math.max(0, cilj - (vseh ?? 0))
  if (!dodati) {
    console.log(`  ${l.slug.padEnd(22)} ${pravih} pravih + ${obstojece.length} hišnih / cilj ${cilj} — nič za dodati`)
    continue
  }

  const { nabor, samoLetosnji } = await naborLige(l.id, sezona)

  // Zasedena imena (vse ekipe lige) in izbranost med hišnimi ekipami.
  const { data: vseEkipe, error: eE } = await db
    .from('fantasy_teams').select('id, name').eq('competition_id', l.id).order('id')
  if (eE) throw new Error(eE.message)
  const zasedena = new Set((vseEkipe ?? []).map((e) => e.name.trim().toLowerCase()))
  const izbranost = new Map()
  if (obstojece.length) {
    const { data: kadri, error: eK } = await db
      .from('fantasy_roster').select('player_id').in('fantasy_team_id', obstojece.map((e) => e.id))
    if (eK) throw new Error(eK.message)
    for (const r of kadri ?? []) izbranost.set(r.player_id, (izbranost.get(r.player_id) ?? 0) + 1)
  }
  const imena = premesaj(DRZAVA === 'SI' ? IMENA_SI : IMENA, generator('imena:' + l.slug))
    .filter((i) => !zasedena.has(i.toLowerCase()))

  console.log(
    `  ${l.slug.padEnd(22)} ${pravih} pravih + ${obstojece.length} hišnih / cilj ${cilj} (${klubov} klubov) → +${dodati}` +
    `  (nabor ${nabor.length} igralcev${samoLetosnji ? ', z letošnjimi minutami' : ', tudi brez letošnjih minut'})`,
  )
  for (let i = 0; i < dodati; i++) {
    const ime = imena[i]
    if (!ime) {
      console.log('    ✗ zmanjkalo je imen')
      napak++
      break
    }
    let predlog = null
    const rnd = generator(`kader:${l.slug}:${ime}`)
    for (let poskus = 0; poskus < 25 && !predlog; poskus++) {
      const p = sestaviKader(nabor, rnd, izbranost)
      if (p && !preveri(p).length) predlog = p
    }
    if (!predlog) {
      console.log(`    ✗ ${ime}: veljavnega kadra ni bilo mogoče sestaviti`)
      napak++
      continue
    }
    for (const p of predlog.igralci) izbranost.set(p.id, (izbranost.get(p.id) ?? 0) + 1)
    const kap = predlog.igralci.find((p) => predlog.kader.find((k) => k.player_id === p.id)?.is_captain)
    console.log(
      `    ${pisi ? '+' : '·'} ${ime.padEnd(24)} ${predlog.postava}  ${predlog.slog.padEnd(10)} ` +
      `${predlog.cena.toFixed(1).padStart(5)} M  kapetan ${kap?.full_name ?? '?'}`,
    )
    if (!pisi) continue
    const { data: id, error } = await db.rpc('ustvari_hisno_ekipo', {
      p_owner: lastnik,
      p_competition_id: l.id,
      p_ime: ime,
      p_roster: predlog.kader,
    })
    if (error) {
      console.log(`      ✗ ${error.message}`)
      napak++
      continue
    }
    const { data: veljaven } = await db.rpc('roster_je_veljaven', { p_team_id: id })
    if (veljaven !== true) {
      console.log(`      ✗ ekipa ${id} po zapisu ni veljavna`)
      napak++
      continue
    }
    novih++
  }
}

// Hišne ekipe, ki so medtem postale neveljavne (igralec odšel ipd.), samo
// naštejemo — take ekipe ob roku ostanejo brez točk.
if (lastnik) {
  const vse = []
  for (const l of seznam) vse.push(...(await hisneEkipe(l.id)).map((e) => ({ ...e, slug: l.slug })))
  const neveljavne = []
  for (const e of vse) {
    const { data } = await db.rpc('roster_je_veljaven', { p_team_id: e.id })
    if (data !== true) neveljavne.push(`${e.slug}/${e.name}`)
  }
  if (neveljavne.length) console.log(`\nNeveljavne hišne ekipe (${neveljavne.length}): ${neveljavne.join(', ')}`)
  console.log(`\nHišnih ekip v izbranih ligah: ${vse.length}, od tega veljavnih ${vse.length - neveljavne.length}.`)
}

console.log(pisi ? `Dodanih ${novih}, napak ${napak}.` : `Napak v načrtu: ${napak}. Za zapis dodaj --pisi.`)
if (napak) process.exitCode = 1
