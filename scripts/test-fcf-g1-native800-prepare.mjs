// TEST ONLY: source-free synthetic projection; no DB, provider, or authority.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import cp from 'node:child_process'
import {syncBuiltinESMExports} from 'node:module'
import {createFcfG1Native800PreparationDatabase} from './fcf-g1-native800-db.mjs'
import {describeFcfG1Native800Preparation} from './fcf-g1-native800-prepare.mjs'

const sha=x=>createHash('sha256').update(x).digest('hex')
function envelope(){
 const capturedUTC=new Date().toISOString(),rounds=Array.from({length:30},(_,i)=>({id:100+i,number:i+1,competition_id:783})),matches=Array.from({length:240},(_,i)=>({id:1000+i,round_id:100+i%30})),players=[{id:501,competition_id:783,team_id:1,reg_st:'TEST-GK',position:'GK',position_source:'zapisnik',active:true,value:5,value_start:5}],native={competition:{id:783,slug:'es-ct-segona-g1',active:false},rounds,matches,dependencies:{complete:true,competitionUserRows:0,rounds:rounds.map(r=>({roundId:r.id,lineupRows:0,rosterRows:0,transferRows:0,chipRows:0,userRows:0})),matches:matches.map(m=>({matchId:m.id,userRows:0,appearances:0,goals:0}))}},price=JSON.stringify({players}),privacy={schemaVersion:1,kind:'fcf-native-privacy-projection',complete:true,checkedKeys:[],matches:[]},dep={schemaVersion:1,classification:'fcf-future-projection-current-v1',native,catalog:[{TEST_ONLY:true}],shapes:{TEST_ONLY:{}},relations:{'public.player_scores':{globalUser:false,count:0,rowsSha256:sha('[]')},humans:{globalUser:true,count:0,rowsSha256:sha('[]')},offTargetG9:{globalUser:false,count:0,rowsSha256:sha('[]')}},goalAssociations:[],privacy,pricingSnapshotText:price},dependencySnapshotText=JSON.stringify(dep),score=(competitionId,roundIds,playerIds,rows,withRoundCounts=false)=>{const snapshotText=JSON.stringify(rows),v={competitionId,roundIds,playerIds,count:rows.length,snapshotText,snapshotSha256:sha(snapshotText)};if(withRoundCounts)v.roundCounts=roundIds.map(roundId=>({roundId,scoreRows:rows.filter(x=>x.round_id===roundId).length,priceChangeRows:0}));return v},g1rows=[{round_id:100,player_id:501,points:4.25,computed_at:capturedUTC}],g9rows=[{round_id:9001,player_id:9002,points:2.5,computed_at:capturedUTC}],selectedG1=score(783,rounds.map(r=>r.id),players.map(p=>p.id),g1rows,true),offTargetG9=score(797,[9001],[9002],g9rows),projection={schemaVersion:1,kind:'fcf-future-native-projection',capturedUTC,method:'explicitBEGIN_READ_ONLY_ROLLBACK',databaseInventory:{capturedUTC,method:'explicitBEGIN_READ_ONLY_ROLLBACK',rounds,matches,players,identityPrivacy:{...privacy,capturedUTC}},native,dependencySnapshotText,dependencySnapshotSha256:sha(dependencySnapshotText),pricingSnapshot:{snapshotText:price,snapshotSha256:sha(price)}}
 dep.relations['public.player_scores']={globalUser:false,count:g1rows.length,rowsSha256:selectedG1.snapshotSha256};native.dependencies.rounds[0].userRows=1;dep.native=native;projection.dependencySnapshotText=JSON.stringify(dep);projection.dependencySnapshotSha256=sha(projection.dependencySnapshotText)
 return {projection,scoreBeforeimages:{selectedG1,offTargetG9}}
}

test('G1 preparation retains one coherent inactive 783 snapshot and both dynamic score vectors',()=>{
 const input=envelope(),out=describeFcfG1Native800Preparation(input)
 assert.equal(out.projection.native.competition.id,783)
 assert.equal(out.scoreBeforeimages.selectedG1.snapshotText,input.scoreBeforeimages.selectedG1.snapshotText)
 assert.equal(out.scoreBeforeimages.offTargetG9.count,1)
 assert.equal(out.projection.dependencySnapshotText,input.projection.dependencySnapshotText)
 assert.equal(out.admissible,false);assert.equal(out.nativeAdmission,false);assert.equal(out.activationEligible,false)
})

test('G1 preparation refuses stale, active, human, wrong target, or detached score data',()=>{
 const mutations=[e=>e.projection.capturedUTC='2020-01-01T00:00:00Z',e=>e.projection.native.competition.active=true,e=>e.projection.native.competition.id=797,e=>e.projection.native.dependencies.competitionUserRows=1,e=>e.scoreBeforeimages.selectedG1.competitionId=797,e=>e.scoreBeforeimages.offTargetG9.competitionId=783,e=>e.scoreBeforeimages.selectedG1.snapshotText+=' ',e=>{e.scoreBeforeimages.selectedG1.snapshotSha256='f'.repeat(64)},e=>e.projection.pricingSnapshot.snapshotText+=' ']
 for(const mutate of mutations){const input=envelope();mutate(input);assert.throws(()=>describeFcfG1Native800Preparation(input))}
})

test('fixed G1 native800 facade builds one READ ONLY projection plus both exact score vectors',()=>{
 const original=cp.execFileSync,calls=[]
 try{
  cp.execFileSync=(command,args,options)=>{calls.push({command,args,options});return Buffer.from('{}')};syncBuiltinESMExports()
  const db=createFcfG1Native800PreparationDatabase({env:{SUPABASE_DB_URL:'postgresql://test:test@127.0.0.1:5432/postgres',PGHOSTADDR:'attacker',PGSERVICE:'attacker'}})
  assert.deepEqual(Object.keys(db),['prepare']);db.prepare({privacyKeys:['a'.repeat(64)]})
  for(const bad of [{targetSlug:'es-ct-tercera-g9'},{sql:'delete'},{execute:()=>{}},{now:0},{privacyKeys:['bad']}])assert.throws(()=>db.prepare(bad))
  for(const bad of [{execute:()=>{}},{network:()=>{}},{targetSlug:'es-ct-tercera-g9'}])assert.throws(()=>createFcfG1Native800PreparationDatabase(bad))
  assert.equal(calls.length,1);const q=calls[0];assert.equal(q.command,'psql');assert.equal(q.options.env.PGHOSTADDR,'127.0.0.1');assert.equal(q.options.env.PGSERVICE,undefined)
  assert.match(q.options.input,/^BEGIN READ ONLY;\nSET LOCAL ROLE service_role;/);assert.match(q.options.input,/public\.fcf_g1_readonly_projection\(/);assert.match(q.options.input,/competition_id=783/);assert.match(q.options.input,/competition_id=797/);assert.match(q.options.input,/'selectedG1'/);assert.match(q.options.input,/'offTargetG9'/);assert.match(q.options.input,/roundCounts/);assert.match(q.options.input,/ROLLBACK;\n$/);assert.doesNotMatch(q.options.input,/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i)
 }finally{cp.execFileSync=original;syncBuiltinESMExports()}
})
