// Napolni vrsto pošte klubom (`klub_stik.v_vrsti`), ki jo pošilja
// scripts/posta-klubom.mjs.
//
//   node scripts/vrsta-poste-klubom.mjs --drzava AT              # načrt (le številke)
//   node scripts/vrsta-poste-klubom.mjs --drzava EE --pisi [--poslji-od 2027-03-01T08:00:00Z]
//
// Naslov je **le uradni naslov kluba**, nikoli osebni naslov funkcionarja:
// - AT: vereine.oefb.at/<društvo>/News/ → blok "Kontakt" (EMAIL), ne
//   "funktionaere". Šifro društva da razpored lige (heimMannschaftUrl).
//   Bundesliga in 2. Liga sta izpuščeni (pisarne profesionalnih klubov), z
//   njima vsak naslov, ki ga ima tudi klub teh dveh lig. 1,5 s med stranmi.
// - EE: stran ekipe jalgpall.ee/voistlused/<liga>/team/<id> → "E-post"
//   (naslov kluba), ne "Esindaja" (zastopnik, osebni naslov). Povezave ekip
//   so v razporedu lige. robots.txt: Crawl-Delay 5 (vir.premorMs); ajax.php
//   in /otsing ne beremo. Estonske lige so neaktivne — maili čakajo na vklop.
// 403, 429 ali izziv ustavi branje (izhod 2) — ne obhajamo.
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
import { OD, POSLAL } from './posta-klubom.mjs'

const arg = (ime) => {
  const i = process.argv.indexOf(ime)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const drzava = arg('--drzava')
const pisi = process.argv.includes('--pisi')
const posljiOd = arg('--poslji-od') || null
const env = process.env
if (!['AT', 'EE'].includes(drzava)) {
  console.error('Uporaba: --drzava AT|EE [--pisi] [--poslji-od <ISO>]')
  process.exit(1)
}
if (posljiOd && Number.isNaN(Date.parse(posljiOd))) {
  console.error(`--poslji-od ni datum: ${posljiOd}`)
  process.exit(1)
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

const IZPUSTI = new Set(['at-bundesliga', 'at-2-liga'])
const REZERVA = /(\b1[b-d]\b|\(1b\)|\bII+\b|Juniors|Amateure|\bU2[0-3]\b)/
const VELJAVEN = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i
const vir = drzava === 'AT' ? oefb : jalgpall

async function stran(url) {
  const o = await prenesiSPonovitvami(url, { glave: vir.glave, premorMs: vir.premorMs })
  const t = await o.text()
  if (o.status === 403 || o.status === 429 || (drzava === 'EE' && jeIzziv(t))) {
    console.error(`Ustavljeno: ${url} -> ${o.status} (zavrnitev ali izziv — ne obhajamo)`)
    process.exit(2)
  }
  return o.ok ? t : null
}

// --- lige, klubi, igralci z nastopi ---------------------------------------------
let q = db.from('competitions').select('id, slug, active, source_league_code').like('slug', `${drzava.toLowerCase()}-%`).order('slug')
if (drzava === 'AT') q = q.eq('active', true)
const lige = preveri(await q)
const obstojeci = await vseVrstice((od, do_) =>
  db.from('klub_stik').select('id, team_id, email, drzava, v_vrsti').order('id').range(od, do_),
)
const posta = await vseVrstice((od, do_) => db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal').order('id').range(od, do_))
const imaVrstico = new Set(obstojeci.map((s) => s.team_id).filter(Boolean))
const zasedeni = new Set(obstojeci.map((s) => s.email?.toLowerCase()).filter(Boolean))
const poKljucu = drzava === 'EE' ? await mapaKlubov(db, jalgpall) : null

const klubi = [] // { team_id, klub, liga_slug, igralcev, email, vir_url, profi }
const naslovDrustva = new Map() // AT: šifra društva → naslov (rezerva in prva ekipa delita društvo)
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

  const html = await stran(drzava === 'AT' ? razporedAt(l.source_league_code.split('+')[0]) : razporedEe(l.source_league_code))
  const povezave = new Map() // ključ kluba → šifra društva (AT) ali naslov strani ekipe (EE)
  if (drzava === 'AT') {
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

// Avstrijski naslovi, ki jim je prvi mail poslal le Luka (lokalno pošiljanje pred vrsto): opomnik gre iz vrste.
const poStiku = new Map()
for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
const nasi = drzava !== 'AT' ? [] : obstojeci.filter((s) => {
  const r = (poStiku.get(s.id) ?? []).filter((x) => ['prvi', 'opomnik'].includes(x.vrsta))
  return s.drzava === 'AT' && !s.v_vrsti && r.some((x) => x.vrsta === 'prvi') && r.every((x) => x.poslal === POSLAL)
})

console.log(`\n${drzava}: lig ${lige.length}, prebranih klubov ${klubi.length}`)
console.log(`  novih naslovov v vrsto: ${novi.size}${posljiOd ? ` (ne pred ${posljiOd})` : ''}`)
console.log(`  brez naslova (ni_maila): ${brezNaslova.length}`)
console.log(`  izločenih (profesionalni ali že vpisan naslov): ${izlocenih}`)
console.log(`  že poslanih (Luka) v vrsto za opomnik: ${nasi.length}`)
if (!pisi) {
  console.log('\nNačrt — brez --pisi nič ne zapišem.')
  process.exit(0)
}

const vrstice = [
  ...[...novi.values()].map((k) => ({ team_id: k.team_id, klub: k.klub, drzava, liga_slug: k.liga_slug, email: k.email, vir_url: k.vir_url, stanje: 'nov', v_vrsti: true, posiljatelj: OD, poslji_od: posljiOd })),
  ...brezNaslova.map((k) => ({ team_id: k.team_id, klub: k.klub, drzava, liga_slug: k.liga_slug, email: null, vir_url: k.vir_url, stanje: 'ni_maila', v_vrsti: false, posiljatelj: OD, poslji_od: null })),
]
for (let i = 0; i < vrstice.length; i += 100) preveri(await db.from('klub_stik').insert(vrstice.slice(i, i + 100)))
for (let i = 0; i < nasi.length; i += 100)
  preveri(await db.from('klub_stik').update({ v_vrsti: true }).in('id', nasi.slice(i, i + 100).map((s) => s.id)))
console.log(`\nZapisano: ${vrstice.length} vrstic, ${nasi.length} v vrsto za opomnik.`)
