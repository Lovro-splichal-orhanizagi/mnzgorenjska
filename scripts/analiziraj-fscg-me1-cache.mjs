// Fixed two-report, cache-only audit. No input options or source transport.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const REPORTS = [
  { id: 'me8209041', file: 'scripts/.predpomnilnik/fscg/tekma-8209041.html' },
  { id: 'me9278796', file: 'scripts/.predpomnilnik/fscg/tekma-9278796.html' },
]
const OUTPUT = 'fscg-me1-cache-audit-output'

export function povzetek(id, raw) {
  const html = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)
  const sha256 = createHash('sha256').update(raw).digest('hex')
  return Promise.all([import('./viri/comet-auris.mjs'), import('./viri/fscg.mjs')]).then(([{ vZapisnik }, { default: fscg }]) => {
    const z = vZapisnik(html, { id })
    if (!z) throw new Error(`${id}: cached report does not parse to a complete lineup/result`)
    const appearances = fscg.nastopi(z)
    return {
      id,
      rawSha256: sha256,
      teams: [z.domaci.ime, z.gostje.ime],
      score: z.rezultat,
      rosters: [z.domaci, z.gostje].map(team => ({
        team: team.ime,
        starters: team.postava.map(({ ime, st, vratar, dogodki }) => ({ player: ime, shirt: st, goalkeeper: vratar, events: dogodki })),
        substitutes: team.rezerve.map(({ ime, st, vratar, noter, dogodki }) => ({ player: ime, shirt: st, goalkeeper: vratar, minuteOn: noter, events: dogodki })),
      })),
      goalEvents: z.goli.map(({ ekipaIdx, ime, st, minuta, avtogol, enajstmetrovka }) => ({
        team: ekipaIdx === 0 ? z.domaci.ime : z.gostje.ime, player: ime, shirt: st,
        minute: minuta, ownGoal: avtogol, penalty: enajstmetrovka,
      })),
      redCards: z.rdeci.map(({ ekipaIdx, ime, st, minuta }) => ({
        team: ekipaIdx === 0 ? z.domaci.ime : z.gostje.ime, player: ime, shirt: st, minute: minuta,
      })),
      substitutions: z.menjave.map(({ ekipaIdx, minuta, noter, ven }) => ({
        team: ekipaIdx === 0 ? z.domaci.ime : z.gostje.ime, minute: minuta,
        on: noter, off: ven,
      })),
      players: appearances.map(({ ekipa, ime, st, pozicija, zacetnik, minutaOd, minutaDo, minute, goli, rdeci }) => ({
        team: ekipa, player: ime, shirt: st, position: pozicija, started: zacetnik,
        minuteOn: minutaOd, minuteOff: minutaDo, minutes: minute, goals: goli, redCards: rdeci,
      })),
      parserWarnings: z.opozorila,
    }
  })
}

export async function audit() {
  // Make accidental parser transport use impossible during this cache-only job.
  globalThis.fetch = () => { throw new Error('FSCG cache audit is offline; network access is forbidden') }
  const report = []
  mkdirSync(OUTPUT, { recursive: true })
  for (const { id, file } of REPORTS) {
    const raw = readFileSync(file)
    report.push(await povzetek(id, raw))
    writeFileSync(`${OUTPUT}/${id}.html`, raw, { flag: 'wx' })
  }
  writeFileSync(`${OUTPUT}/audit.json`, `${JSON.stringify({ source: 'fscg cached reports', reports: report }, null, 2)}\n`, { flag: 'wx' })
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await audit()
  console.log(`Audited ${REPORTS.length} fixed cached FSCG reports; artifacts saved to ${OUTPUT}/`)
}
