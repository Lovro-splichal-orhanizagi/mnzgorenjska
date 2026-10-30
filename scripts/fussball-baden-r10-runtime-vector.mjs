// Immutable Git content DATA, not budget authority. Includes new executable
// modules in the selected inventory; unrelated documentation may differ.
import {createHash} from 'node:crypto'
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',hex=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v)
const need=(v,m)=>{if(!v)throw Object.assign(Error('BADEN_RUNTIME_VECTOR_'+m),{code:'BADEN_RUNTIME_VECTOR_'+m,dataHold:true})}
export const badenR10CriticalCodePath=(path,workflow)=>path===workflow||['package.json','package-lock.json'].includes(path)||!path.startsWith('.github/')&&/\.(?:[cm]?[jt]sx?|sh|py|sql)$/.test(path)
export function badenR10VectorDigest(rows,workflow){
 need(rows.filter(e=>badenR10CriticalCodePath(e.path,workflow)).every(e=>e.type==='blob'),'CRITICAL_TYPE')
 const selected=rows.filter(e=>badenR10CriticalCodePath(e.path,workflow)).map(e=>({path:e.path,mode:e.mode,sha:e.sha,size:e.size})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)
 need(selected.some(e=>e.path===workflow)&&selected.every(e=>['100644','100755'].includes(e.mode)&&hex(e.sha)&&Number.isSafeInteger(e.size)&&e.size>=0),'CRITICAL_INVENTORY')
 return {vectorSha256:createHash('sha256').update(JSON.stringify(selected)).digest('hex'),files:selected.length}
}
export async function readBadenR10RuntimeVector(input){
 need(input&&Object.getPrototypeOf(input)===Object.prototype&&Object.keys(input).sort().join(',')==='github,head,workflow'&&typeof input.github==='function'&&hex(input.head)&&/^\.github\/workflows\/[a-z0-9-]+\.yml$/.test(input.workflow??''),'INPUT')
 const c=await input.github(prefix+'git/commits/'+input.head);need(c?.sha===input.head&&hex(c.tree?.sha),'COMMIT')
 const t=await input.github(prefix+'git/trees/'+c.tree.sha+'?recursive=1')
 need(t?.sha===c.tree.sha&&t.truncated===false&&Array.isArray(t.tree)&&t.tree.length<=100000&&Buffer.byteLength(JSON.stringify(t))<=10*1024*1024,'COMPLETE_TREE')
 const seen=new Set()
 for(const e of t.tree){need(e&&typeof e.path==='string'&&e.path.length>0&&e.path.length<=4096&&!/[\\\x00-\x1f]/.test(e.path)&&e.path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&p!=='.git')&&!seen.has(e.path)&&hex(e.sha),'TREE_ENTRY');seen.add(e.path)}
 return Object.freeze({kind:'baden-r10-runtime-vector-data',head:input.head,tree:c.tree.sha,...badenR10VectorDigest(t.tree,input.workflow),sourceOperationAuthorized:false})
}
