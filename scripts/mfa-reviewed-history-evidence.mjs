// Closed retained-byte verification. No provider transport; ZIP members are read without extraction.
import {execFileSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {sha256,repository} from './dfb-artifacts.mjs'
export const MFA_ORIGINAL=Object.freeze({runId:'39501309242',artifactId:'12301385790',digest:'sha256:6ca0a033b2d6d52c99cad9deb168091a0e67403c40f3db4a0c2bdb94254a8b7f',commit:'f5f00217a0f95fa27fac50eeee8cab161a63c5fb',branch:'codex/mfa-cache-audit-20261020',workflow:'.github/workflows/razdeli-zlite-igralce.yml',name:'mfa-premier-card-cases-39501309242'})
export const MFA_SOURCE_HASHES=Object.freeze({
 'mt52581524-izid.json':'612c36ce1e05b642871a333ec36635a6d823176b8b7001ccbc322d39a46adc2d',
 'mt52581524-postava.json':'a81da11a4fdad7c6cca90acc28e02248566ae044653b905435acb2f0fbbaa949',
 'mt53142122-izid.json':'432804af0383c7370eecdd9370034f90f133dc67c418b7959d481303136fbaa8',
 'mt53142122-postava.json':'dc0d717b5be05389e72f081df04bac8ee93fe93384ff31f51817d6faaf0b5399',
})
const fail=message=>{throw Error(`MFA evidence: ${message}`)}
export function verifyMfaArtifactIdentity({artifact,run,expected}){
 if(!expected||!/^[1-9]\d*$/.test(expected.runId??'')||!/^[1-9]\d*$/.test(expected.artifactId??'')||!/^sha256:[a-f0-9]{64}$/.test(expected.digest??'')||!/^[a-f0-9]{40}$/.test(expected.commit??''))fail('explicit exact artifact pins required')
 if(String(run?.id)!==expected.runId||run.head_sha!==expected.commit||run.head_branch!==(expected.branch??'main')||run.path!==expected.workflow||run.repository?.full_name!==repository||run.event!=='workflow_dispatch'||run.status!=='completed'||run.conclusion!=='success'||run.run_attempt!==1)fail('successful exact pinned workflow/branch run required')
 if(String(artifact?.id)!==expected.artifactId||artifact.digest!==expected.digest||artifact.name!==expected.name||artifact.expired!==false||String(artifact.workflow_run?.id)!==expected.runId||artifact.workflow_run?.head_sha!==expected.commit||!Number.isSafeInteger(artifact.size_in_bytes)||artifact.size_in_bytes<1||artifact.size_in_bytes>32*1024*1024)fail('artifact identity/size/digest differs')
 return expected
}
export function readMfaArchive(bytes,digest,{prepared=false}={}){
 if(!Buffer.isBuffer(bytes)||bytes.length>32*1024*1024||`sha256:${sha256(bytes)}`!==digest)fail('ZIP digest mismatch')
 const dir=mkdtempSync(join(tmpdir(),'slff-mfa-evidence-'))
 try{
  const zip=join(dir,'artifact.zip');writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:65536}).trim().split('\n')
  if(names.length>16||new Set(names).size!==names.length||names.some(n=>!(/^(?:manifest|before-image|mt[1-9]\d{7}-(?:izid|postava))\.json$/).test(n)))fail('unsafe/unexpected ZIP members')
  const expected=['manifest.json',...Object.keys(MFA_SOURCE_HASHES),...(prepared?['before-image.json']:[])]
  if(expected.some(n=>!names.includes(n))||prepared&&names.length!==expected.length)fail('complete exact prepared/original member set required')
  const files=new Map(names.map(n=>[n,execFileSync('unzip',['-p',zip,n],{maxBuffer:32*1024*1024})]))
  for(const[name,hash]of Object.entries(MFA_SOURCE_HASHES))if(sha256(files.get(name))!==hash)fail('original source bytes changed')
  return files
 }finally{rmSync(dir,{recursive:true,force:true})}
}
export function verifyMfaPreparedFiles(files,{commit,runId,beforeSha256,policySha256}){
 const manifest=JSON.parse(files.get('manifest.json')),text=files.get('before-image.json').toString('utf8'),image=JSON.parse(text)
 if(manifest.kind!=='mfa-reviewed-prepare'||manifest.mainCommit!==commit||manifest.runId!==runId||manifest.runAttempt!=='1'||manifest.beforeSha256!==beforeSha256||manifest.policySha256!==policySha256||image.mainCommit!==commit||image.policySha256!==policySha256||sha256(Buffer.from(text))!==beforeSha256||image.appearances?.length!==64||image.goals?.length!==8||image.installedPolicies?.length!==0||image.markers?.length!==0)fail('exact reviewed prepare image/manifest differs')
 for(const[nativeId,resultName,lineupName]of [['52581524','mt52581524-izid.json','mt52581524-postava.json'],['53142122','mt53142122-izid.json','mt53142122-postava.json']]){
  if(image.sourceHashes?.[nativeId]?.resultSha256!==MFA_SOURCE_HASHES[resultName]||image.sourceHashes?.[nativeId]?.lineupSha256!==MFA_SOURCE_HASHES[lineupName])fail('prepare source proof differs')
 }
 return text
}
