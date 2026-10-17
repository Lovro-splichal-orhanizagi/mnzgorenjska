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
export function github(path,binary=false){return execFileSync('gh',['api',`repos/${repository}/${path}`],{encoding:binary?undefined:'utf8',maxBuffer:maxArchive+1})}
export const githubJson=path=>JSON.parse(github(path))
export function verifyArtifact(a,{runId,commit,name}){
 if(!a||!Number.isSafeInteger(a.id)||!id(a.id)||a.name!==name||a.expired!==false||!Number.isSafeInteger(a.size_in_bytes)||a.size_in_bytes<1||a.size_in_bytes>maxArchive||!/^sha256:[a-f0-9]{64}$/.test(a.digest??'')||String(a.workflow_run?.id)!==String(runId)||a.workflow_run?.head_sha!==commit)throw Error('Invalid artifact identity/digest')
 return {id:String(a.id),digest:a.digest,name:a.name,size:a.size_in_bytes}
}
export function unpackVerifiedArchive(bytes,digest,kind){
 if(bytes.length>maxArchive||!/^sha256:[a-f0-9]{64}$/.test(digest??'')||`sha256:${sha256(bytes)}`!==digest)throw Error('Artifact ZIP digest mismatch')
 const dir=mkdtempSync(join(tmpdir(),'slff-dfb-artifact-'))
 try{
  const zip=join(dir,'source.zip');writeFileSync(zip,bytes)
  const names=execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:500000}).trim().split('\n'),files=new Map()
  if(!['capture','replay'].includes(kind)||names.length>1505||new Set(names).size!==names.length)throw Error('Invalid artifact entry set')
  let total=0
  for(const name of names){
   const allowed=kind==='capture'?/^(?:[a-f0-9]{64}\.html|prenosi\.json|porocilo\.json|razpored\.json|zapisniki\.json)$/:/^(?:replay|summary|razpored|zapisniki|porocilo)\.json$/
   if(!allowed.test(name))throw Error(`Invalid artifact entry ${name}`)
   const body=execFileSync('unzip',['-p',zip,name],{maxBuffer:name.endsWith('.html')?5000001:16*1024*1024})
   total+=body.length;if(total>250*1024*1024)throw Error('Artifact expanded size exceeded')
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
