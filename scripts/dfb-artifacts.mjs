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
 const cleanup=kind==='fcf-cleanup-prepared'||kind==='fcf-cleanup-applied',fcf=kind==='fcf-history'||cleanup
 const cleanupName=name=>name==='manifest.json'||kind==='fcf-cleanup-prepared'&&(name==='before-image.json'||['4109388','4116215','4118352','4118358'].some(id=>name===`acta-${id}.html`))
 const fcfName=name=>cleanup?cleanupName(name):fcfHistoryName(name)
 const memberLimit=kind==='fcf-cleanup-prepared'?6:kind==='fcf-cleanup-applied'?1:kind==='fcf-history'?721:1505
 const dir=mkdtempSync(join(tmpdir(),'slff-dfb-artifact-'))
 try{
  const zip=join(dir,'source.zip');writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:500000}).trim().split('\n'),files=new Map()
  if(!['capture','replay','fcf-history','fcf-cleanup-prepared','fcf-cleanup-applied'].includes(kind)||names.length>memberLimit||new Set(names).size!==names.length)throw Error('Invalid artifact entry set')
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
