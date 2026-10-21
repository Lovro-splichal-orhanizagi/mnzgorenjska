import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import {getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256} from './lib/historical-statistics-policy.mjs'

const policy=getHistoricalStatisticsPolicy('mt-premier')
const competition={id:971,slug:'mt-premier',name:'Malta Premier League',source:'mfa',source_policy:policy.sourcePolicy,source_league_code:'58539/2027',active:true}
function installed(){
 const sha=historicalStatisticsPolicySha256(policy)
 return{installed:true,policyId:policy.id,policySha256:sha,firstFantasyPlayedOn:'2026-10-21',markers:policy.entries.map((entry,i)=>{
  const{rawSha256,reasonCode,...fixture}=entry
  return{sourceMatchId:entry.sourceMatchId,reportId:`mt${entry.sourceMatchId}`,fixture,rawSha256,matchId:517066+i,roundId:34000+i,homeTeamId:10678+i,awayTeamId:10689+i,policyId:policy.id,policySha256:sha,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}
 })}
}

// Exercise the actual CLI, Supabase client, installed-marker validator and MFA
// adapter against a local read-only fixture. Every external fetch is forbidden.
async function registration({row=competition,binding=installed(),rpcError=false}={}){
 const calls=[]
 const server=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk
  const url=new URL(req.url,'http://localhost');calls.push({path:url.pathname,method:req.method,body})
  res.setHeader('Content-Type','application/json')
  if(req.method==='GET'&&url.pathname==='/rest/v1/competitions'){
   res.end(JSON.stringify(url.searchParams.get('select')==='sezona_koledarska'?{sezona_koledarska:false}:row))
  }else if(req.method==='POST'&&url.pathname==='/rest/v1/rpc/get_installed_historical_statistics_markers'){
   res.statusCode=rpcError?403:200;res.end(JSON.stringify(rpcError?{message:'fixture marker read denied'}:binding))
  }else{res.statusCode=400;res.end(JSON.stringify({message:'unexpected fixture request'}))}
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const base=`http://127.0.0.1:${server.address().port}`
  const guard=`const original=globalThis.fetch;globalThis.fetch=(input,...args)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);if(u.origin!==${JSON.stringify(base)})throw Error('external provider fetch forbidden');return original(input,...args)}`
  const child=spawn(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(guard)}`,'scripts/uvoz-registracij.mjs','--tekmovanje',row.slug],{cwd:new URL('..',import.meta.url),env:{PATH:process.env.PATH,SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'local-fixture-only'}})
  let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x)
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)})
  return{code,stdout,stderr,calls}
 }finally{await new Promise(resolve=>server.close(resolve))}
}

test('nightly registration CLI verifies installed MFA markers and exits cleanly when registrations are unsupported',async()=>{
 const result=await registration()
 assert.equal(result.code,0,result.stderr)
 assert.match(result.stdout,/zapisnikov o prestopih ne objavlja/)
 assert.deepEqual(result.calls.filter(x=>x.method==='POST'),[{path:'/rest/v1/rpc/get_installed_historical_statistics_markers',method:'POST',body:'{"p_competition_id":971}'}])
})
for(const [label,options]of[
 ['missing binding',{binding:null}],
 ['partial binding',{binding:{...installed(),markers:[]}}],
 ['marker RPC denied',{rpcError:true}],
])test(`registration CLI fails closed before provider traversal: ${label}`,async()=>{
 const result=await registration(options)
 assert.equal(result.code,1)
 assert.match(result.stderr,/historical|marker/)
 assert.equal(result.calls.filter(x=>x.method==='POST').length,1)
 assert.doesNotMatch(result.stderr,/external provider fetch/)
})
test('ordinary MFA registration CLI needs no historical marker RPC',async()=>{
 const result=await registration({row:{...competition,id:973,slug:'mt-nl1',source_policy:null,source_league_code:'2601267/2027'}})
 assert.equal(result.code,0,result.stderr)
 assert.match(result.stdout,/zapisnikov o prestopih ne objavlja/)
 assert.equal(result.calls.filter(x=>x.method==='POST').length,0)
})
