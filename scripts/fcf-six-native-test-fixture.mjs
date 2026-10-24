// Synthetic projections only: these objects carry no source/admission authority.
import {readFileSync} from 'node:fs'
import {FCF_TARGET_SQL_TEST_NOW} from './fcf-target-sql-test-fixture.mjs'
import {calendarFixture,packetFixture} from './fcf-release-test-fixture.mjs'
import {createHash} from 'node:crypto'
const policyRows=[...readFileSync(new URL('../supabase/migrations/20261019150000_fcf_six_reviewed_native.sql',import.meta.url),'utf8').matchAll(/insert into private_historical_statistics\.policies values\('([^']+)','([^']+)','((?:[^']|'')+)'::jsonb\);/g)].map(x=>({policy:JSON.parse(x[3].replaceAll("''","'")),hash:x[2]}))
export const getSixPolicy=slug=>policyRows.find(x=>x.policy.competitionSlug===slug).policy
const getHistoricalStatisticsPolicy=getSixPolicy
export const sixPolicyHash=slug=>policyRows.find(x=>x.policy.competitionSlug===slug).hash

import {imeHash,regHash} from './anonimizacija.mjs'
export const now=Date.parse('2026-10-18T14:00:00Z'),writerCommit='b'.repeat(40)
export function privacyProjection(competitionId,appearances,capturedUTC){
 return{schemaVersion:1,kind:'fcf-native-privacy-projection',countryCode:'ES',countryId:34,targetCompetitionId:competitionId,method:'explicitBEGIN_READ_ONLY_ROLLBACK',capturedUTC,complete:true,checkedKeys:[...new Set(appearances.flatMap(a=>[regHash(34,a.regSt),imeHash(34,a.ime)]))].sort(),matches:[]}
}
const anchors={'4109388':[321646,28706,8574,8575],'4116215':[297199,27227,8195,8188],'4118352':[306164,27616,8304,8305],'4118358':[306171,27617,8301,8298],'4118354':[306166,27616,7566,8308],'4109404':[321999,28708,8575,8576]}
export function nativePlanFixture(targetSlug='es-ct-segona-g1'){
 const id=targetSlug==='es-ct-segona-g1'?783:797,start=id===783?4109388:4118349,policy=getHistoricalStatisticsPolicy(targetSlug)
 const reviewed=JSON.parse(readFileSync(new URL('./policies/historical-statistics-club-bindings.json',import.meta.url))).bindings.filter(b=>b.provider==='fcf').concat([{sourceClubId:'1372',sourceCategoryId:'19610692',canonicalNames:['CAN VIDALET, C.F.']},{sourceClubId:'54319880',sourceCategoryId:'54709553',canonicalNames:['ONA SANT ADRIA, F.C.']},{sourceClubId:'5029',sourceCategoryId:'33592',canonicalNames:['BESCANO, C.D.']}])
 const fixtures=calendarFixture(),labels=new Map(fixtures.flatMap(f=>f.clubs.map(c=>[c.sourceClubId,{...c}]))),reserved=new Map(),occupied=new Set(),teamIds=new Map()
 for(const entry of policy.entries){
  const f=fixtures.find(f=>f.round===entry.sourceRound&&f.clubs.every(c=>!occupied.has(c.sourceClubId)))
  reserved.set(f,entry.sourceMatchId)
  f.clubs.forEach((c,side)=>{
   occupied.add(c.sourceClubId)
   const sourceClubId=side?entry.awaySourceClubId:entry.homeSourceClubId,sourceCategoryId=side?entry.awaySourceCategoryId:entry.homeSourceCategoryId
   labels.set(c.sourceClubId,{sourceClubId,sourceCategoryId,name:reviewed.find(b=>b.sourceClubId===sourceClubId&&b.sourceCategoryId===sourceCategoryId).canonicalNames[0]})
   teamIds.set(`${sourceClubId}/${sourceCategoryId}`,anchors[entry.sourceMatchId][side+2])
  })
 }
 const remaining=Array.from({length:240},(_,i)=>String(start+i)).filter(n=>!policy.entries.some(e=>e.sourceMatchId===n))
 fixtures.forEach(f=>{
  f.id='es'+(reserved.get(f)??remaining.shift());f.clubs=f.clubs.map(c=>({...labels.get(c.sourceClubId)}));f.date=f.round<=5?'2026-09-20':f.round===6?'2026-10-24':'2027-05-01';f.time='16:00'
  f.homeGoals=f.statisticsStatus==='available'?1:null;f.awayGoals=f.statisticsStatus==='available'?0:null
  if(reserved.has(f)){f.statisticsStatus='unavailable_historical';f.appearances=null}
 })
 const clubs=[...labels.values()]
 clubs.forEach((c,i)=>{const k=`${c.sourceClubId}/${c.sourceCategoryId}`;if(!teamIds.has(k))teamIds.set(k,900000+i)})
 const teams=clubs.map(c=>({id:teamIds.get(`${c.sourceClubId}/${c.sourceCategoryId}`),competition_id:id,name:c.name}))
 const rounds=Array.from({length:30},(_,i)=>({id:policy.entries.find(e=>e.sourceRound===i+1)?anchors[policy.entries.find(e=>e.sourceRound===i+1).sourceMatchId][1]:700000+i,competition_id:id,season:'2026/27',number:i+1}))
 const matches=fixtures.map((f,i)=>({id:anchors[f.id.slice(2)]?.[0]??800000+i,round_id:rounds.find(r=>r.number===f.round).id,home_team_id:teamIds.get(`${f.clubs[0].sourceClubId}/${f.clubs[0].sourceCategoryId}`),away_team_id:teamIds.get(`${f.clubs[1].sourceClubId}/${f.clubs[1].sourceCategoryId}`),zapisnik_id:f.round<=3?f.id:null}))
 const existingExceptionBindings=reviewed.map(b=>({provider:b.provider,source_club_id:b.sourceClubId,source_category_id:b.sourceCategoryId,country_code:b.countryCode,canonical_names:b.canonicalNames,proofs:b.proofs,bound_team_id:null}))
 const sourceData={targetSlug,competition:{id,slug:targetSlug},fixtures,clubs,binding:{sourceCommit:'a'.repeat(40),sourceClaimState:'consumed',sourceFingerprintSha256:'c'.repeat(64)}}
 const databaseInventory={...packetFixture(null).databaseInventory,teams,rounds,matches,players:[]}
 return{targetSlug,sourceData,databaseInventory,existingExceptionBindings,writerCommit,now}
}
export function nativeMatchFixture(targetSlug='es-ct-segona-g1'){
 const f=nativePlanFixture(targetSlug),match=f.sourceData.fixtures.find(m=>m.round===3),players=[]
 const appearances=[]
 for(const side of[0,1])for(let i=0;i<11;i++){
  const regSt=10000+side*100+i
  appearances.push({regSt,ime:`SYNTHETIC PLAYER ${regSt}`,ekipaIdx:side,st:i+1,zacetnik:true,vratar:i===0,minutaOd:0,minutaDo:90,minute:90,goli:side===0&&i===2?1:0,avtogoli:0,goliIzEnajstmetrovke:0,zgreseneEnajstmetrovke:0,rumeni:i===5?1:0,rdeci:0,prejetiGoli:side,cleanSheet:side===0})
  players.push({id:50000+regSt,competition_id:f.sourceData.competition.id,reg_st:regSt,full_name:`SYNTHETIC PLAYER ${regSt}`,position:i===0?'GK':'DEF',position_source:i===0?'zapisnik':'ugibanje',anonimiziran_at:null})
 }
 appearances[3].minutaDo=61;appearances[3].minute=61
 appearances.push({...appearances[3],regSt:10200,ime:'SYNTHETIC SUBSTITUTE',st:12,zacetnik:false,minutaOd:61,minutaDo:90,minute:29})
 Object.assign(match,{appearances,goals:[{regSt:10002,ekipaIdx:0,ime:'SYNTHETIC PLAYER 10002',st:3,minuta:35,avtogol:false,enajstmetrovka:false,rezultat:[1,0]}]})
 f.databaseInventory.players=players
 f.databaseInventory.groups.find(g=>g.slug===f.targetSlug).country_id=34
 f.databaseInventory.identityPrivacy=privacyProjection(f.sourceData.competition.id,appearances,f.databaseInventory.capturedUTC)
 return{...f,sourceMatchId:match.id}
}
export function fullNativeMatchFixture(targetSlug){
 const f=nativeMatchFixture(targetSlug),template=structuredClone(f.sourceData.fixtures.find(m=>m.id===f.sourceMatchId))
 for(const m of f.sourceData.fixtures.filter(m=>m.statisticsStatus==='available')){
  const transform=a=>{const index=f.sourceData.clubs.findIndex(c=>c.sourceClubId===m.clubs[a.ekipaIdx].sourceClubId);return 100000+index*1000+(a.regSt-(a.ekipaIdx?10100:10000))}
  m.appearances=template.appearances.map(a=>({...a,regSt:transform(a),ime:'SYNTHETIC PLAYER '+transform(a)}))
  m.goals=template.goals.map(g=>({...g,regSt:transform(g),ime:'SYNTHETIC PLAYER '+transform(g)}));m.homeGoals=1;m.awayGoals=0
 }
 f.databaseInventory.players=[]
 f.databaseInventory.identityPrivacy=privacyProjection(f.sourceData.competition.id,f.sourceData.fixtures.flatMap(m=>m.appearances??[]),f.databaseInventory.capturedUTC)
 return f
}

