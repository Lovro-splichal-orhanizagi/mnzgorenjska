// Izpiše, koliko nizov je prevedenih in katerih ključev prevod še nima.
//   npm run prevodi            # vsi jeziki
//   npm run prevodi -- hr      # samo hrvaščina, s seznamom manjkajočih
import { sl } from '../src/i18n/sl'
import { hr } from '../src/i18n/hr'

type Drevo = { [k: string]: unknown }
const jeList = (v: unknown) => typeof v === 'string' || (typeof v === 'object' && v !== null && 'other' in v)

function listi(d: Drevo, pot = ''): string[] {
  return Object.entries(d).flatMap(([k, v]) => (jeList(v) ? [pot + k] : listi(v as Drevo, `${pot}${k}.`)))
}
function ima(d: Drevo, kljuc: string): boolean {
  let v: unknown = d
  for (const del of kljuc.split('.')) {
    if (typeof v !== 'object' || v === null || !(del in v)) return false
    v = (v as Drevo)[del]
  }
  return jeList(v)
}

const vsi = listi(sl as Drevo)
const jeziki: Record<string, Drevo> = { hr: hr as Drevo }
const izbran = process.argv[2]
for (const [j, slovar] of Object.entries(jeziki)) {
  if (izbran && izbran !== j) continue
  const manjka = vsi.filter((k) => !ima(slovar, k))
  console.log(`${j}: prevedenih ${vsi.length - manjka.length} od ${vsi.length}`)
  if (izbran) for (const k of manjka) console.log(`  ${k}`)
}
