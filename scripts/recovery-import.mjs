// Replay only captured complete reports through the existing idempotent writer.
import {createClient} from '@supabase/supabase-js'
import {spawnSync} from 'node:child_process'
import {loadRecovery,createRecoverySource} from './viri/recovery-captured.mjs'
const {RECOVERY_SOURCE:source,SLFF_RECOVERY_CAPTURE:directory,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env
if(!['true','false'].includes(process.env.RECOVERY_PREVIEW))throw Error('RECOVERY_PREVIEW must explicitly be true or false')
const shard=Number(process.env.RECOVERY_SHARD??1),count=source==='hns'?3:1
if(!['hns','pzpn'].includes(source)||![1,2,3].includes(shard))throw Error('invalid recovery scope')
if(shard>count)process.exit(0)
const s=loadRecovery(directory,source),db=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
let failed=0,imported=0
for(const l of s.leagues.filter((_,i)=>i%count===shard-1)){
 const n=source==='hns'?l.reports.length:l.reports.filter(r=>r.status==='complete').length
 if(!n)continue
 const {data:c,error}=await db.from('competitions').select('*,countries!inner(code)').eq('id',l.id).single();if(error)throw error
 const provider=createRecoverySource({competition:c,directory,db});const records=await provider.zapisniki(l.code)
 if(process.env.RECOVERY_PREVIEW==='true'){console.log(JSON.stringify({league:l.slug,reports:records.length,mode:'validated-only'}));continue}
 const result=spawnSync(process.execPath,['scripts/uvoz-zapisnikov.mjs','--tekmovanje',l.slug,'--samo-dotaknjene'],{env:process.env,stdio:'inherit',timeout:30*60*1000})
 if(result.status===0){
  const {data:rounds,error}=await db.from('rounds').select('id').eq('competition_id',c.id).eq('season','2026/27').in('number',provider.recoveryRounds)
  if(error)throw error
  for(const round of rounds)for(const rpc of ['pripisi_obranjene_enajstmetrovke','recompute_round_scores']){const {error}=await db.rpc(rpc,{p_round_id:round.id});if(error)throw error}
 }
 if(result.status!==0){failed++;console.error(`Recovery import failed: ${l.slug}`)}else imported++
}
console.log(JSON.stringify({source,shard,importedLeagues:imported,failedLeagues:failed}))
if(failed)process.exitCode=1
