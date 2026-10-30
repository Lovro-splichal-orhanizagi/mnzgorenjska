// Immutable Git content DATA, not budget authority. Includes new executable
// modules in the selected inventory; unrelated documentation may differ.
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
const compiled=JSON.parse(readFileSync(new URL('./fussball-baden-r10-content-vectors.json',import.meta.url))),compiledOutside=compiled.ciOutsideCode??{}
const prefix='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',hex=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v)
const need=(v,m)=>{if(!v)throw Object.assign(Error('BADEN_RUNTIME_VECTOR_'+m),{code:'BADEN_RUNTIME_VECTOR_'+m,dataHold:true})}
export const badenR10CriticalCodePath=(path,workflow)=>path===workflow||['package.json','package-lock.json','fastlane/Fastfile'].includes(path)||!path.startsWith('.github/')&&/\.(?:[cm]?[jt]sx?|sh|py|sql|rb|toml|gradle)$/.test(path)
export const badenR10CiGermanCodePath=(path,workflow)=>path===workflow||['package.json','package-lock.json'].includes(path)||path.startsWith('scripts/')&&/(?:fussball|baden|bulk|historical-statistics|cakaj-na-uvoze)/i.test(path)&&/\.(?:[cm]?[jt]sx?|sh|py|sql|json)$/.test(path)||path.startsWith('policies/')&&/(?:fussball|baden)/i.test(path)
export function badenR10VectorDigest(rows,workflow,projection='all',outsideCode=compiledOutside){
 need(['all','german-ci','scout-ci'].includes(projection),'PROJECTION');const select=projection==='scout-ci'?(path,_workflow)=>path===_workflow||path.startsWith('scout/stroj/')&&/\.(?:py|toml)$/.test(path)||path==='scripts/visja-liga.mjs':projection==='german-ci'?(path,_workflow,e)=>badenR10CiGermanCodePath(path,_workflow)||badenR10CriticalCodePath(path,_workflow)&&!outsideCode[path]?.includes(e.sha):badenR10CriticalCodePath
 need(rows.filter(e=>select(e.path,workflow,e)).every(e=>e.type==='blob'),'CRITICAL_TYPE')
 const selected=rows.filter(e=>select(e.path,workflow,e)).map(e=>({path:e.path,mode:e.mode,sha:e.sha,size:e.size})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)
 need(selected.some(e=>e.path===workflow)&&selected.every(e=>['100644','100755'].includes(e.mode)&&hex(e.sha)&&Number.isSafeInteger(e.size)&&e.size>=0),'CRITICAL_INVENTORY')
 return {vectorSha256:createHash('sha256').update(JSON.stringify(selected)).digest('hex'),files:selected.length,reviewedCriticalBytes:projection==='german-ci'&&selected.every(e=>compiled.ciGermanCode?.[e.path]?.includes(e.sha))&&(compiled.ciRequiredPaths??[]).every(p=>selected.some(e=>e.path===p))}
}
export async function readBadenR10RuntimeVector(input){
 need(input&&Object.getPrototypeOf(input)===Object.prototype&&['github,head,workflow','github,head,projection,workflow'].includes(Object.keys(input).sort().join(','))&&typeof input.github==='function'&&hex(input.head)&&/^\.github\/workflows\/[a-z0-9-]+\.yml$/.test(input.workflow??''),'INPUT')
 const c=await input.github(prefix+'git/commits/'+input.head);need(c?.sha===input.head&&hex(c.tree?.sha),'COMMIT')
 const t=await input.github(prefix+'git/trees/'+c.tree.sha+'?recursive=1')
 need(t?.sha===c.tree.sha&&t.truncated===false&&Array.isArray(t.tree)&&t.tree.length<=100000&&Buffer.byteLength(JSON.stringify(t))<=10*1024*1024,'COMPLETE_TREE')
 const seen=new Set()
 for(const e of t.tree){need(e&&typeof e.path==='string'&&e.path.length>0&&e.path.length<=4096&&!/[\\\x00-\x1f]/.test(e.path)&&e.path.split('/').every(p=>p&&p!=='.'&&p!=='..'&&p!=='.git')&&!seen.has(e.path)&&hex(e.sha),'TREE_ENTRY');seen.add(e.path)}
 return Object.freeze({kind:'baden-r10-runtime-vector-data',head:input.head,tree:c.tree.sha,...badenR10VectorDigest(t.tree,input.workflow,input.projection),sourceOperationAuthorized:false})
}
