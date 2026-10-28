// Offline boundary fixture: whitespace expands the same catalog DATA; no source
// capability, freshness clock or catalog authority is substituted.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import child from 'node:child_process'
import {syncBuiltinESMExports} from 'node:module'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
const MiB=1024*1024,repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',catalog='scripts/policies/fussball-baden-native-composition.json',head='a'.repeat(40)
const blob=b=>createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex')
if(process.argv[2]==='runtime'){
 const mode=process.argv[3],read=fs.readFileSync,path=fileURLToPath(new URL('../'+catalog,import.meta.url)),original=read(path),size=mode==='oversize'?4*MiB+1:mode==='small'?original.length:2*MiB
 const bytes=Buffer.concat([original,Buffer.alloc(size-original.length,32)])
 fs.readFileSync=function(p,options){if(String(p)===path||(p instanceof URL&&fileURLToPath(p)===path))return typeof options==='string'||options?.encoding?bytes.toString():Buffer.from(bytes);return read.apply(this,arguments)}
 syncBuiltinESMExports()
 const {produceFussballNativeComposition}=await import('./fussball-native-composition.mjs')
 let raw=0,source=0;const calls=[]
 const github=async(p,binary=false)=>{
  calls.push([p,binary]);assert.ok(p.startsWith(repo));const relative=p.slice(repo.length)
  if(relative==='actions/runs/123')return {id:123,run_attempt:1,head_sha:head,head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/replay-fussball-native-composition.yml',repository:{full_name:repo.slice(6,-1)},head_repository:{full_name:repo.slice(6,-1)},status:'in_progress',conclusion:null,created_at:'2026-10-28T00:00:00Z',updated_at:'2026-10-28T00:00:00Z'}
  if(relative==='branches/main')return {name:'main',commit:{sha:mode==='head'?'b'.repeat(40):head}}
  if(relative.startsWith('contents/')){
   assert.ok(relative.endsWith('?ref='+head));const file=relative.slice(9,-45),b=file===catalog?bytes:read(new URL('../'+file,import.meta.url))
   if(binary){assert.equal(file,catalog);raw++;return mode==='truncated'?bytes.subarray(1):mode==='altered'?Buffer.concat([Buffer.from('!'),bytes.subarray(1)]):mode==='rawoversize'?Buffer.alloc(4*MiB+1):bytes}
   if(file===catalog&&mode!=='small')return {type:mode==='type'?'dir':'file',path:mode==='path'?'wrong.json':file,size:b.length+(mode==='size'?1:0),encoding:mode==='encoding'?'base64':'none',content:mode==='content'?'unexpected':'',sha:mode==='sha'?'0'.repeat(40):blob(b),download_url:'https://untrusted.invalid/never-follow'}
   return {type:'file',path:file,size:b.length,encoding:'base64',content:b.toString('base64')}
  }
  source++;throw Object.assign(Error('source boundary intentionally unavailable'),{code:'TEST_SOURCE_BOUNDARY'})
 }
 let error;try{await produceFussballNativeComposition({derivedRunId:'123',derivedHead:head,sourceRunId:'124',frozenDirectory:'UNUSED',v6FrozenDirectory:'UNUSED',directory:'UNCREATED-large-catalog-test',github})}catch(e){error=e}
 console.log(JSON.stringify({code:error?.code,message:error?.message,raw,source,calls}));process.exit(0)
}else if(process.argv[2]==='adapter'){
 const calls=[];let payload=Buffer.from('{}')
 child.execFileSync=(file,args,options)=>{calls.push({file,args,maxBuffer:options.maxBuffer});return payload}
 syncBuiltinESMExports();const {githubGetAdapter}=await import('./stage-fussball-native-composition.mjs'),get=githubGetAdapter('TEST-ONLY')
 await get(repo+'contents/package-lock.json?ref='+head)
 payload=Buffer.from('raw');await get(repo+'contents/'+catalog+'?ref='+head,true)
 await get(repo+'actions/artifacts/123/zip',true)
 await assert.rejects(get(repo+'contents/package-lock.json?ref='+head,true),/fixed.*catalog/)
 await assert.rejects(get(repo+'contents/'+catalog+'?ref=main',true),/fixed.*catalog/)
 payload=Buffer.alloc(4*MiB+1);await assert.rejects(get(repo+'contents/'+catalog+'?ref='+head,true),/bounded.*catalog/)
 console.log(JSON.stringify(calls));process.exit(0)
}else{
 const run=(kind,mode)=>JSON.parse(child.execFileSync(process.execPath,[fileURLToPath(import.meta.url),kind,...(mode?[mode]:[])],{encoding:'utf8',maxBuffer:MiB}))
 test('exported hosted producer accepts exact 1–4 MiB catalog raw bytes and preserves small inline path',()=>{
  for(const mode of ['valid','small']){const r=run('runtime',mode);assert.ok(['TEST_SOURCE_BOUNDARY','FUSSBALL_COMPLETED_SOURCE_V7_HOLD'].includes(r.code),r.message);assert.equal(r.raw,mode==='small'?0:1)}
 })
 test('large catalog metadata, immutable head and raw byte drift hold before source authority',()=>{
  for(const mode of ['head','type','path','size','sha','encoding','content','truncated','altered','oversize','rawoversize']){const r=run('runtime',mode);assert.equal(r.code,'FUSSBALL_NATIVE_COMPOSITION_HOLD',mode+': '+r.message);assert.equal(r.source,0);assert.equal(r.raw,['truncated','altered','rawoversize'].includes(mode)?1:0,mode)}
 })
 test('GitHub adapter selects object/raw media and limits only fixed catalog raw reads to 4 MiB',()=>{
  const calls=run('adapter');assert.ok(calls[0].args.includes('Accept: application/vnd.github.object+json'));assert.ok(calls[1].args.includes('Accept: application/vnd.github.raw+json'));assert.equal(calls[1].maxBuffer,4*MiB+1);assert.equal(calls[2].maxBuffer,512*MiB+1);assert.equal(calls.length,4)
 })
}
