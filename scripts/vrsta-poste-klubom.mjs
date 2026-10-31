// Napolni vrsto pošte klubom (`klub_stik.v_vrsti`), ki jo pošilja
// scripts/posta-klubom.mjs.
//
//   node scripts/vrsta-poste-klubom.mjs --drzava AT              # načrt (le številke)
//   node scripts/vrsta-poste-klubom.mjs --drzava EE --pisi [--poslji-od 2027-03-01T08:00:00Z]
//   node scripts/vrsta-poste-klubom.mjs --drzava HU --suho --koda 67/20/33915 [--najvec 5]
//   node scripts/vrsta-poste-klubom.mjs --drzava BA --suho --koda wwin-prva-liga-fbih/2026-27 [--najvec 5]
//     (brez baze: prebere ligo in nekaj strani klubov, izpiše zakrite naslove)
//
// Naslov je **le uradni naslov kluba**, nikoli osebni naslov funkcionarja:
// - AT: vereine.oefb.at/<društvo>/News/ → blok "Kontakt" (EMAIL), ne
//   "funktionaere". Šifro društva da razpored lige (heimMannschaftUrl).
//   Bundesliga in 2. Liga (in HU NB I, NB II) so izpuščene (pisarne profesionalnih klubov), z
//   njima vsak naslov, ki ga ima tudi klub teh dveh lig. 1,5 s med stranmi.
// - EE: stran ekipe jalgpall.ee/voistlused/<liga>/team/<id> → "E-post"
//   (naslov kluba), ne "Esindaja" (zastopnik, osebni naslov). Povezave ekip
//   so v razporedu lige. robots.txt: Crawl-Delay 5 (vir.premorMs); ajax.php
//   in /otsing ne beremo. Estonske lige so neaktivne — maili čakajo na vklop.
// - HU: adatbank.mlsz.hu/club/<liga>/1/<ekipa>.html → "Klub adatok" E-mail
//   (naslov, ki ga klub vodi pri MLSZ). Ekipe da stranski seznam strani 1.
//   kroga. Crawl-delay 1 (beremo po 1,5 s); ostanek "Too many connections"
//   ni stran kluba — umik in ponovitev, nato klub preskočimo (brez vrstice,
//   da ga naslednji zagon prebere znova). Le aktivne lige.
// - BA: nsfbih.ba/klubovi/<liga>/<id> → vrstica "E-mail" tabele kluba (ne
//   naslov zveze v nogi). Šifro kluba da seznam /klubovi/<liga> (isti slug
//   kot šifra lige), ime kluba je ime z razporeda. Le aktivne lige vira
//   nsfbih (ne nfsbih), 3 s med stranmi (vir.premorMs).
// - HR, RS: uradnega naslova kluba vir ne objavi (Semafor ima pri klubu le
//   naslov in stadion, fsb/fss.rs nič); ŽNS ga imajo le v PDF "adresar
//   klubova" — ni podprto.
// 401, 403, 429 ali izziv ustavi branje takoj (izhod 2) — ne obhajamo.
// Teče na strežniku (docker compose run --rm posta …, scripts/hetzner/posta/).
//
// En naslov = en klub (prednost ima prva ekipa pred rezervno), klub brez
// igralcev z nastopi letos izpustimo. Nov naslov dobi vrstico (`nov`,
// `v_vrsti`, pošiljatelj luka@slff.eu); klub brez naslova `ni_maila`, če
// zanj vrstice še ni. Obstoječih vrstic NE spreminjamo — razen da v vrsto
// postavimo avstrijske, ki jim je prvi mail poslal le Luka (opomnik).
// Kluba z vrstico ne beremo znova, zato je ponoven zagon hiter.
import { createClient } from '@supabase/supabase-js'
import { prenesiSPonovitvami } from './prenos.mjs'
import { vseVrstice } from './strani.mjs'
import { mapaKlubov, razpakiraj } from './klubi.mjs'
import oefb, { naslovRazporeda as razporedAt, predhodniPodatki, imeEkipe, kljucKlubaAt } from './viri/oefb.mjs'
import jalgpall, { naslovRazporeda as razporedEe, jeIzziv } from './viri/jalgpall.mjs'
import mlsz, { naslovKroga, naslovKluba, ekipeLige, emailKluba, UMIK_MS } from './viri/mlsz.mjs'
import nsfbih, { naslovKlubov, naslovKlubaBa, klubiLige, emailKluba as emailKlubaBa, jeIzziv as jeIzzivBa } from './viri/nsfbih.mjs'
import { OD, stareZaOpomnik } from './posta-klubom.mjs'

