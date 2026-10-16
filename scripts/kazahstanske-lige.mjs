// Kazahstanske lige na kffleague.kz — za migracijo, ki jih vpiše, in preizkus
// vira `kff` (brez baze).
//
//   node scripts/kazahstanske-lige.mjs                       # sezone tekočega leta iz sitemap.xml: id, ime, tekem, skupine
//   node scripts/kazahstanske-lige.mjs --od 1 --do 884       # isto za razpon id-jev tekem (arhiv ni v sitemap.xml)
//   node scripts/kazahstanske-lige.mjs --polno 2l/2026/203/5065   # vse tekme lige: razpored, zapisniki, goli = izid, 11 + 11, minute
//   node scripts/kazahstanske-lige.mjs --polno … --opozorila      # še vsa opozorila zapisnikov
//
// Strani tekem bere in shranjuje vir sam (izvlečki v scripts/.predpomnilnik/kff),
// zato drugi zagon ne bere ničesar znova, razen tekem tekočega kroga.
// Vljudno kot vir: User-Agent SLFF, 6 s med zahtevki. Ob 401, 403, 429,
// izzivu ali treh zaporednih omrežnih napakah se ustavi (izhod 4) — ne obhajamo.
import { existsSync, readFileSync } from 'node:fs'
import { prenesiSPonovitvami } from './prenos.mjs'
import kff, {
  NASLOV_ZEMLJEVIDA, tekmeZemljevida, preberiTekmo, preberiLigo, skupineSezone, razporedTekem, vZapisnik, nastopi,
} from './viri/kff.mjs'

const argumenti = process.argv.slice(2)
const zastavica = (ime) => argumenti.includes(`--${ime}`)
const vrednost = (ime) => {
  const i = argumenti.indexOf(`--${ime}`)
  return i >= 0 ? argumenti[i + 1] : null
}

let zahtevkov = 0
async function prenesi(url) {
  zahtevkov++
  const o = await prenesiSPonovitvami(url, { glave: kff.glave, premorMs: kff.premorMs, fetchFn: kff.fetch, log: () => {} })
  if (!o.ok) {
    const e = new Error(`${url} -> HTTP ${o.status}`)
    e.status = o.status
    throw e
  }
  return o.text()
}

const MAPA = 'scripts/.predpomnilnik/kff'
function izvlecek(id) {
  const p = `${MAPA}/tekma-${id}.json`
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
}

async function seznam() {
  let ids
  const od = vrednost('od')
  if (od) {
    ids = []
    for (let i = Number(od); i <= Number(vrednost('do') ?? od); i++) ids.push(i)
  } else {
    const leto = vrednost('leto') ?? String(new Date().getFullYear())
    ids = tekmeZemljevida(await prenesi(NASLOV_ZEMLJEVIDA)).filter((t) => t.datum?.startsWith(leto)).map((t) => t.id)
  }
  const sezone = new Map()
  let i = 0
  for (const id of ids) {
    const t = izvlecek(id) ?? (await preberiTekmo(prenesi, id))
    if (++i % 50 === 0) console.error(`  ${i}/${ids.length} (zahtevkov ${zahtevkov})`)
    if (t.ni) continue
    if (!sezone.has(t.sezonaId)) sezone.set(t.sezonaId, { ime: t.sezonaIme, tekme: [] })
    sezone.get(t.sezonaId).tekme.push(t)
  }
  for (const [id, s] of [...sezone].sort((a, b) => a[0] - b[0])) {
    const faze = new Map()
    for (const t of s.tekme) faze.set(t.faza, (faze.get(t.faza) ?? 0) + 1)
    const idji = s.tekme.map((t) => t.id)
    console.log(`sezona ${id} "${s.ime}": ${s.tekme.length} tekem (id ${Math.min(...idji)}–${Math.max(...idji)}), datumi ${s.tekme.map((t) => t.datum).sort()[0]} – ${s.tekme.map((t) => t.datum).sort().at(-1)}`)
    const ostaleFaze = [...faze].filter(([f]) => !/^(Тур\s+\d+|Лига\s+\S+|)$/.test(f ?? ''))
    if (ostaleFaze.length) console.log(`  faze zunaj rednega dela: ${ostaleFaze.map(([f, n]) => `${f} (${n})`).join(', ')}`)
    for (const g of skupineSezone(s.tekme))
      console.log(`  skupina: ${g.klubi.length} klubov, ${g.tekem} tekem — ${g.klubi.map((k) => `${k.ime} [${k.id}]`).join(', ')}`)
  }
  console.error(`Zahtevkov: ${zahtevkov}`)
}