const q=s=>"'"+String(s).replaceAll("'","''")+"'"
export function sixG9ReleaseFixture(){
 const f=fullNativeMatchFixture('es-ct-tercera-g9'),cid=797,slug=f.targetSlug,policy=getSixPolicy(slug)
 for(const r of f.databaseInventory.rounds)if(r.id>=700000){const old=r.id;r.id=cid*10000+r.number;for(const m of f.databaseInventory.matches)if(m.round_id===old)m.round_id=r.id}
 f.databaseInventory.matches.forEach((m,i)=>{if(m.id>=800000)m.id=cid*10000+100+i})
 const binding={schemaVersion:1,kind:'fcf-missing-target-admission',protocol:'six-reviewed-continuation-v1',targetSlug:slug,sourceCommit:'a'.repeat(40),sourceClaimState:'consumed',sourceFingerprintSha256:'c'.repeat(64),maximumSourceGETs:478,priorSourceGETs:22,newSourceGETs:233,actualSourceGETs:255,claimBinding:{test:'synthetic'},consumptionBinding:{test:'synthetic'},inventoryBinding:{test:'synthetic'},auditBinding:{test:'synthetic'},finalReceiptBinding:{test:'synthetic'}}
 for(const m of f.sourceData.fixtures){
  const e=policy.entries.find(e=>'es'+e.sourceMatchId===m.id)
  Object.assign(m,{source:{sourceUrl:'https://www.fcf.cat/ca/competicio/acta/'+m.id.slice(2),capturedUTC:FCF_TARGET_SQL_TEST_NOW,rawSha256:'d'.repeat(64)},report:m.statisticsStatus==='available'?{opozorila:[]}:null,sourceFixture:null,statisticsReason:null})
  if(e){const {rawSha256,reasonCode,...fixture}=e;Object.assign(m,{date:e.playedOn,homeGoals:e.observedHomeScore,awayGoals:e.observedAwayScore,statisticsReason:reasonCode,sourceFixture:{...fixture,season:'2026/27'},source:{...m.source,rawSha256},appearances:null,goals:null})}
  else if(m.statisticsStatus==='pending'){m.appearances=null;m.goals=null}
 }
 const mapping={kind:'fcf-native-target-mapping',targetSlug:slug,sourceCommit:f.writerCommit,sourceFingerprintSha256:binding.sourceFingerprintSha256,mappings:f.sourceData.clubs.map(c=>({nativeClubId:c.sourceClubId,nativeCategoryId:c.sourceCategoryId,sourceName:c.name,canonicalTeamName:c.name,teamId:f.databaseInventory.teams.find(t=>t.name===c.name).id})),fixtures:f.sourceData.fixtures.map((m,i)=>({sourceMatchId:m.id,matchId:f.databaseInventory.matches[i].id,roundId:f.databaseInventory.matches[i].round_id}))}
 const mappingText=JSON.stringify(mapping),sha=s=>createHash('sha256').update(s).digest('hex')
 const packet={schemaVersion:3,kind:'fcf-six-current-target-release',targetSlug:slug,sourceCommit:f.writerCommit,auditedUTC:FCF_TARGET_SQL_TEST_NOW,cleanupBinding:null,databaseInventory:{},target:{sourceEvidence:binding,competitionId:cid,competitionSlug:slug,season:'2026/27',firstFantasyPlayedOn:'2026-10-24',policyId:policy.id,policySha256:sixPolicyHash(slug),fixtures:f.sourceData.fixtures}}
 const rollout={schemaVersion:2,kind:'fcf-six-current-target-rollout',targetSlug:slug,sourceCommit:f.writerCommit,execution:{},targetPacketText:'',targetPacketSha256:'',inventoryBinding:binding,cleanupBinding:null,identityPlan:{mappingText,mappingSha256:sha(mappingText)},readiness:null}
 let sql=`insert into teams(id,name,short_name,country_id)overriding system value select(x->>'id')::bigint,x->>'name','TEST',(select id from countries where code='ES')from jsonb_array_elements(${q(JSON.stringify(f.databaseInventory.teams))}::jsonb)x on conflict(id)do nothing;
`
 sql+=`delete from rounds where competition_id=797 and number=6;insert into rounds(id,competition_id,season,number,played_on,deadline_at)overriding system value select(x->>'id')::bigint,797,'2026/27',(x->>'number')::int,case when x->>'number'='6'then '2026-10-24'::date else '2026-09-20'::date end,clock_timestamp()+interval'7 days'from jsonb_array_elements(${q(JSON.stringify(f.databaseInventory.rounds))}::jsonb)x on conflict(id)do nothing;
`
 sql+=`insert into matches(id,round_id,home_team_id,away_team_id,played_on)overriding system value select(x->>'id')::bigint,(x->>'round_id')::bigint,(x->>'home_team_id')::bigint,(x->>'away_team_id')::bigint,'2026-09-20'from jsonb_array_elements(${q(JSON.stringify(f.databaseInventory.matches))}::jsonb)x on conflict(id)do nothing;
`
 sql+=`create temporary table fcf_target_packets(slug text primary key,rollout jsonb);do $$declare p jsonb:=${q(JSON.stringify(packet))}::jsonb;v jsonb:=${q(JSON.stringify(rollout))}::jsonb;b jsonb;t text;begin select jsonb_build_object('phase','applied','beforeImageText',proof->>'beforeImageText','beforeSha256',proof->>'beforeSha256','appliedReceipt',jsonb_build_object('result',(select result from six_result)))into b from six_proof;p:=jsonb_set(p,'{cleanupBinding}',b);t:=p::text;v:=v||jsonb_build_object('cleanupBinding',b,'targetPacketText',t,'targetPacketSha256',encode(sha256(convert_to(t,'UTF8')),'hex'));insert into fcf_target_packets values('es-ct-tercera-g9',v);end$$;
`
 return sql
}
