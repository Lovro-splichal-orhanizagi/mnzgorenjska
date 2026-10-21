import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
const moduleURL=new URL('./mfa-registration-smoke.mjs',import.meta.url)
test('release registration smoke guard only permits exact native read-only context requests',async()=>{
 assert.ok(existsSync(moduleURL),'release smoke helper exists')
 const{registrationSmokeGuard}=await import(moduleURL)
 const calls=[],original=globalThis.fetch;globalThis.fetch=async(...args)=>{calls.push(args);return new Response('{}')}
 try{
  eval(registrationSmokeGuard('https://db.example',972))
  await globalThis.fetch('https://db.example/rest/v1/competitions')
  await globalThis.fetch('https://db.example/rest/v1/rpc/get_installed_historical_statistics_markers',{method:'POST',body:'{"p_competition_id":972}'})
  for(const [url,options]of [['https://api.mfa.com.mt/api/test',{}],['https://db.example/rest/v1/competitions',{method:'PATCH'}],['https://db.example/rest/v1/rpc/apply_mfa_challenge_reviewed_cleanup',{method:'POST'}],['https://db.example/rest/v1/rpc/get_installed_historical_statistics_markers',{method:'POST',body:'{"p_competition_id":971}'}]])assert.throws(()=>globalThis.fetch(url,options),/forbidden/)
  assert.equal(calls.length,2)
 }finally{globalThis.fetch=original}
})

test('real release smoke runs both ordinary registration CLIs with installed native context and no writes',async()=>{
 const{createServer}=await import('node:http'),{spawn}=await import('node:child_process')
 const{getHistoricalStatisticsPolicy,historicalStatisticsPolicySha256}=await import('./lib/historical-statistics-policy.mjs')
 const calls=[]
 const rows=[[971,'mt-premier','58539/2027','2026-10-21'],[972,'mt-challenge','2601248/2027','2026-10-23'],[973,'mt-nl1','2601267/2027','2026-11-13'],[974,'mt-nl2','6234492/2027','2026-11-01']].map(([id,slug,code,date])=>({id,slug,source:'mfa',source_policy:getHistoricalStatisticsPolicy(slug).sourcePolicy,source_league_code:code,active:false,date}))
 const server=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk
  const u=new URL(req.url,'http://localhost');calls.push([req.method,u.pathname])
  res.setHeader('Content-Type','application/json')
  if(req.method==='GET'&&u.pathname==='/rest/v1/competitions'){const row=rows.find(r=>'eq.'+r.slug===u.searchParams.get('slug'));res.end(JSON.stringify(u.searchParams.get('select')==='sezona_koledarska'?{sezona_koledarska:false}:row));return}
  if(req.method==='POST'&&u.pathname==='/rest/v1/rpc/get_installed_historical_statistics_markers'){
   const row=rows.find(r=>r.id===JSON.parse(body).p_competition_id),p=getHistoricalStatisticsPolicy(row.slug),sha=historicalStatisticsPolicySha256(p)
   res.end(JSON.stringify({installed:true,policyId:p.id,policySha256:sha,firstFantasyPlayedOn:row.date,markers:p.entries.map((e,i)=>{const{rawSha256,reasonCode,...fixture}=e;return{sourceMatchId:e.sourceMatchId,reportId:`mt${e.sourceMatchId}`,fixture,rawSha256,matchId:100+i,roundId:200+i,homeTeamId:300+i*2,awayTeamId:301+i*2,policyId:p.id,policySha256:sha,statisticsStatus:'unavailable_historical',importedAt:null,individualRowCount:0}})}));return
  }
  res.statusCode=400;res.end('{}')
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const endpoint=`http://127.0.0.1:${server.address().port}`
  const child=spawn(process.execPath,['--input-type=module','-e',`import {runMfaRegistrationSmoke} from './scripts/mfa-registration-smoke.mjs';console.log(JSON.stringify([...runMfaRegistrationSmoke(process.env.SUPABASE_URL,process.env),...runMfaRegistrationSmoke(process.env.SUPABASE_URL,process.env,{competitionId:973}),...runMfaRegistrationSmoke(process.env.SUPABASE_URL,process.env,{competitionId:974})]))`],{env:{PATH:process.env.PATH,SUPABASE_URL:endpoint,SUPABASE_SERVICE_ROLE_KEY:'fixture-only'}})
  let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x)
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)})
  assert.equal(code,0,err);assert.deepEqual(JSON.parse(out).map(x=>x.competitionId),[971,972,973,974]);assert.equal(calls.filter(([m])=>m==='POST').length,4)
  assert.ok(calls.every(([method,path])=>method==='GET'&&path==='/rest/v1/competitions'||method==='POST'&&path==='/rest/v1/rpc/get_installed_historical_statistics_markers'))
 }finally{await new Promise(resolve=>server.close(resolve))}
})
