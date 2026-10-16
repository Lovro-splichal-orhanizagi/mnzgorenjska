// Lokalni pregled shranjenega NFG_CmpPartido: brez omrežja in brez baze.
// node scripts/preveri-novanet-izide.mjs pot/do/zapisnika.html
import { readFileSync } from 'node:fs'
import { izidNovanet, preslikaveNovanet } from './viri/novanet-izidi.mjs'

try {
  if (process.argv.length !== 3) throw new Error('Uporaba: node scripts/preveri-novanet-izide.mjs <zapisnik.html>')
  const bajti = readFileSync(process.argv[2])
  // Shranjene strani raziskave so že UTF-8, izvirni pnfg pa ISO-8859-15.
  let html
  try { html = new TextDecoder('utf-8', { fatal: true }).decode(bajti) }
  catch { html = new TextDecoder('iso-8859-15', { fatal: true }).decode(bajti) }
  const kontekst = preslikaveNovanet(html)
  const glava = html.match(/<h2\b(?=[^>]*\bntype\b)[^>]*>[\s\S]*?<\/h2\s*>/i)?.[0]
  if (!glava) throw new Error('novanet: v strani ni znane glave izida (h2.ntype)')
  const izid = izidNovanet(glava, kontekst)
  const vmesniIzidi = [...html.matchAll(/<td\s+nowrap>\s*<strong>([\s\S]*?)<\/strong>/gi)]
    .map((m) => izidNovanet(m[1], kontekst))
  const opozorila = []
  let prejsnji = [0, 0]
  for (const [i, vmesni] of vmesniIzidi.entries()) {
    if (!vmesni || !((vmesni[0] === prejsnji[0] + 1 && vmesni[1] === prejsnji[1]) || (vmesni[1] === prejsnji[1] + 1 && vmesni[0] === prejsnji[0])))
      opozorila.push(`Gol ${i + 1}: vmesni izid ni en gol več kot prejšnji`)
    if (vmesni) prejsnji = vmesni
  }
  if (izid && (prejsnji[0] !== izid[0] || prejsnji[1] !== izid[1]))
    opozorila.push('Glava in seznam golov se ne ujemata; izida ne popravljamo po seznamu golov')
  console.log(JSON.stringify({ izid, vmesniIzidi, opozorila }, null, 2))
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
}
