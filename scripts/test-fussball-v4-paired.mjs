// Transport composition only: genuine parent/seed bytes and real schema5
// capture/replay, with explicitly synthetic one-round/no-native-statistics output.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,unlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import * as checkpoint from './fussball-checkpoint.mjs'
import {captureFussballDirectory,verifyFussballDirectory,fussballBulkCacheDocuments,loadFussballRetryCheckpoint} from './fussball-capture-evidence.mjs'
import {stageFussballPairedPack,loadFussballPairedPack} from './fussball-paired-pack.mjs'
import {seedFussballNightly,prepareFussballNightly} from './prepare-fussball-nightly.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
const collectFn=async({client,...o})=>{await client.read(o.seedUrl,'round');return{version:1,testOnlySynthetic:true,scope:{provider:'fussball',seedUrl:o.seedUrl,staffel:o.staffel,season:o.season},coverage:{sampled:true},activationEligible:false}}

for(const [version,directory,readCheckpoint,currentMaximum]of[
 ['v4',process.env.FUSSBALL_V4_EVIDENCE_DIR,checkpoint.readFussballTransportV4,483],
 ['v5',process.env.FUSSBALL_V5_EVIDENCE_DIR,checkpoint.readFussballTransportV5,432],
])test(`${version} paired schema5 transport accepts retried seed success2 through replay/nightly and rejects mismatched authority`,{skip:directory===undefined?'set genuine '+version+' parent evidence directory':false},async t=>{
 const parent={...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))},proof=readCheckpoint({parent}),raw=JSON.parse(readFileSync(join(directory,'current-manifest.json'))),seed=raw.documents.find(d=>d.kind==='round'&&d.url===proof.scope.seedUrl),seedBytes=execFileSync('unzip',['-p',join(directory,'current.zip'),seed.file],{maxBuffer:8*1024*1024}),base=mkdtempSync(join(tmpdir(),'fussball-v4-pair-review-'));t.after(()=>rmSync(base,{recursive:true,force:true}))
 const asset=checkpoint.getFussballCheckpointDocuments(proof).find(d=>d.kind==='css')
 const networkAssetUrl='https://www.fussball.de/export.fontface/-/id/v4test01/type/css',networkAssetBytes=Buffer.from('TEST ONLY synthetic CSS asset; no source/native readiness');assert.equal(checkpoint.getFussballCheckpointDocuments(proof).some(d=>d.url===networkAssetUrl),false)
 const collectWithAsset=async o=>{const result=await collectFn(o);if(o.season==='2026/27'){await o.client.read(asset.url,asset.kind);await o.client.read(networkAssetUrl,'css')}return result}
 const candidate=structuredClone(GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden')),currentDirectory=join(base,'current-source'),archiveDirectory=join(base,'archive-source'),paired=join(base,'pair');let calls=0
 const currentOptions={...proof.scope,maxRequests:currentMaximum,reportLimit:null,cardPolicy:'community-v1'},cm=await captureFussballDirectory({directory:currentDirectory,options:currentOptions,completionProof:proof,collectFn:collectWithAsset,fetchFn:async url=>{calls++;if(calls===1||calls===3)throw new TypeError('fetch failed',{cause:Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})});return new Response(url===networkAssetUrl?networkAssetBytes:seedBytes,{headers:{'content-type':url===networkAssetUrl?'text/css':'text/html'}})}})
 assert.equal(calls,4);assert.equal(cm.documents[0].originalReceipt.attempt.number,2);assert.equal(cm.documents.find(d=>d.url===networkAssetUrl).originalReceipt.attempt.number,4)
 const retryProof=loadFussballRetryCheckpoint(currentDirectory)
 assert.equal(retryProof.preset,proof.preset);assert.equal(retryProof.priorRequests,proof.priorRequests)
 const document=Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,cm.documents[0][k]])),a=candidate.archives[0],archiveOptions={seedUrl:a.seedUrl,staffel:a.code.split(':')[0],season:a.season,maxRequests:3000,reportLimit:null,cardPolicy:'community-v1'}
 await captureFussballDirectory({directory:archiveDirectory,options:archiveOptions,retryProof,archiveParent:{current:proof.scope,observedSeedUrl:a.observedSeedUrl,document,originalReceipt:cm.documents[0].originalReceipt,bytes:seedBytes},collectFn:collectWithAsset,fetchFn:async()=>new Response('SYNTHETIC archive transport body, not a real season',{headers:{'content-type':'text/html'}})})
 const audit={current:{runId:'40614233935',artifactId:1001,artifactName:'fussball-season-40614233935',headSha:'a'.repeat(40),repository:'Lovro-splichal-orhanizagi/mnzgorenjska'},archive:{runId:'40614233935',artifactId:1002,artifactName:'fussball-season-archive-40614233935',headSha:'a'.repeat(40),repository:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
 const replayed=[],dependencies={loadCapture:async(path,o)=>{
  const receipt=await verifyFussballDirectory(path,{collectFn:collectWithAsset});replayed.push(receipt)
  // This existing seam isolates paired transport binding. It grants no native
  // statistics/completeness and is never used by the production loader.
  return{provider:'fussball-public',staffel:o.staffel,season:o.season,cardPolicy:'community-v1',schedule:[],reports:[],identities:[],pendingReports:[],cardEnvelopes:[],activationEligible:false}
 }}
 const pack=await stageFussballPairedPack({directory:paired,currentDirectory,archiveDirectory,candidate,audit},dependencies)
 assert.equal(pack.seasons.length,2);assert.deepEqual(replayed.map(r=>r.requests),[4,1]);assert.ok(replayed.every(r=>r.checkpointPreset===proof.preset))
 // The first ordinary nightly starts from the unchanged paired bulk-seed.
 const loadPack=(path,o)=>loadFussballPairedPack(path,{...o,candidate},dependencies),cache=join(base,'nightly-cache'),native={...candidate,id:101,country_id:49,source_policy:'fussball-community-cards-v1'}
 await seedFussballNightly({candidate:{...native,active:false},bulkDirectory:paired,cacheDirectory:cache,loadPack})
 assert.equal(JSON.parse(readFileSync(join(cache,'bulk-seed','current','manifest.json'))).version,5)
 const nightCollect=async o=>{const cached=await o.client.read(asset.url,asset.kind);assert.deepEqual(Buffer.from(cached.bytes),Buffer.from(asset.bytes));assert.deepEqual(Buffer.from((await o.client.read(networkAssetUrl,'css')).bytes),networkAssetBytes);return collectFn(o)},nightOutput=join(base,'first-nightly');let nightGets=0
 await prepareFussballNightly({candidate:{...native,active:true},directory:nightOutput,cacheDirectory:cache,maxRequests:2,fetchFn:async url=>{nightGets++;assert.equal(url,proof.scope.seedUrl);return new Response(seedBytes,{headers:{'content-type':'text/html'}})},captureDirectory:args=>{
  assert.equal(args.reuseBulkDirectory,join(cache,'bulk-seed'));assert.equal(args.completionProof,undefined);assert.equal(args.retryProof,undefined)
  return captureFussballDirectory({...args,collectFn:nightCollect,loadBulkPack:loadPack})
 },loadCapture:async(path,o)=>{
  await verifyFussballDirectory(path,{collectFn:nightCollect})
  // Existing test seam only; this transport test invents no native statistics.
  return{provider:'fussball-public',staffel:o.staffel,season:o.season,cardPolicy:'community-v1',schedule:[{stevilka:1,tekme:[]}],reports:[{id:'TEST_ONLY_SYNTHETIC'}],identities:[{source_id:'TEST_ONLY_SYNTHETIC',reg_st:1}],pendingReports:[],cardEnvelopes:[],activationEligible:false}
 }})
 assert.equal(nightGets,1,'only a fresh current round uses the synthetic fetch')
 const night=JSON.parse(readFileSync(join(nightOutput,'manifest.json'))),cachedAsset=night.documents.find(d=>d.url===asset.url)
 assert.equal(night.version,2);assert.equal(night.snapshot.requests,1);assert.equal(night.retryPolicy,undefined);assert.equal(night.checkpoint,undefined);assert.equal(cachedAsset.origin,'cache');assert.deepEqual(cachedAsset.originalReceipt,asset.originalReceipt);assert.equal(night.documents.find(d=>d.url===networkAssetUrl).originalReceipt.attempt.number,4)
 assert.ok(night.documents.every(d=>d.originalReceipt.capture.season==='2026/27'),'no archive source originals reused')
 // Production normalization still refuses this synthetic/no-statistics frame.
 await assert.rejects(loadFussballPairedPack(paired,{candidate}),/scope|fixtures|reports|coverage|budget exhausted|missing|replay URL\/order/)
 const path=join(paired,'current','manifest.json'),archivePath=join(paired,'archive','manifest.json'),original=readFileSync(path),originalArchive=readFileSync(archivePath)
 for(const [label,change]of[
  ['mixed current4/archive5',(c,a)=>{c.version=4}],['mixed current5/archive3',(c,a)=>{a.version=3}],
  ['old checkpoint',(c,a)=>{c.checkpoint.version=3}],['foreign preset',(c,a)=>{a.checkpoint.proof.preset='baden-reviewed-transports-v3'}],
  ['wrong accounted ledger',(c,a)=>{c.checkpoint.proof.priorRequests=version==='v5'?1517:1568}],
  ['mixed accounted presets',(c,a)=>{a.checkpoint.proof.preset=version==='v5'?'baden-reviewed-transports-v4':'baden-reviewed-transports-v5';a.checkpoint.proof.priorRequests=version==='v5'?1517:1568}],
  ['wrong policy',(c,a)=>{c.retryPolicy='unknown'}],['missing outcomes hash',(c,a)=>{delete a.outcomesSha256}],
  ['failed seed receipt',(c,a)=>{c.documents[0].originalReceipt.attempt=c.snapshot.attempts[0];a.archiveParent.originalReceipt=c.documents[0].originalReceipt}],
  ['duplicate success',(c,a)=>{c.snapshot.attempts.push({...c.snapshot.attempts[1],number:3})}],
  ['failed network asset receipt',(c,a)=>{c.documents.find(d=>d.url===networkAssetUrl).originalReceipt.attempt=c.snapshot.attempts[2]}],
  ['foreign receipt body',(c,a)=>{c.documents[0].originalReceipt.document.sha256='f'.repeat(64);a.archiveParent.originalReceipt=c.documents[0].originalReceipt}],
 ]){
  const c=JSON.parse(original),a=JSON.parse(originalArchive);change(c,a);writeFileSync(path,JSON.stringify(c)+'\n');writeFileSync(archivePath,JSON.stringify(a)+'\n');await assert.rejects(loadFussballPairedPack(paired,{candidate},dependencies),undefined,label);await assert.rejects(fussballBulkCacheDocuments(paired,{...proof.scope,cardPolicy:'community-v1',loadPack}),undefined,'cache '+label)
  if(label==='failed network asset receipt')await assert.rejects(fussballBulkCacheDocuments(paired,{...proof.scope,cardPolicy:'community-v1',loadPack:async()=>pack}),/receipt/)
 }
 writeFileSync(path,original);writeFileSync(archivePath,originalArchive);unlinkSync(join(paired,'archive','outcomes.jsonl'));await assert.rejects(loadFussballPairedPack(paired,{candidate},dependencies),/outcome|ENOENT/);await assert.rejects(fussballBulkCacheDocuments(paired,{...proof.scope,cardPolicy:'community-v1',loadPack}),/outcome|ENOENT/)
})
