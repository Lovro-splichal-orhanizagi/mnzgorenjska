import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {dirname,join} from 'node:path'
import {sha256} from './dfb-artifacts.mjs'
const moduleURL=new URL('./mfa-challenge-reviewed-history-evidence.mjs',import.meta.url)
test('Challenge retained archive proof verifies full ZIP before selecting eight exact bodies',async()=>{
 assert.ok(existsSync(moduleURL),'closed Challenge evidence reader exists')
 const {readChallengeArchive,MFA_CHALLENGE_ORIGINAL,MFA_CHALLENGE_SOURCE_HASHES,verifyMfaArtifactIdentity}=await import(moduleURL)
 assert.throws(()=>readChallengeArchive(Buffer.from('changed'),MFA_CHALLENGE_ORIGINAL.digest),/digest/)
 const path=process.env.MFA_CHALLENGE_RETAINED_ZIP
 if(path){const dir=dirname(path),artifact=JSON.parse(readFileSync(join(dir,'artifact.json'))),run=JSON.parse(readFileSync(join(dir,'run.json'))),bytes=readFileSync(path);verifyMfaArtifactIdentity({artifact,run,expected:MFA_CHALLENGE_ORIGINAL});assert.equal(bytes.length,artifact.size_in_bytes);const files=readChallengeArchive(bytes,MFA_CHALLENGE_ORIGINAL.digest);assert.equal(files.size,8);for(const[name,hash]of Object.entries(MFA_CHALLENGE_SOURCE_HASHES))assert.equal(sha256(files.get(name)),hash)}
})

test('Challenge preparation transport binds exact118/14 beforeimage and all eight original hashes',async()=>{
 const{verifyChallengePreparedFiles,MFA_CHALLENGE_SOURCE_HASHES:hashes}=await import(moduleURL)
 const image={mainCommit:'a'.repeat(40),policySha256:'b'.repeat(64),appearances:Array.from({length:118},(_,id)=>({id})),goals:Array.from({length:14},(_,id)=>({id})),installedPolicies:[],markers:[],sourceHashes:Object.fromEntries(['50903309','50903328','50903358','52353213'].map(id=>[id,{resultSha256:hashes[`mt${id}-izid.json`],lineupSha256:hashes[`mt${id}-postava.json`]}]))}
 const text=JSON.stringify(image),pins={commit:image.mainCommit,policySha256:image.policySha256,runId:'123',beforeSha256:sha256(Buffer.from(text))},manifest={kind:'mfa-challenge-reviewed-prepare',mainCommit:pins.commit,runId:pins.runId,runAttempt:'1',beforeSha256:pins.beforeSha256,policySha256:pins.policySha256}
 const files=new Map([['manifest.json',Buffer.from(JSON.stringify(manifest))],['before-image.json',Buffer.from(text)]])
 assert.equal(verifyChallengePreparedFiles(files,pins),text)
 for(const patch of [{commit:'c'.repeat(40)},{beforeSha256:'0'.repeat(64)},{runId:'124'}])assert.throws(()=>verifyChallengePreparedFiles(files,{...pins,...patch}),/differs/)
})
test('Challenge workflow authenticates source artifact and writes all eight bodies to reviewed prepare',()=>{
 const runner=readFileSync(new URL('./mfa-challenge-reviewed-history.mjs',import.meta.url),'utf8'),workflow=readFileSync(new URL('../.github/workflows/mfa-challenge-reviewed-history.yml',import.meta.url),'utf8')
 assert.match(runner,/for\(const\[name,bytes\]of originals\)writeFileSync/)
 assert.doesNotMatch(runner,/mt52581524|mt53142122|api\.mfa\.com|uvoz-zapisnikov|uvoz-razporeda/)
 assert.match(workflow,/cakaj-na-uvoze\.mjs --liga mt-challenge --popravek/)
 assert.match(workflow,/cancel-in-progress: false/)
})
