// Ali je ÖFB ligi odprl novo fazo (Meister-/Qualifikationsgruppe, Meister-/
// Abstiegsrunde)? Nadaljevanje razdeljene lige je pri ÖFB NOVO tekmovanje,
// ustvarjeno sredi sezone; dokler njegove šifre ne pripnemo ligi
// (`source_league_code = '<osnovna>+<nova>'`, glej `vrsticeFaz` v
// viri/oefb.mjs), se fantasy liga po zadnjem krogu prve faze tiho konča.
//
// Za vsako aktivno `at-` ligo poišče skupino tekmovanj pri zvezi, v kateri je
// liga, in v njej tekmovanja, ki jih nobena naša liga še ne bere. Če so vsi
// klubi novega tekmovanja iz te lige, je to nova faza: javi na Discord z
// natančnim SQL. Delno ujemanje (mešana liga dveh dežel) javi za ročni
// pregled. Baze NE spreminja. Brez novosti molči.
//
//   node scripts/nova-faza-oefb.mjs            # izpis; Discord, če je DISCORD_WEBHOOK
//   node scripts/nova-faza-oefb.mjs --jahr 2026   # sezona 2025/26 (preizkus)
import { createClient } from '@supabase/supabase-js'
import { prenesiSPonovitvami } from './prenos.mjs'
import oefb, { razbijKodo, vrsticeFaz, kljucKlubaAt, naslovPodatkov } from './viri/oefb.mjs'

const BASE = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const KLJUC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
if (!BASE || !KLJUC) {
  console.error('Manjka SUPABASE_URL ali ključ.')
  process.exit(1)
}
const db = createClient(BASE, KLJUC, { auth: { persistSession: false } })

// Zveze na oefb.at (izbirnik na /bewerbe/). Državne lige (Bundesliga, 2. Liga,
// Regionallige) so v skupinah deželnih zvez, zato `oefb` pregleda več njih.
const VERBAND = {
  bfv: ['4d5b3b4d93139e5ca7c8'], kfv: ['07383705631a73ec5a03'], noefv: ['ed9c2fe8888e641f8e1a'],
  ooefv: ['5faee79882faada18ab2'], sfv: ['5ac4e17caa6271317678'], stfv: ['2b343dd0b84af271a9ea'],
  tfv: ['2597aa11e457ecc97f32'], vfv: ['83f816954706cd0dff5f'], wfv: ['22793f390fce3e915783'],
  oefb: ['ed9c2fe8888e641f8e1a', '4d5b3b4d93139e5ca7c8', '2597aa11e457ecc97f32', '83f816954706cd0dff5f', '22793f390fce3e915783'],
}
const HOMEPAGE = '1473983024629548524'
// Skupine, v katerih ni lig odraslih.
const NI_ODRASLIH = /Unter|U-?\s?\d|Frauen|Damen|Mädchen|Girls|Cup|Pokal|Reserve|Futsal|Jugend|JHG|OPO|MPO|UPO|Nachwuchs|Turnier|Hallen|Senior|Ü\s?\d|Legend|Schul|Relegation|Entscheid|IB Ligen/i
// Tekmovanja, ki niso nadaljevanje lige (play-off za Evropo, kvalifikacije).
// "Oberes/Unteres Play-Off" (Salzburg 2025/26) je delitev lige in ostane.
const NI_FAZA = (ime) => /Relegation|Entscheid|Europa|Cup|Pokal|Turnier|Reserve/i.test(ime) ||
  (/Play-?Off/i.test(ime) && !/Oberes|Unteres|Mittleres/i.test(ime))

const prenesi = async (url) => {
  const o = await prenesiSPonovitvami(url, { glave: oefb.glave, premorMs: oefb.premorMs })
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  return o.text()
}
const podatki = async (pot) => JSON.parse(await prenesi(naslovPodatkov(pot)))
const klubi = async (koda) => {
  const strani = []
  for (const id of razbijKodo(koda).idji) strani.push(await prenesi(oefb.naslovRazporeda(id)))
  return new Set(vrsticeFaz(strani).flatMap((t) => [kljucKlubaAt(t.domaci), kljucKlubaAt(t.gostje)]))
}

