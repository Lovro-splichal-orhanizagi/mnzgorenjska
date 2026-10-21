// Ordinary CLI replay, using only authenticated retained source bytes.
import { lstatSync, readFileSync, appendFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'

const types = { 'mt-nl1': '2601267', 'mt-nl2': '6234492' }
const fail = message => { throw Error(`MFA sealed replay: ${message}`) }
export function mfaCacheFileForURL(input, league) {
  const type = types[league], u = new URL(input)
  if (!type || u.origin !== 'https://api.mfa.com.mt' || u.username || u.password || u.hash) fail('foreign source origin or league')
  const match = /^\/api\/matches\/([1-9]\d{0,11})(?:\/(result|lineup))?$/.exec(u.pathname)
  if (match && !u.search) return match[2] ? `tekma-${match[1]}-${match[2] === 'result' ? 'izid' : 'postava'}.json` : `po-sifri-${match[1]}.json`
  const list = new RegExp(`^/api/competitions/${type}/(standings|pastMatches|upcomingMatches)$`).exec(u.pathname)
  if (!list || !['2026', '2027'].includes(u.searchParams.get('season'))) fail('foreign source competition or season')
  const year = u.searchParams.get('season')
  if (list[1] === 'standings' && u.searchParams.size === 1) return `standings-${type}-${year}.json`
  if (list[1] !== 'standings' && u.searchParams.size === 3 && u.searchParams.get('pageSize') === '50' && /^([1-9]|[1-3][0-9]|40)$/.test(u.searchParams.get('page'))) return `${list[1]}-${type}-${year}-${u.searchParams.get('page')}.json`
  fail('unexpected source query')
}

export function installMfaSealedGuard({ league, cacheRoot, logPath, databaseURL }) {
  if (!types[league] || !cacheRoot || !logPath || !databaseURL) fail('fixed league, cache, log and database required')
  const original = globalThis.fetch, database = new URL(databaseURL), dir = resolve(cacheRoot)
  if (database.username || database.password || database.search || database.hash || database.pathname !== '/' || !['http:', 'https:'].includes(database.protocol) || database.origin === 'https://api.mfa.com.mt') fail('invalid database origin')
  globalThis.fetch = async (input, options = {}) => {
    const u = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
    if (u.origin === database.origin) return original(input, options)
    const method = String(options.method ?? input?.method ?? 'GET').toUpperCase()
    if (method !== 'GET') fail('source mutation forbidden')
    let file = mfaCacheFileForURL(u, league), path = join(dir, file), stat
    try { stat = lstatSync(path) } catch (error) {
      // Scheduled metadata may only have the ordinary downloader's retained name.
      // Existing canonical bodies, including unsafe/corrupt ones, never fall back.
      if (error.code !== 'ENOENT' || !/^po-sifri-[1-9]\d*[.]json$/.test(file)) fail(`missing authenticated cached body ${file}`)
      file = file.replace('po-sifri-', 'tekma-'); path = join(dir, file)
      try { stat = lstatSync(path) } catch { fail(`missing authenticated cached body ${file}`) }
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024) fail('unsafe cached body')
    const body = readFileSync(path)
    try { JSON.parse(body) } catch { fail('invalid cached JSON') }
    appendFileSync(logPath, JSON.stringify({ mode: 'retained-cache-replay', url: u.href, file, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), actualProviderRequests: 0 }) + '\n')
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}

if (process.env.MFA_NL_SEALED_CACHE) installMfaSealedGuard({ league: process.env.MFA_NL_LEAGUE, cacheRoot: process.env.MFA_NL_SEALED_CACHE, logPath: process.env.MFA_NL_READ_LOG, databaseURL: process.env.SUPABASE_URL })
