// Fixed reviewed NL provenance and prepare-artifact verification. No transport.
import {execFileSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {repository,sha256} from './dfb-artifacts.mjs'
import {historicalStatisticsPolicySha256 as canonicalSha} from './lib/historical-statistics-policy.mjs'

export const NL_REVIEWED_WORKFLOW='.github/workflows/mfa-nl-reviewed-history.yml'
const captureWorkflow='.github/workflows/razdeli-zlite-igralce.yml',captureCommit='57f58fe9cbb624856b5b230a6928b09534aac148',captureBranch='codex/mfa-nl-public-capture-20261021'
export const NL_REVIEWED_SOURCES=Object.freeze({
 'mt-nl1':Object.freeze({competitionId:973,type:'2601267',sourceRunId:'39652695879',prefix:'',artifact:Object.freeze({runId:'39654281589',artifactId:'12369359893',digest:'sha256:a758e66fa050cfefb5897018e9b71eb9595fb3a7c3947627c90fc58a71a662e2',commit:'71c38c9de391a210a1f9f068a36f9a9cf6cd3abc',workflow:captureWorkflow,branch:'main',name:'mfa-nl-cache-mt-nl1-39652695879-39654281589-1'})}),
 'mt-nl2':Object.freeze({competitionId:974,type:'6234492',sourceRunId:'39655969899',prefix:'audit/',artifact:Object.freeze({runId:'39655969899',artifactId:'12374320002',digest:'sha256:76ff29ffe701b057190fdd5860afd592b018db60dbc1ee56e74f6f9bdeecc793',commit:captureCommit,workflow:captureWorkflow,branch:captureBranch,name:'mfa-nl2-public-capture-39655969899-1'})}),
})
export const NL_REVIEWED_PRIOR=Object.freeze({runId:'39654307070',artifactId:'12369633692',digest:'sha256:945f1bc189818a93618f15d08892e74283ee080b8f44134032223196626d52c5',commit:captureCommit,workflow:captureWorkflow,branch:captureBranch,name:'mfa-nl2-public-capture-39654307070-1'})
const fail=message=>{throw Error(`MFA NL route: ${message}`)}
export const requireNl=(ok,message)=>{if(!ok)fail(message)}
export function nlTarget(league){const t=NL_REVIEWED_SOURCES[league];requireNl(t,'fixed NL I/II league required');return t}
export function assertNlActionsExecution(env,{head,originMain,liveMain}){
 const commit=env.EXPECTED_SHA
 requireNl(env.GITHUB_ACTIONS==='true'&&env.CI==='true'&&env.GITHUB_REPOSITORY===repository&&env.GITHUB_REF==='refs/heads/main'&&env.GITHUB_SHA===commit&&/^[a-f0-9]{40}$/.test(commit??'')&&env.GITHUB_RUN_ATTEMPT==='1'&&/^[1-9]\d*$/.test(env.GITHUB_RUN_ID??'')&&env.GITHUB_EVENT_NAME==='workflow_dispatch'&&env.GITHUB_WORKFLOW_REF===`${repository}/${NL_REVIEWED_WORKFLOW}@refs/heads/main`,'first-attempt fixed main Actions execution required')
 requireNl(head===commit&&originMain===commit&&liveMain===commit,'checkout/remote/live main SHA changed')
 return commit
}
export function verifyNlReviewedContract(response,{league,contractSha,policy}){
 const t=nlTarget(league),doc=response?.contractDocument
 requireNl(policy&&response?.competitionId===t.competitionId&&response.contractSha256===contractSha&&/^[a-f0-9]{64}$/.test(contractSha??'')&&canonicalSha(doc)===contractSha,'stored canonical source contract SHA differs')
 requireNl(doc.schemaVersion===1&&doc.competitionId===t.competitionId&&doc.policyId===policy.id&&doc.policySha256===canonicalSha(policy)&&response.policySha256===doc.policySha256,'compiled/stored immutable policy differs')
 requireNl(doc.sourceArtifact&&canonicalSha(doc.sourceArtifact)===canonicalSha(t.artifact),'all seven reviewed source artifact pins required')
 return doc
}
export function verifyNlPreparedArtifactIdentity({expected,run,artifact}){
 requireNl(expected&&/^[1-9]\d*$/.test(expected.runId??'')&&/^[1-9]\d*$/.test(expected.artifactId??'')&&/^sha256:[a-f0-9]{64}$/.test(expected.digest??'')&&/^[a-f0-9]{40}$/.test(expected.commit??'')&&expected.branch==='main'&&expected.workflow===NL_REVIEWED_WORKFLOW&&/^mfa-nl-reviewed-prepare-mt-nl[12]-[1-9]\d*-1$/.test(expected.name??''),'exact reviewed prepare artifact pins required')
 requireNl(String(run?.id)===expected.runId&&run.head_sha===expected.commit&&run.head_branch==='main'&&run.path===NL_REVIEWED_WORKFLOW&&run.event==='workflow_dispatch'&&run.status==='completed'&&run.conclusion==='success'&&run.run_attempt===1&&run.repository?.full_name===repository&&run.head_repository?.full_name===repository,'successful exact first-attempt main prepare run required')
 requireNl(String(artifact?.id)===expected.artifactId&&artifact.digest===expected.digest&&artifact.name===expected.name&&artifact.expired===false&&String(artifact.workflow_run?.id)===expected.runId&&artifact.workflow_run?.head_sha===expected.commit&&Number.isSafeInteger(artifact.size_in_bytes)&&artifact.size_in_bytes>0&&artifact.size_in_bytes<=64*1024*1024,'prepare artifact identity/size differs')
 return expected
}
export function readNlPreparedArchive(bytes,digest){
 requireNl(Buffer.isBuffer(bytes)&&bytes.length<=64*1024*1024&&`sha256:${sha256(bytes)}`===digest,'prepare ZIP digest differs')
 const dir=mkdtempSync(join(tmpdir(),'slff-nl-prepared-'))
 try{
  const path=join(dir,'prepared.zip');writeFileSync(path,bytes)
  const files=JSON.parse(execFileSync('python3',['-c',`
import zipfile,sys,stat,json,base64
z=zipfile.ZipFile(sys.argv[1]); ms=z.infolist(); names=[m.filename for m in ms]
if len(ms)!=3 or set(names)!={'manifest.json','before-image.json','source-contract.json'} or len(set(names))!=3:raise ValueError('MFA NL: exact prepared member set required')
if sum(m.file_size for m in ms)>64*1024*1024:raise ValueError('MFA NL: expanded prepare bound')
files={}
for m in ms:
 if m.is_dir() or m.flag_bits&1 or stat.S_IFMT(m.external_attr>>16) not in (0,stat.S_IFREG) or m.file_size>32*1024*1024:raise ValueError('MFA NL: unsafe prepared metadata')
 files[m.filename]=base64.b64encode(z.read(m)).decode()
print(json.dumps(files))
`,path],{encoding:'utf8',maxBuffer:96*1024*1024}))
  return new Map(Object.entries(files).map(([name,body])=>[name,Buffer.from(body,'base64')]))
 }finally{rmSync(dir,{recursive:true,force:true})}
}
export function verifyNlPreparedFiles(files,{league,commit,runId,contractSha,policy,contract,beforeSha}){
 const t=nlTarget(league)
 requireNl(files instanceof Map&&files.size===3&&['manifest.json','before-image.json','source-contract.json'].every(n=>files.has(n)),'complete exact prepared files required')
 let manifest,image,doc,text
 try{manifest=JSON.parse(files.get('manifest.json'));text=files.get('before-image.json').toString('utf8');image=JSON.parse(text);doc=JSON.parse(files.get('source-contract.json'))}catch{fail('invalid prepared JSON')}
 requireNl(manifest.schemaVersion===1&&manifest.kind==='mfa-nl-reviewed-prepare'&&manifest.league===league&&manifest.competitionId===t.competitionId&&manifest.mainCommit===commit&&manifest.runId===runId&&manifest.runAttempt==='1'&&manifest.contractSha256===contractSha&&manifest.policySha256===canonicalSha(policy)&&manifest.beforeSha256===beforeSha&&/^[a-f0-9]{64}$/.test(beforeSha??'')&&manifest.complete===true,'reviewed prepare manifest differs')
 requireNl(canonicalSha(manifest.sourceArtifact)===canonicalSha(t.artifact)&&canonicalSha(doc)===contractSha&&canonicalSha(doc)===canonicalSha(contract),'reviewed source contract/artifact changed')
 requireNl(sha256(Buffer.from(text))===beforeSha&&sha256(files.get('before-image.json'))===beforeSha&&image.schemaVersion===1&&image.competitionId===t.competitionId&&image.mainCommit===commit&&image.policySha256===canonicalSha(policy)&&canonicalSha(image.policyDocument)===canonicalSha(policy),'complete exact SQL beforeimage differs')
 requireNl(image.competition?.id===t.competitionId&&image.competition.slug===league&&image.competition.source==='mfa'&&image.competition.source_league_code===`${t.type}/2027`&&image.competition.source_policy===null&&image.competition.active===false,'prepared native current-only tuple differs')
 return text
}
