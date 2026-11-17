#!/usr/bin/env node
// Local evidence collection only. Never imports, prices, activates, or writes a database.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import provider, { izid, jePauza, jeWalkower, vZapisnik, popolnZapisnik } from './viri/pzpn.mjs'

const API = 'https://szpnkielce.pl/wp-json/szpn/v1/proxy'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const isId = value => new RegExp(`^${UUID}$`).test(value)
const hash = value => createHash('sha256').update(value).digest('hex')
const serial = value => JSON.stringify(value, null, 2) + '\n'
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'))
export const LEAGUES = Object.freeze([
  [579, 'pl-sk-a-kielce-1', 'a6cd6f08-26ed-4cc6-8504-80d0e43c0882'],
  [580, 'pl-sk-a-kielce-2', '3f6b628a-737c-47be-8f56-15445e1bd347'],
  [577, 'pl-sk-4-liga', '0e86c2b3-75d3-483b-80a0-4f086352afc5'],
  [583, 'pl-sk-b-kielce-2', '9c6fbee7-a9e5-4abd-84da-13bcf42c2d60'],
  [578, 'pl-sk-okregowa', '1681c4a3-9391-4990-b155-7f2c06535441'],
  [584, 'pl-sk-b-sandomierz', '740e1d89-139f-4fdd-a431-23a7da11b23c'],
  [581, 'pl-sk-a-sandomierz', '64ee2db0-9540-4372-9928-dfe268fc963e'],
  [582, 'pl-sk-b-kielce-1', 'ed980a22-e851-4b47-bf75-5dfbee9f60cc'],
].map(([id, slug, play]) => Object.freeze({ id, slug, code: `swietokrzyski/${play}` })))
export const scheduleUrl = (code, type) => {
  if (!LEAGUES.some(l => l.code === code) || !['results', 'schedule'].includes(type)) throw Error('invalid schedule scope')
  return provider.naslovRazporeda(code).replace('type=schedule', `type=${type}`)
}
export function validateConfig({ manifest, from = '2026-11-06', through = '2026-11-17', completed = [] }) {
  const date = x => /^2026-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x
  const days = (Date.parse(through) - Date.parse(from)) / 86400000 + 1
  if (!date(from) || !date(through) || days < 1 || days > 14 || from < '2026-07-01' || through > new Date().toISOString().slice(0,10)) throw Error('invalid date window: current 2026 season, at most14 days, no future dates')
  if (!Array.isArray(manifest)) throw Error('invalid manifest')
  const rows = manifest.filter(r => r.source === 'pzpn')
  if (rows.length !== 8 || LEAGUES.some(l => rows.filter(r => r.id === l.id && r.slug === l.slug && r.source_league_code === l.code && r.active === true).length !== 1)) throw Error('manifest must match the exact eight current active PZPN leagues')
  if (!Array.isArray(completed)) throw Error('completed manifest must be an array')
  const seen = new Set()
  for (const row of completed) {
    const league = LEAGUES.find(l => l.id === row.id && l.slug === row.slug && l.code === row.code)
    if (!league || seen.has(row.id) || !Array.isArray(row.reportIds) || row.reportIds.some(id => typeof id !== 'string' || !isId(id)) || new Set(row.reportIds).size !== row.reportIds.length) throw Error('invalid completed manifest binding')
    seen.add(row.id)
  }
  const leagues = LEAGUES.map(l => ({ ...l, skip: [...(completed.find(r => r.id === l.id)?.reportIds ?? [])].sort() }))
  return { version: 1, source: 'pzpn', from, through, leagues, maxAttempts: 150, pauseMs: 10000 }
}
export function selectMatches(rows, from, through, completed) {
  return rows.filter(t => {
    const date = String(t.kickoff_at ?? '').slice(0,10)
    return date >= from && date <= through && !completed.has(t.id) && t.state === 'Rozegrany' && !jePauza(t) && !jeWalkower(t) && !!izid(t.score?.final ?? t.score?.full_time)
  }).sort((a,b) => String(a.kickoff_at).localeCompare(String(b.kickoff_at)) || String(a.id).localeCompare(String(b.id)))
}
function immutable(file, data) {
  try { fs.writeFileSync(file, data, { flag: 'wx', mode: 0o600 }) }
  catch (error) {
    if (error.code !== 'EEXIST' || !fs.readFileSync(file).equals(Buffer.from(data))) throw error
  }
}
function atomic(file, value) {
  const temp = `${file}.${process.pid}.tmp`
  const fd = fs.openSync(temp, 'w', 0o600)
  try { fs.writeFileSync(fd, serial(value)); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  fs.renameSync(temp, file)
}
function validatePayload(payload, kind) {
  if (!payload || payload.success !== true) throw Error('source JSON rejected')
  if (kind === 'schedule') {
    if (!Array.isArray(payload.data) || !Number.isInteger(payload.count) || payload.count !== payload.data.length || payload.count > 500 || payload.page !== 1) throw Error('incomplete schedule envelope')
    const ids = new Set()
    for (const t of payload.data) {
      if (!isId(t?.id) || ids.has(t.id) || typeof t.kickoff_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(t.kickoff_at) || !t.host?.name || !t.guest?.name) throw Error('invalid schedule fixture')
      ids.add(t.id)
    }
  } else if (!payload.events || !Array.isArray(payload.events.host?.squad) || !Array.isArray(payload.events.guest?.squad)) throw Error('invalid report envelope')
}

export class RecoveryStore {
  constructor(dir, config, { transport, now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
    this.dir = path.resolve(dir); this.config = config; this.transport = transport; this.now = now; this.sleep = sleep
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 }); fs.chmodSync(this.dir, 0o700)
    this.lock = path.join(this.dir, 'collector.lock')
    try { this.lockFd = fs.openSync(this.lock, 'wx', 0o600); fs.writeFileSync(this.lockFd, serial({ pid: process.pid, startedAt: new Date().toISOString() })) }
    catch { throw Error('collector lock exists; do not remove until its process has stopped and ledger has been inspected') }
    try {
      this.file = path.join(this.dir, 'ledger.json')
      const binding = hash(serial(config))
      this.state = fs.existsSync(this.file) ? read(this.file) : { version: 1, binding, attempts: 0, nextAllowedAt: 0, blocked: null, entries: {} }
      if (this.state.binding !== binding || !Number.isInteger(this.state.attempts) || this.state.attempts < 0 || this.state.attempts > 150 || Object.keys(this.state.entries).length !== this.state.attempts || !Number.isFinite(this.state.nextAllowedAt)) throw Error('ledger binding or attempt accounting invalid')
      if (!this.state.blocked && Object.values(this.state.entries).some(e => e.status === 'attempted')) this.state.blocked = 'interrupted_request'
      fs.mkdirSync(path.join(this.dir, 'raw'), { mode: 0o700, recursive: true })
      fs.mkdirSync(path.join(this.dir, 'snapshots'), { mode: 0o700, recursive: true })
      this.save()
    } catch (error) { this.close(); throw error }
  }
  save() { atomic(this.file, this.state) }
  close() {
    if (this.lockFd !== undefined) { fs.closeSync(this.lockFd); this.lockFd = undefined; fs.unlinkSync(this.lock) }
  }
  stop(reason) { this.state.blocked = reason; this.save(); throw Error(`blocked: ${reason}`) }
  async request(url, kind) {
    if (this.state.blocked) throw Error(`blocked: ${this.state.blocked}`)
    const allowed = kind === 'schedule' ? this.config.leagues.some(l => ['results','schedule'].some(type => url === scheduleUrl(l.code,type))) : kind === 'report' && new RegExp(`^${API.replaceAll('.','\\.')}/pzpn/shared/matches/${UUID}/events\\.json$`).test(url)
    if (!allowed) throw Error('endpoint outside exact public source scope')
    const previous = this.state.entries[url]
    if (previous) {
      if (previous.status !== 'captured') return this.stop('previous_attempt_not_replayable')
      const file = path.join(this.dir, previous.path)
      const bytes = fs.readFileSync(file)
      if (hash(bytes) !== previous.sha256) return this.stop('cache_hash_mismatch')
      const payload = JSON.parse(bytes.toString('utf8')); validatePayload(payload,kind)
      return { ...previous, payload }
    }
    if (this.state.attempts >= 150) throw Error('attempt budget exhausted')
    const wait = Math.max(0,this.state.nextAllowedAt - this.now())
    if (wait) await this.sleep(wait)
    const entry = { url, kind, status: 'attempted', attemptedAt: new Date(this.now()).toISOString() }
    this.state.entries[url] = entry; this.state.attempts++; this.save() // durable before touching network
    let result
    try { result = await this.transport(url) }
    catch { this.state.nextAllowedAt = this.now()+10000; this.save(); return this.stop('transport_failed_no_retry') }
    this.state.nextAllowedAt = this.now()+10000
    entry.httpStatus = result.status
    this.save()
    const bytes = Buffer.from(result.body), text = bytes.toString('utf8')
    if ([401,403,429].includes(result.status) || /<title>\s*(Just a moment|Attention Required|.*blocked)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|challenge-platform\/h\//i.test(text)) return this.stop(`source_refusal_${result.status}`)
    if (result.status !== 200) return this.stop(`http_${result.status}_no_retry`)
    let payload
    try { payload = JSON.parse(text); validatePayload(payload,kind) } catch { return this.stop('invalid_json_or_source_envelope') }
    const sha256 = hash(bytes), relative = `raw/${sha256}.json`
    immutable(path.join(this.dir,relative),bytes)
    Object.assign(entry,{status:'captured',capturedAt:new Date(this.now()).toISOString(),sha256,path:relative,bytes:bytes.length})
    this.save()
    return {...entry,payload}
  }
}

const PYTHON = String.raw`
import base64,json,sys
from curl_cffi import requests
try:
    with requests.Session(impersonate='chrome',trust_env=False) as session:
        response=session.get(sys.argv[1],allow_redirects=False,timeout=60)
    print(json.dumps({'status':response.status_code,'body':base64.b64encode(response.content).decode('ascii')}))
except Exception:
    sys.exit(2)
`
export function pythonTransport(python) {
  if (!path.isAbsolute(python) || !fs.existsSync(python)) throw Error('absolute existing curl_cffi Python required')
  const execute = promisify(execFile)
  return async url => {
    const { stdout } = await execute(python,['-I','-c',PYTHON,url],{
      timeout: 75000, maxBuffer: 32*1024*1024,
      env: { PATH:'/usr/bin:/bin', LANG:'en_US.UTF-8', PYTHONDONTWRITEBYTECODE:'1' },
    })
    const result=JSON.parse(stdout)
    return {status:result.status,body:Buffer.from(result.body,'base64')}
  }
}
function assess(match, capture) {
  try {
    const z=vZapisnik(match,capture.payload)
    if (!z) return {status:'pending',reason:'no_parsed_report'}
    const n=provider.nastopi(z),starters=[z.domaci.postava.length,z.gostje.postava.length]
    const keepers=[z.domaci.postava.filter(p=>p.vratar).length,z.gostje.postava.filter(p=>p.vratar).length]
    const teamMinutes=[0,1].map(i=>n.filter(p=>p.ekipaIdx===i).reduce((s,p)=>s+p.minute,0))
    const complete=popolnZapisnik(capture.payload)&&!z.nepopoln&&!z.prazen&&!z.opozorila.length&&starters.every(x=>x===11)&&keepers.every(x=>x===1)&&n.every(p=>Number.isFinite(p.minute)&&p.minute>=0&&p.minute<=90&&p.regSt!==null)&&teamMinutes.every(x=>x>0&&x<=990)
    return {status:complete?'complete':'pending',reason:complete?null:'parser_quality_hold',validation:{starters,keepers,teamMinutes,appearances:n.length,goals:z.goli.length,score:z.rezultat,warningCount:z.opozorila.length}}
  } catch {return {status:'pending',reason:'parser_failed'}}
}
export async function collect(options, dependencies={}) {
  const config=validateConfig(options),store=new RecoveryStore(options.dir,config,dependencies)
  const snapshot={version:1,source:'pzpn',mode:'local-evidence-only',config,leagues:config.leagues.map(({skip,...league})=>({...league,skippedCompleteIds:skip,status:'pending',schedules:[],reports:[],completeReportIds:[]})),status:'complete'}
  try {
    for(const league of snapshot.leagues) {
      const byId=new Map()
      for(const type of ['results','schedule']) {
        const capture=await store.request(scheduleUrl(league.code,type),'schedule')
        league.schedules.push({type,capture})
        for(const match of capture.payload.data) if(!jePauza(match)) byId.set(match.id,match)
      }
      const matches=selectMatches([...byId.values()],config.from,config.through,new Set(league.skippedCompleteIds))
      // Store selection before report reads so a stopped snapshot retains all pending IDs.
      league.reports=matches.map(match=>({id:match.id,match,status:'pending',reason:'not_fetched'}))
      for(const row of league.reports) {
        const url=provider.naslovZapisnika(league.code,row.id)
        const capture=await store.request(url,'report')
        Object.assign(row,{capture},assess(row.match,capture))
        if(row.status==='complete')league.completeReportIds.push(row.id)
      }
      league.status=league.reports.some(r=>r.status==='pending')?'pending':'complete'
    }
  } catch(error) {
    snapshot.status=store.state.blocked?'blocked':store.state.attempts>=150?'budget_exhausted':'stopped'
    snapshot.reason=store.state.blocked??(store.state.attempts>=150?'attempt_budget_exhausted':'collection_error')
  } finally {
    snapshot.attempts=store.state.attempts
    snapshot.nextAllowedAt=store.state.nextAllowedAt
    if(snapshot.status==='complete'&&snapshot.leagues.some(l=>l.status!=='complete'))snapshot.status='pending'
    const bytes=serial(snapshot),file=path.join(store.dir,'snapshots',`${hash(bytes)}.json`)
    try {immutable(file,bytes)} finally {store.close()}
    snapshot.artifactPath=file
  }
  const file=snapshot.artifactPath;delete snapshot.artifactPath
  return {path:file,snapshot}
}
async function main(argv) {
  if(argv.includes('--help')) {
    console.log('Usage: node scripts/pzpn-collect-recovery.mjs --manifest FILE --out DIR --python ABSOLUTE_PYTHON [--from 2026-11-06 --through 2026-11-17] [--completed FILE]\nManifest: inventory array with exact8 active PZPN rows. Completed: [{id,slug,code,reportIds:[uuid]}].\nPrivate output: ledger.json, collector.lock, raw/<sha256>.json, snapshots/<sha256>.json. Fixed150 attempts,10s after each response. No retries/imports. Reuse same output directory on restart. A stale lock requires operator inspection; never delete an active lock.')
    return
  }
  const args={}
  for(let i=0;i<argv.length;i+=2) {
    if(!['--manifest','--out','--python','--from','--through','--completed'].includes(argv[i])||!argv[i+1]||args[argv[i]]!==undefined)throw Error('invalid CLI arguments; use --help')
    args[argv[i]]=argv[i+1]
  }
  if(!args['--manifest']||!args['--out']||!args['--python'])throw Error('--manifest, --out and --python are required')
  const result=await collect({manifest:read(args['--manifest']),dir:args['--out'],from:args['--from'],through:args['--through'],completed:args['--completed']?read(args['--completed']):[]},{transport:pythonTransport(args['--python'])})
  console.log(JSON.stringify({status:result.snapshot.status,attempts:result.snapshot.attempts,snapshot:result.path,completeReports:result.snapshot.leagues.reduce((s,l)=>s+l.completeReportIds.length,0)}))
  if(!['complete','pending'].includes(result.snapshot.status))process.exitCode=4
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main(process.argv.slice(2)).catch(()=>{console.error('PZPN collection failed; inspect private ledger or use --help');process.exitCode=1})
