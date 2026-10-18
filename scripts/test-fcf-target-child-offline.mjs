import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync,realpathSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {admissionFixture,retained} from './fcf-missing-inventory-admission-fixture.mjs'
import {readFcfCapturedTargetEvidence,readFcfCleanupEvidence} from './fcf-target-evidence.mjs'
import {cleanupFixture} from './fcf-target-test-fixture.mjs'
import {packetFixture} from './fcf-release-test-fixture.mjs'
import {compileFcfTargetReleasePacket} from './fcf-target-release.mjs'
import {encodeFcfTargetWire,decodeFcfTargetWire} from './fcf-target-child-offline.mjs'
test('offline wire preserves actual immutable ZIP/claim bytes, never a caller verification brand',()=>{
 const w={claimBytes:Buffer.from('opaque raw claim'),children:[{zipBytes:Buffer.from([0,255,1])}]},r=decodeFcfTargetWire(JSON.parse(JSON.stringify(encodeFcfTargetWire(w))))
 assert.deepEqual(r,w);assert.throws(()=>decodeFcfTargetWire({$fcfBuffer:'bad!?'}),/FCF_CHILD_OFFLINE/)
})
test('automatic child reauthenticates genuine retained proof bytes and serves only its own packet',{skip:!retained},async t=>{
 const f=await admissionFixture(t),targetSlug='es-ct-segona-g1',inventoryAdmission=readFcfCapturedTargetEvidence({...f.wire,targetSlug}),cleanupEvidence=readFcfCleanupEvidence(cleanupFixture(t,{applied:true}).input),databaseInventory=packetFixture(retained).databaseInventory
 databaseInventory.groups.forEach(g=>g.source_policy='es-fcf-reviewed-history-v1')
 const packet=compileFcfTargetReleasePacket({targetSlug,sourceCommit:'b'.repeat(40),targetEvidence:inventoryAdmission,cleanupEvidence,databaseInventory,now:f.now}),dir=realpathSync(mkdtempSync(join(tmpdir(),'fcf-child-parent-')));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'parent.json'),bytes=Buffer.from(JSON.stringify({wire:encodeFcfTargetWire(f.wire),targetSlug,targetPacketText:packet.manifestText,targetPacketSha256:packet.manifestSha256}));writeFileSync(path,bytes,{mode:0o600})
 const result=spawnSync(process.execPath,['--import','./scripts/fcf-target-preload.mjs','--input-type=module','-e',`const r=await fetch('https://www.fcf.cat/ca/competicio/acta/4109389');if(r.status!==200)throw Error('packet unavailable');for(const u of ['https://www.fcf.cat./x','https://www.fcf.cat/ca/competicio/acta/4116215','https://unexpected.example/']){let refused=false;try{await fetch(u)}catch{refused=true}if(!refused)throw Error('escaped source closure')}console.log('CLOSED_PACKET_OK')`],{cwd:new URL('..',import.meta.url),env:{...process.env,SUPABASE_URL:'https://synthetic.supabase.co',FCF_TARGET_OFFLINE_FILE:path,FCF_TARGET_OFFLINE_SHA256:createHash('sha256').update(bytes).digest('hex')},encoding:'utf8',timeout:120000,maxBuffer:2*1024*1024})
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/CLOSED_PACKET_OK/)
})
test('automatic preloader refuses a child with lost environment before its script runs',()=>{
 const env={...process.env};delete env.FCF_TARGET_OFFLINE_FILE;delete env.FCF_TARGET_OFFLINE_SHA256
 const r=spawnSync(process.execPath,['--import','./scripts/fcf-target-preload.mjs','-e',"console.log('UNSAFE_CHILD_STARTED')"],{cwd:new URL('..',import.meta.url),env,encoding:'utf8',timeout:30000})
 assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/UNSAFE_CHILD_STARTED/);assert.match(r.stderr,/FCF_CHILD_OFFLINE/)
})
