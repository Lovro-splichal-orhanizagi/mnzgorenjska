// TEST ONLY. The one-time Baden native chain (fresh pair, completed stages, V7,
// native composition/runtime) pins the exact bytes of scripts/viri/fussball.mjs
// from main 80406b24 (sha256 816617fb…). After a reviewed parser change the real
// modules correctly refuse that old authority. Following the #582/V6 pattern,
// the chain's happy-path tests run in this explicit context, in which only reads
// of scripts/viri/fussball.mjs through node:fs return the retained historical
// bytes. Module loading (the parser actually executed) is untouched, no pin file
// or run record changes, and production code never imports this module.
import fs from 'node:fs'
import {syncBuiltinESMExports} from 'node:module'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'

const root=new URL('./vzorci/test-only-fussball-mjs-816617fb/',new URL('../',import.meta.url))
const proof=JSON.parse(fs.readFileSync(new URL('provenance.json',root)))
const oldBytes=fs.readFileSync(new URL(proof.file,root))
const sha=b=>createHash('sha256').update(b).digest('hex')
if(proof.testOnly!==true||proof.commit!=='80406b242a59b30ce7dbcd421cda7720c31a5b7a'||proof.path!=='scripts/viri/fussball.mjs'||oldBytes.length!==proof.bytes||sha(oldBytes)!==proof.sha256||proof.sha256!=='816617fbcbaa808a49955ff3174a729f505fdd9112dcd5aadaa55e1cc305793a')throw Error('TEST ONLY pinned fussball.mjs fixture changed')

export const PINNED_FUSSBALL_SHA256=proof.sha256
export const PINNED_CAPTURE_CODE_SHA256=proof.captureCodeSha256
const target=fileURLToPath(new URL('../viri/fussball.mjs',import.meta.url))
const realRead=fs.readFileSync
let active=false
const pathOf=p=>{try{return p instanceof URL?fileURLToPath(p):typeof p==='string'?resolve(p.startsWith('file:')?fileURLToPath(p):p):null}catch{return null}}
function readFileSync(p,options){
 if(!active||pathOf(p)!==target)return realRead.apply(fs,arguments)
 const encoding=typeof options==='string'?options:options?.encoding
 return encoding?oldBytes.toString(encoding):Buffer.from(oldBytes)
}
fs.readFileSync=readFileSync
syncBuiltinESMExports()

/** Enable the TEST ONLY historical-bytes context for the rest of this process. */
export function usePinnedFussballBytes(){active=true}
/** Run fn against the real current bytes (to prove the old authority is refused). */
export async function withCurrentFussballBytes(fn){const was=active;active=false;try{return await fn()}finally{active=was}}
export const currentFussballSha256=()=>withCurrentFussballBytes(()=>sha(realRead(target)))
