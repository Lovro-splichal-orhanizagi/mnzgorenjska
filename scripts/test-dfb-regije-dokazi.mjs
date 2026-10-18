import test from 'node:test'
import assert from 'node:assert/strict'
const api=await import('./preveri-zagona-dfb-regije.mjs').catch(()=>({}))
const offline=await import('./dfb-offline.mjs').catch(()=>({}))
const commit='a'.repeat(40),id='12345',slug='de-regionalliga-nord'
const run={id:12345,head_sha:commit,path:'.github/workflows/preveri-dfb-ligo.yml',event:'workflow_dispatch',status:'completed',conclusion:'success',repository:{full_name:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
const step={name:'Arhiv sezona — brez baze',status:'completed',conclusion:'success'}
const job={id:6789,name:'DFB regionalni audit',run_id:12345,head_sha:commit,status:'completed',conclusion:'success',steps:[step]}
test('actual regional job and exact season capture step establish provenance',()=>{
 assert.equal(typeof api.preveriZagon,'function')
 const check=(r=run,jobs=[job])=>api.preveriZagon(r,id,commit,{slug,season:'2025/26',jobs})
 assert.equal(check().jobId,'6789')
 for(const patch of [{head_sha:'b'.repeat(40)},{path:'.github/workflows/ci.yml'},{event:'push'},{status:'in_progress'}])assert.throws(()=>check({...run,...patch}))
 for(const patch of [{name:'other'},{id:null},{conclusion:'failure'},{steps:[]},{steps:[{...step,conclusion:'skipped'}]},{steps:[{...step,name:'Tekoča sezona — brez baze'}]}])assert.throws(()=>check(run,[{...job,...patch}]))
 assert.throws(()=>check(run,[job,job]))
})
test('offline DFB fetch is closed; database HTTP still delegates normally',async()=>{
 assert.equal(typeof offline.offlineFetch,'function')
 let network=0
 const url='https://datencenter.dfb.de/competitions/test',fetch=offline.offlineFetch(new Map([[url,'body']]),async()=>{network++;return new Response('db')})
 assert.equal(await(await fetch(url)).text(),'body');assert.equal(network,0)
 for(const u of [url+'/missing','http://datencenter.dfb.de/competitions/test','https://datencenter.dfb.de:443/other','https://www.dfb.de/missing','https://datencenter.dfb.de./missing','https://datencenter.dfb.de%2e/missing','https://www.dfb.de./missing','https://dfb.de../missing'])await assert.rejects(()=>fetch(u))
 await assert.rejects(()=>fetch(url,{method:'POST'}))
 assert.equal(network,0);assert.equal(await(await fetch('https://api.slff.eu/rest/v1/players')).text(),'db');assert.equal(network,1)
})
test('offline loader verifies every raw SHA, URL and oldest capture time against approval',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path')
 const {sha,parserSha256}=await import('./vklopi-dfb-regijo.mjs')
 const dir=mkdtempSync(join(tmpdir(),'dfb-regional-proof-'))
 try{
  const body='<html>captured</html>',now=new Date().toISOString(),old=new Date(Date.now()-1000).toISOString(),file=sha(body)+'.html'
  const records=[{url:'https://datencenter.dfb.de/a',at:old,file,sha256:sha(body)},{url:'https://datencenter.dfb.de/b',at:now,file,sha256:sha(body)}]
  writeFileSync(join(dir,file),body);writeFileSync(join(dir,'prenosi.json'),JSON.stringify(records))
  const digest=sha(JSON.stringify(records.map(({url,sha256,at})=>({url,sha256,at}))))
  const m={version:1,slug,sourceCommit:commit,parserSha256:parserSha256(),seasons:['2025/26','2026/27'].map((season,i)=>({season,code:`regionalliga-nord/${i?'2026-2027':'2025-2026'}`,capturedAt:old,runId:'12345',jobId:'6789',documentsSha256:digest,fixtures:Array(306).fill({})}))}
  const load=()=>{const raw=JSON.stringify(m);return offline.loadApprovedDocuments(raw,sha(raw),[dir,dir])}
  assert.equal(load().size,2)
  // Exercise the actual Node preloader in a child. Only authenticated local
  // documents can remove the live provider's courtesy delay.
  const {spawnSync}=await import('node:child_process'),dfb=(await import('./viri/dfb.mjs')).default
  assert.equal(dfb.premorMs,6000)
  const manifestFile=join(dir,'approved.json'),raw=JSON.stringify(m);writeFileSync(manifestFile,raw)
  const probe=`import assert from 'node:assert/strict';import dfb from ${JSON.stringify(new URL('./viri/dfb.mjs',import.meta.url).href)};assert.equal(dfb.premorMs,0);assert.equal(await(await fetch('https://datencenter.dfb.de/a')).text(),'${body}');await assert.rejects(()=>fetch('https://datencenter.dfb.de/not-captured'));assert.equal(await(await fetch('https://api.slff.eu/rest/v1/players')).text(),'db-sentinel');`
  const child=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent("globalThis.fetch=async()=>new Response('db-sentinel')"),'--import',new URL('./dfb-offline.mjs',import.meta.url).href,'--input-type=module','-e',probe],{env:{...process.env,SLFF_DFB_MANIFEST:manifestFile,SLFF_DFB_APPROVED_SHA:sha(raw),SLFF_DFB_ARCHIVE:dir,SLFF_DFB_CURRENT:dir},encoding:'utf8',timeout:30000})
  assert.equal(child.status,0,child.stderr)
  assert.equal(dfb.premorMs,6000,'ordinary provider keeps the source pause outside the isolated preload')
  writeFileSync(join(dir,file),'changed');assert.throws(load,/SHA/);writeFileSync(join(dir,file),body)
  m.seasons[0].capturedAt=now;assert.throws(load,/changed/);m.seasons[0].capturedAt=old
  records[1].url='https://evil.example/b';writeFileSync(join(dir,'prenosi.json'),JSON.stringify(records));assert.throws(load,/uradn/)
  records[1].url='https://datencenter.dfb.de/b';records[1].at=new Date(Date.now()+3600000).toISOString();writeFileSync(join(dir,'prenosi.json'),JSON.stringify(records));assert.throws(load,/future/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
