// Retain original bytes BEFORE strict parsing. Partial failures remain diagnostic
// evidence and can never be consumed as a successful source/release packet.
import {constants,lstatSync,mkdirSync,openSync,writeFileSync,closeSync,fstatSync} from 'node:fs'
import {isAbsolute,resolve,join,parse,relative,sep} from 'node:path'
import {createHash} from 'node:crypto'
import {validateFcfFinalAuditPlan} from './fcf-final-audit.mjs'
const fail=message=>{throw Error(`FCF_EVIDENCE: ${message}`)}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
function directory(path){
 let current=parse(path).root
 for(const part of relative(current,path).split(sep).filter(Boolean)){
  current=join(current,part);const st=lstatSync(current)
  if(!st.isDirectory()||st.isSymbolicLink())fail('symlink/non-directory ancestor')
 }
 return lstatSync(path)
}
export function createFcfAuditRetention({root,plan,execution}){
 const selected=validateFcfFinalAuditPlan(plan),planSha256=plan.planSha256,sourceCommit=plan.sourceCommit
 if(!execution||Object.keys(execution).sort().join(',')!=='commit,ref,repository,runAttempt,runId'||execution.repository!=='Lovro-splichal-orhanizagi/mnzgorenjska'||execution.ref!=='refs/heads/main'||execution.commit!==sourceCommit||!['runId','runAttempt'].every(k=>typeof execution[k]==='string'&&/^[1-9][0-9]{0,19}$/.test(execution[k])))fail('exact Actions execution identity required')
 if(typeof root!=='string'||!isAbsolute(root)||resolve(root)!==root)fail('absolute owned parent required')
 directory(root);const output=join(root,'fcf-historical-audit')
 try{lstatSync(output);fail('fresh output required')}catch(error){if(error.code!=='ENOENT')throw error}
 mkdirSync(output,{mode:0o700});const identity=directory(output),captures=[],attempts=[],context={...execution};let closed=false
 function write(name,bytes){
  const st=directory(output)
  if(st.ino!==identity.ino||st.dev!==identity.dev||closed)fail('evidence directory changed/closed')
  let fd
  try{
   fd=openSync(join(output,name),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600)
   if(!fstatSync(fd).isFile())fail('nonregular evidence file')
   writeFileSync(fd,bytes)
  }finally{if(fd!==undefined)closeSync(fd)}
 }
 function attempt(receipt){
  const expected=selected[attempts.length]
  if(closed||!expected||attempts.length!==captures.length||!receipt||Object.keys(receipt).sort().join(',')!=='competitionSlug,expectedSourceRound,id,sourceUrl,startedUTC'||receipt.id!==expected.id||receipt.competitionSlug!==expected.competitionSlug||receipt.expectedSourceRound!==expected.expectedSourceRound||receipt.sourceUrl!==`https://www.fcf.cat/ca/competicio/acta/${expected.id}`||!Number.isFinite(Date.parse(receipt.startedUTC)))fail('unplanned/repeated/out-of-order actual source attempt')
  attempts.push(JSON.parse(JSON.stringify(receipt)))
 }
 function capture(receipt,bytes){
  const expected=selected[captures.length],start=Date.parse(receipt?.startedUTC),end=Date.parse(receipt?.capturedUTC)
  if(attempts.length!==captures.length+1||attempts[captures.length]?.startedUTC!==receipt?.startedUTC)fail('raw receipt lacks matching actual request attempt')
  if(closed||!expected||receipt?.id!==expected.id||receipt.competitionSlug!==expected.competitionSlug||receipt.expectedSourceRound!==expected.expectedSourceRound||receipt.sourceUrl!==`https://www.fcf.cat/ca/competicio/acta/${expected.id}`||!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>2*1024*1024||receipt.bytes!==bytes.length||receipt.rawSha256!==digest(bytes)||!Number.isFinite(start)||!Number.isFinite(end)||end<start)fail('unplanned/repeated/changed original receipt')
  write(`acta-${expected.id}.html`,bytes)
  captures.push(JSON.parse(JSON.stringify(receipt)))
 }
 function save(status,result){
  if(closed)fail('evidence already sealed')
  const manifest={schemaVersion:1,kind:'fcf-final-current-audit',status,planSha256,sourceCommit,execution:context,actualSourceGETs:attempts.length,attempts,captures:result?.captures??captures}
  const bytes=Buffer.from(JSON.stringify(manifest)+'\n')
  if(bytes.length>2*1024*1024)fail('bounded manifest size exceeded')
  write('manifest.json',bytes);closed=true
 }
 function finish(result){
  if(!result||result.schemaVersion!==1||result.sourceCommit!==sourceCommit||result.planSha256!==planSha256||captures.length!==selected.length||attempts.length!==selected.length||result.actualSourceGETs!==attempts.length||!Array.isArray(result.captures)||result.captures.length!==captures.length||result.captures.some((r,i)=>{const{canonical,...receipt}=r;return canonical==null||JSON.stringify(receipt)!==JSON.stringify(captures[i])}))fail('complete collector output differs from retained receipts')
  save('complete',result)
 }
 return{directory:output,attempt,capture,finish,abort:()=>save('failed')}
}
