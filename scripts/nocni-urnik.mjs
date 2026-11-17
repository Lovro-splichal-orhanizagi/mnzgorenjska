// Enaka odločitev za vse koše, tudi če čakajo ali se posel ponovi naslednji dan.
// zacetek je created_at ZAGONA, ne ura zagona posameznega koša.
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function dovoljenUvoz({ drzava, dogodek, urnik, zacetek, izbranaDrzava = '' }) {
  if (dogodek === 'workflow_dispatch') return !izbranaDrzava || izbranaDrzava === drzava
  if (dogodek !== 'schedule') return false
  if (drzava !== 'HR') return true
  if (['17 5 * * 1-4', '47 6 * * 1-4'].includes(urnik)) return true
  if (urnik !== '17 * * * 5,6,0') return false
  return [5, 17, 21].includes(new Date(zacetek).getUTCHours())
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const teci = dovoljenUvoz({ drzava: process.env.DRZAVA, dogodek: process.env.GITHUB_EVENT_NAME,
    urnik: process.env.URNIK, zacetek: process.env.ZACETEK_URNIKA, izbranaDrzava: process.env.IZBRANA_DRZAVA })
  console.log(`${process.env.DRZAVA}: ${teci ? 'uvoz' : 'preskok po urniku/izboru države'}`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `teci=${teci}\n`)
}
