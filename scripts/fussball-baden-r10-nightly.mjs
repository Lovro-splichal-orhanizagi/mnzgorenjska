// Country-scoped DATA only. Foreign progress never rewrites German provenance.
import {readFileSync} from 'node:fs'
const pins=JSON.parse(readFileSync(new URL('./fussball-baden-r10-nightly.json',import.meta.url))),repo='Lovro-splichal-orhanizagi/mnzgorenjska'
const need=(v,c)=>{if(!v)throw Object.assign(Error('BADEN_NIGHTLY_'+c),{code:'BADEN_NIGHTLY_'+c,dataHold:true})}
export const badenR10NightlyRunProjection=r=>Object.fromEntries(Object.entries(r).filter(([k])=>!['status','conclusion','updated_at'].includes(k)))
export function badenR10NightlyProjection(run,jobs){
 need(run?.run_attempt===1&&run.path===pins.workflow&&run.repository?.full_name===repo&&run.head_repository?.full_name===repo&&/^[a-f0-9]{40}$/.test(run.head_sha??''),'RUN')
 need(jobs?.total_count===pins.countryJobNames.length&&Array.isArray(jobs.jobs)&&jobs.jobs.length===jobs.total_count&&new Set(jobs.jobs.map(j=>j.id)).size===jobs.total_count&&JSON.stringify(jobs.jobs.map(j=>j.name).sort())===JSON.stringify(pins.countryJobNames),'COMPLETE_COUNTRY_GRAPH')
 need(jobs.jobs.every(j=>j.run_id===run.id&&j.head_sha===run.head_sha&&j.run_attempt===1),'COUNTRY_BINDINGS')
 const de=jobs.jobs.filter(j=>j.name==='uvoz DE');need(de.length===1&&de[0].status==='completed'&&de[0].conclusion==='success'&&Array.isArray(de[0].steps)&&de[0].steps.every(s=>s.status==='completed')&&de[0].steps.some(s=>s.name==='Uvoz po ligah'&&s.conclusion==='success'),'DE_TERMINAL')
 return {countryJobs:jobs.jobs.map(j=>Object.fromEntries(['id','run_id','run_attempt','head_sha','name'].map(k=>[k,j[k]]))).sort((a,b)=>a.id-b.id),deJob:Object.fromEntries(['id','run_id','run_attempt','head_sha','name','status','conclusion','started_at','completed_at','steps'].map(k=>[k,de[0][k]]))}
}
export const badenR10NightlyPins=()=>structuredClone(pins)
