// Lokalni pregled že prenesene pisave: brez omrežja in brez baze.
// node scripts/preveri-fussball-pisavo.mjs <pisava.woff> '<besedilo po razpakiranju entitet HTML>'
import { readFileSync } from 'node:fs'
import { preslikavaPisave, dekodirajIme } from './viri/fussball-pisava.mjs'

try {
  if (process.argv.length !== 4) throw new Error('Uporaba: node scripts/preveri-fussball-pisavo.mjs <pisava.woff> <besedilo>')
  const pisava = preslikavaPisave(readFileSync(process.argv[2]))
  console.log(JSON.stringify({ sha256: pisava.sha256, besedilo: dekodirajIme(process.argv[3], pisava) }, null, 2))
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
}
