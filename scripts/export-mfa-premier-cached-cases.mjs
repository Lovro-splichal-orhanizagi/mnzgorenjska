// Offline export of exactly fourteen pre-existing Malta Premier cache files.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const REPORT_IDS = Object.freeze(['51309025', '52581524', '51718561', '52072685', '53142122', '53142546', '53142793'])
const FILES = Object.freeze(REPORT_IDS.flatMap(id => ['izid', 'postava'].map(kind => ({
  match: `mt${id}`, kind, relativePath: `scripts/.predpomnilnik/mfa/tekma-${id}-${kind}.json`,
}))))
const OUTPUT = 'mfa-premier-cache-audit-output'

export function assemble(entries) {
  if (!Array.isArray(entries) || entries.length !== FILES.length) throw new Error('Expected exactly fourteen fixed cache entries')
  return {
    source: 'mfa exact cached JSON; offline read-only export',
    files: entries.map(({ match, kind, path, raw, value }) => ({
      match, kind, sourcePath: path, artifactFile: `${match}-${kind}.json`,
      bytes: raw.length, sha256: createHash('sha256').update(raw).digest('hex'), value,
    })),
  }
}

export function exportCached({ cacheRoot = '.', outputDir = OUTPUT } = {}) {
  globalThis.fetch = () => { throw new Error('MFA cache export is offline; network access is forbidden') }
  const entries = FILES.map(file => {
    const path = join(cacheRoot, file.relativePath)
    const stat = lstatSync(path)
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${path}: expected a regular cache file`)
    const raw = readFileSync(path)
    let value
    try { value = JSON.parse(raw.toString('utf8')) } catch (error) {
      throw new Error(`${path}: cached response is not valid JSON`, { cause: error })
    }
    return { ...file, path, raw, value }
  })
  const manifest = assemble(entries)
  mkdirSync(outputDir, { recursive: true })
  for (const file of manifest.files) {
    const source = entries.find(entry => entry.match === file.match && entry.kind === file.kind)
    writeFileSync(join(outputDir, file.artifactFile), source.raw, { flag: 'wx' })
  }
  writeFileSync(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = exportCached()
  console.log(`Exported ${manifest.files.length} fixed cached MFA JSON files to ${OUTPUT}/`)
}
