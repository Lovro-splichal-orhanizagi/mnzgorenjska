// TEST ONLY: genuine retained hosted metadata/ZIPs through the actual private
// readers. Offline GET journal adapter; no network or source implementation.
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {readFcfG1RemainderParent} from './fcf-g1-remainder-parent.mjs'
import {readFcfG1RemainderAppendLink} from './fcf-g1-remainder-actions.mjs'
const sha=b=>createHash('sha256').update(b).digest('hex')
export async function retainedG1NativeReadinessFixture(){
 const directory=process.env.FCF_G1_NATIVE_READINESS_TERMINAL,sequence=process.env.FCF_G1_NATIVE_READINESS_SEQUENCE,frozenDirectory=process.env.FCF_G1_REMAINDER_FROZEN_DIRECTORY
 if(!directory||!sequence||!frozenDirectory)throw Error('Explicit retained private test locators required')
 const result=JSON.parse(readFileSync(join(directory,'RESULT.json'))),approval=JSON.parse(readFileSync(join(sequence,'approval.json'))),responses=new Map()
 for(const line of readFileSync(join(directory,'transport-journal.ndjson'),'utf8').trim().split('\n')){const r=JSON.parse(line);if(r.status!=='get-returned')continue;const bytes=readFileSync(join(directory,r.file));if(sha(bytes)!==r.sha256)throw Error('Retained GET digest drift');responses.set(r.path,bytes)}
 let reads=0;const github=async(path,binary=false)=>{const bytes=responses.get(path);if(!bytes)throw Error('Offline response missing '+path);reads++;return binary?Buffer.from(bytes):JSON.parse(bytes)}
 const parentProof=await readFcfG1RemainderParent({...approval.parent,frozenDirectory,github}),appendProofs=[]
 for(const data of approval.appendSources)appendProofs.push(await readFcfG1RemainderAppendLink({data,parentProof,appendProofs,github}))
 const rawProof=await readFcfG1RemainderAppendLink({data:result.sourceReferences,parentProof,appendProofs,github})
 return{rawProof,parentProof,appendProofs,offlineGETs:reads}
}
