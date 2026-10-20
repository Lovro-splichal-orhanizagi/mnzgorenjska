import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sha256,repository} from './dfb-artifacts.mjs'
import {MFA_ORIGINAL,MFA_SOURCE_HASHES,verifyMfaArtifactIdentity,readMfaArchive,verifyMfaPreparedFiles} from './mfa-reviewed-history-evidence.mjs'
const identity=()=>({expected:MFA_ORIGINAL,run:{id:Number(MFA_ORIGINAL.runId),head_sha:MFA_ORIGINAL.commit,head_branch:'codex/mfa-cache-audit-20261020',path:MFA_ORIGINAL.workflow,repository:{full_name:repository},event:'workflow_dispatch',status:'completed',conclusion:'success',run_attempt:1},artifact:{id:Number(MFA_ORIGINAL.artifactId),digest:MFA_ORIGINAL.digest,name:MFA_ORIGINAL.name,expired:false,size_in_bytes:49749,workflow_run:{id:Number(MFA_ORIGINAL.runId),head_sha:MFA_ORIGINAL.commit}}})
test('original MFA source authority requires exact actual successful original branch run and artifact pins',()=>{
 assert.equal(verifyMfaArtifactIdentity(identity()),MFA_ORIGINAL)
 for(const mutate of [x=>{x.run.head_branch='main'},x=>{x.run.head_sha='0'.repeat(40)},x=>{x.run.path='.github/workflows/other.yml'},x=>{x.run.repository.full_name='foreign'},x=>{x.run.conclusion='failure'},x=>{x.run.run_attempt=2},x=>{x.artifact.expired=true},x=>{x.artifact.digest='sha256:'+'0'.repeat(64)},x=>{x.artifact.workflow_run.head_sha='b'.repeat(40)},x=>{x.artifact.id++}]){const x=identity();mutate(x);assert.throws(()=>verifyMfaArtifactIdentity(x),/MFA evidence/)}
})
test('MFA archive rejects changed ZIP bytes before parsing any member',()=>assert.throws(()=>readMfaArchive(Buffer.from('changed'),'sha256:'+'0'.repeat(64)),/digest/))
const proof=()=>{
 const image={mainCommit:'a'.repeat(40),policySha256:'b'.repeat(64),appearances:Array.from({length:64},(_,id)=>({id})),goals:Array.from({length:8},(_,id)=>({id})),installedPolicies:[],markers:[],sourceHashes:Object.fromEntries(['52581524','53142122'].map(id=>[id,{resultSha256:MFA_SOURCE_HASHES[`mt${id}-izid.json`],lineupSha256:MFA_SOURCE_HASHES[`mt${id}-postava.json`]}]))},text=JSON.stringify(image),pins={commit:image.mainCommit,policySha256:image.policySha256,runId:'123',beforeSha256:sha256(Buffer.from(text))},manifest={kind:'mfa-reviewed-prepare',mainCommit:pins.commit,runId:pins.runId,runAttempt:'1',beforeSha256:pins.beforeSha256,policySha256:pins.policySha256}
 return{files:new Map([['manifest.json',Buffer.from(JSON.stringify(manifest))],['before-image.json',Buffer.from(text)]]),pins,text}
}
test('cleanup transport binds complete SQL text digest,64/8 counts,source hashes and exact prepare manifest',()=>{
 const{files,pins,text}=proof();assert.equal(verifyMfaPreparedFiles(files,pins),text)
 for(const mutate of [p=>{p.pins.beforeSha256='0'.repeat(64)},p=>{p.pins.commit='c'.repeat(40)},p=>{const m=JSON.parse(p.files.get('manifest.json'));m.runAttempt='2';p.files.set('manifest.json',Buffer.from(JSON.stringify(m)))},p=>{p.files.set('before-image.json',Buffer.from('{}'))}]){const p=proof();mutate(p);assert.throws(()=>verifyMfaPreparedFiles(p.files,p.pins),/MFA evidence/)}
})
test('MFA Actions is fixed main, no provider fetch and externally reviewed prepare/preview gates',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/mfa-reviewed-history.yml',import.meta.url),'utf8'),runner=readFileSync(new URL('./mfa-reviewed-history.mjs',import.meta.url),'utf8')
 assert.match(workflow,/npm ci --ignore-scripts/);assert.match(workflow,/cakaj-na-uvoze\.mjs --liga mt-premier --popravek/);assert.match(workflow,/cancel-in-progress: false/)
 assert.match(runner,/verifyMfaPreparedFiles/);assert.match(runner,/PREVIEW_SHA256/);assert.doesNotMatch(runner,/api\.mfa\.com|matchcentre\.mfa|uvoz-zapisnikov|uvoz-razporeda/)
})
const retained=process.env.MFA_HISTORY_RETAINED_ZIP
test('actual original retained ZIP matches pinned digest and all four source hashes',{skip:!retained},()=>{
 const files=readMfaArchive(readFileSync(retained),MFA_ORIGINAL.digest)
 for(const[name,hash]of Object.entries(MFA_SOURCE_HASHES))assert.equal(sha256(files.get(name)),hash)
})

test('prepared artifacts still require exact successful main execution',()=>{
 const x=identity();x.expected={...MFA_ORIGINAL,branch:'main'};assert.throws(()=>verifyMfaArtifactIdentity(x),/branch|workflow/);x.run.head_branch='main';assert.equal(verifyMfaArtifactIdentity(x),x.expected)
})
