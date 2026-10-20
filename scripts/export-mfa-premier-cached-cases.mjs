// Offline export of exactly four pre-existing Malta Premier cache files.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const FILES = [
  { match: 'mt51309025', kind: 'izid', path: 'scripts/.predpomnilnik/mfa/tekma-51309025-izid.json' },
  { match: 'mt51309025', kind: 'postava', path: 'scripts/.predpomnilnik/mfa/tekma-51309025-postava.json' },
  { match: 'mt52581524', kind: 'izid', path: 'scripts/.predpomnilnik/mfa/tekma-52581524-izid.json' },
  { match: 'mt52581524', kind: 'postava', path: 'scripts/.predpomnilnik/mfa/tekma-52581524-postava.json' },
]
const OUTPUT = 'mfa-premier-cache-audit-output'

export function assemble(entries) {
  if (!Array.isArray(entries) || entries.length !== FILES.length) throw new Error('Expected exactly four fixed cache entries')
  return {
    source: 'mfa exact cached JSON; offline read-only export',
    files: entries.map(({ match, kind, path, raw, value }) => ({
      match, kind, sourcePath: path, artifactFile: `${match}-${kind}.json`,
      bytes: raw.length, sha256: createHash('sha256').update(raw).digest('hex'), value,
    })),
  }
}

export function exportCached() {
  globalThis.fetch = () => { throw new Error('MFA cache export is offline; network access is forbidden') }
  const entries = FILES.map(file => {
    const stat = lstatSync(file.path)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${file.path}: expected a regular cache file`)
    const raw = readFileSync(file.path)
    let value
    try { value = JSON.parse(raw.toString('utf8')) } catch (error) {
      throw new Error(`${file.path}: cached response is not valid JSON`, { cause: error })
    }
    return { ...file, raw, value }
  })
  const manifest = assemble(entries)
  mkdirSync(OUTPUT, { recursive: true })
  for (const file of manifest.files) {
    const source = entries.find(entry => entry.match === file.match && entry.kind === file.kind)
    writeFileSync(`${OUTPUT}/${file.artifactFile}`, source.raw, { flag: 'wx' })
  }
  writeFileSync(`${OUTPUT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = exportCached()
  console.log(`Exported ${manifest.files.length} fixed cached MFA JSON files to ${OUTPUT}/`)
}
