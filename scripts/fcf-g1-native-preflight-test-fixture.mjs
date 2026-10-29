// TEST ONLY: fixed source301 production reader, retained byte-bound GETs only.
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {readFcfG1NativePreflightSource} from './fcf-g1-native-preflight-source.mjs'
export async function retainedG1NativePreflightSource(){
 const responses=new Map(),dirs=[process.env.FCF_G1_PREFLIGHT_SEQUENCE,process.env.FCF_G1_NATIVE_READINESS_TERMINAL]
 for(const dir of dirs){if(!dir)throw Error('Exact retained source fixture directory required');for(const line of readFileSync(join(dir,'transport-journal.ndjson'),'utf8').trim().split('\n')){const r=JSON.parse(line);if(r.status!=='get-returned')continue;const b=readFileSync(join(dir,r.file));if(createHash('sha256').update(b).digest('hex')!==r.sha256)throw Error('Retained byte digest drift');responses.set(r.path+'\0'+r.binary,b)}}
 let offlineGETs=0;const github=async(path,binary=false)=>{offlineGETs++;const b=responses.get(path+'\0'+binary);if(!b)throw Error('Retained response missing '+path+' binary:'+binary);return binary?Buffer.from(b):JSON.parse(b)}
 const proof=await readFcfG1NativePreflightSource({github,frozenDirectory:process.env.FCF_G1_REMAINDER_FROZEN_DIRECTORY});return{proof,offlineGETs}
}
