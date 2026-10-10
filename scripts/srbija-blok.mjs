// Iz ene znane šifre tekme COMET poišče blok tekmovanja-sezone na fss.rs
// (vir `fssid`) in izpiše šifro lige, število klubov, klube 1. kroga in ali je
// liga članska (zapisnik ima četrtega sodnika in kontrolorja sojenja —
// mladinske lige jih nimajo).
//
//   node scripts/srbija-blok.mjs 75912400
//
// Meja: od šifre navzven v korakih 1, 2, 4, … do prve "Utakmica ne postoji",
// nato bisekcija. Blok mora imeti N×(N−1) šifer; če jih nima, sta se zlila dva
// bloka ali ima blok luknjo — preveri ročno. Vljudno: 3 s med zahtevki, strani
// se hranijo v scripts/.predpomnilnik/fssid (iste kot pri uvozu).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { glavaStrani, razberiKodo, stanjeStrani } from './viri/fssid.mjs'
import { naslovIzvestaja } from './viri/fss.mjs'

const MAPA = 'scripts/.predpomnilnik/fssid'
const id0 = Number(process.argv[2])
if (!id0) {
  console.error('Uporaba: node scripts/srbija-blok.mjs <šifra tekme COMET>')
  process.exit(1)
}
mkdirSync(MAPA, { recursive: true })

async function stran(id) {
  const pot = `${MAPA}/tekma-${id}.html`
  if (existsSync(pot)) return readFileSync(pot, 'utf8')
  await new Promise((r) => setTimeout(r, 3000))
  const o = await fetch(naslovIzvestaja(id), { headers: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' } })
  if (!o.ok) throw new Error(`${naslovIzvestaja(id)}: HTTP ${o.status} — ustavljam`)
  const html = await o.text()
  if (stanjeStrani(html) === 'neznano') throw new Error(`${naslovIzvestaja(id)} ni stran tekme (izziv?) — ustavljam`)
  writeFileSync(pot, html)
  return html
}
const obstaja = async (id) => stanjeStrani(await stran(id)) !== 'ne-postoji'

async function meja(id, smer) {
  let dobro = id
  let korak = 1
  while (korak <= 1024 && (await obstaja(id + smer * korak))) {
    dobro = id + smer * korak
    korak *= 2
  }
  let slabo = id + smer * korak
  while (Math.abs(slabo - dobro) > 1) {
    const sred = Math.floor((dobro + slabo) / 2)
    if (await obstaja(sred)) dobro = sred
    else slabo = sred
  }
  return dobro
}

if (!(await obstaja(id0))) {
  console.error(`Tekme ${id0} ni.`)
  process.exit(1)
}
const od = await meja(id0, -1)
const do_ = await meja(id0, +1)
const koda = `${od}-${do_}`
let blok
try {
  blok = razberiKodo(koda)
} catch (e) {
  console.error(`${e.message} — preveri ročno.`)
  process.exit(1)
}
const prvi = []
for (let id = od; id < od + blok.naKrog; id++) prvi.push({ id, html: await stran(id) })
const clanska = prvi.some((p) => /Četvrti sudija/.test(p.html) && /Kontrolor suđenja/.test(p.html))
const g = glavaStrani(prvi[0].html)
console.log(`šifra lige: ${koda}`)
console.log(`klubov: ${blok.klubov}, krogov: ${blok.krogov}, prvi datum: ${g.datum ?? '(neodigrana)'}`)
console.log(`članska: ${clanska ? 'da (četrti sudija in kontrolor)' : 'NE — verjetno mladinska ali neodigrana'}`)
for (const p of prvi) {
  const t = glavaStrani(p.html)
  console.log(`  ${p.id}  ${t.domaci} : ${t.gostje}${t.izid ? `  ${t.izid.domaci}:${t.izid.gostje}` : ''}`)
}
