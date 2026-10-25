import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
const api=await import('./prepare-fussball-nightly.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const reviewed=GERMANY_BULK_CANDIDATES[0]
const row={id:123,country_id:4,country_code:'DE',active:true,slug:reviewed.slug,source:reviewed.source,source_league_code:reviewed.source_league_code,source_policy:null}
const now=new Date('2026-10-25T10:00:00.000Z')
function setup(){
 const root=mkdtempSync(join(tmpdir(),'fussball-nightly-')),directory=join(root,'new-capture'),calls=[]
 const captureDirectory=async options=>{calls.push(['capture',options]);mkdirSync(directory);writeFileSync(join(directory,'manifest.json'),JSON.stringify({snapshot:{stopped:false}}))}
 const loadCapture=async(path,options)=>{calls.push(['load',path,options]);return {provider:'fussball-public',staffel:reviewed.source_league_code.split(':')[0],season:reviewed.season,activationEligible:false,reports:[{id:'native-report'}],schedule:[{stevilka:1,tekme:[]}],identities:[{source_id:'test',reg_st:2**52}],provenance:{requests:19}}}
 return {root,directory,calls,captureDirectory,loadCapture,clean:()=>rmSync(root,{recursive:true,force:true})}
}
test('only exact active reviewed German current competition may prepare a nightly capture',()=>{
 assert.equal(typeof api.assertFussballNightlyCompetition,'function')
 assert.equal(api.assertFussballNightlyCompetition(row).seedUrl,reviewed.seedUrl)
 for(const change of [{active:false},{source:'dfb'},{country_code:'AU'},{country_id:null},{id:null},{source_policy:{}},{slug:'de-other'},{source_league_code:reviewed.source_league_code.replace('2026/27','2025/26')}])assert.throws(()=>api.assertFussballNightlyCompetition({...row,...change}))
})
test('nightly prepares full current capture then requires fresh native replay before returning directory',async()=>{
 const f=setup()
 try{
  const result=await api.prepareFussballNightly({candidate:row,directory:f.directory,maxRequests:55,now,captureDirectory:f.captureDirectory,loadCapture:f.loadCapture})
  const [capture,load]=f.calls
  assert.equal(capture[1].directory,f.directory);assert.equal(capture[1].options.reportLimit,null)
  assert.deepEqual(capture[1].options,{seedUrl:reviewed.seedUrl,staffel:reviewed.source_league_code.split(':')[0],season:reviewed.season,maxRequests:55,reportLimit:null,asOfDate:'2026-10-25'})
  assert.equal(load[1],f.directory);assert.equal(load[2].current,true);assert.equal(load[2].now,+now)
  assert.equal(result.directory,resolve(f.directory));assert.equal(result.reports,1);assert.equal(result.source_league_code,row.source_league_code)
 }finally{f.clean()}
})
test('scope, budget and existing directory fail before source collection',async()=>{
 const f=setup()
 try{
  for(const maxRequests of [0,4001,1.5])await assert.rejects(api.prepareFussballNightly({candidate:row,directory:f.directory,maxRequests,captureDirectory:f.captureDirectory}))
  await assert.rejects(api.prepareFussballNightly({candidate:{...row,active:false},directory:f.directory,captureDirectory:f.captureDirectory}))
  mkdirSync(f.directory)
  await assert.rejects(api.prepareFussballNightly({candidate:row,directory:f.directory,captureDirectory:f.captureDirectory}),/exist|new/i)
  assert.equal(f.calls.length,0)
 }finally{f.clean()}
})
test('source failure snapshot sets non-retry exit 4; semantic failure cannot authorize import',async()=>{
 const f=setup()
 try{
  const captureDirectory=async()=>{mkdirSync(f.directory);writeFileSync(join(f.directory,'manifest.json'),JSON.stringify({snapshot:{stopped:true}}));throw Error('capture terminal failure')}
  await assert.rejects(api.prepareFussballNightly({candidate:row,directory:f.directory,now,captureDirectory,loadCapture:f.loadCapture}),e=>e.sourceStop===true&&e.exitCode===4)
  assert.equal(f.calls.length,0,'failed source never reaches native loader')
 }finally{f.clean()}
 const held=setup()
 try{
  await assert.rejects(api.prepareFussballNightly({candidate:row,directory:held.directory,now,captureDirectory:held.captureDirectory,loadCapture:async()=>{throw Error('incomplete full-season coverage')}}),e=>e.exitCode===1&&!e.sourceStop)
 }finally{held.clean()}
})
test('installed source collector distinguishes actual refused response from semantic HTML failure',async()=>{
 for(const status of [403,200]){
  const f=setup();let requests=0,loaded=false
  try{
   await assert.rejects(api.prepareFussballNightly({candidate:row,directory:f.directory,maxRequests:1,
    fetchFn:async()=>{requests++;return new Response('<html><body>no valid public competition identity</body></html>',{status,headers:{'content-type':'text/html'}})},
    loadCapture:async()=>{loaded=true;throw Error('must not reach loader')},
   }),e=>e.exitCode===(status===403?4:1)&&!!e.sourceStop===(status===403))
   assert.equal(requests,1);assert.equal(loaded,false)
  }finally{f.clean()}
 }
})
test('loader scope mismatch and empty report proof are rejected',async()=>{
 for(const patch of [{season:'2025/26'},{provider:'dfb'},{activationEligible:true},{reports:[]}]){
  const f=setup(),load=f.loadCapture
  try{await assert.rejects(api.prepareFussballNightly({candidate:row,directory:f.directory,now,captureDirectory:f.captureDirectory,loadCapture:async(...args)=>({...await load(...args),...patch})}))}finally{f.clean()}
 }
})
test('CLI requires explicit bounded arguments, exact DB row and exposes output path',async()=>{
 assert.equal(typeof api.runFussballNightlyCli,'function')
 let reads=0,prepares=0
 const dependencies={readCompetition:async slug=>{reads++;assert.equal(slug,row.slug);return row},prepare:async options=>{prepares++;assert.equal(options.candidate,row);assert.equal(options.maxRequests,42);return {directory:options.directory}}}
 const result=await api.runFussballNightlyCli(['--tekmovanje',row.slug,'--output','/tmp/test-nightly-new','--max-requests','42'],dependencies)
 assert.equal(result.directory,'/tmp/test-nightly-new');assert.equal(reads,1);assert.equal(prepares,1)
 for(const args of [[],['--tekmovanje',row.slug,'--output','/tmp/x'],['--tekmovanje',row.slug,'--output','/tmp/x','--max-requests','4001'],['--tekmovanje',row.slug,'--output','/tmp/x','--max-requests','1','--unknown','x']])await assert.rejects(api.runFussballNightlyCli(args,dependencies))
 assert.equal(reads,1,'argument rejection occurs before database read')
 await assert.rejects(api.runFussballNightlyCli(['--tekmovanje',row.slug,'--output','/tmp/x','--max-requests','1'],{...dependencies,readCompetition:async()=>({...row,active:false})}))
 assert.equal(prepares,1,'inactive row never prepares a source capture')
})
