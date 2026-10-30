// Operator-only immutable code authentication. No historical receipt reader,
// provider transport, cache, clock or authority changes; exactly two own GETs.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync,realpathSync} from 'node:fs'
import {resolve} from 'node:path'
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',api='https://api.github.com/'+prefix,hex=(x,n)=>typeof x==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(x),sha=b=>createHash('sha256').update(b).digest('hex'),need=(v,m)=>{if(!v)throw Error('FCF_NATIVE800_RUNTIME_TREE: '+m)}
const validPath=p=>typeof p==='string'&&p.length>0&&p.length<=4096&&!/[\\\x00-\x1f\x7f]/.test(p)&&!p.startsWith('/')&&!p.endsWith('/')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'&&x!=='.git')
function jsonBound(value,maximum){let bytes;try{bytes=Buffer.byteLength(JSON.stringify(value))}catch{need(false,'JSON_BODY')}need(bytes>0&&bytes<=maximum,'JSON_BOUND')}
export const native800GitBlobSha1=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
export async function authenticateNative800RuntimeTree({github,commit,runtimeFiles}){
 need(typeof github==='function'&&hex(commit,40)&&Array.isArray(runtimeFiles)&&runtimeFiles.length>0&&runtimeFiles.length<=10000,'FIXED_RUNTIME_INPUT')
 need(new Set(runtimeFiles.map(f=>f.path)).size===runtimeFiles.length&&runtimeFiles.every(f=>f&&Object.keys(f).sort().join(',')==='path,sha256'&&validPath(f.path)&&hex(f.sha256,64)),'EXACT_REQUIRED_MANIFEST')
 const object=await github(prefix+'git/commits/'+commit);jsonBound(object,1024*1024);need(object?.sha===commit&&hex(object.tree?.sha,40),'EXACT_COMMIT_TREE');if(object.url!==undefined)need(object.url===api+'git/commits/'+commit,'COMMIT_URL');if(object.tree.url!==undefined)need(object.tree.url===api+'git/trees/'+object.tree.sha,'COMMIT_TREE_URL')
 const tree=await github(prefix+'git/trees/'+object.tree.sha+'?recursive=1');jsonBound(tree,10*1024*1024);need(tree?.sha===object.tree.sha&&tree.truncated===false&&Array.isArray(tree.tree)&&tree.tree.length<=100000,'COMPLETE_BOUNDED_TREE');if(tree.url!==undefined)need(tree.url===api+'git/trees/'+object.tree.sha,'TREE_URL')
 const entries=new Map();for(const e of tree.tree){need(e&&validPath(e.path)&&!entries.has(e.path)&&hex(e.sha,40),'UNIQUE_VALID_TREE_ENTRY');const blob=e.type==='blob'&&['100644','100755'].includes(e.mode),directory=e.type==='tree'&&e.mode==='040000';need(blob||directory,'REGULAR_BLOB_OR_TREE_ONLY');need(blob?Number.isSafeInteger(e.size)&&e.size>=0:e.size===undefined,'ENTRY_SIZE');if(e.url!==undefined)need(e.url===api+'git/'+(blob?'blobs/':'trees/')+e.sha,'ENTRY_URL');entries.set(e.path,e)}
 for(const e of entries.values()){const components=e.path.split('/');for(let n=1;n<components.length;n++)need(entries.get(components.slice(0,n).join('/'))?.type==='tree','COMPLETE_PARENT_TREES')}
 const root=realpathSync(process.cwd());let localBytes=0;for(const f of runtimeFiles){const e=entries.get(f.path);need(e?.type==='blob'&&['100644','100755'].includes(e.mode),'REQUIRED_REGULAR_FILE');const path=resolve(root,f.path),stat=lstatSync(path);need(stat.isFile()&&!stat.isSymbolicLink()&&realpathSync(path)===path&&stat.size===e.size&&stat.size<=10*1024*1024,'LOCAL_REGULAR_FILE_SIZE');const bytes=readFileSync(path);localBytes+=bytes.length;need(localBytes<=256*1024*1024&&bytes.length===e.size&&sha(bytes)===f.sha256&&native800GitBlobSha1(bytes)===e.sha,'LOCAL_SHA256_GIT_BLOB_BINDING')}
 return Object.freeze({kind:'fcf-native800-immutable-runtime-data',commit,treeSha:tree.sha,requiredFiles:runtimeFiles.length,githubReads:2,nativeAdmission:false,activationEligible:false})
}
