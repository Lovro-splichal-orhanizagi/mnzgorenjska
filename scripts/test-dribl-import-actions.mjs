import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {admitDriblCapture,assertDriblImportCompetition,checkDriblImportCompetition,previewDriblImport,createDriblDatabaseOnlyFetch,assertDriblImportExecution} from './dribl-import-actions.mjs'
import {captureDriblDirectory,driblScopeCode} from './dribl-capture.mjs'
import {syntheticDriblSeason,closedDriblFetch,fakeDriblClock,driblScope,captureNow} from './dribl-test-fixtures.mjs'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',sha='a'.repeat(40),runId='40000000000',now=new Date('2026-10-24T20:00:00Z'),code=driblScopeCode(driblScope)
const run=()=>({id:Number(runId),status:'completed',conclusion:'success',event:'workflow_dispatch',head_branch:'main',head_sha:sha,path:'.github/workflows/preveri-dribl-paket.yml',head_repository:{full_name:repository},repository:{full_name:repository},created_at:'2026-10-24T18:00:00Z'})
const artifacts=()=>({total_count:1,artifacts:[{id:123,name:'dribl-batch-'+runId,expired:false,size_in_bytes:1024,created_at:'2026-10-24T19:00:00Z',workflow_run:{id:Number(runId),head_sha:sha}}]})
const options={repository,headSha:sha,runId,now}
const competition=()=>({id:1234,slug:'au-nsw-npl',country_id:44,country_code:'AU',source:'dribl-public',source_policy:null,date_only_deadline_policy:null,sezona_koledarska:true,source_league_code:code,active:false})
test('only exact fresh successful same-repository main capture and complete artifact enumeration are admitted',()=>{
 const a=admitDriblCapture(run(),artifacts(),options);assert.equal(a.artifactId,123);assert.equal(a.artifactName,'dribl-batch-'+runId);assert.equal(a.activationEligible,false)
 for(const patch of [{conclusion:'failure'},{status:'in_progress'},{event:'pull_request'},{head_branch:'feature'},{head_sha:'b'.repeat(40)},{path:'.github/workflows/ci.yml'},{head_repository:{full_name:'foreign/repo'}},{repository:{full_name:'foreign/repo'}},{created_at:'2026-10-23T18:00:00Z'},{created_at:'2026-10-25T18:00:00Z'},{id:99}])assert.throws(()=>admitDriblCapture({...run(),...patch},artifacts(),options))
 for(const patch of [{expired:true},{name:'other'},{size_in_bytes:0},{size_in_bytes:600*1024**2},{workflow_run:{id:99,head_sha:sha}},{workflow_run:{id:Number(runId),head_sha:'b'.repeat(40)}},{created_at:'2026-10-23T18:00:00Z'}]){const a=artifacts();Object.assign(a.artifacts[0],patch);assert.throws(()=>admitDriblCapture(run(),a,options))}
 for(const inventory of [{...artifacts(),total_count:2},{...artifacts(),total_count:101},{artifacts:artifacts().artifacts},{total_count:2,artifacts:[...artifacts().artifacts,...artifacts().artifacts]}])assert.throws(()=>admitDriblCapture(run(),inventory,options))
 assert.throws(()=>admitDriblCapture(run(),artifacts(),{...options,runId:'1;echo bad'}))
})
test('competition admission requires the exact inactive AU/calendar/source/policy tuple',()=>{
 assert.equal(assertDriblImportCompetition(competition(),{slug:'au-nsw-npl',code}).id,1234)
 for(const patch of [{id:null},{country_id:null},{country_code:'DE'},{active:true},{source:'mlsz'},{source_policy:'custom'},{date_only_deadline_policy:'custom'},{sezona_koledarska:false},{source_league_code:code+'x'},{slug:'au-other'}])assert.throws(()=>assertDriblImportCompetition({...competition(),...patch},{slug:'au-nsw-npl',code}))
})
function dbFixture(patch={}) {
 const calls=[]
 const db={from(table){return {select(columns,options){
  calls.push({table,columns,options})
  if(table==='competitions')return {eq(){return {maybeSingle:async()=>({data:{...competition(),countries:{code:'AU'}},error:null,...patch.competition})}}}
  return {eq:async()=>({count:0,error:null,...patch[table]})}
 }}}}
 return {calls,db}
}
test('database errors, unknown counts, and existing teams or lineups fail closed',async()=>{
 const {db,calls}=dbFixture();assert.equal((await checkDriblImportCompetition({db,slug:'au-nsw-npl',code})).competition.id,1234);assert.deepEqual(calls.map(c=>c.table),['competitions','fantasy_teams','fantasy_lineups'])
 for(const patch of [{competition:{error:{message:'503'}}},{competition:{data:null}},{fantasy_teams:{count:null}},{fantasy_teams:{count:1}},{fantasy_teams:{error:{message:'503'}}},{fantasy_lineups:{count:1}},{fantasy_lineups:{error:{message:'503'}}}])await assert.rejects(()=>checkDriblImportCompetition({db:dbFixture(patch).db,slug:'au-nsw-npl',code}))
})
test('actual complete original-byte capture replays into a selected native preview without source access',async()=>{
 const root=mkdtempSync(join(tmpdir(),'dribl-action-preview-')),directory=join(root,'capture'),s=syntheticDriblSeason()
 try{await captureDriblDirectory({directory,options:{scopes:[driblScope],maxRequests:100,reportLimit:null,maxPages:100,asOfDate:'2026-10-24'},fetchFn:closedDriblFetch(s.map),...fakeDriblClock()});const preview=await previewDriblImport({directory,code,now:captureNow+2*3600_000});assert.equal(preview.current.reports.length,3);assert.equal(preview.activationEligible,false);assert.equal(preview.archive,null);await assert.rejects(()=>previewDriblImport({directory,code,now:captureNow+25*3600_000}),/stale|fresh/i)}finally{rmSync(root,{recursive:true,force:true})}
})
test('optional archive is selected from the same capture and must be a distinct previous published year',async()=>{
 const archiveScope={...driblScope,season:'7ZKRL1jmkB'},archiveCode=driblScopeCode(archiveScope),calls=[]
 const batch=(scope,year,current)=>({provider:'dribl-public',code:driblScopeCode(scope),scope,activationEligible:false,season:String(year),catalog:{seasons:[{id:driblScope.season,year:2026,isCurrent:true},{id:archiveScope.season,year:2025,isCurrent:false}]},reports:[{id:'one'}],schedule:[{stevilka:1,tekme:[{}]}]})
 const loadCapture=async(dir,s)=>{calls.push({dir,scope:s});return batch(s,s.current?2026:2025,s.current)}
 const p=await previewDriblImport({directory:'/fixed/capture',code,archiveCode,now:now.getTime(),loadCapture});assert.equal(p.archive.season,'2025');assert.ok(calls.every(c=>c.dir==='/fixed/capture'));assert.deepEqual(calls.map(c=>c.scope.current),[true,false])
 await assert.rejects(()=>previewDriblImport({directory:'/fixed/capture',code,archiveCode:code,loadCapture}))
 await assert.rejects(()=>previewDriblImport({directory:'/fixed/capture',code,archiveCode,loadCapture:async(dir,s)=>({...batch(s,s.current?2026:2025,s.current),catalog:{seasons:[{id:driblScope.season,year:2026,isCurrent:true},{id:archiveScope.season,year:2024,isCurrent:false}]}})}),/previous|archive|year/i)
})
test('import network boundary permits exact database origin and rejects all source/redirect attempts without calling fetch',async()=>{
 const calls=[],fetch=createDriblDatabaseOnlyFetch({databaseOrigin:'https://db.fixture.invalid',fetch:async(url,options)=>{calls.push({url:String(url),options});return new Response('[]')}})
 await fetch('https://db.fixture.invalid/rest/v1/players',{method:'POST',body:'{}'})
 for(const url of ['https://mc-api.dribl.com/api/fixtures','https://competitions.footballnsw.com.au/','https://evil.invalid/','https://user:secret@db.fixture.invalid/rest/v1/players'])await assert.rejects(()=>fetch(url),/offline|database/i)
 assert.equal(calls.length,1);assert.equal(calls[0].options.redirect,'error')
})
test('operator execution requires exact first-attempt main checkout and Actions-only database configuration',()=>{
 const env={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_REPOSITORY:repository,GITHUB_RUN_ID:'42',GITHUB_RUN_ATTEMPT:'1'}
 assertDriblImportExecution({expectedSha:sha,headSha:sha,env,envFileExists:false})
 for(const patch of [{headSha:'b'.repeat(40)},{env:{...env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...env,GITHUB_REF:'refs/heads/feature'}},{envFileExists:true}])assert.throws(()=>assertDriblImportExecution({expectedSha:sha,headSha:sha,env,envFileExists:false,...patch}))
})
test('workflow admits and replays exact evidence before every guarded writer, supports one explicit archive, and never activates',()=>{
 const text=readFileSync(new URL('../.github/workflows/uvoz-dribl-public.yml',import.meta.url),'utf8')
 assert.match(text,/run-name: Uvoz lige \$\{\{ inputs.liga \}\} Dribl public/);assert.match(text,/actions: read/);assert.match(text,/cancel-in-progress: false/)
 assert.match(text,/dribl-batch-\$CAPTURE_RUN/);assert.match(text,/SLFF_DRIBL_CAPTURE/);assert.match(text,/SLFF_DRIBL_ARCHIVE_CODE/);assert.match(text,/SLFF_DRIBL_OFFLINE_IMPORT/)
 assert.ok(text.indexOf(' admit --run ')<text.indexOf('gh run download'));assert.ok(text.indexOf(' preview --capture ')<text.indexOf('node scripts/uvoz-razporeda.mjs'))
 for(const file of ['uvoz-razporeda','uvoz-zapisnikov','ugani-pozicije','ovrednoti-igralce','pripravljenost-lige'])assert.ok(text.includes(`scripts/${file}.mjs`))
 assert.ok(!/vklopi_ligo|vklop-lige|vklopi-obstojece|dovoli-aktivno/.test(text));assert.match(text,/--liga "\$SLFF_DRIBL_ARCHIVE_CODE"/)
})
test('actual workflow shell stops before imports on a failed fresh competition guard',async()=>{
 const {writeFileSync,existsSync}=await import('node:fs'),{spawnSync}=await import('node:child_process'),dir=mkdtempSync(join(tmpdir(),'dribl-writer-guard-'))
 try{
  writeFileSync(join(dir,'node'),`#!${process.execPath}\nconst fs=require('node:fs'),args=process.argv.slice(2);fs.appendFileSync(process.env.CALL_LOG,JSON.stringify(args)+'\\n');if(args[0]==='scripts/preveri-dribl-uvoz.mjs'&&process.env.BLOCK_GUARD==='true')process.exit(79);`,{mode:0o755})
  const text=readFileSync(new URL('../.github/workflows/uvoz-dribl-public.yml',import.meta.url),'utf8'),block=text.slice(text.indexOf('      - name: Guarded offline native import')).split('        run: |\n')[1].split('\n      - name:')[0],script=block.split('\n').filter(x=>x.startsWith('          ')).map(x=>x.slice(10)).join('\n')
  for(const blocked of ['true','false']){
   const log=join(dir,blocked+'.jsonl'),result=spawnSync('bash',['-c',script],{encoding:'utf8',timeout:10000,env:{...process.env,PATH:`${dir}:${process.env.PATH}`,CALL_LOG:log,BLOCK_GUARD:blocked,LIGA:'au-nsw-npl',SOURCE_CODE:code,SLFF_DRIBL_ARCHIVE_CODE:code.replace(driblScope.season,'7ZKRL1jmkB'),EXPECTED_SHA:sha}}),calls=existsSync(log)?readFileSync(log,'utf8').trim().split('\n').map(JSON.parse):[]
   assert.equal(calls[0][0],'scripts/preveri-dribl-uvoz.mjs')
   if(blocked==='true'){assert.equal(result.status,79);assert.equal(calls.length,1)}else{assert.equal(result.status,0,result.stderr);for(let i=1;i<calls.length-1;i+=2){assert.equal(calls[i-1][0],'scripts/preveri-dribl-uvoz.mjs');assert.notEqual(calls[i][0],'scripts/preveri-dribl-uvoz.mjs')}assert.equal(calls.at(-1)[0],'scripts/pripravljenost-lige.mjs')}
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
})
