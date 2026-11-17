// Ločeni, neprekrivajoči se croni nosijo termin; zamik/ponovitev zagona ga
// ne spremeni. Druge države ob vikendih še vedno dobijo vseh 24 terminov.
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function dovoljenUvoz({ drzava, dogodek, urnik }) {
  if (dogodek === 'workflow_dispatch') return true
  if (dogodek !== 'schedule') return false
  if (drzava !== 'HR') return true
  return ['17 5 * * 5,6,0', '17 17,21 * * 5,6,0', '17 5 * * 1-4', '47 6 * * 1-4'].includes(urnik)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const teci = dovoljenUvoz({ drzava: process.env.DRZAVA, dogodek: process.env.GITHUB_EVENT_NAME, urnik: process.env.URNIK })
  console.log(`${process.env.DRZAVA}: ${teci ? 'uvoz' : 'preskok po urniku'}`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `teci=${teci}\n`)
}
