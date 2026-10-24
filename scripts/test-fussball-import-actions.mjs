import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const api=await import('./fussball-import-actions.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',sha='a'.repeat(40),runId='40000000000'
const run=()=>({id:Number(runId),status:'completed',conclusion:'success',event:'workflow_dispatch',head_branch:'main',head_sha:sha,path:'.github/workflows/preveri-fussball-sezono.yml',head_repository:{full_name:repository}})
const artifacts=()=>({artifacts:[{id:123,name:'fussball-season-'+runId,expired:false,size_in_bytes:1024,workflow_run:{id:Number(runId),head_sha:sha,head_repository_id:1}}]})
const options={repository,headSha:sha,runId}
test('only a successful same-repository main audit at the exact checked-out commit is admitted',()=>{
 assert.equal(typeof api.admitFussballAudit,'function')
 assert.deepEqual(api.admitFussballAudit(run(),artifacts(),options),{runId,artifactId:123,artifactName:'fussball-season-'+runId,headSha:sha,repository})
 for(const patch of [{conclusion:'failure'},{status:'in_progress'},{event:'pull_request'},{head_branch:'feature'},{head_sha:'b'.repeat(40)},{path:'.github/workflows/ci.yml'},{head_repository:{full_name:'other/repo'}},{id:123}])assert.throws(()=>api.admitFussballAudit({...run(),...patch},artifacts(),options))
 for(const patch of [{expired:true},{name:'other'},{size_in_bytes:0},{size_in_bytes:600*1024**2},{workflow_run:{id:123,head_sha:sha}},{workflow_run:{id:Number(runId),head_sha:'b'.repeat(40)}}]){const a=artifacts();Object.assign(a.artifacts[0],patch);assert.throws(()=>api.admitFussballAudit(run(),a,options))}
 const a=artifacts();a.artifacts.push(structuredClone(a.artifacts[0]));assert.throws(()=>api.admitFussballAudit(run(),a,options))
 assert.throws(()=>api.admitFussballAudit(run(),artifacts(),{...options,runId:'1;echo bad'}))
})
test('manual import requires the exact inactive German competition',()=>{
 assert.equal(typeof api.assertFussballImportCompetition,'function')
 const code='031EKNM2HG00000LVS5489BUVUR5FS5A-G:2026/27',row={id:9999,slug:'de-test',country_id:44,country_code:'DE',source:'fussball-public',source_policy:null,source_league_code:code,active:false},scope={slug:'de-test',code}
 assert.equal(api.assertFussballImportCompetition(row,scope),row)
 for(const patch of [{active:true},{source:'dfb'},{country_code:'PL'},{country_id:'DE'},{country_id:0},{country_id:null},{country_code:undefined},{slug:'de-other'},{source_league_code:code.replace('2026/27','2025/26')},{source_policy:'other'}, {id:null}])assert.throws(()=>api.assertFussballImportCompetition({...row,...patch},scope))
})
test('manual workflow never executes artifact code, accepts alternate refs or activates leagues',()=>{
 const s=readFileSync(new URL('../.github/workflows/uvoz-fussball-public.yml',import.meta.url),'utf8')
 assert.match(s,/github\.ref == 'refs\/heads\/main'/)
 assert.match(s,/admit --run/);assert.match(s,/preview --capture/)
 assert.match(s,/check-competition/);assert.match(s,/SLFF_FUSSBALL_CAPTURE/)
 assert.match(s,/gh run download/);assert.match(s,/fussball-season-/)
 assert.ok(!/vklopi_ligo|vklop-lige|update.*active|checkout[^\n]*capture/.test(s))
 assert.match(s,/cancel-in-progress: false/)
})