const arg = (ime) => {
  const i = process.argv.indexOf(ime)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const drzava = arg('--drzava')
const pisi = process.argv.includes('--pisi')
const posljiOd = arg('--poslji-od') || null
const env = process.env
if (!['AT', 'EE', 'HU', 'BA'].includes(drzava)) {
  console.error('Uporaba: --drzava AT|EE|HU|BA [--pisi] [--poslji-od <ISO>]  (HR in RS: vir naslovov klubov ne objavi)')
  process.exit(1)
}
if (posljiOd && Number.isNaN(Date.parse(posljiOd))) {
  console.error(`--poslji-od ni datum: ${posljiOd}`)
  process.exit(1)
}
const IZPUSTI = new Set(['at-bundesliga', 'at-2-liga', 'hu-nb1', 'hu-nb2'])
const REZERVA = /(\b1[b-d]\b|\(1b\)|\bII+\b|Juniors|Amateure|\bU2[0-3]\b)/
const VELJAVEN = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i
const vir = { AT: oefb, EE: jalgpall, HU: mlsz, BA: nsfbih }[drzava]

// 401/403/429 ustavi takoj, brez ponovitve (prenesiSPonovitvami bi 429 ponovil).
class Zavrnitev extends Error {}
const izziv = (t) => /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile/i.test(t) || (drzava === 'EE' && jeIzziv(t)) || (drzava === 'BA' && jeIzzivBa(t))
async function stran(url) {
  let o
  try {
    o = await prenesiSPonovitvami(url, {
      glave: vir.glave,
      premorMs: vir.premorMs,
      fetchFn: async (u, m) => {
        const r = await fetch(u, m)
        if (r.status === 401 || r.status === 403 || r.status === 429) throw new Zavrnitev(`${r.status}`)
        return r
      },
    })
  } catch (e) {
    if (!(e instanceof Zavrnitev)) throw e
    console.error(`Ustavljeno: ${url} -> ${e.message} (zavrnitev — ne obhajamo)`)
    process.exit(2)
  }
  const t = await o.text()
  if (izziv(t)) {
    console.error(`Ustavljeno: ${url} vrne izziv (CAPTCHA) — ne obhajamo`)
    process.exit(2)
  }
  return o.ok ? t : null
}

// HU: ada1bank ob preobremenitvi vrne 200 z "Too many connections" — umik in
// ponovitev (kot stranKroga v viru); vztrajen ostanek vrne null.
async function stranHu(url, prava) {
  for (const ms of [0, ...UMIK_MS]) {
    if (ms) await new Promise((r) => setTimeout(r, ms))
    const h = await stran(url)
    if (prava(h)) return h
  }
  return null
}
const ekipeHu = async (koda) => ekipeLige(await stranHu(naslovKroga(koda, 1), (h) => ekipeLige(h).length > 0))
const naslovHu = async (koda, id) => emailKluba(await stranHu(naslovKluba(koda, id), (h) => emailKluba(h) !== undefined))
const ekipeBa = async (koda) => klubiLige(await stran(naslovKlubov(koda)))
const naslovBa = async (koda, id) => emailKlubaBa(await stran(naslovKlubaBa(koda, id)))

// Preizkus brez baze (bere le javne strani, naslove zakrije).
if (process.argv.includes('--suho')) {
  const koda = arg('--koda')
  if (!['HU', 'BA'].includes(drzava) || !koda) {
    console.error('--suho zna le: --drzava HU|BA --suho --koda <évad/sz/verseny | slug/sezona> [--najvec 5]')
    process.exit(1)
  }
  const ekipe = await (drzava === 'HU' ? ekipeHu : ekipeBa)(koda)
  let najdenih = 0
  for (const e of ekipe.slice(0, Number(arg('--najvec') ?? 5))) {
    const email = await (drzava === 'HU' ? naslovHu : naslovBa)(koda, e.id)
    if (email) najdenih++
    console.log(`${e.ime}\t${email === undefined ? '? (ni strani kluba)' : email ? email.replace(/^(.)[^@]*/, '$1***') : '-'}`)
  }
  console.log(`\n${drzava} ${koda}: ekip ${ekipe.length}, prebranih ${Math.min(ekipe.length, Number(arg('--najvec') ?? 5))}, z naslovom ${najdenih}`)
  process.exit(0)
}

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const preveri = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

// jalgpall.ee ima en proračun branja (Crawl-Delay 5) za vse nas skupaj. Uvozi
// Estonije tečejo v GitHub Actions (cakaj-na-uvoze, SKUPEN_VIR), ta skripta pa
// na strežniku, kjer ni žetona: pogledamo javni API (brez žetona) in ne beremo,
// dokler kak tak zagon teče ali čaka. Polnjenje traja ~15 minut; uvoz, ki se
// začne med njim, za nekaj minut bere hkrati (ponytail: ni zaklepa čez oba sistema).
async function teceUvozEstonije() {
  const repo = env.GITHUB_REPOSITORY || 'Lovro-splichal-orhanizagi/mnzgorenjska'
  const api = async (pot) => {
    const o = await fetch(`https://api.github.com/repos/${repo}/${pot}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'SLFF posta' } })
    if (!o.ok) throw new Error(`GitHub API ${o.status}`)
    return o.json()
  }
  const tece = []
  for (const status of ['in_progress', 'queued']) {
    for (const z of (await api(`actions/runs?status=${status}&per_page=100`)).workflow_runs ?? []) {
      const tok = String(z.path ?? '').split('/').pop()
      const naslov = z.display_title ?? ''
      // Nočni uvoz nosi vse države; šteje le njegov posel "uvoz EE".
      const nocni = tok === 'uvoz-zapisnikov.yml' &&
        (await api(`actions/runs/${z.id}/jobs?per_page=100`)).jobs?.some((j) => j.name === 'uvoz EE' && j.status !== 'completed')
      if (nocni || (tok === 'uvoz-lige.yml' && /^Uvoz lige ee-/.test(naslov)) || (tok === 'grbi.yml' && naslov === 'Grbi klubov jalgpall'))
        tece.push(`${naslov || tok} (${z.id})`)
    }
  }
  return tece
}
if (drzava === 'EE') {
  let tece
  try {
    tece = await teceUvozEstonije()
  } catch (e) {
    console.error(`Ne vem, ali teče uvoz Estonije (${e.message}) — ne berem jalgpall.ee.`)
    process.exit(3)
  }
  if (tece.length) {
    console.error(`Teče uvoz, ki bere jalgpall.ee: ${tece.join(', ')} — poskusi pozneje.`)
    process.exit(3)
  }
}

// --- lige, klubi, igralci z nastopi ---------------------------------------------
let q = db.from('competitions').select('id, slug, active, source_league_code').like('slug', `${drzava.toLowerCase()}-%`).order('slug')
if (drzava !== 'EE') q = q.eq('active', true)
if (drzava === 'BA') q = q.eq('source', 'nsfbih') // državna WWIN liga BiH (nfsbih) naslovov klubov ne objavi
const lige = preveri(await q)
const obstojeci = await vseVrstice((od, do_) =>
  db.from('klub_stik').select('id, team_id, email, drzava, v_vrsti, posiljatelj, stanje, opomba').order('id').range(od, do_),
)
const posta = await vseVrstice((od, do_) => db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal').order('id').range(od, do_))
const imaVrstico = new Set(obstojeci.map((s) => s.team_id).filter(Boolean))
const zasedeni = new Set(obstojeci.map((s) => s.email?.toLowerCase()).filter(Boolean))
const poKljucu = drzava === 'EE' ? await mapaKlubov(db, jalgpall) : null

const klubi = [] // { team_id, klub, liga_slug, igralcev, email, vir_url, profi }
const naslovDrustva = new Map() // AT: šifra društva → naslov (rezerva in prva ekipa delita društvo); BA: šifra kluba → naslov
for (const l of lige) {
  if (!l.source_league_code) continue
  const profi = IZPUSTI.has(l.slug)
  const sezona = preveri(await db.rpc('sezona_lige', { p_competition_id: l.id }))
  const igralcev = new Map()
  for (const r of await vseVrstice((od, do_) =>
    db.from('player_season_standings').select('id, team_id').eq('competition_id', l.id).eq('season', sezona).gt('matches', 0).order('id').range(od, do_),
  )) igralcev.set(r.team_id, (igralcev.get(r.team_id) ?? 0) + 1)
  const ekipe = preveri(await db.from('competition_teams').select('team_id, name').eq('competition_id', l.id).order('team_id'))
  // Le klubi, ki jih je treba prebrati: profesionalni (za izločitev naslovov) in novi z igralci.
  const beri = ekipe.filter((e) => profi || (!imaVrstico.has(e.team_id) && igralcev.get(e.team_id)))
  if (!beri.length) continue

  const html = drzava === 'HU' || drzava === 'BA' ? null : await stran(drzava === 'AT' ? razporedAt(l.source_league_code.split('+')[0]) : razporedEe(l.source_league_code))
  const povezave = new Map() // ključ kluba → šifra društva (AT), naslov strani ekipe (EE) ali šifra ekipe (HU)
  if (drzava === 'HU') {
    const ekipeVira = await ekipeHu(l.source_league_code)
    if (!ekipeVira.length) {
      console.log(`${l.slug}\t(stran kroga ni prebrana — liga preskočena)`)
      continue
    }
    for (const x of ekipeVira) povezave.set(mlsz.kljucKluba(x.ime), x.id)
  } else if (drzava === 'BA') {
    const ekipeVira = await ekipeBa(l.source_league_code)
    if (!ekipeVira.length) {
      console.log(`${l.slug}\t(seznam klubov ni prebran — liga preskočena)`)
      continue
    }
    for (const x of ekipeVira) povezave.set(nsfbih.kljucKluba(x.ime), x.id)
  } else if (drzava === 'AT') {
    for (const p of predhodniPodatki(html ?? ''))
      for (const t of [...(p.ergebnisse ?? []), ...(p.spiele ?? [])])
        for (const [ime, url] of [[t.heimMannschaft, t.heimMannschaftUrl], [t.gastMannschaft, t.gastMannschaftUrl]]) {
          const s = String(url ?? '').match(/vereine\.oefb\.at\/([^/]+)\//)?.[1]
          if (s) povezave.set(kljucKlubaAt(imeEkipe(ime, url)), s)
        }
  } else {
    for (const m of String(html ?? '').matchAll(/href="(\/voistlused\/\d+\/team\/\d+)"[^>]*>\s*([^<]+?)\s*</g)) {
      const id = poKljucu.get(jalgpall.kljucKluba(razpakiraj(m[2])))
      if (id) povezave.set(id, `https://jalgpall.ee${m[1]}`)
    }
  }

  for (const e of beri) {
    let email = null
    let virUrl = null
    if (drzava === 'AT') {
      const s = povezave.get(kljucKlubaAt(e.name))
      if (s) {
        virUrl = `https://vereine.oefb.at/${s}/`
        if (!naslovDrustva.has(s)) {
          const h = await stran(`https://vereine.oefb.at/${s}/News/`)
          naslovDrustva.set(s, h?.match(/"Kontakt":\{"bezeichnung":"Kontakt","infos":\{[^}]*?"EMAIL":\["([^"]+)"/)?.[1] ?? null)
        }
        email = naslovDrustva.get(s)
      }
    } else if (drzava === 'HU') {
      const id = povezave.get(mlsz.kljucKluba(e.name))
      if (id) {
        virUrl = naslovKluba(l.source_league_code, id)
        email = await naslovHu(l.source_league_code, id)
        if (email === undefined) {
          console.log(`${l.slug}\t${e.name}\t? (ni strani kluba — naslednjič)`)
          continue
        }
      }
    } else if (drzava === 'BA') {
      const id = povezave.get(nsfbih.kljucKluba(e.name))
      if (id) {
        virUrl = naslovKlubaBa(l.source_league_code, id)
        if (!naslovDrustva.has(id)) naslovDrustva.set(id, await naslovBa(l.source_league_code, id))
        email = naslovDrustva.get(id)
        if (email === undefined) {
          naslovDrustva.delete(id)
          console.log(`${l.slug}\t${e.name}\t? (ni strani kluba — naslednjič)`)
          continue
        }
      }
    } else {
      virUrl = povezave.get(e.team_id) ?? null
      if (virUrl) email = (await stran(virUrl))?.match(/<p class="title">\s*E-post\s*<\/p>\s*<p class="value">\s*([^<\s]+)\s*<\/p>/i)?.[1] ?? null
    }
    email = email?.trim().toLowerCase() ?? null
    klubi.push({ team_id: e.team_id, klub: e.name, liga_slug: l.slug, igralcev: igralcev.get(e.team_id) ?? 0, email: email && VELJAVEN.test(email) ? email : null, vir_url: virUrl, profi })
    console.log(`${l.slug}\t${e.name}\t${email ? 'naslov' : '-'}`)
  }
}

// --- načrt ---------------------------------------------------------------------
const profiNaslovi = new Set(klubi.filter((k) => k.profi && k.email).map((k) => k.email))
const novi = new Map()
const brez = []
let izlocenih = 0
for (const k of klubi.filter((k) => !k.profi).sort((a, b) => Number(REZERVA.test(a.klub)) - Number(REZERVA.test(b.klub)) || b.igralcev - a.igralcev)) {
  if (!k.email) brez.push(k)
  else if (profiNaslovi.has(k.email) || zasedeni.has(k.email)) izlocenih++
  else if (!novi.has(k.email)) novi.set(k.email, k)
}
const brezNaslova = [...new Map(brez.filter((k) => !imaVrstico.has(k.team_id)).map((k) => [k.team_id, k])).values()]

// Stari avstrijski naslovi (prvi mail iz lokalnega pošiljanja pred vrsto): opomnik gre iz vrste.
// Parkirane vrstice ("poslano? preveri ročno") ne ustrezajo — glej stareZaOpomnik.
const nasi = drzava !== 'AT' ? [] : stareZaOpomnik(obstojeci, posta)

console.log(`\n${drzava}: lig ${lige.length}, prebranih klubov ${klubi.length}`)
console.log(`  novih naslovov v vrsto: ${novi.size}${posljiOd ? ` (ne pred ${posljiOd})` : ''}`)
console.log(`  brez naslova (ni_maila): ${brezNaslova.length}`)
console.log(`  izločenih (profesionalni ali že vpisan naslov): ${izlocenih}`)
console.log(`  že poslanih (Luka) v vrsto za opomnik: ${nasi.length}`)
if (!pisi) {
  console.log('\nNačrt — brez --pisi nič ne zapišem.')
  process.exit(0)
}

const opomba = drzava === 'BA' ? 'vir: federacija; nsfbih klub stran' : null
const vrstice = [
  ...[...novi.values()].map((k) => ({ team_id: k.team_id, klub: k.klub, drzava, liga_slug: k.liga_slug, email: k.email, vir_url: k.vir_url, stanje: 'nov', v_vrsti: true, posiljatelj: OD, poslji_od: posljiOd, opomba })),
  ...brezNaslova.map((k) => ({ team_id: k.team_id, klub: k.klub, drzava, liga_slug: k.liga_slug, email: null, vir_url: k.vir_url, stanje: 'ni_maila', v_vrsti: false, posiljatelj: OD, poslji_od: null, opomba })),
]
for (let i = 0; i < vrstice.length; i += 100) preveri(await db.from('klub_stik').insert(vrstice.slice(i, i + 100)))
for (let i = 0; i < nasi.length; i += 100)
  preveri(await db.from('klub_stik').update({ v_vrsti: true, posiljatelj: OD }).in('id', nasi.slice(i, i + 100).map((s) => s.id)).is('posiljatelj', null).eq('v_vrsti', false))
console.log(`\nZapisano: ${vrstice.length} vrstic, ${nasi.length} v vrsto za opomnik.`)
