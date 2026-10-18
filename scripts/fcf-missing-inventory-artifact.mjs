// Pure authenticated-metadata/ZIP boundary. No GitHub, source or DB client.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
export const FCF_INVENTORY_REPOSITORY='Lovro-splichal-orhanizagi/mnzgorenjska'
export const FCF_INVENTORY_WORKFLOW='.github/workflows/uvoz-fcf-zgodovina.yml'
export const inventoryFail=message=>{throw Error(`FCF_INVENTORY: ${message}`)}
export const rawSha256=bytes=>createHash('sha256').update(bytes).digest('hex')
export const nativeId=value=>typeof value==='string'&&/^[1-9]\d{0,19}$/.test(value)
export const commitId=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value)
export const sha256Id=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)
export const artifactDigest=value=>typeof value==='string'&&/^sha256:[a-f0-9]{64}$/.test(value)
export const validUTC=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString().replace('.000Z','Z')===value.replace('.000Z','Z')
export function exactKeys(value,keys,label){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))inventoryFail(`${label} closed fields differ`)
}
export function frozenJSON(value){
 if(value&&typeof value==='object'){Object.values(value).forEach(frozenJSON);Object.freeze(value)}
 return value
}
export function jsonBytes(bytes,label,maxBytes=8*1024*1024){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>maxBytes||bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)inventoryFail(`${label} bytes/size/BOM invalid`)
 let text,value
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);value=JSON.parse(text)}catch{inventoryFail(`${label} UTF8/JSON invalid`)}
 return value
}
export function verifyInventoryExecution({artifact,run,jobs,expected,jobName,stepNames,artifactName,runPhase,jobPhase='completed'}){
 if(!expected||!nativeId(expected.runId)||!nativeId(expected.runAttempt)||!commitId(expected.sourceCommit)||!nativeId(expected.jobId)||!nativeId(expected.artifactId)||!artifactDigest(expected.artifactDigest)||expected.name!==artifactName||!sha256Id(expected.manifestSha256))inventoryFail('explicit expected artifact execution/hash required')
 if(!run||String(run.id)!==expected.runId||run.run_attempt!==Number(expected.runAttempt)||run.repository?.full_name!==FCF_INVENTORY_REPOSITORY||run.path!==FCF_INVENTORY_WORKFLOW||run.event!=='workflow_dispatch'||run.head_branch!=='main'||run.head_sha!==expected.sourceCommit)inventoryFail('actual main workflow/run/attempt differs')
 const runAllowed=runPhase==='successful-run'?run.status==='completed'&&run.conclusion==='success':['consumption-record','inventory-record'].includes(runPhase)&&(run.status==='in_progress'&&run.conclusion===null||run.status==='completed'&&['success','failure'].includes(run.conclusion))
 if(!runAllowed)inventoryFail('actual run phase differs')
 if(!Array.isArray(jobs))inventoryFail('actual jobs required')
 const matching=jobs.filter(job=>job.name===jobName),job=matching[0]
 if(matching.length!==1||String(job.id)!==expected.jobId||String(job.run_id)!==expected.runId||job.run_attempt!==Number(expected.runAttempt)||job.head_sha!==expected.sourceCommit||!(jobPhase==='captured-uploaded'?['in_progress','completed'].includes(job.status):jobPhase==='diagnostic'?job.status==='completed'&&job.conclusion==='failure':job.status==='completed'&&job.conclusion==='success')||!Array.isArray(job.steps))inventoryFail('exact successful job differs')
 for(const name of stepNames){const steps=job.steps.filter(step=>step.name===name);if(steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='success')inventoryFail('exact successful step differs')}
 if(!artifact||String(artifact.id)!==expected.artifactId||artifact.name!==artifactName||artifact.digest!==expected.artifactDigest||artifact.expired!==false||!Number.isSafeInteger(artifact.size_in_bytes)||artifact.size_in_bytes<1||artifact.size_in_bytes>100*1024*1024||String(artifact.workflow_run?.id)!==expected.runId||artifact.workflow_run?.head_sha!==expected.sourceCommit)inventoryFail('actual artifact identity differs')
 return {artifactId:expected.artifactId,artifactDigest:expected.artifactDigest,runId:expected.runId,runAttempt:expected.runAttempt,jobId:expected.jobId,retentionCommit:expected.sourceCommit,manifestSha256:expected.manifestSha256}
}
export function readInventoryZip({zipBytes,artifact,expected,members,allowMissing=false}){
 if(!Buffer.isBuffer(zipBytes)||zipBytes.length!==artifact.size_in_bytes||zipBytes.length>100*1024*1024||`sha256:${rawSha256(zipBytes)}`!==expected.artifactDigest)inventoryFail('actual ZIP length/digest differs')
 const directory=mkdtempSync(join(tmpdir(),'fcf-inventory-zip-'))
 try{
  const path=join(directory,'source.zip');writeFileSync(path,zipBytes,{flag:'wx',mode:0o600})
  let names,details
  try{names=execFileSync('unzip',['-Z1',path],{encoding:'utf8',maxBuffer:128*1024}).trimEnd().split('\n');details=execFileSync('unzip',['-Z','-l',path],{encoding:'utf8',maxBuffer:256*1024}).split('\n')}catch{inventoryFail('ZIP directory invalid')}
  if((!allowMissing&&names.length!==Object.keys(members).length)||names.length>Object.keys(members).length||new Set(names).size!==names.length||names.some(name=>!Object.hasOwn(members,name)))inventoryFail('ZIP closed member set differs')
  const files=new Map();let expanded=0
  for(const name of names){
   const rows=details.filter(row=>row.endsWith(` ${name}`))
   if(rows.length!==1||!/^-[rwxstST-]{9}\s/.test(rows[0]))inventoryFail('ZIP member must be regular, never symlink')
   let bytes
   try{bytes=execFileSync('unzip',['-p',path,name],{maxBuffer:members[name]+1,stdio:['ignore','pipe','pipe']})}catch{inventoryFail('ZIP member extraction/size invalid')}
   expanded+=bytes.length
   if(bytes.length>members[name]||expanded>192*1024*1024)inventoryFail('ZIP expanded/member size exceeded')
   files.set(name,bytes)
  }
  if(rawSha256(files.get('manifest.json'))!==expected.manifestSha256)inventoryFail('actual manifest SHA differs')
  return files
 }finally{rmSync(directory,{recursive:true,force:true})}
}
