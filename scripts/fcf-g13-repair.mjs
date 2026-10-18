// Fixed operational entry point. No source requests, arbitrary SQL/path arguments,
// service-role API writes or persistent database helpers.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export function validateInput({ odvecni, obdrzi, pisi='false', approved_sha256='', ref }) {
  if (ref !== 'refs/heads/main') throw Error('G13 requires main')
  if (odvecni !== '10388' || obdrzi !== '8371') throw Error('G13 requires exactly 10388 -> 8371')
  if (!['false','true'].includes(pisi)) throw Error('Explicit boolean pisi required')
  if (pisi === 'true' ? !/^[a-f0-9]{64}$/.test(approved_sha256) : approved_sha256 !== '') throw Error('Apply requires a reviewed lowercase SHA256; preview requires no approval')
  return { apply:pisi === 'true', approved:approved_sha256 }
}
const read = name => readFileSync(new URL(name,import.meta.url),'utf8')
// JSON is versioned in the checkout; SQL string literals use doubled quotes.
const literal = value => `'${value.replaceAll("'","''")}'`
export function sessionSQL() {
  return `set local lock_timeout='10s';
set local statement_timeout='180s';
set local idle_in_transaction_session_timeout='120s';
set local search_path=public,pg_temp;
create temporary table g13_input(plan jsonb,fks jsonb) on commit drop;
insert into g13_input values(${literal(read('fcf-g13-plan.json'))}::jsonb,${literal(read('fcf-g13-fks.json'))}::jsonb);
${read('fcf-g13-repair.sql')}`
}
export function transactionSQL({apply,approved}) {
  if (typeof apply !== 'boolean' || (apply && !/^[a-f0-9]{64}$/.test(approved))) throw Error('Invalid transaction input')
  return `begin isolation level read committed;\n${sessionSQL()}\nselect pg_temp.fcf_g13_repair(${apply},${apply?literal(approved):'null'});\n${apply?'commit':'rollback'};\n`
}
function connectionEnvironment(uri) {
  const u=new URL(uri)
  if (!['postgres:','postgresql:'].includes(u.protocol) || !u.hostname || !u.username) throw Error('Database prerequisite missing')
  return {...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:decodeURIComponent(u.pathname.slice(1)||'postgres'),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:u.searchParams.get('sslmode')||'prefer',PGCONNECT_TIMEOUT:'15',PGAPPNAME:'slff-fcf-g13-repair'}
}
function main() {
  if (process.argv.length>3 || (process.argv[2] && process.argv[2]!=='--check')) throw Error('No arbitrary arguments accepted')
  const input=validateInput({odvecni:process.env.ODVECNI,obdrzi:process.env.OBDRZI,pisi:process.env.PISI,approved_sha256:process.env.APPROVED_SHA256,ref:process.env.GITHUB_REF})
  if (process.argv[2]==='--check') return
  if (process.env.GITHUB_ACTIONS!=='true' || process.env.MIGRACIJE_PREMOR==='1') throw Error('Workflow execution prerequisites missing or paused')
  if (!process.env.SUPABASE_DB_URL) throw Error('Database prerequisite missing')
  const dir='fcf-g13-repair', path=`${dir}/result.json`
  if (existsSync(dir)) throw Error('Evidence directory already exists')
  mkdirSync(dir)
  const env=connectionEnvironment(process.env.SUPABASE_DB_URL)
  try {
    const out=execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{env,input:transactionSQL(input),encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']})
    const evidence=JSON.parse(out.trim())
    if (!/^[a-f0-9]{64}$/.test(evidence.sha256) || evidence.mode!==(input.apply?'apply':'preview')) throw Error('Invalid database evidence')
    writeFileSync(path,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'})
    console.log(`${evidence.mode}: ${evidence.sha256}; evidence: ${path}`)
  } catch (error) {
    // Never dump psql diagnostics, connection arguments or row DETAIL values.
    const stderr=String(error.stderr??'')
    const reason=error.code==='ETIMEDOUT' ? 'database process timeout; inspect state before retry'
      : /(?:^|\n)(?:psql:[^\r\n]*: )?ERROR:[ \t]+canceling statement due to statement timeout\r?(?:\n|$)/.test(stderr)
        ? 'database statement timeout; inspect state before retry'
        : stderr.match(/ERROR:\s+G13: ([A-Za-z0-9 ._\/-]+)/)?.[1]??'database execution failed; inspect state before retry'
    writeFileSync(path,JSON.stringify({version:1,status:'failed-or-unknown',reason})+'\n',{flag:'wx'})
    throw Error(reason)
  }
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {main()} catch(error) {console.error(error.message);process.exitCode=1}
}
