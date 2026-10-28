// Exact checked-in catalogs and actual provider replay functions, not proof placeholders.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {POLAND_BULK_CANDIDATES,capturePolandCandidate,loadPolandPack} from './bulk-poland-source.mjs'
import {GERMANY_BULK_CANDIDATES,captureGermanyCandidate,loadGermanyPack,validateGermanyCandidate} from './bulk-germany-source.mjs'
import {atomicCheckpoint} from './provider-league-batch.mjs'
import {zaprtje} from './odtis-kode.mjs'
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
const fail=message=>{throw Object.assign(Error(message),{dataHold:true,reason_code:'BULK_SOURCE_ADMISSION_HOLD'})}
export const bulkCandidates=country=>structuredClone([...POLAND_BULK_CANDIDATES,...GERMANY_BULK_CANDIDATES].filter(c=>country==='ALL'||c.country_code===country))
export function selectBulkCandidates(country,slug){
 const candidates=bulkCandidates(country)
 if(slug===undefined)return candidates
 if(country!=='DE'||!/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))fail('Single-candidate selection requires an exact reviewed German slug.')
 const selected=candidates.filter(c=>c.slug===slug)
 if(selected.length!==1)fail('Unknown or ambiguous reviewed German candidate.')
 validateGermanyCandidate(selected[0])
 return selected
}
function candidateScope(candidate){
 const catalog=bulkCandidates('ALL'),found=catalog.find(c=>c.slug===candidate?.slug)
 if(!found||digest(found)!==digest(candidate))fail('Pack candidate differs from the checked-in catalog.')
 return found
}
function codeHash(){
 const paths=new Set([...zaprtje('scripts/bulk-source-packs.mjs'),'scripts/policies/pl-bulk-candidates.json','scripts/policies/de-bulk-candidates.json','scripts/viri/fussball-datumski-glifi.json'])
 return digest([...paths].sort().map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))
}
export async function captureBulkCandidate(candidate,options){
 candidateScope(candidate)
 if(candidate.country_code==='PL')return capturePolandCandidate(candidate,{...options,maxRequests:Math.min(options.maxRequests,1000)})
 if(candidate.country_code==='DE')return captureGermanyCandidate(candidate,options)
 fail('No installed bulk source contract.')
}
export async function saveBulkAdmission(directory,admission){
 candidateScope(admission.candidate)
 atomicCheckpoint(resolve(directory)+'.admission.json',{...admission,code_sha256:codeHash()})
}
export async function loadBulkPack(directory,{candidate,competition,now=new Date(),requireFresh=true,profile,composition,preparation,context,db}={}){
 if(profile==='germany-retained-fussball-native-v1'){
  const {loadPreparedFussballNativePack}=await import('./fussball-native-runtime.mjs')
  return loadPreparedFussballNativePack({competition,preparation,context,composition,db})
 }
 const path=resolve(directory)+'.admission.json'
 if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink()||lstatSync(path).size>128*1024)fail('Invalid source admission file.')
 const admission=JSON.parse(readFileSync(path,'utf8')),catalog=candidateScope(admission.candidate)
 if(admission.version!==1||admission.code_sha256!==codeHash()||! /^[a-f0-9]{40}$/.test(admission.expected_sha??''))fail('Source parser or admission provenance changed.')
 if(process.env.GITHUB_ACTIONS==='true'&&admission.expected_sha!==process.env.GITHUB_SHA)fail('Source pack was not captured by this exact main commit.')
 if(candidate){const supplied={...candidate};if(!catalog.id)delete supplied.id;if(digest(supplied)!==digest(catalog))fail('Native candidate differs from captured tuple.')}
 if(competition&&(['slug','source','source_league_code','country_code'].some(k=>competition[k]!==catalog[k])||catalog.id&&competition.id!==catalog.id))fail('Native competition differs from captured tuple/country.')
 const loader=catalog.country_code==='PL'?loadPolandPack:loadGermanyPack
 return loader(directory,{candidate:catalog,now,requireFresh})
}
