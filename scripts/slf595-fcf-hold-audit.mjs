// One-off retained-only diagnostic. Never imports, fetches sources or repairs rows.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import fcf, {validateFcfSingleReportSource,vZapisnik,naslovZapisnika} from './viri/fcf.mjs'
import {isFcfCurrentPage} from './viri/fcf-current.mjs'
import {fcfReportFits,fcfReportComplete} from './viri/fcf-current-fixtures.mjs'
export const manifest=JSON.parse(readFileSync(new URL('./slf595-fcf-hold-targets.json',import.meta.url),'utf8'))
const MAX_ROWS=30000
export function validateManifest(m) {
 assert.equal(m.run_id,'44693766098');assert.equal(m.cache_key,'zapisniki-ES-k1od1-44693766098-1')
 assert.equal(m.from,'2026-10-30');assert.equal(m.through,'2026-11-20');assert.equal(m.season,'2026/27')
 assert.equal(m.targets.length,163)
 const pairs=new Set(),ids=new Set()
 for(const t of m.targets){
  assert.match(t.slug,/^es-ct-(elit|primera-g[1-9]\d*|segona-g[1-9]\d*|tercera-g[1-9]\d*|quarta-g[1-9]\d*)$/)
  assert.match(t.report_id,/^es[1-9]\d{6}$/)
  pairs.add(`${t.slug}:${t.report_id}`);ids.add(t.report_id)
 }
 assert.equal(pairs.size,163);assert.equal(ids.size,163)
 return m
}
export function auditSql(m=manifest){
 validateManifest(m)
 const hex=Buffer.from(JSON.stringify(m.targets)).toString('hex')
 return `\\set ON_ERROR_STOP on
begin isolation level repeatable read read only;
set local statement_timeout='25s';
set local lock_timeout='3s';
with targets as (select * from jsonb_to_recordset(convert_from(decode('${hex}','hex'),'UTF8')::jsonb) as t(slug text,report_id text)),
competitions_selected as (select c.id,c.slug,c.source,c.source_league_code,c.active,c.source_policy,c.sezona_koledarska from competitions c where c.slug in(select slug from targets)),
fixtures as (select m.id,m.zapisnik_id,m.source_url,m.imported_at,m.kontumacija,m.played_on,
 jsonb_build_object('id',h.id,'name',h.name) home,jsonb_build_object('id',a.id,'name',a.name) away,
 jsonb_build_object('id',r.id,'competition_id',r.competition_id,'season',r.season,'number',r.number) rounds,
 jsonb_build_object('id',oc.id,'slug',oc.slug,'source',oc.source,'source_league_code',oc.source_league_code,'sezona_koledarska',oc.sezona_koledarska) owner_competition
 from matches m join rounds r on r.id=m.round_id join teams h on h.id=m.home_team_id join teams a on a.id=m.away_team_id join competitions oc on oc.id=r.competition_id
 where (r.competition_id in(select id from competitions_selected) and r.season='2026/27')
 or m.zapisnik_id in(select report_id from targets)
 order by m.id limit ${MAX_ROWS+1})
select jsonb_build_object('checked_at',transaction_timestamp(),'read_only',current_setting('transaction_read_only'),
 'competitions',coalesce((select jsonb_agg(c order by c.id) from competitions_selected c),'[]'::jsonb),
 'fixtures',coalesce((select jsonb_agg(f order by f.id) from fixtures f),'[]'::jsonb));
rollback;
`
}
function localFile(file,max=8*1024*1024){
 const s=lstatSync(file);assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.size<=max)
 return readFileSync(file,'utf8')
}
export function retainedReport(dir,t,c){
 let html
 try{html=localFile(join(dir,`acta-${t.report_id.slice(2)}.html`))}
 catch(e){return {state:e.code==='ENOENT'?'missing-retained-capture':'unreadable-retained-capture'}}
 const sha256=createHash('sha256').update(html).digest('hex'),url=naslovZapisnika(t.report_id)
 // Fixed stage labels only: parser/assertion errors can contain player names.
 // These diagnose an evidence gap; no stage can waive native validation.
 let evidenceStage='detect-page-format'
 const block=/^([1-9]\d*)-([1-9]\d*)$/.exec(c.source_league_code??'')
 const numericId=Number(t.report_id.slice(2))
 const inRegisteredBlock=Boolean(block&&Number.isSafeInteger(numericId)&&numericId>=Number(block[1])&&numericId<=Number(block[2]))
 const evidence=()=>({stage:evidenceStage,in_registered_block:inRegisteredBlock})
 try{
  let redirectHtml=null
  if(isFcfCurrentPage(html)){
   evidenceStage='read-redirect-proof'
   const proof=localFile(join(dir,`acta-${t.report_id.slice(2)}.redirect.json`))
   evidenceStage='parse-redirect-proof'
   const p=JSON.parse(proof)
   evidenceStage='bind-redirect-proof'
   assert.equal(p.sha256,sha256);assert.equal(p.id,t.report_id);assert.equal(p.url,url)
   assert.equal(typeof p.redirectHtml,'string');redirectHtml=p.redirectHtml
  }
  evidenceStage='validate-source-identity'
  validateFcfSingleReportSource(html,c.source_league_code,{id:t.report_id,tekmovanje:c,sezona:manifest.season,danes:Date.parse('2026-11-20T07:16:00Z'),redirectHtml})
  evidenceStage='parse-report'
  const z=vZapisnik(html,{id:t.report_id,url,redirectHtml})
  evidenceStage='bind-parsed-report'
  assert.equal(z?.zapisnikId,t.report_id)
  evidenceStage='check-completeness'
  const complete=fcfReportComplete(z,fcf)
  if(complete)evidenceStage='complete'
  return {state:complete?'complete':'parser-or-finality-hold',sha256,z,evidence:evidence()}
 }catch{return {state:'unproven-retained-identity-or-parser',sha256,evidence:evidence()}}
}
export function classifyCandidate(t,c,source,fixtures){
 const out={slug:t.slug,report_id:t.report_id,source_state:source.state,capture_sha256:source.sha256??null,source_evidence:source.evidence??null}
 const owners=fixtures.filter(f=>f.zapisnik_id===t.report_id)
 out.owner_ids=owners.map(f=>f.id)
 if(source.state!=='complete')return {...out,classification:'missing-or-unproven-source-evidence'}
 const z=source.z, parts=/^es-ct-(elit|primera|segona|tercera|quarta)(?:-g([1-9]\d*))?$/.exec(c.slug)
 const competition=parts[1]==='elit'?'LLIGA ELIT':`${parts[1].toUpperCase()} CATALANA`, group=`GRUP ${parts[2]??'1'}`
 const inWindow=z.datum>=manifest.from&&z.datum<=manifest.through
 const league=fixtures.filter(f=>f.rounds.competition_id===c.id&&f.rounds.season===manifest.season)
 const exact=league.filter(f=>fcfReportFits(z,f,manifest.season,fcf.kljucKluba,competition,group))
 const pending=exact.filter(f=>!f.imported_at&&!f.kontumacija&&inWindow&&(!f.zapisnik_id||f.zapisnik_id===t.report_id))
 // Mirrors known-report pinning in the reader: a known ID cannot bind another tuple.
 const known=league.filter(f=>!f.imported_at&&!f.kontumacija&&f.played_on>=manifest.from&&f.played_on<=manifest.through&&f.zapisnik_id===t.report_id)
 const eligible=pending.filter(f=>!known.length||known.some(k=>k.id===f.id))
 let classification='no-exact-native-fixture'
 if(owners.length>1)classification='duplicate-report-ownership'
 else if(exact.some(f=>f.imported_at&&f.zapisnik_id===t.report_id))classification='already-imported-exact'
 else if(owners.length&&!exact.some(f=>f.id===owners[0].id))classification='report-owned-by-different-fixture'
 else if(!inWindow)classification='outside-run-window'
 else if(eligible.length>1)classification='multiple-exact-pending'
 else if(eligible.length===1)classification='unique-exact-pending-now'
 else if(exact.some(f=>f.imported_at))classification='completed-exact-other-report'
 else if(exact.some(f=>f.kontumacija))classification='held-walkover'
 else if(exact.length)classification='exact-tuple-ownership-conflict'
 return {...out,classification,in_run_window:inWindow,exact_ids:exact.map(f=>f.id),eligible_pending_ids:eligible.map(f=>f.id),
  // Near rows help distinguish date/round/team drift. Names never leave memory.
  comparisons:league.filter(f=>f.rounds.number===z.krog||f.played_on===z.datum||f.zapisnik_id===t.report_id).map(f=>({
   match_id:f.id,round_equal:f.rounds.number===z.krog,date_equal:f.played_on===z.datum,
   home_equal:fcf.kljucKluba(f.home.name)===fcf.kljucKluba(z.domaci.ime),away_equal:fcf.kljucKluba(f.away.name)===fcf.kljucKluba(z.gostje.ime),
   imported:Boolean(f.imported_at),forfeit:Boolean(f.kontumacija),report_unassigned:f.zapisnik_id==null,report_equal:f.zapisnik_id===t.report_id}))}
}
// Diagnostic only: do not relabel the extracted warning or waive its identity guard.
// The global owner query can find a match in a different league from the log label.
export function ownerEvidence(t,c,fixtures,dir,read=retainedReport){
 return fixtures.filter(f=>f.zapisnik_id===t.report_id).map(f=>{
  const oc=f.owner_competition
  const base={match_id:f.id,same_competition:f.rounds.competition_id===c.id,
   competition_id:f.rounds.competition_id,imported:Boolean(f.imported_at)}
  if(!oc||oc.id!==f.rounds.competition_id||oc.source!=='fcf'||oc.sezona_koledarska!==false||
    !/^es-ct-(elit|(?:primera|segona|tercera|quarta)-g[1-9]\d*)$/.test(oc.slug??'')||
    !/^[1-9]\d*-[1-9]\d*$/.test(oc.source_league_code??'')||f.rounds.season!==manifest.season)
   return {...base,state:'unproven-owner-context'}
  const target={slug:oc.slug,report_id:t.report_id}
  const source=read(dir,target,oc)
  const check=classifyCandidate(target,oc,source,fixtures)
  return {...base,slug:oc.slug,registered_block:oc.source_league_code,
   imported_at:f.imported_at&&Number.isFinite(Date.parse(f.imported_at))?new Date(f.imported_at).toISOString():null,
   state:'checked-owner-context',source_state:check.source_state,source_evidence:check.source_evidence,
   classification:check.classification,exact_owner:check.exact_ids?.includes(f.id)??false}
 })
}
export function summarize(db,dir,m=manifest,read=retainedReport){
 validateManifest(m);assert.equal(db.read_only,'on');assert.ok(Number.isFinite(Date.parse(db.checked_at)))
 assert.ok(Array.isArray(db.fixtures)&&db.fixtures.length<=MAX_ROWS)
 assert.equal(new Set(db.fixtures.map(f=>f.id)).size,db.fixtures.length)
 assert.ok(Array.isArray(db.competitions))
 const rows=m.targets.map(t=>{
  const cs=db.competitions.filter(c=>c.slug===t.slug);assert.equal(cs.length,1)
  const c=cs[0];assert.equal(c.source,'fcf');assert.equal(c.sezona_koledarska,false)
  assert.match(c.source_league_code,/^[1-9]\d*-[1-9]\d*$/)
  const result=classifyCandidate(t,c,read(dir,t,c),db.fixtures)
  return {...result,registered_competition:{id:c.id,slug:c.slug,block:c.source_league_code},
   owner_evidence:ownerEvidence(t,c,db.fixtures,dir,read)}
 })
 return {run_id:m.run_id,cache_key:m.cache_key,checked_at:db.checked_at,read_only:db.read_only,
  database_basis:'current-readback-not-run-time-snapshot',window:{from:m.from,through:m.through,season:m.season},
  scope:'163 unmatched candidates only; not a classification of all 203 pending fixtures',
  counts:rows.reduce((a,r)=>(a[r.classification]=(a[r.classification]??0)+1,a),{}),rows}
}
export function main(){
 const [cacheDir,out]=process.argv.slice(2);assert.ok(cacheDir&&out)
 assert.equal(process.env.RETAINED_CACHE_KEY,manifest.cache_key,'exact cache restore required')
 assert.ok(process.env.SUPABASE_DB_URL,'database configuration required')
 mkdirSync(out,{recursive:true,mode:0o700})
 const sqlPath=join(out,'audit.sql');writeFileSync(sqlPath,auditSql(),{mode:0o600})
 // psql expands a connection URI from argv, not PGDATABASE; errors stay fixed text.
 const r=spawnSync('psql',['-X','-A','-t','-q','-f',sqlPath,process.env.SUPABASE_DB_URL],{encoding:'utf8',timeout:40000,maxBuffer:32*1024*1024})
 if(r.status!==0)throw Error('read-only database query failed; no classification produced')
 const db=JSON.parse(r.stdout.trim()),summary=summarize(db,cacheDir)
 writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600})
 console.log(JSON.stringify({candidates:summary.rows.length,counts:summary.counts}))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{main()}catch{console.error('FCF retained audit failed; no complete classification produced');process.exitCode=1}
}