const { data: vse, error } = await db
  .from('competitions')
  .select('slug, active, source_league_code, federations(code)')
  .eq('source', 'oefb')
  .order('slug')
if (error) {
  console.error(`Tekmovanj ni mogoče prebrati: ${error.message}`)
  process.exit(1)
}
const znane = new Set(vse.flatMap((t) => (t.source_league_code ? razbijKodo(t.source_league_code).idji : [])))
const aktivne = vse.filter((t) => t.active && t.source_league_code)
if (!aktivne.length) process.exit(0)

const zdaj = new Date()
// `--jahr 2026` = sezona 2025/26 (za preizkus na lanski delitvi).
const iJahr = process.argv.indexOf('--jahr')
const jahr = iJahr > -1 ? Number(process.argv[iJahr + 1]) : zdaj.getUTCMonth() >= 6 ? zdaj.getUTCFullYear() + 1 : zdaj.getUTCFullYear()
const novice = []
const iskane = new Map(aktivne.map((t) => [razbijKodo(t.source_league_code).id, t]))

for (const [zveza, verbandi] of Object.entries(VERBAND)) {
  const lige = aktivne.filter((t) => (t.federations?.code ?? '') === zveza)
  if (!lige.length) continue
  const manjkajo = new Set(lige.map((t) => razbijKodo(t.source_league_code).id))
  for (const verband of verbandi) {
    if (!manjkajo.size) break
    const gruppen = (await podatki(`gruppen/${verband};jahr=${jahr};homepage=${HOMEPAGE}`))
      .filter((g) => !NI_ODRASLIH.test(g.name))
      // Skupina, katere predstavnik je naša liga, najprej — pogosto zadošča.
      .sort((a, b) => Number(!manjkajo.has(a.url?.match(/Bewerb\/(\d+)/)?.[1])) - Number(!manjkajo.has(b.url?.match(/Bewerb\/(\d+)/)?.[1])))
    for (const g of gruppen) {
      if (!manjkajo.size) break
      const bewerbe = await podatki(`bewerbe/${g.id};homepage=${HOMEPAGE};runden=true`)
      const nase = bewerbe.filter((b) => manjkajo.has(String(b.id)))
      if (!nase.length) continue
      for (const b of nase) manjkajo.delete(String(b.id))
      const kandidati = bewerbe.filter((b) => !znane.has(String(b.id)) && !NI_FAZA(b.name ?? ''))
      if (!kandidati.length) continue
      for (const b of nase) {
        const liga = iskane.get(String(b.id))
        const ligaKlubi = await klubi(liga.source_league_code)
        const nove = []
        for (const k of kandidati) {
          const kKlubi = await klubi(String(k.id))
          const skupni = [...kKlubi].filter((x) => ligaKlubi.has(x)).length
          if (kKlubi.size && skupni === kKlubi.size) nove.push(k)
          else if (skupni >= 2)
            novice.push(`⚠️ ${liga.slug}: "${k.name}" (${k.id}) ima ${skupni} od ${kKlubi.size} klubov lige — mešano tekmovanje, preglej ročno.`)
        }
        if (nove.length) {
          const koda = [liga.source_league_code, ...nove.map((k) => k.id)].join('+')
          novice.push(
            `🆕 ${liga.slug}: nova faza ${nove.map((k) => `"${k.name}" (${k.id})`).join(', ')}\n` +
              `\`update competitions set source_league_code = '${koda}' where slug = '${liga.slug}';\``,
          )
        }
      }
    }
  }
  if (manjkajo.size) console.log(`  ${zveza}: skupine za ${[...manjkajo].join(', ')} nisem našel (sezona ${jahr - 1}/${jahr % 100})`)
}

if (!novice.length) {
  console.log('Nobene nove faze.')
  process.exit(0)
}
const besedilo = `**Avstrija: nova faza lige (oefb.at)**\n${novice.join('\n')}\n_SQL vpiši z migracijo (ali ročno na strežniku); nočni uvoz razporeda nato doda kroge._`
console.log(besedilo)
if (process.env.DISCORD_WEBHOOK) {
  const o = await fetch(process.env.DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: besedilo.slice(0, 1900) }),
  }).catch((e) => ({ ok: false, status: e.message }))
  console.log(o.ok ? 'Javljeno na Discord.' : `Discord: ${o.status}`)
}
