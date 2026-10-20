// Fixed six-report, cache-only audit for ME2 timing warnings. No input options or source transport.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const REPORTS = [
  'me8209907', 'me8209916', 'me8209927', 'me8209941', 'me8209982', 'me9279753',
].map(id => ({ id, file: `scripts/.predpomnilnik/fscg/tekma-${id.slice(2)}.html` }))
const OUTPUT = 'fscg-me2-cache-audit-output'

export async function povzetek(id, raw) {
  const html = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)
  const rawSha256 = createHash('sha256').update(raw).digest('hex')
  const [{ vZapisnik }, { default: fscg }] = await Promise.all([
    import('./viri/comet-auris.mjs'), import('./viri/fscg.mjs'),
  ])
  const z = vZapisnik(html, { id })
  if (!z) throw new Error(`${id}: cached report does not parse to a complete lineup/result`)
  const appearances = fscg.nastopi(z)
  return {
    id, rawSha256, teams: [z.domaci.ime, z.gostje.ime], score: z.rezultat,
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
      team: ekipaIdx === 0 ? z.domaci.ime : z.gostje.ime, minute: minuta, on: noter, off: ven,
    })),
    players: appearances.map(({ ekipa, ime, st, pozicija, zacetnik, minutaOd, minutaDo, minute, goli, rdeci }) => ({
      team: ekipa, player: ime, shirt: st, position: pozicija, started: zacetnik,
      minuteOn: minutaOd, minuteOff: minutaDo, minutes: minute, goals: goli, redCards: rdeci,
    })),
    parserWarnings: z.opozorila,
  }
}

export async function audit() {
  // Make accidental parser transport use impossible during this cache-only job.
  globalThis.fetch = () => { throw new Error('FSCG cache audit is offline; network access is forbidden') }
  const reports = []
  mkdirSync(OUTPUT, { recursive: true })
  for (const { id, file } of REPORTS) {
    const raw = readFileSync(file)
    reports.push(await povzetek(id, raw))
    writeFileSync(`${OUTPUT}/${id}.html`, raw, { flag: 'wx' })
  }
  writeFileSync(`${OUTPUT}/audit.json`, `${JSON.stringify({ source: 'fscg cached reports', reports }, null, 2)}\n`, { flag: 'wx' })
  return reports
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await audit()
  console.log(`Audited ${REPORTS.length} fixed cached FSCG reports; artifacts saved to ${OUTPUT}/`)
}
