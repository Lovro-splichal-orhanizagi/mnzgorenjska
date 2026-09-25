// Seznam slovaških lig za odrasle v eni regiji — za migracijo, ki jih vpiše.
//
//   node scripts/slovaske-lige.mjs ssfz          # Stredoslovenský FZ in okresi pod njim
//   node scripts/slovaske-lige.mjs ssfz --sql    # vrstice za `insert into competitions`
//
// Regija je stran zveze na futbalnet.sk (`/futbalnet/z/<regija>/`), ki našteje
// okresne zveze pod sabo. Vsaka zveza ima na Sportnetu svoj appSpace, iz
// katerega API vrne tekmovanja sezone; tekmovanje s skupinami (V. liga: Sever,
// Juh) postane več lig. Mladinske, ženske, futsal in pokalne izpustimo — v
// prvem koraku igramo le lige odraslih moških.
const API = 'https://sutaze.api.sportnet.online/api/v2'
const STRAN = 'https://sportnet.sme.sk/futbalnet/z'
const GLAVE = { 'User-Agent': 'SLFF fantasy (https://slff.eu)' }
const SEZONA = '2026/2027'
// Arhiv za cene: ista liga lansko sezono. Poiščemo jo po imenu, ker ima vsaka
// sezona svoj competitionId in svoje šifre skupin.
const ARHIV = '2025/2026'
const enako = (a, b) => a.replace(/\s+/g, ' ').replace(/[\s.-]/g, '').toLowerCase() === b.replace(/\s+/g, ' ').replace(/[\s.-]/g, '').toLowerCase()
// Zapis je ročen in poln tipkarskih napak ("prírpavka", "strata prípravka", "U 13").
const IZPUSTI = /\bW?U[\s-]?\d|dorast|žiac|ženy|žien|futsal|pr[ií]p|prír|strata|pohár|pohar|mladš|starš|veteran|miniliga|internát|turnaj|baráž|kvalifik/i

const regija = process.argv[2] ?? 'ssfz'
const sql = process.argv.includes('--sql')
const pocakaj = () => new Promise((r) => setTimeout(r, 300))

async function besedilo(url) {
  await pocakaj()
  const o = await fetch(url, { headers: GLAVE })
  if (!o.ok) throw new Error(`${url} -> HTTP ${o.status}`)
  return o.text()
}
const json = async (url) => JSON.parse(await besedilo(url))

/** Podatki strani Next.js so v `self.__next_f.push([1,"…"])`. */
function podatkiStrani(html) {
  return [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)]
    .map((m) => JSON.parse(`"${m[1]}"`))
    .join('')
}

const prostorIz = (html) =>
  [...podatkiStrani(html).matchAll(/"appSpace":"([^"]+)"/g)].map((m) => m[1]).find((a) => a !== 'sportnet.sme.sk') ?? null

/**
 * appSpace zveze (za API). Stran zveze ga nosi le včasih; stran katerekoli
 * njene lige vedno — zato po potrebi odpremo prvo ligo.
 */
async function appSpace(zveza) {
  const html = await besedilo(`${STRAN}/${zveza}/`)
  const izStrani = prostorIz(html)
  if (izStrani) return izStrani
  const liga = html.match(new RegExp(`/futbalnet/z/${zveza}/s/([^/"]+)/`))?.[1]
  return liga ? prostorIz(await besedilo(`${STRAN}/${zveza}/s/${liga}/`)) : null
}

/** Zveze pod regijo (okresi) in regija sama. */
async function zveze(regija) {
  const html = await besedilo(`${STRAN}/${regija}/`)
  const pod = [...html.matchAll(/\/futbalnet\/z\/([a-z0-9-]+)\//g)].map((m) => m[1])
  return [...new Set([regija, ...pod])]
}

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const lige = []
for (const zveza of await zveze(regija)) {
  const prostor = await appSpace(zveza).catch(() => null)
  if (!prostor) continue
  const tekmovanja = (await json(`${API}/public/${encodeURIComponent(prostor)}/competitions?limit=200`)).competitions ?? []
  for (const c of tekmovanja) {
    if (c.season?.name !== SEZONA || IZPUSTI.test(c.name)) continue
    const tekme = (await json(`${API}/public/${encodeURIComponent(prostor)}/competitions/${c._id}/matches?limit=100`)).matches ?? []
    if (!tekme.length) continue
    const deli = new Map()
    for (const t of tekme) if (t.competitionPart?._id) deli.set(t.competitionPart._id, t.competitionPart.name)
    const vec = deli.size > 1

    // Lanska ista liga (in njene skupine po imenu) za arhiv.
    const lani = tekmovanja.find((x) => x.season?.name === ARHIV && enako(x.name, c.name))
    let laniDeli = new Map()
    if (lani) {
      const t2 = (await json(`${API}/public/${encodeURIComponent(prostor)}/competitions/${lani._id}/matches?limit=100`)).matches ?? []
      for (const t of t2) if (t.competitionPart?._id) laniDeli.set(t.competitionPart.name, t.competitionPart._id)
    }
    for (const [delId, delIme] of vec ? deli : [[null, null]]) {
      const ime = vec ? delIme : c.name
      const laniDel = vec ? [...laniDeli].find(([n]) => enako(n, delIme))?.[1] : null
      lige.push({
        zveza,
        prostor,
        ime,
        koda: [prostor, c._id, delId].filter(Boolean).join('/'),
        arhiv: lani && (!vec || laniDel) ? [prostor, lani._id, laniDel].filter(Boolean).join('/') : null,
        slug: `sk-${slug(zveza.replace(/^obfz-|-futbalovy-zvaz$/g, ''))}-${slug(ime).slice(0, 30)}`,
      })
    }
  }
}

if (sql) {
  for (const l of lige)
    console.log(`    ('${l.slug}', '${l.ime.replace(/'/g, "''")}', '${l.zveza}', '${l.koda}'),`)
} else {
  for (const l of lige) console.log(`${l.zveza.padEnd(28)} ${l.ime.padEnd(40)} ${l.koda}  arhiv: ${l.arhiv ?? '—'}`)
  console.log(`\n${lige.length} lig`)
}
