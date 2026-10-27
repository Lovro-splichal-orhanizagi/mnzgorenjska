import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
import {FUSSBALL_COMMUNITY_SOURCE_POLICY as policy} from './fussball-community-policy.mjs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
const api=await import('./replay-fussball-cards.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const candidate=GERMANY_BULK_CANDIDATES.find(c=>c.communityCards===true),code=candidate.source_league_code,sha='a'.repeat(40),repo='Lovro-splichal-orhanizagi/mnzgorenjska'
const environment=()=>({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:repo,GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_RUN_ID:'40000000000',GITHUB_RUN_ATTEMPT:'1',GITHUB_EVENT_NAME:'schedule',GITHUB_WORKFLOW_REF:repo+'/.github/workflows/replay-fussball-cards.yml@refs/heads/main'})
function database({policyPatch={},rowPatch={},jobs={}}={}){
 const calls=[],row={id:99,slug:candidate.slug,source:'fussball-public',source_league_code:code,source_policy:policy,country_id:4,...rowPatch},jobMap=new Map(Object.entries(jobs).map(([code,rows])=>[code,rows.slice()]))
 const db={calls,from(table){const q={select(){return q},eq(key,value){if(table==='competitions')assert.equal(value,candidate.slug);if(table==='countries')assert.equal(value,4);return q},async maybeSingle(){return {data:table==='competitions'?row:{code:'DE'},error:null}}};return q},async rpc(name,args){calls.push([name,args]);if(name==='get_fussball_card_policy')return {data:{installed:true,enabled:true,source_policy:policy,current_code:code,archive_codes:candidate.archives.map(a=>a.code),...policyPatch},error:null};if(name==='get_fussball_card_replay_jobs'){assert.equal(args.p_limit,1);return {data:jobMap.get(args.p_code)?.splice(0,1)??[],error:null}}if(name==='defer_fussball_card_replay')return {data:true,error:null};if(name==='apply_fussball_card_report')return {data:{applied:true,match_id:args.p_match_id,revision_sha256:args.p_revision_sha,resolution_sha256:args.p_resolution_sha},error:null};throw Error('unexpected RPC '+name)}}
 return db
}
function genuineJobs(){
 const read=n=>readFileSync(new URL('./vzorci/de-fussball-community/'+n,import.meta.url)),w=JSON.parse(read('provenance.json')),fonts=Object.fromEntries(Object.entries(w.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}])),main=read('report.html').toString()
 const envelope=razberiFantasyZapisnik(main,read('lineup.html').toString(),{fonts,id:w.matchId,lineupId:w.matchId,season:w.season,cardPolicy:'community-v1'}).cardEnvelope
 const red=envelope.cards.find(c=>c.type==='second_yellow'),first=envelope.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal),p=envelope.roster.find(p=>p.side===red.side&&!p.goalkeeper&&!p.starter&&!main.includes(p.sourceId.split('-').at(-1)))
 const base={revision_sha256:envelope.revisionSha256,resolution_sha256:'b'.repeat(64),envelope,candidates:envelope.roster.map((p,i)=>({source_id:p.sourceId,player_id:i+1,team_id:p.side+1}))}
 return [{...structuredClone(base),match_id:1,resolutions:{[red.eventKey]:p.sourceId}},{...structuredClone(base),match_id:2,resolutions:{[red.eventKey]:p.sourceId,[first.eventKey]:p.sourceId}}]
}
test('worker runs real retained parser and atomic runtime, defers invalid consensus and continues to a valid job',async()=>{
 assert.equal(typeof api.runFussballCardReplayWorker,'function');const db=database({jobs:{[code]:genuineJobs()}})
 const result=await api.runFussballCardReplayWorker({db,runId:'40000000000'})
 assert.deepEqual([result.processed,result.applied,result.held],[2,1,1]);assert.equal(db.calls.filter(([name])=>name==='defer_fussball_card_replay').length,1)
 const apply=db.calls.find(([name])=>name==='apply_fussball_card_report');assert.equal(apply[1].p_match_id,2);assert.ok(apply[1].p_nastopi.length>=22);assert.equal(apply[1].p_nastopi.filter(a=>a.red_cards===1).length,1)
 assert.ok(!JSON.stringify(result).includes('base64'));assert.ok(!JSON.stringify(result).includes('sourceId'))
})
test('ten total jobs remain fair between exact current/archive scopes and never retry an apply',async()=>{
 const archive=candidate.archives[0].code,jobs=Array.from({length:12},(_,i)=>({match_id:i+1,revision_sha256:'a'.repeat(64),resolution_sha256:'b'.repeat(64)})),db=database({jobs:{[code]:jobs,[archive]:jobs.map(j=>({...j,match_id:j.match_id+100}))}}),seen=[]
 const r=await api.runFussballCardReplayWorker({db,runId:'40000000000',processJob:async job=>{seen.push(job.code);return {status:'APPLIED'}}})
 assert.equal(r.processed,10);assert.equal(seen.filter(c=>c===code).length,5);assert.equal(seen.filter(c=>c===archive).length,5)
 assert.equal(db.calls.filter(([name])=>name==='get_fussball_card_replay_jobs').length,10)
})
test('disabled or uninstalled plain competition has no jobs; foreign installed scope fails before job access',async()=>{
 for(const db of [database({policyPatch:{enabled:false}}),database({rowPatch:{source_policy:null}})]){assert.equal((await api.runFussballCardReplayWorker({db,runId:'2'})).processed,0);assert.ok(!db.calls.some(([n])=>n==='get_fussball_card_replay_jobs'))}
 for(const patch of [{installed:false},{current_code:'foreign'},{archive_codes:[]},{source_policy:null}]){const db=database({policyPatch:patch});await assert.rejects(api.runFussballCardReplayWorker({db,runId:'2'}));assert.ok(!db.calls.some(([n])=>n==='get_fussball_card_replay_jobs'))}
})
test('corrupt originals and an ambiguous apply are fatal and cannot continue or retry',async()=>{
 for(const corruption of [true,false]){
  const jobs=genuineJobs().reverse();if(corruption)jobs[0].envelope.bundle.report.base64=Buffer.from('corrupt').toString('base64')
  const db=database({jobs:{[code]:jobs}}),rpc=db.rpc;db.rpc=async(name,args)=>{if(!corruption&&name==='apply_fussball_card_report'){db.calls.push([name,args]);throw Error('lost commit response')};return rpc(name,args)}
  await assert.rejects(api.runFussballCardReplayWorker({db,runId:'40000000000'}));assert.equal(db.calls.filter(([name])=>name==='get_fussball_card_replay_jobs').length,1)
  assert.equal(db.calls.filter(([name])=>name==='apply_fussball_card_report').length,corruption?0:1);assert.equal(db.calls.filter(([name])=>name==='defer_fussball_card_replay').length,0)
 }
})
test('CLI requires exact GitHub main first attempt and refuses local .env or unknown manual selection before database access',async()=>{
 assert.equal(typeof api.runFussballCardReplay,'function')
 const options={env:environment(),headSha:sha,envFileExists:false,db:database()}
 assert.equal((await api.runFussballCardReplay(['check'],options)).allowed,true)
 for(const patch of [{GITHUB_ACTIONS:'false'},{GITHUB_REF:'refs/heads/feature'},{GITHUB_EVENT_NAME:'push'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_REPOSITORY:'foreign/repo'},{GITHUB_SHA:'f'.repeat(40)},{GITHUB_WORKFLOW_REF:repo+'/.github/workflows/other.yml@refs/heads/main'}])await assert.rejects(api.runFussballCardReplay(['run'],{...options,env:{...environment(),...patch}}))
 await assert.rejects(api.runFussballCardReplay(['run'],{...options,envFileExists:true}));await assert.rejects(api.runFussballCardReplay(['run','--liga','de-unknown'],options));await assert.rejects(api.runFussballCardReplay(['run','--limit','100'],options))
 assert.equal((await api.runFussballCardReplay(['run','--liga',candidate.slug],options)).processed,0)
})
test('database request boundary blocks football URLs and unreviewed RPCs instead of following redirects',async()=>{
 assert.equal(typeof api.createFussballCardReplayFetch,'function');let requests=0
 const request=api.createFussballCardReplayFetch('https://db.invalid',async(url,o)=>{requests++;assert.equal(o.redirect,'error');return Response.json({})})
 for(const url of ['https://www.fussball.de/spiel/-/spiel/'+ 'A'.repeat(32),'https://db.invalid/rest/v1/rpc/unreviewed_write','https://evil.invalid/rest/v1/rpc/get_fussball_card_policy'])await assert.rejects(request(url,{method:'POST'}))
 await request('https://db.invalid/rest/v1/rpc/get_fussball_card_policy',{method:'POST'});assert.equal(requests,1)
})
test('the same acknowledged job cannot be written twice and malformed job inventories fail closed',async()=>{
 const job={match_id:1,revision_sha256:'a'.repeat(64),resolution_sha256:'b'.repeat(64)},db=database({jobs:{[code]:[job,job]}});let writes=0
 await assert.rejects(api.runFussballCardReplayWorker({db,runId:'40000000000',processJob:async()=>{writes++;return {status:'APPLIED'}}}),/no retry/);assert.equal(writes,1)
 for(const data of [null,{},[job,job]]){const db=database(),rpc=db.rpc;db.rpc=async(name,args)=>name==='get_fussball_card_replay_jobs'?{data,error:null}:rpc(name,args);await assert.rejects(api.runFussballCardReplayWorker({db,runId:'2'}))}
})
test('the actual CLI redacts database error details and dummy credentials without any network request',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{spawnSync,execFileSync}=await import('node:child_process')
 const dir=mkdtempSync(join(tmpdir(),'card-cli-redaction-')),preload=join(dir,'deny-fetch.mjs'),counter=join(dir,'attempts'),canary='PRIVATE_CARD_RAW_AND_DUMMY_SECRET'
 try{
  writeFileSync(preload,`import {appendFileSync} from 'node:fs';globalThis.fetch=async()=>{appendFileSync(${JSON.stringify(counter)},'x');throw Error(${JSON.stringify(canary)})}`)
  const localSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),r=spawnSync(process.execPath,['--import',preload,new URL('./replay-fussball-cards.mjs',import.meta.url).pathname,'run'],{env:{PATH:process.env.PATH,...environment(),GITHUB_SHA:localSha,SUPABASE_URL:'https://db.invalid',SUPABASE_SERVICE_ROLE_KEY:canary},encoding:'utf8'})
  assert.equal(r.status,1);assert.equal(readFileSync(counter,'utf8'),'x','database failures are never retried');assert.equal(r.stdout,'');assert.ok(!r.stderr.includes(canary));assert.match(r.stderr,/replay stopped; inspect private native state/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
