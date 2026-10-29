// Transport bytes only. No source/native capability, clock or GET permission.
import {createHash,randomBytes} from 'node:crypto'
import {existsSync,lstatSync,realpathSync,mkdirSync,readdirSync,readFileSync,writeFileSync,linkSync,unlinkSync,rmdirSync} from 'node:fs'
import {join,resolve} from 'node:path'
const validEtag=v=>typeof v==='string'&&/^(?:W\/)?"[\x21\x23-\x7e]{1,200}"$/.test(v)
const MiB=1024*1024,headerLimit=64*1024,cacheLimit=512*MiB,entryLimit=256,repo='Lovro-splichal-orhanizagi/mnzgorenjska'
const sha=b=>createHash('sha256').update(b).digest('hex'),hold=()=>{throw Object.assign(Error('Baden GitHub cache/framing refused'),{code:'BADEN_GITHUB_GET_HOLD',githubDiagnostic:'REPOSITORY_JSON_FAILED'})},need=v=>{if(!v)hold()}
export function parseBadenGithubResponse(bytes,limit){
 need(Buffer.isBuffer(bytes));const end=bytes.indexOf('\r\n\r\n');need(end>=0&&end<=headerLimit)
 const lines=bytes.subarray(0,end).toString('latin1').split(/\r?\n/),match=lines.shift().match(/^HTTP\/\d(?:\.\d)? (\d{3})(?: [^\r\n]*)?$/);need(match)
 const headers={};for(const line of lines){const m=line.match(/^([A-Za-z0-9-]+):[ \t]*([^\r\n]*)$/);need(m);const key=m[1].toLowerCase();if(['etag','x-ratelimit-limit','x-ratelimit-remaining','x-ratelimit-used','x-ratelimit-reset','x-ratelimit-resource','retry-after'].includes(key)){need(!Object.hasOwn(headers,key));headers[key]=m[2]}}
 const body=bytes.subarray(end+4);if(body.length>limit)throw Object.assign(Error('Baden GitHub response exceeds bound'),{code:'BADEN_GITHUB_BODY_BOUND'});return {status:Number(match[1]),headers,body:Buffer.from(body)}
}
function directory(tokenScope){
 if(process.env.GITHUB_ACTIONS!=='true')return null
 const e=process.env;need(e.GITHUB_REPOSITORY===repo&&/^[1-9]\d{0,15}$/.test(e.GITHUB_RUN_ID??'')&&/^[1-9]\d{0,3}$/.test(e.GITHUB_RUN_ATTEMPT??'')&&/^[A-Za-z0-9_-]{1,100}$/.test(e.GITHUB_JOB??'')&&/^[a-f0-9]{40}$/.test(e.GITHUB_SHA??'')&&typeof e.RUNNER_TEMP==='string')
 const root=resolve(e.RUNNER_TEMP);need(root===e.RUNNER_TEMP);regular(root,true)
 const scope=sha(JSON.stringify([repo,e.GITHUB_RUN_ID,e.GITHUB_RUN_ATTEMPT,e.GITHUB_JOB,e.GITHUB_SHA,tokenScope]));let path=root
 for(const name of ['slff-baden-gh-immutable-v1',scope]){path=join(path,name);if(!existsSync(path)){try{mkdirSync(path,{mode:0o700})}catch(error){if(error.code!=='EEXIST')hold()}}regular(path,true)}return path
}
function regular(path,isDirectory=false){let s;try{s=lstatSync(path)}catch{hold()};need(!s.isSymbolicLink()&&(isDirectory?s.isDirectory():s.isFile())&&realpathSync(path)===path&&(typeof process.getuid!=='function'||s.uid===process.getuid()));return s}
function inventory(dir){const files=readdirSync(dir);need(files.length<=entryLimit*2);let bytes=0,count=0;for(const name of files){if(name==='.write-lock'){regular(join(dir,name),true);continue}need(/^[a-f0-9]{64}\.bin$|^[a-f0-9]{64}\.[a-f0-9]{16}\.tmp$/.test(name));const s=regular(join(dir,name));bytes+=s.size;if(name.endsWith('.bin'))count++}need(count<=entryLimit&&bytes<=cacheLimit+entryLimit*2048);return {bytes,count}}
function diskRead(dir,key,limit){if(!dir)return null;inventory(dir);const path=join(dir,key+'.bin');let stat;try{stat=lstatSync(path)}catch(error){if(error.code==='ENOENT')return null;hold()};need(!stat.isSymbolicLink());regular(path);need(stat.size>=4&&stat.size<=limit+2048);const bytes=readFileSync(path),length=bytes.readUInt32BE(0);need(length>0&&length<=2044&&bytes.length>=4+length);let h;try{h=JSON.parse(bytes.subarray(4,4+length))}catch{hold()};const body=bytes.subarray(4+length);need(Object.keys(h).sort().join(',')==='bytes,key,sha256,version'&&h.version===1&&h.key===key&&h.bytes===body.length&&h.bytes<=limit&&sha(body)===h.sha256);return Buffer.from(body)}
function diskWrite(dir,key,body,limit){
 if(!dir)return
 // Shared aggregate bounds are checked under one exclusive owned write lock.
 const lock=join(dir,'.write-lock');try{mkdirSync(lock,{mode:0o700})}catch{hold()}
 try{const old=diskRead(dir,key,limit);if(old){need(old.equals(body));return}const state=inventory(dir),head=Buffer.from(JSON.stringify({version:1,key,bytes:body.length,sha256:sha(body)})),record=Buffer.alloc(4+head.length+body.length);need(state.count<entryLimit&&state.bytes+record.length<=cacheLimit);record.writeUInt32BE(head.length);head.copy(record,4);body.copy(record,4+head.length);const target=join(dir,key+'.bin'),temp=join(dir,key+'.'+randomBytes(8).toString('hex')+'.tmp');writeFileSync(temp,record,{flag:'wx',mode:0o600});try{try{linkSync(temp,target)}catch(error){need(error.code==='EEXIST');need(diskRead(dir,key,limit)?.equals(body))}}finally{unlinkSync(temp)}}finally{rmdirSync(lock)}
}
export function createBadenGithubReadCache(token){
 need(typeof token==='string'&&token.length>0);const immutable=new Map(),mutable=new Map(),tokenScope=sha(token),stats={networkGETs:0,ok:0,notModified:0,immutableMemoryHits:0,immutableDiskHits:0,quota:{}};let immutableBytes=0,mutableBytes=0,dir
 function quota(headers){for(const [header,key]of Object.entries({'x-ratelimit-limit':'limit','x-ratelimit-remaining':'remaining','x-ratelimit-used':'used','x-ratelimit-reset':'reset','retry-after':'retryAfter'})){if(/^\d{1,16}$/.test(headers[header]??'')&&Number.isSafeInteger(Number(headers[header])))stats.quota[key]=Number(headers[header])}if(['core','search','code_search','graphql','integration_manifest'].includes(headers['x-ratelimit-resource']))stats.quota.resource=headers['x-ratelimit-resource']}
 const diagnostics=()=>structuredClone(stats)
 return {diagnostics,async read({path,binary,accept,limit},fetchResponse){
  const key=sha(JSON.stringify([repo,path,binary,accept])),privateKey=tokenScope+':'+key,isImmutable=new RegExp(`^repos/${repo}/contents/.+\\?ref=[a-f0-9]{40}$`).test(path)||binary&&new RegExp(`^repos/${repo}/actions/artifacts/[1-9]\\d{0,15}/zip$`).test(path)
  if(isImmutable){if(immutable.has(key)){stats.immutableMemoryHits++;return Buffer.from(immutable.get(key))}dir??=directory(tokenScope);const saved=diskRead(dir,key,limit);if(saved){need(immutable.size<entryLimit&&immutableBytes+saved.length<=cacheLimit);immutable.set(key,Buffer.from(saved));immutableBytes+=saved.length;stats.immutableDiskHits++;return Buffer.from(saved)}}
  const prior=isImmutable?null:mutable.get(privateKey);stats.networkGETs++;const response=await fetchResponse(prior?.etag??null),{status,headers,body}=response;quota(headers);need(Buffer.isBuffer(body)&&body.length<=limit)
  if(status===304){need(!isImmutable&&prior&&body.length===0&&(!headers.etag||validEtag(headers.etag)&&headers.etag.replace(/^W\//,'')===prior.etag.replace(/^W\//,'')));stats.notModified++;return Buffer.from(prior.body)}
  need(status===200);if(!binary){try{JSON.parse(body)}catch{hold()}}stats.ok++;const etag=headers.etag;if(etag!==undefined)need(validEtag(etag))
  if(isImmutable){need(immutable.size<entryLimit&&immutableBytes+body.length<=cacheLimit);diskWrite(dir,key,body,limit);immutable.set(key,Buffer.from(body));immutableBytes+=body.length}
  else{if(prior){mutableBytes-=prior.body.length;mutable.delete(privateKey)}if(etag){need(mutable.size<entryLimit&&mutableBytes+body.length<=16*MiB);mutable.set(privateKey,{etag,body:Buffer.from(body)});mutableBytes+=body.length}}
  return Buffer.from(body)
 }}
}
export const BADEN_GITHUB_HEADER_BYTES=headerLimit