async function polno(koda) {
  const tekme = await preberiLigo(koda, prenesi, { log: (v) => console.error(v) })
  const krogi = razporedTekem(tekme)
  const vse = krogi.flatMap((k) => k.tekme)
  const klubi = new Map()
  for (const t of tekme) for (const s of [t.domaci, t.gostje]) {
    if (!klubi.has(s.id)) klubi.set(s.id, new Set())
    klubi.get(s.id).add(s.ime)
  }
  console.log(`${koda}: ${krogi.length} krogov, ${vse.length} tekem, ${klubi.size} klubov, ${vse.filter((t) => t.ura).length} z uro`)
  console.log(`  klubi: ${[...klubi].map(([id, imena]) => `${[...imena].join(' / ')} [${id}]`).join(', ')}`)
  for (const [id, imena] of klubi) if (imena.size > 1) console.log(`  OPOZORILO: klub ${id} ima več imen: ${[...imena].join(', ')}`)
  const odigrane = tekme.filter((t) => t.izid && (t.status === 'finished' || t.tehnicna))
  const kontumacije = odigrane.filter((t) => t.tehnicna)
  console.log(`  odigranih ${odigrane.length}, kontumacij ${kontumacije.length}${kontumacije.length ? ` (${kontumacije.map((t) => `${t.id} ${t.domaci.ime} ${t.izid.domaci}:${t.izid.gostje} ${t.gostje.ime}`).join('; ')})` : ''}`)
  const statusi = new Map()
  for (const t of tekme) statusi.set(t.status, (statusi.get(t.status) ?? 0) + 1)
  console.log(`  statusi: ${[...statusi].map(([s, n]) => `${s} ${n}`).join(', ')}`)

  const s = { zapisnikov: 0, brez: [], golov: 0, golovZap: 0, goliIzid: 0, postav: 0, postav11: 0, vratar: 0, minut990: 0, zRdecim: 0, minuteDrugo: [], nastopov: 0, sKlopi: 0, sSifro: 0, menjav: 0, menjavZMinuto: 0, menjavPolnih: 0, rumenih: 0, rdecih: 0, avtogolov: 0, enajstmetrovk: 0, zgresenih: 0, kapetan: 0, opozoril: 0 }
  const vrste = new Map()
  const opozorila = []
  for (const t of odigrane.filter((x) => !x.tehnicna)) {
    for (const d of t.dogodki ?? []) vrste.set(d.vrsta, (vrste.get(d.vrsta) ?? 0) + 1)
    const z = vZapisnik(t)
    if (!z) { s.brez.push(`${t.id} ${t.datum} ${t.domaci.ime}:${t.gostje.ime}`); continue }
    s.zapisnikov++
    s.golov += z.rezultat.domaci + z.rezultat.gostje
    s.golovZap += z.goli.length
    if (!z.opozorila.some((o) => o.startsWith('goli iz dogodkov'))) s.goliIzid++
    s.menjav += z.menjave.length
    s.menjavZMinuto += z.menjave.filter((m) => m.minuta != null).length
    s.menjavPolnih += z.menjave.filter((m) => m.noter.regSt != null && m.ven.regSt != null).length
    s.rumenih += z.rumeni.length
    s.rdecih += z.rdeci.length
    s.avtogolov += z.goli.filter((g) => g.avtogol).length
    s.enajstmetrovk += z.goli.filter((g) => g.enajstmetrovka).length
    s.zgresenih += z.zgresene.length
    const n = nastopi(z)
    for (const [idx, e] of [z.domaci, z.gostje].entries()) {
      s.postav++
      if (e.postava.length === 11) s.postav11++
      if (e.postava.filter((i) => i.vratar).length === 1) s.vratar++
      if (e.postava.some((i) => i.kapetan)) s.kapetan++
      const minute = n.filter((x) => x.ekipaIdx === idx).reduce((a, x) => a + x.minute, 0)
      if (minute === 990) s.minut990++
      else if (z.rdeci.some((r) => r.ekipaIdx === idx)) s.zRdecim++
      else s.minuteDrugo.push(`${t.id} ${e.ime}: ${minute} (začetnikov ${e.postava.length})`)
    }
    s.nastopov += n.length
    s.sKlopi += n.filter((x) => !x.zacetnik).length
    s.sSifro += n.filter((x) => x.regSt != null).length
    s.opozoril += z.opozorila.length
    for (const o of z.opozorila) opozorila.push(`${t.id} (${t.datum} ${z.domaci.ime} : ${z.gostje.ime}): ${o}`)
  }
  console.log(`  zapisnikov ${s.zapisnikov}; goli dogodkov ${s.golovZap} / izidi ${s.golov}; goli = izid ${s.goliIzid}/${s.zapisnikov}`)
  console.log(`  postav ${s.postav}: po 11 ${s.postav11}, en vratar ${s.vratar}, s kapetanom ${s.kapetan}; 990 minut ${s.minut990}, z rdečim ${s.zRdecim}, drugo ${s.minuteDrugo.length}`)
  console.log(`  nastopov ${s.nastopov} (s klopi ${s.sKlopi}, s šifro ${s.sSifro}); menjav ${s.menjav} (z minuto ${s.menjavZMinuto}, oba igralca ${s.menjavPolnih})`)
  console.log(`  rumenih ${s.rumenih}, rdečih ${s.rdecih}, avtogolov ${s.avtogolov}, 11 m ${s.enajstmetrovk}, zgrešenih 11 m ${s.zgresenih}; opozoril ${s.opozoril}`)
  console.log(`  vrste dogodkov: ${[...vrste].map(([v, n]) => `${v} ${n}`).join(', ')}`)
  if (s.brez.length) console.log(`  odigrane brez zapisnika (${s.brez.length}): ${s.brez.slice(0, 10).join('; ')}`)
  if (s.minuteDrugo.length) console.log(`  minute ≠ 990 brez rdečega: ${s.minuteDrugo.slice(0, 10).join('; ')}`)
  if (zastavica('opozorila')) for (const o of opozorila) console.log(`    ${o}`)
  else if (opozorila.length) console.log(`  prva opozorila: ${opozorila.slice(0, 8).join(' | ')}`)
  console.error(`Zahtevkov: ${zahtevkov}`)
}

try {
  if (vrednost('polno')) await polno(vrednost('polno'))
  else await seznam()
} catch (e) {
  if (e.zavrnitev) {
    console.error(`Ustavljeno: ${e.message}`)
    process.exit(4)
  }
  throw e
}
