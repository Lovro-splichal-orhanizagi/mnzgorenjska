import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {captureFussballDirectory} from './fussball-capture-evidence.mjs'
const api=await import('./fussball-season-pilot.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const sha='a'.repeat(40),repository='Lovro-splichal-orhanizagi/mnzgorenjska'
const staffel='03188V27L800000JVS5489BTVU7GTVLE-G',archiveStaffel='02TGLSVQ1800000IVS5489BTVTLPPK10-G'
const seedUrl='https://www.fussball.de/spieltag/bfv-verbandsliga-baden-verbandsliga-herren-saison2627-baden/-/staffel/'+staffel
const archive={seedUrl:'https://www.fussball.de/spieltag/-/staffel/'+archiveStaffel,staffel:archiveStaffel,season:'2025/26',maxRequests:3000}
const environment=()=>({ROLLOUT_CANDIDATE:'',SEED_URL:seedUrl,STAFFEL:staffel,SEASON:'2026/27',MAX_REQUESTS:'1500',REPORTS:'all',ARCHIVE_JSON:JSON.stringify(archive),PRIOR_REQUESTS:'363',TOTAL_REQUEST_CAP:'5000',EXPECTED_SHA:sha,GITHUB_SHA:sha,GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:repository,GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40000000000',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_WORKFLOW_REF:repository+'/.github/workflows/preveri-fussball-sezono.yml@refs/heads/main'})
const validate=e=>api.validateFussballSeasonPilot(e,{headSha:sha})
test('ordinary single-season mode retains the old optional interface and hosted ceiling',()=>{
 assert.equal(typeof api.validateFussballSeasonPilot,'function')
 assert.equal(validate({MAX_REQUESTS:'1000',ARCHIVE_JSON:''}),null)
 assert.throws(()=>validate({MAX_REQUESTS:'3001'}),/budget|requests/i)
})
test('paired plan reserves both ceilings and the recorded 363 prior requests before capture',()=>{
 assert.equal(typeof api.validateFussballSeasonPilot,'function')
 const plan=validate(environment());assert.equal(plan.priorRequests,363);assert.equal(plan.totalRequestCap,5000)
 assert.equal(validate({...environment(),TOTAL_REQUEST_CAP:'4863'}).archive.maxRequests,3000)
 for(const patch of [{TOTAL_REQUEST_CAP:'4862'},{TOTAL_REQUEST_CAP:'5001'},{PRIOR_REQUESTS:'362'},{PRIOR_REQUESTS:'0'},{PRIOR_REQUESTS:'NaN'},{REPORTS:'0'},{MAX_REQUESTS:'3001'},{ARCHIVE_JSON:'{}'},{ARCHIVE_JSON:'null'},{ARCHIVE_JSON:JSON.stringify({...archive,extra:1})},{ARCHIVE_JSON:JSON.stringify({...archive,maxRequests:'3000'})},{ARCHIVE_JSON:JSON.stringify({...archive,seedUrl:archive.seedUrl.replace('www.fussball.de','evil.test')})},{ARCHIVE_JSON:JSON.stringify({...archive,season:'2024/25'})},{SEED_URL:seedUrl+'?x=1'}])assert.throws(()=>validate({...environment(),...patch}),JSON.stringify(patch))
})
test('paired plan requires exact reviewed main, repository, dispatch context and first attempt',()=>{
 for(const patch of [{EXPECTED_SHA:''},{GITHUB_SHA:'b'.repeat(40)},{GITHUB_REPOSITORY:'other/repo'},{GITHUB_REF:'refs/heads/branch'},{GITHUB_EVENT_NAME:'push'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_RUN_ID:''},{GITHUB_WORKFLOW_REF:repository+'/.github/workflows/ci.yml@refs/heads/main'}])assert.throws(()=>validate({...environment(),...patch}),JSON.stringify(patch))
 assert.throws(()=>api.validateFussballSeasonPilot(environment(),{headSha:'b'.repeat(40)}))
})
const original=readFileSync(new URL('./vzorci/de-fussball-schleswig-round16-20261024.html',import.meta.url))
const fixtureStaffel='031AVH9TIC000004VS5489BTVSK8S3O6-G',fixtureSeed='https://www.fussball.de/spieltag/flens-oberliga-schleswig-holstein-oberliga-schleswig-holstein-herren-saison2627-schleswig-holstein/-/staffel/'+fixtureStaffel
const fixtureArchive={...archive,staffel:'02TC3RCRHK000004VS5489BTVVQ0O654-G',seedUrl:'https://www.fussball.de/spieltag/-/staffel/02TC3RCRHK000004VS5489BTVVQ0O654-G'}
const retainedEnvironment=()=>({...environment(),STAFFEL:fixtureStaffel,SEED_URL:fixtureSeed,ARCHIVE_JSON:JSON.stringify(fixtureArchive)})
// A narrow collector isolates handoff policy. Capture and independent replay
// still run the real evidence/client machinery over retained original HTML.
const collector=async({client,seedUrl,staffel,season})=>{await client.read(seedUrl,'round');return {scope:{provider:'fussball',seedUrl,staffel,season},coverage:{sampled:false,rejectedReports:1},rejectedReports:[{reason:'retained semantic hold'}],activationEligible:false}}
async function retained(run,{html=original,fail=false,e=retainedEnvironment()}={}){
 const parent=mkdtempSync(join(tmpdir(),'fussball-pilot-')),directory=join(parent,'capture')
 try{
  const capture=()=>captureFussballDirectory({directory,options:{seedUrl:e.SEED_URL,staffel:e.STAFFEL,season:'2026/27',reportLimit:null,maxRequests:1500},fetchFn:async()=>new Response(html,{headers:{'content-type':'text/html'}}),collectFn:fail?async args=>{await collector(args);throw Error('partial capture')}:collector})
  if(fail)await assert.rejects(capture(),/partial/);else await capture()
  return await run(directory)
 }finally{rmSync(parent,{recursive:true,force:true})}
}
const authorize=directory=>api.authorizeFussballSeasonArchive(directory,retainedEnvironment(),{headSha:sha,collectFn:collector})
test('independent replay permits only the exact adjacent archive despite retained semantic report holds',async()=>{
 assert.equal(typeof api.authorizeFussballSeasonArchive,'function')
 await retained(async directory=>{
  const result=await authorize(directory)
  assert.equal(JSON.parse(readFileSync(join(directory,'result.json'))).coverage.rejectedReports,1)
  assert.equal(result.currentRequests,1);assert.equal(result.cumulativeReserved,3364);assert.deepEqual(result.archive,fixtureArchive)
  await assert.rejects(api.authorizeFussballSeasonArchive(directory,{...retainedEnvironment(),ARCHIVE_JSON:JSON.stringify({...fixtureArchive,seedUrl:fixtureArchive.seedUrl.replace('/-/','/invented/-/')})},{headSha:sha,collectFn:collector}))
  await assert.rejects(api.authorizeFussballSeasonArchive(directory,{...retainedEnvironment(),STAFFEL:archiveStaffel,SEED_URL:archive.seedUrl},{headSha:sha,collectFn:collector}))
 })
})
test('failed, partial, changed bytes, code, scope and understated capture budgets never authorize archive',async()=>{
 assert.equal(typeof api.authorizeFussballSeasonArchive,'function')
 await retained(directory=>assert.rejects(authorize(directory),/incomplete|failed/),{fail:true})
 await retained(async directory=>{
  const path=join(directory,'manifest.json'),raw=readFileSync(path),m=JSON.parse(raw)
  for(const mutate of [x=>x.success=false,x=>x.codeSha256='0'.repeat(64),x=>x.options.staffel=archiveStaffel,x=>x.options.maxRequests=1499,x=>x.options.reportLimit=0,x=>x.snapshot.requests=1501]){
   const changed=structuredClone(m);mutate(changed);writeFileSync(path,JSON.stringify(changed));await assert.rejects(authorize(directory))
  }
  writeFileSync(path,raw);writeFileSync(join(directory,m.documents[0].file),'changed');await assert.rejects(authorize(directory),/bytes|hash/)
 })
})
test('missing or duplicate live archive pairing cannot be supplied by inert markup',async()=>{
 assert.equal(typeof api.authorizeFussballSeasonArchive,'function')
 const html=original.toString(),option=html.match(/<option[^>]+>Saison 25\/26<\/option>/)?.[0];assert.ok(option)
 await retained(directory=>assert.rejects(authorize(directory)),{html:html.replace(option,'').replace('</body>',`<template><select name="saison">${option}</select></template></body>`)})
 await retained(directory=>assert.rejects(authorize(directory)),{html:html.replace(option,option+option)})
})
test('CLI validation fails closed without emitting archive permission on malformed plans',()=>{
 const path=new URL('./fussball-season-pilot.mjs',import.meta.url)
 const child=spawnSync(process.execPath,[path.pathname,'validate'],{env:{...process.env,...environment(),EXPECTED_SHA:'bad'},encoding:'utf8'})
 assert.notEqual(child.status,0);assert.ok(!child.stdout.includes('archive_allowed=true'))
})

test('CLI keeps ordinary mode and validates an exact reviewed paired plan at the checked-out SHA',()=>{
 const script=new URL('./fussball-season-pilot.mjs',import.meta.url).pathname
 const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()
 const child=spawnSync(process.execPath,[script,'validate'],{env:{...process.env,...environment(),EXPECTED_SHA:head,GITHUB_SHA:head},encoding:'utf8'})
 assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).priorRequests,363)
 const ordinary=spawnSync(process.execPath,[script,'validate'],{env:{...process.env,MAX_REQUESTS:'1000',ARCHIVE_JSON:'',ROLLOUT_CANDIDATE:''},encoding:'utf8'})
 assert.equal(ordinary.status,0,ordinary.stderr);assert.equal(JSON.parse(ordinary.stdout),null)
})

test('CLI refuses incomplete originals before granting permission or attempting archive collection',async()=>{
 await retained(async directory=>{
  const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim()
  const output=join(directory,'outputs');writeFileSync(output,'')
  for(const mode of ['authorize','capture-archive']){
   const child=spawnSync(process.execPath,[new URL('./fussball-season-pilot.mjs',import.meta.url).pathname,mode,directory],{env:{...process.env,...retainedEnvironment(),EXPECTED_SHA:head,GITHUB_SHA:head,GITHUB_OUTPUT:output},encoding:'utf8'})
   assert.notEqual(child.status,0);assert.match(child.stderr,/incomplete|failed/);assert.equal(readFileSync(output,'utf8'),'')
  }
 },{fail:true})
})

const badenProof=JSON.parse(readFileSync(new URL('./vzorci/de-fussball-baden-archive-20261026.json',import.meta.url)))
test('reviewed canonical seed preserves exact observed short menu and current parent scope',()=>{
 const canonicalArchive={...archive,...badenProof.archive,observedSeedUrl:badenProof.observedSeedUrl}
 const plan=validate({...environment(),ARCHIVE_JSON:JSON.stringify(canonicalArchive)})
 assert.equal(plan.archive.seedUrl,badenProof.archive.seedUrl)
 assert.equal(plan.archive.observedSeedUrl,badenProof.observedSeedUrl)
 for(const patch of [{seedUrl:badenProof.archive.seedUrl.replace('/bfv-', '/invented-bfv-')},{observedSeedUrl:badenProof.archive.seedUrl}])assert.throws(()=>validate({...environment(),ARCHIVE_JSON:JSON.stringify({...canonicalArchive,...patch})}))
 assert.throws(()=>validate({...environment(),PRIOR_REQUESTS:'361',ARCHIVE_JSON:JSON.stringify(canonicalArchive)}))
})

test('archive authorization binds the exact current short menu even when capture uses a reviewed long seed',async()=>{
 const e={...environment(),ARCHIVE_JSON:JSON.stringify({...archive,...badenProof.archive,observedSeedUrl:badenProof.observedSeedUrl})}
 await retained(async directory=>{
  const allowed=await api.authorizeFussballSeasonArchive(directory,e,{headSha:sha,collectFn:collector})
  assert.equal(allowed.archive.seedUrl,badenProof.archive.seedUrl);assert.equal(allowed.archive.observedSeedUrl,badenProof.observedSeedUrl)
  await assert.rejects(api.authorizeFussballSeasonArchive(directory,{...e,ARCHIVE_JSON:JSON.stringify({...archive,...badenProof.archive})},{headSha:sha,collectFn:collector}),/observed adjacent/)
 },{e,html:readFileSync(new URL('./vzorci/'+badenProof.currentSourceFile,import.meta.url))})
})

test('opt-in rollout candidate must exactly own both observed catalog scopes before source requests',()=>{
 const e={...environment(),ROLLOUT_CANDIDATE:'de-verbandsliga-baden',ARCHIVE_JSON:JSON.stringify({...archive,...badenProof.archive,observedSeedUrl:badenProof.observedSeedUrl})}
 assert.equal(validate(e).rolloutCandidate,'de-verbandsliga-baden')
 for(const patch of [{ROLLOUT_CANDIDATE:'de-other'},{ROLLOUT_CANDIDATE:'de-flens-oberliga-schleswig-holstein'},{ARCHIVE_JSON:''},{STAFFEL:fixtureStaffel,SEED_URL:fixtureSeed},{ARCHIVE_JSON:JSON.stringify({...archive,...badenProof.archive,seedUrl:archive.seedUrl})}])assert.throws(()=>validate({...e,...patch}))
})

test('rollout authorization requires both complete fresh native batches and unchanged main before creating exact dispatch args',async()=>{
 assert.equal(typeof api.authorizeFussballRollout,'function')
 const e={...environment(),ROLLOUT_CANDIDATE:'de-verbandsliga-baden',ARCHIVE_JSON:JSON.stringify({...archive,...badenProof.archive,observedSeedUrl:badenProof.observedSeedUrl})},calls=[]
 const readManifest=path=>({version:path==='current'?1:3,success:true,options:{...(path==='current'?badenProof.current:badenProof.archive),reportLimit:null}})
 const loadCapture=async(path,o)=>{calls.push({path,...o});return {provider:'fussball-public',staffel:o.staffel,season:o.season,activationEligible:false,reports:[{id:'report'}],schedule:[{stevilka:1}],identities:[{source_id:'source',reg_st:1}]}}
 const options={currentDirectory:'current',archiveDirectory:'archive',e,headSha:sha,mainSha:sha}
 const result=await api.authorizeFussballRollout(options,{loadCapture,readManifest})
 assert.deepEqual(result,['workflow','run','uvoz-pl-de-paketa.yml','--repo',repository,'--ref','main','-f','country=DE','-f','expected_sha='+sha,'-f','audit_run=40000000000','-f','candidate=de-verbandsliga-baden','-f','max_requests=1'])
 assert.deepEqual(calls.map(c=>[c.path,c.current]),[['current',true],['archive',false]])
 await assert.rejects(api.authorizeFussballRollout({...options,mainSha:'b'.repeat(40)},{loadCapture:()=>assert.fail('changed main must reject before replay'),readManifest}))
 for(const failedPath of ['current','archive'])await assert.rejects(api.authorizeFussballRollout(options,{readManifest,loadCapture:async(path,o)=>{if(path===failedPath)throw Error('incomplete coverage or stale/fingerprint hold');return loadCapture(path,o)}}),/coverage/)
 await assert.rejects(api.authorizeFussballRollout(options,{readManifest,loadCapture:async(path,o)=>({...await loadCapture(path,o),reports:[]})}))
})
