// GitHub artifact bytes are verified before ZIP extraction; no Actions warning bypass.
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync,mkdirSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
export const repository='Lovro-splichal-orhanizagi/mnzgorenjska'
export const sha256=x=>createHash('sha256').update(x).digest('hex')
const id=x=>/^[1-9]\d{0,19}$/.test(String(x))
const maxArchive=100*1024*1024
const fcfHistoryName=name=>name==='manifest.json'||/^acta-[1-9]\d{6}\.html$/.test(name)&&[[4109388,4109627],[4116188,4116427],[4118349,4118588]].some(([start,end])=>{const n=Number(name.slice(5,-5));return n>=start&&n<=end})
export function github(path,binary=false){return execFileSync('gh',['api',`repos/${repository}/${path}`],{encoding:binary?undefined:'utf8',maxBuffer:maxArchive+1})}
export const githubJson=path=>JSON.parse(github(path))
export function verifyArtifact(a,{runId,commit,name}){
 if(!a||!Number.isSafeInteger(a.id)||!id(a.id)||a.name!==name||a.expired!==false||!Number.isSafeInteger(a.size_in_bytes)||a.size_in_bytes<1||a.size_in_bytes>maxArchive||!/^sha256:[a-f0-9]{64}$/.test(a.digest??'')||String(a.workflow_run?.id)!==String(runId)||a.workflow_run?.head_sha!==commit)throw Error('Invalid artifact identity/digest')
 return {id:String(a.id),digest:a.digest,name:a.name,size:a.size_in_bytes}
}
export function unpackVerifiedArchive(bytes,digest,kind){
 if(bytes.length>maxArchive||!/^sha256:[a-f0-9]{64}$/.test(digest??'')||`sha256:${sha256(bytes)}`!==digest)throw Error('Artifact ZIP digest mismatch')
 if(kind==='fussball-checkpoint')return unpackFussballCheckpoint(bytes)
 if(kind==='fussball-resumption')return unpackFussballResumption(bytes)
 if(kind==='fussball-successor-current'||kind==='fussball-successor-archive')return unpackFussballSuccessor(bytes,kind)
 const sixCleanup=kind==='fcf-six-cleanup-prepared'||kind==='fcf-six-cleanup-applied',cleanup=sixCleanup||kind==='fcf-cleanup-prepared'||kind==='fcf-cleanup-applied',fcf=kind==='fcf-history'||cleanup
 const cleanupName=name=>name==='manifest.json'||['fcf-cleanup-prepared','fcf-six-cleanup-prepared'].includes(kind)&&(name==='before-image.json'||(sixCleanup?['4109388','4109404','4116215','4118352','4118354','4118358']:['4109388','4116215','4118352','4118358']).some(id=>name===`acta-${id}.html`))
 const fcfName=name=>cleanup?cleanupName(name):fcfHistoryName(name)
 const memberLimit=kind==='fcf-six-cleanup-prepared'?8:kind==='fcf-six-cleanup-applied'?1:kind==='fcf-cleanup-prepared'?6:kind==='fcf-cleanup-applied'?1:kind==='fcf-history'?721:1505
 const dir=mkdtempSync(join(tmpdir(),'slff-dfb-artifact-'))
 try{
  const zip=join(dir,'source.zip');writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:500000}).trim().split('\n'),files=new Map()
  if(!['capture','replay','fcf-history','fcf-cleanup-prepared','fcf-cleanup-applied','fcf-six-cleanup-prepared','fcf-six-cleanup-applied'].includes(kind)||names.length>memberLimit||new Set(names).size!==names.length)throw Error('Invalid artifact entry set')
  if(fcf){
   const details=execFileSync('unzip',['-Z','-l',zip],{encoding:'utf8',maxBuffer:500000}).split('\n')
   for(const name of names){
    if(!fcfName(name))throw Error(`Invalid artifact entry ${name}`)
    const entries=details.filter(line=>line.endsWith(` ${name}`))
    if(entries.length!==1||!(/^[?-][rwxstST-]{9}\s/).test(entries[0]))throw Error('FCF artifact entry must be regular, never a symlink')
   }
  }
  let total=0
  for(const name of names){
   const allowed=kind==='capture'?/^(?:[a-f0-9]{64}\.html|prenosi\.json|porocilo\.json|razpored\.json|zapisniki\.json)$/:/^(?:replay|summary|razpored|zapisniki|porocilo)\.json$/
   if(fcf?!fcfName(name):!allowed.test(name))throw Error(`Invalid artifact entry ${name}`)
   const bound=cleanup?(name.endsWith('.html')?2:8)*1024*1024:kind==='fcf-history'?2*1024*1024:null
   const body=execFileSync('unzip',['-p',zip,name],{maxBuffer:bound===null?(name.endsWith('.html')?5000001:16*1024*1024):bound+1})
   if(bound!==null&&body.length>bound)throw Error('FCF artifact member size exceeded')
   total+=body.length;if(total>(fcf?192:250)*1024*1024)throw Error('Artifact expanded size exceeded')
   files.set(name,body)
  }
  return files
 }finally{rmSync(dir,{recursive:true,force:true})}
}
// Separate closed format; legacy capture/replay/FCF extraction is unchanged.
function unpackFussballCheckpoint(bytes){
 const dir=mkdtempSync(join(tmpdir(),'slff-fussball-checkpoint-'))
 try{
  const zip=join(dir,'source.zip');writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:3*1024*1024}).trimEnd().split('\n')
  const details=execFileSync('unzip',['-Z','-l',zip],{encoding:'utf8',maxBuffer:5*1024*1024}).split('\n')
  if(!names.length||names.length>20003||new Set(names).size!==names.length)throw Error('Invalid checkpoint artifact entry set')
  const files=new Map();let total=0
  for(const name of names){
   if(!/^(?:manifest\.json|attempts\.jsonl|progress\.jsonl|documents\/[a-f0-9]{64}\.(?:html|css|woff))$/.test(name))throw Error('Invalid checkpoint artifact path')
   const rows=details.filter(row=>row.endsWith(` ${name}`))
   if(rows.length!==1||!/^-[rwxstST-]{9}\s/.test(rows[0]))throw Error('Checkpoint artifact member must be regular, never symlink or directory')
   const bound=name.endsWith('.css')?64*1024:name.startsWith('documents/')?8*1024*1024:16*1024*1024
   const body=execFileSync('unzip',['-p',zip,name],{maxBuffer:bound+1})
   if(body.length>bound)throw Error('Checkpoint artifact member size exceeded')
   total+=body.length;if(total>192*1024*1024)throw Error('Checkpoint artifact expanded size exceeded')
   files.set(name,body)
  }
  return files
 }finally{rmSync(dir,{recursive:true,force:true})}
}
// Exact fourth-parent v4 envelope only. Nested ZIPs are returned as raw bytes;
// only the unchanged v1 reader may subsequently authenticate the fixed old3.
function unpackFussballResumption(bytes){
 const dir=mkdtempSync(join(tmpdir(),'slff-fussball-resumption-'))
 try{
  const zip=join(dir,'source.zip');writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:256*1024}).trimEnd().split('\n')
  const details=execFileSync('unzip',['-Z','-l',zip],{encoding:'utf8',maxBuffer:512*1024}).split('\n')
  if(!names.length||names.length>241||new Set(names).size!==names.length)throw Error('Invalid resumption artifact entry set')
  const files=new Map();let total=0
  for(const name of names){
   const nested=/^checkpoint\/parents\/(?:40416972177|40509926697|40531709101)\.(?:json|zip)$/.test(name)
   if(!nested&&!/^(?:manifest\.json|attempts\.jsonl|progress\.jsonl|documents\/[a-f0-9]{64}\.(?:html|css|woff))$/.test(name))throw Error('Invalid resumption artifact path')
   const rows=details.filter(row=>row.endsWith(` ${name}`))
   if(rows.length!==1||!/^-[rwxstST-]{9}\s/.test(rows[0]))throw Error('Resumption artifact member must be regular, never symlink or directory')
   const bound=nested?(name.endsWith('.zip')?32*1024*1024:1024*1024):name.endsWith('.css')?64*1024:name.startsWith('documents/')?8*1024*1024:16*1024*1024
   const body=execFileSync('unzip',['-p',zip,name],{maxBuffer:bound+1})
   if(body.length>bound)throw Error('Resumption artifact member size exceeded')
   total+=body.length;if(total>192*1024*1024)throw Error('Resumption artifact expanded size exceeded')
   files.set(name,body)
  }
  return files
 }finally{rmSync(dir,{recursive:true,force:true})}
}
export function downloadArtifact({runId,commit,name,kind,expectedId,expectedDigest}){
 if(!id(runId)||!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid artifact run/commit')
 const listing=githubJson(`actions/runs/${runId}/artifacts?per_page=100`)
 if(listing.total_count>100||listing.artifacts?.length!==listing.total_count)throw Error('Incomplete artifact listing')
 const matches=listing.artifacts.filter(a=>a.name===name)
 if(matches.length!==1)throw Error('Expected one actual source artifact')
 const artifact=verifyArtifact(matches[0],{runId,commit,name})
 if(expectedId!=null&&artifact.id!==expectedId||expectedDigest!=null&&artifact.digest!==expectedDigest)throw Error('Parent artifact identity/digest changed')
 const bytes=github(`actions/artifacts/${artifact.id}/zip`,true)
 if(bytes.length!==artifact.size)throw Error('Artifact ZIP size mismatch')
 return {artifact,files:unpackVerifiedArchive(bytes,artifact.digest,kind)}
}
export function writeArtifact(files,dir){
 mkdirSync(dir,{recursive:true});if(readdirSync(dir).length)throw Error('Artifact target must be empty')
 for(const [name,bytes]of files)writeFileSync(join(dir,name),bytes)
}

// Two fixed latest-stage envelopes. Nested provenance stays raw for the v2 reader.
function unpackFussballSuccessor(bytes,kind){
 const current=kind==='fussball-successor-current',dir=mkdtempSync(join(tmpdir(),'slff-fussball-successor-'))
 try{
  const zip=join(dir,'source.zip');writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:256*1024}).trimEnd().split('\n')
  const details=execFileSync('unzip',['-Z','-l',zip],{encoding:'utf8',maxBuffer:512*1024}).split('\n')
  if(!names.length||names.length>(current?670:9)||new Set(names).size!==names.length)throw Error('Invalid successor artifact entry set')
  const files=new Map();let total=0
  for(const name of names){
   const nested=current&&/^checkpoint\/parents\/40566792786\.(?:json|zip)$/.test(name)
   const parent=!current&&name==='archive-parent/7a0bb00b1aae60f61ec36985a3718d897f704dc4400255ff60896e2e653c4734.html'
   const ordinary=/^(?:manifest\.json|attempts\.jsonl|progress\.jsonl|documents\/[a-f0-9]{64}\.(?:html|css|woff))$/.test(name)||current&&name==='result.json'
   if(!nested&&!parent&&!ordinary)throw Error('Invalid successor artifact path')
   const rows=details.filter(row=>row.endsWith(` ${name}`))
   if(rows.length!==1||!/^-[rwxstST-]{9}\s/.test(rows[0]))throw Error('Successor artifact member must be regular, never symlink or directory')
   const bound=name==='result.json'?72*1024*1024:nested?(name.endsWith('.zip')?16*1024*1024:1024*1024):name.endsWith('.css')?64*1024:name.startsWith('documents/')||parent?8*1024*1024:16*1024*1024
   const body=execFileSync('unzip',['-p',zip,name],{maxBuffer:bound+1})
   if(body.length>bound)throw Error('Successor artifact member size exceeded')
   total+=body.length;if(total>(current?192:32)*1024*1024)throw Error('Successor artifact expanded size exceeded')
   files.set(name,body)
  }
  return files
 }finally{rmSync(dir,{recursive:true,force:true})}
}
