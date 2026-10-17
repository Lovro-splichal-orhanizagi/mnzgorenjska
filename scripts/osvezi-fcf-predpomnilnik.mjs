// Deliberately only cache eviction: no provider transport or database mutation.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, unlinkSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, parse, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

// Verified 2026/27 configuration; a new season requires a reviewed block map.
export const BLOKI_2026_27 = Object.freeze({
  'es-ct-elit': '4106968-4107207',
  'es-ct-primera-g1': '4108646-4108885',
  'es-ct-primera-g2': '4108886-4109125',
  'es-ct-primera-g3': '4109126-4109365',
  'es-ct-segona-g1': '4109388-4109627',
  'es-ct-segona-g2': '4109630-4109869',
  'es-ct-segona-g3': '4109870-4110109',
  'es-ct-segona-g4': '4110110-4110349',
  'es-ct-segona-g5': '4110354-4110593',
  'es-ct-segona-g6': '4110598-4110837',
  'es-ct-tercera-g1': '4115948-4116187',
  'es-ct-tercera-g2': '4116188-4116427',
  'es-ct-tercera-g3': '4116428-4116667',
  'es-ct-tercera-g4': '4115228-4115467',
  'es-ct-tercera-g5': '4115468-4115707',
  'es-ct-tercera-g6': '4116668-4116907',
  'es-ct-tercera-g7': '4116908-4117147',
  'es-ct-tercera-g8': '4117389-4117628',
  'es-ct-tercera-g9': '4118349-4118588',
  'es-ct-tercera-g10': '4119498-4119737',
  'es-ct-tercera-g11': '4118591-4118830',
  'es-ct-tercera-g12': '4118835-4119074',
  'es-ct-tercera-g13': '4119076-4119315',
  'es-ct-tercera-g14': '4117629-4117868',
  'es-ct-tercera-g15': '4117869-4118108',
  'es-ct-tercera-g16': '4114505-4114744',
  'es-ct-tercera-g17': '4114745-4114984',
})
const fail = message => { throw new Error(`FCF osvezitev: ${message}`) }
function actionsOnly(env, sourceCommit) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== 'Lovro-splichal-orhanizagi/mnzgorenjska' || !/^\d+$/.test(env.GITHUB_RUN_ID ?? '') || !/^[a-f0-9]{40}$/.test(sourceCommit ?? '') || env.GITHUB_SHA !== sourceCommit)
    fail('Zahteva repository Actions na istem commitu.')
}
function currentSeason(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit' }).formatToParts(now).map(p => [p.type, p.value]))
  const y = Number(parts.year) - (Number(parts.month) < 7 ? 1 : 0)
  return `${y}/${String(y + 1).slice(-2)}`
}
function selectedIds(ids) {
  const selected = typeof ids === 'string' ? ids.split(',').map(x => x.trim()) : []
  if (!selected.length || selected.length > 8 || selected.some(x => !/^es[1-9]\d{6}$/.test(x)) || new Set(selected).size !== selected.length)
    fail('Zahteva 1–8 unikatnih es zapisnikov, locenih z vejico.')
  return selected
}
function validate({ competition: c, season, now, arhiv, zapisnik, tekoca, dovoliManjKlubov, prepisiAktivno }, selected) {
  if (arhiv || zapisnik || tekoca !== true || dovoliManjKlubov || prepisiAktivno) fail('Nezdruzljiv arhiv/zapisnik/tekoca/override nacin.')
  if (!c || !Object.hasOwn(BLOKI_2026_27, c.slug) || c.source !== 'fcf' || c.country_code !== 'ES' || c.active !== false || c.sezona_koledarska !== false || !Number.isSafeInteger(c.id) || c.id < 1)
    fail('Samo 27 neaktivnih zgornjih FCF skupin ES.')
  if (season !== '2026/27' || season !== currentSeason(now)) fail('Napacna tekoca sezona.')
  if (c.source_league_code !== BLOKI_2026_27[c.slug]) fail('Blok lige ni pregledana konfiguracija.')
  const [start, end] = c.source_league_code.split('-').map(Number)
  if (selected.some(x => Number(x.slice(2)) < start || Number(x.slice(2)) > end)) fail('Zapisnik je zunaj bloka lige.')
}
function statOrMissing(path) {
  try { return lstatSync(path) } catch (e) { if (e.code === 'ENOENT') return null; throw e }
}
// Walk every ancestor even when the target is missing: a missing cache below a
// symlinked scripts/ directory must not become an apparently harmless no-op.
function checkedFile(path) {
  const absolute = resolve(path), base = parse(absolute).root, pieces = relative(base, absolute).split('/'); let cursor = base
  for (let i = 0; i < pieces.length; i++) {
    cursor = join(cursor, pieces[i])
    const stat = statOrMissing(cursor)
    if (!stat) return null
    if (stat.isSymbolicLink()) fail('Symlink v poti predpomnilnika.')
    if (i < pieces.length - 1 && !stat.isDirectory()) fail('Prednik ni directory/mapa.')
    if (i === pieces.length - 1) { if (!stat.isFile()) fail('Cilj ni regular datoteka.'); return stat }
  }
}
export function osvezi(options) {
  const { root = process.cwd(), env = process.env, sourceCommit, now = Date.now(), onAudit = () => {} } = options
  const audit = { version: 1, phase: 'preflight', sourceCommit, slug: options.competition?.slug ?? null, season: options.season ?? null, selected: [], files: [] }
  try {
    actionsOnly(env, sourceCommit)
    audit.selected = selectedIds(options.ids)
    validate({ ...options, now }, audit.selected)
    // Complete semantic + filesystem preflight BEFORE the first unlink.
    const targets = audit.selected.map(id => {
      const path = `scripts/.predpomnilnik/fcf/acta-${id.slice(2)}.html`, absolute = resolve(root, path), stat = checkedFile(absolute)
      return { absolute, file: { id, path, status: stat ? 'pending' : 'missing', ...(stat ? { oldSha256: createHash('sha256').update(readFileSync(absolute)).digest('hex'), oldMtimeMs: stat.mtimeMs } : {}) } }
    })
    audit.files = targets.map(t => t.file)
    audit.phase = 'validated'; onAudit(audit)
    for (const { absolute, file } of targets) if (file.status === 'pending') {
      unlinkSync(absolute); file.status = 'removed'; onAudit(audit)
    }
    audit.phase = 'complete'; onAudit(audit)
    return audit
  } catch (e) {
    audit.phase = 'failed'; audit.error = e.message; onAudit(audit); throw e
  }
}
export async function preberiCilj(db, slug) {
  const { data: c, error } = await db.from('competitions')
    .select('id,slug,active,source,source_league_code,sezona_koledarska,countries(code)').eq('slug', slug).single()
  if (error || !c) fail(error?.message ?? 'Liga manjka.')
  const { data: season, error: seasonError } = await db.rpc('sezona_lige', { p_competition_id: c.id })
  if (seasonError || typeof season !== 'string') fail(seasonError?.message ?? 'Sezona manjka.')
  const { countries, ...competition } = c
  return { competition: { ...competition, country_code: countries?.code }, season }
}
async function main() {
  // Configuration is Actions environment only; never load local credentials.
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  actionsOnly(process.env, sourceCommit)
  const output = resolve('release/fcf-refresh/audit.json')
  const onAudit = audit => { mkdirSync(resolve('release/fcf-refresh'), { recursive: true }); writeFileSync(output, JSON.stringify(audit, null, 2) + '\n') }
  try {
    const { SUPABASE_URL: base, SUPABASE_SERVICE_ROLE_KEY: key } = process.env
    if (!base || !key || new URL(base).protocol !== 'https:') fail('Manjka Actions konfiguracija baze.')
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(base, key, { auth: { persistSession: false } })
    const target = await preberiCilj(db, process.env.LIGA)
    const result = osvezi({ ...target, sourceCommit, ids: process.env.FCF_OSVEZI, arhiv: process.env.ARHIV, zapisnik: process.env.ZAPISNIK, tekoca: process.env.TEKOCA === 'true', dovoliManjKlubov: Boolean(process.env.DOVOLI_MANJ_KLUBOV), prepisiAktivno: Boolean(process.env.DOVOLI_AKTIVNO), onAudit })
    console.log(`FCF: ${result.files.filter(f => f.status === 'removed').length} odstranjenih, ${result.files.filter(f => f.status === 'missing').length} manjkajocih. Revizija: release/fcf-refresh/audit.json`)
  } catch (e) {
    // Keep failures before target read reviewable without serializing credentials
    // or arbitrary DB/transport error text into a downloadable artifact.
    try { readFileSync(output) } catch { onAudit({ version: 1, phase: 'failed', sourceCommit, error: 'Preflight/metadata read failed; see Actions step.' }) }
    throw e
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
