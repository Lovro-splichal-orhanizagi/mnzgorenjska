// Runtime manifest is fixed to the approved capture epoch, not the consumer SHA.
import {readFileSync} from 'node:fs'
import {posix} from 'node:path'
import {zaprtje,lokalniUvozi} from './odtis-kode.mjs'
import {rawSha256} from './fcf-missing-inventory-artifact.mjs'
const dataImports=(p,bytes)=>[...bytes.toString('utf8').matchAll(/new URL\(['"](\.{1,2}\/[^'"]+\.(?:json|yml))['"],\s*import\.meta\.url\)/g)].map(m=>posix.normalize(posix.join(posix.dirname(p),m[1])))
const roots=['scripts/fcf-refresh800-actions.mjs','scripts/fcf-refresh800-capture.mjs'],fixed=['.github/workflows/uvoz-fcf-zgodovina.yml','package.json','package-lock.json','scripts/policies/fcf-g1-4109410-supplement.json','scripts/policies/fcf-g1-4109409-supplement.json','scripts/fcf-g9-calendar-counter-pins.json','scripts/fcf-g9-pre-provider-zero-pins.json']
export function fcfRefresh800RuntimeFiles(){const paths=new Set([...fixed,...roots.flatMap(p=>zaprtje(p))]);for(const p of paths)if(/\.(m?js|ts)$/.test(p))for(const data of dataImports(p,readFileSync(p)))paths.add(data);return [...paths].sort().map(path=>({path,sha256:rawSha256(readFileSync(path))}))}
export function assertFcfRefresh800RuntimeClosure(manifest,contents){const need=(v,m)=>{if(!v)throw Error('FCF_REFRESH800_RUNTIME: '+m)},paths=new Set(manifest.map(x=>x.path)),seen=new Set(),todo=[...roots,...fixed];while(todo.length){const p=todo.pop();if(seen.has(p))continue;seen.add(p);need(paths.has(p)&&contents.has(p),'approved capture runtime closure incomplete');if(/\.(m?js|ts)$/.test(p)){for(const relative of lokalniUvozi(contents.get(p).toString('utf8')))todo.push(posix.normalize(posix.join(posix.dirname(p),relative)));todo.push(...dataImports(p,contents.get(p)))}}need(paths.size===seen.size,'unreviewed extra runtime path');return true}
