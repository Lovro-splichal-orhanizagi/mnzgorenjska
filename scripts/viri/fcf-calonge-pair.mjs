import { createHash } from 'node:crypto'

const SOURCE_PATH = ['', 'ca', 'competicio', 'acta', '4116202']
const SOURCE_URL = 'https://www.fcf.cat/ca/competicio/acta/4116202'
const SOURCE_SHA = 'ffe7a5e9dd542b92f2050e7357acf8d16a7f788acef3485ed8d193b2001a87f1'
const CANONICAL_SHA = '0abbed1f6484ffe80e7c6b9d2a4aa46ac4222a777732da8211572df51799eb2f'
const sha256 = text => createHash('sha256').update(text).digest('hex')

/** One reviewed source omission; a changed candidate requires a new evidence review. */
export function doplniCalongeMenjavo(z, { sourcePath, sourceSha256 } = {}) {
  const candidate = sourcePath?.at(-1) === '4116202' || z?.zapisnikId === 'es4116202' || z?.url === SOURCE_URL
  if (!candidate) return z
  const reject = () => { throw new Error('fcf: spremenjen zapisnik4116202 z dokazano dopolnitvijo menjave — potreben ponoven pregled') }
  if (JSON.stringify(sourcePath) !== JSON.stringify(SOURCE_PATH) || sourceSha256 !== SOURCE_SHA ||
      (z?.zapisnikId != null && z.zapisnikId !== 'es4116202') || (z?.url != null && z.url !== SOURCE_URL)) reject()

  // Full registration, full name, side and role; never choose by shirt or a name fragment.
  const sides = [z.domaci, z.gostje]
  const participants = sides.flatMap((team, side) => [
    ...team.postava.map(player => ({ player, side, starter: true })),
    ...team.rezerve.map(player => ({ player, side, starter: false })),
  ])
  const unique = (regSt, name, starter) => {
    const matches = participants.filter(x => x.player.regSt === regSt)
    if (matches.length !== 1 || matches[0].side !== 0 || matches[0].starter !== starter ||
        matches[0].player.ime !== name || matches[0].player.zacetnik !== starter ||
        matches[0].player.preklopi.length !== 0) reject()
    return matches[0].player
  }
  const incoming = unique(31287135, 'Bouhmara Boulhout Mohamed', false)
  const outgoing = unique(48680949, 'Adairak Dairak Mohamed', true)
  // Bind all other parsed facts too, including every goal's running score, player/event and clocks13/87.
  if (sha256(JSON.stringify({ ...z, zapisnikId: null, url: null })) !== CANONICAL_SHA) reject()

  incoming.preklopi = [75]
  outgoing.preklopi = [75]
  z.dopolnitveMenjav = [{
    vrsta: 'dokazana-manjkajoca-menjava', ekipaIdx: 0, noter: 31287135, ven: 48680949, minuta: 75,
    izvorno: { noter: [], ven: [] }, popravljeno: { noter: [75], ven: [75] },
    dokazi: [
      { url: SOURCE_URL, sha256: SOURCE_SHA, zajetoUTC: '2026-10-18T12:31:46.880Z' },
      { url: 'https://uecalonge.com/partits/ue-calonge-vs-fc-vilablareix/',
        sha256: 'ed3ea30673cc8cc80d145d27e091bd356853f966806b532b2c4877d5d655d5a3', zajetoUTC: '2026-10-17T22:47:33.134775Z' },
    ],
    vezava: 'enolicni-polni-FCF-registraciji-in-imeni; domaci-rezerva/zacetnik; izrecni-imenski-par-in-profila-kluba',
    preverjeno: '2026-10-18',
  }]
  return z
}
