// Bounded catch-up of existing inactive EPS leagues; never activates or reprices.
import {spawn} from 'node:child_process'
import {requireMissingReportImportScope} from './missing-report-import.mjs'

export function validateRefreshSelection(candidates) {
 if(!Array.isArray(candidates)||candidates.length<1||candidates.length>5||new Set(candidates.map(c=>c.slug)).size!==candidates.length||candidates.some(c=>c.source!=='eps'))
  throw Error('Refresh requires one to five distinct existing EPS candidates.')
 return candidates
}
function requireCandidate(candidate,actual) {
 for(const key of ['id','slug','source','source_league_code'])if(actual?.[key]!==candidate[key])throw Error(`Refresh candidate ${key} changed.`)
 requireMissingReportImportScope({competition:actual,leagueCode:candidate.source_league_code})
}
export function runImportCommand(file,args) {
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[file,...args],{stdio:'inherit',timeout:30*60_000})
  child.once('error',reject)
  child.once('exit',(code,signal)=>signal?reject(Error(`Import terminated (${signal}); inspect partial state before another run.`)):resolve(code))
 })
}
export async function runRefreshBatch({candidates,transport,runCommand=runImportCommand,onResult=()=>{},onProgress=()=>{},now=()=>new Date()}) {
 validateRefreshSelection(candidates)
 // Validate every selected tuple before the first subprocess can write.
 for(const candidate of candidates)requireCandidate(candidate,await transport.competition(candidate))
 const stopped=new Set(),results=[]
 for(const candidate of candidates) {
  const domain=candidate.source_league_code.split(':')[0]
  const result={slug:candidate.slug,checked_at:now().toISOString(),status:'HOLD',steps:[]}
  if(stopped.has(domain)) {result.status='SKIPPED_SOURCE_STOP';result.reason='Provider domain stopped earlier in this batch.'}
  else try {
   const commands=[['schedule','scripts/uvoz-razporeda.mjs',['--tekmovanje',candidate.slug,'--pisi']],['reports','scripts/uvoz-zapisnikov.mjs',['--tekmovanje',candidate.slug,'--samo-manjkajoce']]]
   for(const[stage,file,args]of commands) {
    requireCandidate(candidate,await transport.competition(candidate))
    const step={stage,started_at:now().toISOString(),exit_code:null};result.steps.push(step)
    await onProgress({slug:candidate.slug,stage,status:'RUNNING',at:step.started_at})
    let code
    try {code=await runCommand(file,args)}catch(error){
     stopped.add(domain);step.error=error.message;step.completed_at=now().toISOString()
     await onProgress({slug:candidate.slug,stage,status:'FAILED',at:step.completed_at,error:error.message})
     throw error
    }
    step.exit_code=code;step.completed_at=now().toISOString()
    await onProgress({slug:candidate.slug,stage,status:code===0?'COMPLETED':'FAILED',at:step.completed_at,exit_code:code})
    if(code!==0) {
     // Schedule failures use exit 1 even for 5xx. Only its explicit club-count
     // decision (3) is safe to treat as local; unknown failures stop the domain.
     if(code!==3)stopped.add(domain)
     throw Error(`${stage} exited ${code}; no retry or activation. Review retained import output.`)
    }
   }
   result.status='REFRESHED'
  }catch(error){result.reason=error.message}
  results.push(result);await onResult(result)
 }
 return results
}
