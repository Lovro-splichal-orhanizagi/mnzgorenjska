// Real ordinary CLI, constrained to competition reads and the service marker getter.
import {execFileSync} from 'node:child_process'
import {getHistoricalStatisticsPolicy} from './lib/historical-statistics-policy.mjs'
export function registrationSmokeGuard(endpoint,competitionId){
 return `const original=globalThis.fetch;globalThis.fetch=(input,options={})=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);const method=String(options.method??input.method??'GET').toUpperCase();const read=u.pathname==='/rest/v1/competitions'&&method==='GET';const markers=u.pathname==='/rest/v1/rpc/get_installed_historical_statistics_markers'&&method==='POST'&&options.body===JSON.stringify({p_competition_id:${competitionId}});if(u.origin!==${JSON.stringify(new URL(endpoint).origin)}||!(read||markers))throw Error('MFA registration smoke: provider or database mutation forbidden');return original(input,options)}`
}
export function runMfaRegistrationSmoke(endpoint,env,{competitionId}={}){
 const results=[]
 const tuples=[[971,'mt-premier'],[972,'mt-challenge'],[973,'mt-nl1'],[974,'mt-nl2']]
 if(competitionId!==undefined&&!tuples.some(([id,slug])=>id===competitionId&&getHistoricalStatisticsPolicy(slug)))throw Error('MFA registration smoke: registered fixed competition required')
 for(const[id,slug]of tuples.filter(([id])=>competitionId===undefined?id<=972:id===competitionId)){
  const guard=registrationSmokeGuard(endpoint,id)
  const stdout=execFileSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(guard)}`,'scripts/uvoz-registracij.mjs','--tekmovanje',slug],{encoding:'utf8',env,timeout:30000,maxBuffer:65536})
  if(!stdout.includes('zapisnikov o prestopih ne objavlja'))throw Error('MFA registration smoke: expected ordinary no-registration exit required')
  results.push({competitionId:id,slug,installedContextVerified:true,providerReads:0,databaseWrites:0})
 }
 return results
}
