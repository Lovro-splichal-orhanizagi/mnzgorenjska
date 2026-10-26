import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {fussballBulkCacheDocuments} from './fussball-capture-evidence.mjs'
import {loadGermanyPack} from './bulk-germany-source.mjs'
const api=await import('./fussball-paired-pack.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const hash=b=>createHash('sha256').update(b).digest('hex')
const current={staffel:'03188V27L800000JVS5489BTVU7GTVLE-G',season:'2026/27',seedUrl:'https://www.fussball.de/spieltag/-/staffel/03188V27L800000JVS5489BTVU7GTVLE-G'}
const archive={staffel:'02TGLSVQ1800000IVS5489BTVTLPPK10-G',season:'2025/26',seedUrl:'https://www.fussball.de/spieltag/-/staffel/02TGLSVQ1800000IVS5489BTVTLPPK10-G'}
const candidate={slug:'de-test',source:'fussball-public',country_code:'DE',host:'www.fussball.de',source_league_code:current.staffel+':'+current.season,season:current.season,seedUrl:current.seedUrl,archives:[{code:archive.staffel+':'+archive.season,season:archive.season,seedUrl:archive.seedUrl}]}
const auditSha=/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA??'')?process.env.GITHUB_SHA:'a'.repeat(40)
const audit={current:{runId:'40000000000',artifactId:123,artifactName:'fussball-season-40000000000',headSha:auditSha,repository:'Lovro-splichal-orhanizagi/mnzgorenjska'},archive:{runId:'40000000000',artifactId:124,artifactName:'fussball-season-archive-40000000000',headSha:auditSha,repository:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
function setup(){
 const root=mkdtempSync(join(tmpdir(),'fussball-pair-')),bytes=Buffer.from('original current seed'),document={url:current.seedUrl,kind:'round',sha256:hash(bytes),bytes:bytes.length,status:200,contentType:'text/html',capturedAt:'2026-10-27T00:00:00.001Z'},attempt={number:1,url:document.url,kind:'round',startedAt:document.capturedAt,status:'success',error:null,httpStatus:200}
 const cm={version:1,success:true,createdAt:'2026-10-27T00:00:00.000Z',completedAt:'2026-10-27T00:00:01.000Z',codeSha256:'b'.repeat(64),options:{...current,reportLimit:null},documents:[{...document,file:'documents/'+document.sha256+'.html'}],snapshot:{attempts:[attempt]}}
 const am={version:3,success:true,createdAt:'2026-10-27T00:00:02.000Z',completedAt:'2026-10-27T00:00:03.000Z',codeSha256:'b'.repeat(64),options:{...archive,reportLimit:null},documents:[],archiveParent:{current:structuredClone(current),document,originalReceipt:{version:1,document,attempt,capture:{createdAt:cm.createdAt,codeSha256:cm.codeSha256,staffel:current.staffel,season:current.season}},file:'archive-parent/'+document.sha256+'.html'}}
 for(const [name,m]of [['current',cm],['archive',am]]){mkdirSync(join(root,name));writeFileSync(join(root,name,'manifest.json'),JSON.stringify(m));writeFileSync(join(root,name,'attempts.jsonl'),'original journal\n');writeFileSync(join(root,name,'result.json'),'original result\n')}
 mkdirSync(join(root,'current','documents'));writeFileSync(join(root,'current',cm.documents[0].file),bytes);mkdirSync(join(root,'archive','archive-parent'));writeFileSync(join(root,'archive',am.archiveParent.file),bytes)
 // Capture parser/coverage/fingerprint checks are independently exercised by
 // loadFussballImportCapture tests. This seam isolates cross-capture binding.
 const calls=[],loadCapture=async(d,o)=>{calls.push(o);return {provider:'fussball-public',staffel:o.staffel,season:o.season,schedule:[{stevilka:1,tekme:[]}],reports:[{id:o.season}],identities:[],activationEligible:false,provenance:{createdAt:JSON.parse(readFileSync(join(d,'manifest.json'))).createdAt}}}
 writeFileSync(join(root,'manifest.json'),JSON.stringify({version:1,provider:'germany-paired-fussball',candidate,audit,current:'current',archive:'archive'}))
 return {root,cm,am,calls,dependencies:{catalog:[candidate],loadCapture},clean:()=>rmSync(root,{recursive:true,force:true})}
}
test('paired pack binds separate originals and passes each exact season through the import verifier',async()=>{
 assert.equal(typeof api.loadFussballPairedPack,'function')
 const f=setup();try{
 const pack=await api.loadFussballPairedPack(f.root,{candidate,now:new Date('2026-10-27T01:00:00Z')},f.dependencies)
 assert.deepEqual(pack.seasons.map(s=>s.code),[candidate.source_league_code,candidate.archives[0].code]);assert.equal(pack.captured_at,f.cm.createdAt);assert.match(pack.original_bytes_sha256,/^[a-f0-9]{64}$/)
 assert.deepEqual(f.calls.map(o=>o.current),[true,false]);assert.equal(readFileSync(join(f.root,'current','attempts.jsonl'),'utf8'),'original journal\n')
 }finally{f.clean()}
})
test('paired pack rejects a foreign parent seed, receipt, scope, capture version or future archive',async()=>{
 assert.equal(typeof api.loadFussballPairedPack,'function')
 for(const mutate of [f=>f.am.archiveParent.originalReceipt.capture.createdAt='2026-10-26T23:59:59.000Z',f=>f.am.archiveParent.document.sha256='c'.repeat(64),f=>f.am.archiveParent.current.seedUrl+='x',f=>f.am.options.staffel=current.staffel,f=>f.cm.version=2,f=>f.am.version=1,f=>f.am.createdAt='2026-10-28T00:00:00.000Z',f=>f.cm.success=false]){
 const f=setup();try{mutate(f);writeFileSync(join(f.root,'current','manifest.json'),JSON.stringify(f.cm));writeFileSync(join(f.root,'archive','manifest.json'),JSON.stringify(f.am));await assert.rejects(api.loadFussballPairedPack(f.root,{candidate,now:new Date('2026-10-27T01:00:00Z')},f.dependencies))}finally{f.clean()}
 }
})
test('paired pack propagates coverage/fingerprint/freshness rejection and rejects symlink evidence',async()=>{
 assert.equal(typeof api.loadFussballPairedPack,'function')
 const f=setup();try{
 await assert.rejects(api.loadFussballPairedPack(f.root,{candidate,now:new Date('2026-10-27T01:00:00Z')}, {...f.dependencies,loadCapture:async()=>{throw Error('capture code fingerprint differs')}}),/fingerprint/)
 rmSync(join(f.root,'current','manifest.json'));symlinkSync(join(f.root,'archive','manifest.json'),join(f.root,'current','manifest.json'))
 await assert.rejects(api.loadFussballPairedPack(f.root,{candidate,now:new Date('2026-10-27T01:00:00Z')},f.dependencies),/regular|symbolic/)
 }finally{f.clean()}
})

test('installed Germany dispatch and nightly cache reuse accept a pair without merging source journals',async()=>{
 const f=setup();try{
 const report=Buffer.from('retained report'),d={url:'https://www.fussball.de/spiel/-/spiel/'+ 'A'.repeat(32),kind:'report',sha256:hash(report),bytes:report.length,status:200,contentType:'text/html',capturedAt:'2026-10-27T00:00:00.002Z',file:'documents/'+hash(report)+'.html'}
 f.cm.documents.push(d);f.cm.snapshot.attempts.push({number:2,url:d.url,kind:d.kind,startedAt:d.capturedAt,status:'success',error:null,httpStatus:200});writeFileSync(join(f.root,'current','manifest.json'),JSON.stringify(f.cm));writeFileSync(join(f.root,'current',d.file),report)
 const loadPack=(directory,options)=>loadGermanyPack(directory,{...options,candidate,now:new Date('2026-10-27T01:00:00Z')},f.dependencies)
 const cache=await fussballBulkCacheDocuments(f.root,{...current,loadPack})
 assert.equal(cache.length,1);assert.equal(cache[0].url,d.url);assert.deepEqual(cache[0].bytes,report);assert.equal(cache[0].originalReceipt.attempt.number,2);assert.equal(cache[0].originalReceipt.capture.staffel,current.staffel)
 assert.equal(readFileSync(join(f.root,'archive','attempts.jsonl'),'utf8'),'original journal\n')
 }finally{f.clean()}
})

test('staging preserves captures byte-for-byte and refuses existing output or failed replay',async()=>{
 assert.equal(typeof api.stageFussballPairedPack,'function')
 const f=setup();try{
 const out=join(f.root,'staged'),options={directory:out,currentDirectory:join(f.root,'current'),archiveDirectory:join(f.root,'archive'),candidate,audit,now:new Date('2026-10-27T01:00:00Z')}
 await api.stageFussballPairedPack(options,f.dependencies)
 for(const name of ['current','archive'])for(const file of ['manifest.json','attempts.jsonl','result.json'])assert.deepEqual(readFileSync(join(out,name,file)),readFileSync(join(f.root,name,file)))
 await assert.rejects(api.stageFussballPairedPack(options,f.dependencies),/exist|fresh/)
 await assert.rejects(api.stageFussballPairedPack({...options,directory:join(f.root,'failed')},{...f.dependencies,loadCapture:async()=>{throw Error('incomplete coverage')}}),/coverage/)
 }finally{f.clean()}
})

test('single reviewed German selection cannot select unknown tuples or alter full-country defaults',async()=>{
 const packs=await import('./bulk-source-packs.mjs')
 assert.equal(typeof packs.selectBulkCandidates,'function')
 const selected=packs.selectBulkCandidates('DE','de-verbandsliga-baden')
 assert.equal(selected.length,1);assert.equal(selected[0].source_league_code,'03188V27L800000JVS5489BTVU7GTVLE-G:2026/27')
 assert.equal(packs.selectBulkCandidates('DE').length,3)
 for(const [country,slug]of [['PL','de-verbandsliga-baden'],['ALL','de-verbandsliga-baden'],['DE','de-unknown'],['DE','../bad']])assert.throws(()=>packs.selectBulkCandidates(country,slug))
})

test('hosted handoff refuses changed main, reruns, missing slug and wrong audit before staging',async()=>{
 const handoff=await import('./stage-fussball-paired-audit.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
 assert.equal(typeof handoff.stageHostedFussballPair,'function')
 const env={GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:audit.current.repository,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40000000001',GITHUB_SHA:audit.current.headSha,EXPECTED_SHA:audit.current.headSha,AUDIT_RUN:audit.current.runId,COUNTRY:'DE',CANDIDATE:'de-verbandsliga-baden'}
 const scope={env,headSha:env.EXPECTED_SHA,mainSha:env.EXPECTED_SHA}
 for(const change of [{mainSha:'f'.repeat(40)},{env:{...env,GITHUB_RUN_ATTEMPT:'2'}},{env:{...env,CANDIDATE:''}},{env:{...env,COUNTRY:'ALL'}},{envFileExists:true},{run:{conclusion:'failure'}}])await assert.rejects(handoff.stageHostedFussballPair({...scope,...change}))
})

test('hosted workflow validation executes for a paired Baden dispatch and rejects missing pairing inputs',()=>{
 const root=mkdtempSync(join(tmpdir(),'paired-workflow-'))
 try{
 const workflow=readFileSync(new URL('../.github/workflows/uvoz-pl-de-paketa.yml',import.meta.url),'utf8'),body=workflow.match(/node --input-type=module <<'JS'\n([\s\S]*?)\n\s+JS/)[1].split('\n').map(l=>l.slice(10)).join('\n')
 writeFileSync(join(root,'git'),'#!/bin/sh\nprintf "%s\\trefs/heads/main\\n" "$EXPECTED_SHA"\n',{mode:0o755})
 const env={PATH:root,COUNTRY:'DE',EXPECTED_SHA:audit.current.headSha,MAX_REQUESTS:'1',AUDIT_RUN:audit.current.runId,CANDIDATE:'de-verbandsliga-baden',GITHUB_SHA:audit.current.headSha,GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1'}
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--input-type=module','-e',body],{env,stdio:'pipe'}))
 for(const change of [{AUDIT_RUN:''},{CANDIDATE:''},{COUNTRY:'ALL'},{CANDIDATE:'de-unknown'}])assert.throws(()=>execFileSync(process.execPath,['--input-type=module','-e',body],{env:{...env,...change},stdio:'pipe'}))
 }finally{rmSync(root,{recursive:true,force:true})}
})

test('paired adapter composes real capture replay, full native coverage, installed fingerprints and freshness checks',async()=>{
 const [{captureFussballDirectory,verifyFussballDirectory},{loadFussballImportCapture},{razberiFantasyZapisnik}]=await Promise.all([import('./fussball-capture-evidence.mjs'),import('./fussball-import.mjs'),import('./viri/fussball-statistika.mjs')])
 const read=file=>readFileSync(new URL('./vzorci/'+file,import.meta.url)),witness=JSON.parse(read('de-fussball-baden-archive-20261026.json')),fontProof=JSON.parse(read('de-fussball-zapisnik.json')),fonts=Object.fromEntries(Object.entries(fontProof.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
 // Explicitly synthetic one-report season framing, with real decoded statistics
 // and retained Baden identity pages. This is not complete production evidence.
 const originalId='031EQBPLF4000000VS5489BTVUS470OH',stats=razberiFantasyZapisnik(read('de-fussball-ilvesheim-main.html').toString(),read('de-fussball-ilvesheim-lineup.html').toString(),{fonts,id:originalId,lineupId:originalId})
 const collectFn=async({client,...o})=>{
  await client.read(o.seedUrl,'round')
  const old=o.season==='2025/26',id=old?'A'.repeat(32):originalId,result=JSON.parse(JSON.stringify(stats).replaceAll(originalId,id)),date=old?'2025-10-11':'2026-10-11';result.z.datum=date
  const fixture={id,zapisnikId:'de-fussball-'+id,url:result.dogodki[0].virUrl,krog:8,datum:date,ura:'15:00',domaci:result.z.domaci.ime,gostje:result.z.gostje.ime,rezultat:{domaci:2,gostje:3}}
  return {version:1,scope:{provider:'fussball',seedUrl:o.seedUrl,staffel:o.staffel,season:o.season,asOfDate:o.asOfDate},schedule:{staffel:o.staffel,season:o.season,rounds:[1,2,3,4,5,6,7,8],fixtures:[fixture],rescheduledIds:[]},reports:[{fixture:structuredClone(fixture),result}],rejectedReports:[],coverage:{expectedRounds:8,capturedRounds:8,fixtures:1,playedFixtures:1,attemptedReports:1,completeReports:1,rejectedReports:0,sampled:false,unscoredFixtures:{total:0,past:0,current:0,future:0,unknownDate:0}},activationEligible:false}
 }
 const root=mkdtempSync(join(tmpdir(),'paired-real-loader-'))
 try{
 const catalog=(await import('./bulk-germany-source.mjs')).GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden'),currentDirectory=join(root,'current-input'),archiveDirectory=join(root,'archive-input'),directory=join(root,'pair')
 const cm=await captureFussballDirectory({directory:currentDirectory,options:{...witness.current,maxRequests:2,reportLimit:null},fetchFn:async()=>new Response(read(witness.currentSourceFile),{headers:{'content-type':'text/html'}}),collectFn})
 const document=Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,cm.documents[0][k]])),originalReceipt={version:1,document,attempt:cm.snapshot.attempts[0],capture:{createdAt:cm.createdAt,codeSha256:cm.codeSha256,staffel:witness.current.staffel,season:witness.current.season}}
 await captureFussballDirectory({directory:archiveDirectory,options:{...witness.archive,maxRequests:2,reportLimit:null},archiveParent:{current:witness.current,observedSeedUrl:witness.observedSeedUrl,document,originalReceipt,bytes:read(witness.currentSourceFile)},fetchFn:async()=>new Response(read(witness.archiveSourceFile),{headers:{'content-type':'text/html'}}),collectFn})
 const dependencies={loadCapture:(path,options)=>loadFussballImportCapture(path,options,{verifyDirectory:d=>verifyFussballDirectory(d,{collectFn})})}
 const pack=await api.stageFussballPairedPack({directory,currentDirectory,archiveDirectory,candidate:catalog,audit},dependencies)
 assert.deepEqual(pack.seasons.map(s=>s.reports.length),[1,1]);assert.equal(pack.seasons[0].reports[0].nastopi.length,30)
 await assert.rejects(api.loadFussballPairedPack(directory,{candidate:catalog,now:Date.parse(cm.createdAt)+25*3600_000},dependencies),/stale/)
 const manifestPath=join(directory,'archive','manifest.json'),am=JSON.parse(readFileSync(manifestPath));am.codeSha256='f'.repeat(64);writeFileSync(manifestPath,JSON.stringify(am))
 await assert.rejects(api.loadFussballPairedPack(directory,{candidate:catalog},dependencies),/fingerprint/)
 await assert.rejects(api.loadFussballPairedPack(directory,{candidate:catalog,requireFresh:false},dependencies),/fingerprint/)
 }finally{rmSync(root,{recursive:true,force:true})}
})

test('pair proof also binds authenticated wrapper artifact metadata',async()=>{
 const f=setup();try{
 const options={candidate,now:new Date('2026-10-27T01:00:00Z')},before=await api.loadFussballPairedPack(f.root,options,f.dependencies),path=join(f.root,'manifest.json'),wrapper=JSON.parse(readFileSync(path))
 wrapper.audit.archive.artifactId=999;writeFileSync(path,JSON.stringify(wrapper))
 const after=await api.loadFussballPairedPack(f.root,options,f.dependencies)
 assert.notEqual(after.original_bytes_sha256,before.original_bytes_sha256)
 }finally{f.clean()}
})

test('fresh native imports require audit SHA while verified nightly cache may outlive unrelated main commits',async()=>{
 const f=setup(),priorActions=process.env.GITHUB_ACTIONS,priorSha=process.env.GITHUB_SHA
 try{
 process.env.GITHUB_ACTIONS='true';process.env.GITHUB_SHA='c'.repeat(40)
 const options={candidate,now:new Date('2026-10-27T01:00:00Z')}
 await assert.rejects(api.loadFussballPairedPack(f.root,options,f.dependencies),/commit/)
 const pack=await api.loadFussballPairedPack(f.root,{...options,requireFresh:false},f.dependencies)
 assert.equal(pack.seasons.length,2)
 }finally{
 if(priorActions===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=priorActions
 if(priorSha===undefined)delete process.env.GITHUB_SHA;else process.env.GITHUB_SHA=priorSha
 f.clean()
 }
})
