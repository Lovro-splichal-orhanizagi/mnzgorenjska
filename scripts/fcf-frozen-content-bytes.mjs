// Fixed own-repository frozen bytes DATA only. No raw URL fetch, retries,
// source/execution capability or relaxed digest/path/epoch authentication.
import {createHash} from 'node:crypto'
const repository='Lovro-splichal-orhanizagi/mnzgorenjska',prefix='repos/'+repository+'/',api='https://api.github.com/'+prefix,maximumBytes=4*1024*1024,maximumBase64Characters=6*1024*1024
const need=(v,m)=>{if(!v)throw Error('FCF_FROZEN_CONTENT: '+m)},hex=(s,n)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s),sha=b=>createHash('sha256').update(b).digest('hex'),git=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')
function decode(content,size){need(typeof content==='string'&&content.length<=maximumBase64Characters,'bounded complete base64 required');const text=content.replace(/\r?\n/g,'');need(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text),'strict base64 required');const bytes=Buffer.from(text,'base64');need(bytes.length===size&&bytes.length<=maximumBytes&&bytes.toString('base64')===text,'complete canonical base64/declared size required');return bytes}
function links(value,expected){for(const [key,url]of Object.entries(value))if(typeof url==='string'&&/^[a-z][a-z0-9+.-]*:\/\//i.test(url))need(Object.hasOwn(expected,key),'extra URL metadata refused');for(const [key,url]of Object.entries(expected))if(Object.hasOwn(value,key))need(value[key]===url||(key==='download_url'&&value[key]===null),'foreign or mismatched metadata URL refused');if(Object.hasOwn(value,'_links')){need(value._links&&Object.getPrototypeOf(value._links)===Object.prototype,'fixed metadata links required');for(const [key,url]of Object.entries(value._links))need(Object.hasOwn(expected,key==='self'?'url':key==='git'?'git_url':key==='html'?'html_url':'!')&&url===expected[key==='self'?'url':key==='git'?'git_url':'html_url'],'foreign or extra metadata link refused')}}
export async function readFcfFrozenContentBytes(input){
 need(input&&Object.getPrototypeOf(input)===Object.prototype&&Object.keys(input).sort().join(',')==='commit,expectedSha256,github,path','closed frozen content input required')
 const {github,path,commit,expectedSha256}=input
 need(typeof github==='function'&&typeof path==='string'&&path.length<=300&&/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(path)&&path.split('/').every(p=>p!=='.'&&p!=='..')&&hex(commit,40)&&hex(expectedSha256,64),'fixed path/40hex commit/SHA256 required')
 const metadata=await github(prefix+'contents/'+path+'?ref='+commit,false)
 need(metadata?.type==='file'&&metadata.path===path&&Number.isSafeInteger(metadata.size)&&metadata.size>=0&&metadata.size<=maximumBytes,'bounded exact file metadata/declared size required')
 if(Object.hasOwn(metadata,'sha'))need(hex(metadata.sha,40),'metadata SHA1 required')
 const gitURL=hex(metadata.sha,40)?api+'git/blobs/'+metadata.sha:undefined
 links(metadata,{url:api+'contents/'+path+'?ref='+commit,git_url:gitURL,html_url:'https://github.com/'+repository+'/blob/'+commit+'/'+path,download_url:'https://raw.githubusercontent.com/'+repository+'/'+commit+'/'+path})
 let bytes
 if(metadata.encoding==='base64'){
  bytes=decode(metadata.content,metadata.size)
  if(Object.hasOwn(metadata,'sha'))need(git(bytes)===metadata.sha,'contents Git object SHA1 differs')
 }else{
  // Only the observed >1MiB Contents API omission may use the own Git blob API.
  need(metadata.encoding==='none'&&metadata.content===''&&metadata.size>1024*1024&&hex(metadata.sha,40)&&metadata.git_url===gitURL,'only complete large-file none/empty metadata may use blob API')
  const blob=await github(prefix+'git/blobs/'+metadata.sha,false)
  need(blob&&blob.sha===metadata.sha&&blob.encoding==='base64'&&blob.size===metadata.size,'exact Git blob SHA1/size/encoding required')
  links(blob,{url:gitURL,git_url:gitURL,download_url:null})
  bytes=decode(blob.content,blob.size);need(git(bytes)===metadata.sha,'Git blob object hash differs')
 }
 need(sha(bytes)===expectedSha256,'frozen expected SHA256 differs');return bytes
}
