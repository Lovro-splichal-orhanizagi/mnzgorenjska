// Transport composition only: genuine parent/seed bytes and real schema5
// capture/replay, with explicitly synthetic one-round/no-native-statistics output.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,unlinkSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'
import * as checkpoint from './fussball-checkpoint.mjs'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import {stageFussballPairedPack,loadFussballPairedPack} from './fussball-paired-pack.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
const directory=process.env.FUSSBALL_V4_EVIDENCE_DIR,actual={skip:directory===undefined?'set FUSSBALL_V4_EVIDENCE_DIR to genuine retained parent':false}
const collectFn=async({client,...o})=>{await client.read(o.seedUrl,'round');return{version:1,testOnlySynthetic:true,scope:{provider:'fussball',seedUrl:o.seedUrl,staffel:o.staffel,season:o.season},coverage:{sampled:true},activationEligible:false}}

test('paired schema5 transport accepts retried seed success2 through real replay and rejects mismatched authority',actual,async t=>{
 const parent={...JSON.parse(readFileSync(join(directory,'current-metadata.json'))),zipBytes:readFileSync(join(directory,'current.zip'))},proof=checkpoint.readFussballTransportV4({parent}),raw=JSON.parse(readFileSync(join(directory,'current-manifest.json'))),seed=raw.documents.find(d=>d.kind==='round'&&d.url===proof.scope.seedUrl),seedBytes=execFileSync('unzip',['-p',join(directory,'current.zip'),seed.file],{maxBuffer:8*1024*1024}),base=mkdtempSync(join(tmpdir(),'fussball-v4-pair-review-'));t.after(()=>rmSync(base,{recursive:true,force:true}))
 const candidate=structuredClone(GERMANY_BULK_CANDIDATES.find(c=>c.slug==='de-verbandsliga-baden')),currentDirectory=join(base,'current-source'),archiveDirectory=join(base,'archive-source'),paired=join(base,'pair');let calls=0
 const currentOptions={...proof.scope,maxRequests:483,reportLimit:null,cardPolicy:'community-v1'},cm=await captureFussballDirectory({directory:currentDirectory,options:currentOptions,completionProof:proof,collectFn,fetchFn:async()=>{if(++calls===1)throw new TypeError('fetch failed',{cause:Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})});return new Response(seedBytes,{headers:{'content-type':'text/html'}})}})
 assert.equal(calls,2);assert.equal(cm.documents[0].originalReceipt.attempt.number,2)
 const document=Object.fromEntries(['url','kind','sha256','bytes','status','contentType','capturedAt'].map(k=>[k,cm.documents[0][k]])),a=candidate.archives[0],archiveOptions={seedUrl:a.seedUrl,staffel:a.code.split(':')[0],season:a.season,maxRequests:3000,reportLimit:null,cardPolicy:'community-v1'}
 await captureFussballDirectory({directory:archiveDirectory,options:archiveOptions,retryProof:proof,archiveParent:{current:proof.scope,observedSeedUrl:a.observedSeedUrl,document,originalReceipt:cm.documents[0].originalReceipt,bytes:seedBytes},collectFn,fetchFn:async()=>new Response('SYNTHETIC archive transport body, not a real season',{headers:{'content-type':'text/html'}})})
 const audit={current:{runId:'40614233935',artifactId:1001,artifactName:'fussball-season-40614233935',headSha:'a'.repeat(40),repository:'Lovro-splichal-orhanizagi/mnzgorenjska'},archive:{runId:'40614233935',artifactId:1002,artifactName:'fussball-season-archive-40614233935',headSha:'a'.repeat(40),repository:'Lovro-splichal-orhanizagi/mnzgorenjska'}}
 const replayed=[],dependencies={loadCapture:async(path,o)=>{
  const receipt=await verifyFussballDirectory(path,{collectFn});replayed.push(receipt)
  // This existing seam isolates paired transport binding. It grants no native
  // statistics/completeness and is never used by the production loader.
  return{provider:'fussball-public',staffel:o.staffel,season:o.season,cardPolicy:'community-v1',schedule:[],reports:[],identities:[],pendingReports:[],cardEnvelopes:[],activationEligible:false}
 }}
 const pack=await stageFussballPairedPack({directory:paired,currentDirectory,archiveDirectory,candidate,audit},dependencies)
 assert.equal(pack.seasons.length,2);assert.deepEqual(replayed.map(r=>r.requests),[2,1]);assert.ok(replayed.every(r=>r.checkpointPreset==='baden-reviewed-transports-v4'))
 // Production normalization still refuses this synthetic/no-statistics frame.
 await assert.rejects(loadFussballPairedPack(paired,{candidate}),/scope|fixtures|reports|coverage|budget exhausted|missing/)
 const path=join(paired,'current','manifest.json'),archivePath=join(paired,'archive','manifest.json'),original=readFileSync(path),originalArchive=readFileSync(archivePath)
 for(const [label,change]of[
  ['mixed current4/archive5',(c,a)=>{c.version=4}],['mixed current5/archive3',(c,a)=>{a.version=3}],
  ['old checkpoint',(c,a)=>{c.checkpoint.version=3}],['foreign preset',(c,a)=>{a.checkpoint.proof.preset='baden-reviewed-transports-v3'}],
  ['wrong policy',(c,a)=>{c.retryPolicy='unknown'}],['missing outcomes hash',(c,a)=>{delete a.outcomesSha256}],
  ['failed seed receipt',(c,a)=>{c.documents[0].originalReceipt.attempt=c.snapshot.attempts[0];a.archiveParent.originalReceipt=c.documents[0].originalReceipt}],
  ['duplicate success',(c,a)=>{c.snapshot.attempts.push({...c.snapshot.attempts[1],number:3})}],
  ['foreign receipt body',(c,a)=>{c.documents[0].originalReceipt.document.sha256='f'.repeat(64);a.archiveParent.originalReceipt=c.documents[0].originalReceipt}],
 ]){
  const c=JSON.parse(original),a=JSON.parse(originalArchive);change(c,a);writeFileSync(path,JSON.stringify(c)+'\n');writeFileSync(archivePath,JSON.stringify(a)+'\n');await assert.rejects(loadFussballPairedPack(paired,{candidate},dependencies),undefined,label)
 }
 writeFileSync(path,original);writeFileSync(archivePath,originalArchive);unlinkSync(join(paired,'archive','outcomes.jsonl'));await assert.rejects(loadFussballPairedPack(paired,{candidate},dependencies),/outcome|ENOENT/)
})
