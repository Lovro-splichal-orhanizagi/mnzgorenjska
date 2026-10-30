// G9 preparation DATA only. Existing coherent READ ONLY RPC; no mutation API.
import {createHash} from 'node:crypto'
import {createFcfG9Native800PreparationDatabase} from './fcf-future-target-db.mjs'
import {exactKeys,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const slug='es-ct-tercera-g9',sha=t=>createHash('sha256').update(t).digest('hex'),need=(v,m)=>{if(!v)throw Error('FCF_G9_NATIVE800_PREPARE: '+m)},hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
function text(t,h){need(typeof t==='string'&&Buffer.byteLength(t)>1&&Buffer.byteLength(t)<=8388608&&hex(h)&&sha(t)===h,'exact bounded SQL TEXT/SHA');return JSON.parse(t)}
export function describeFcfG9Native800Preparation(input){
 exactKeys(input,['projection','scoreBeforeimages'],'G9 coherent preparation envelope');const {projection:p,scoreBeforeimages}=input;exactKeys(p,['schemaVersion','kind','capturedUTC','method','databaseInventory','native','dependencySnapshotText','dependencySnapshotSha256','pricingSnapshot'],'G9 SQL projection')
 need(p.schemaVersion===1&&p.kind==='fcf-future-native-projection'&&p.method==='explicitBEGIN_READ_ONLY_ROLLBACK'&&Number.isFinite(Date.parse(p.capturedUTC))&&Date.parse(p.capturedUTC)<=Date.now()&&Date.now()-Date.parse(p.capturedUTC)<=300000,'fresh coherent explicit readonly G9 projection')
 const dep=text(p.dependencySnapshotText,p.dependencySnapshotSha256),d=p.databaseInventory,n=p.native
 exactKeys(dep,['schemaVersion','classification','native','catalog','shapes','relations','goalAssociations','privacy','pricingSnapshotText'],'full SQL dependency snapshot');exactKeys(p.pricingSnapshot,['snapshotText','snapshotSha256'],'SQL pricing snapshot');text(p.pricingSnapshot.snapshotText,p.pricingSnapshot.snapshotSha256)
 need(dep.schemaVersion===1&&dep.classification==='fcf-future-projection-current-v1'&&hash(dep.native)===hash(n)&&dep.pricingSnapshotText===p.pricingSnapshot.snapshotText&&Array.isArray(dep.catalog)&&dep.catalog.length>0&&dep.shapes&&Object.keys(dep.shapes).length>0&&Array.isArray(dep.goalAssociations)&&dep.relations&&Object.keys(dep.relations).length>0,'complete native/catalog/shape/relation/price beforeimage')
 need(n?.competition?.id===797&&n.competition.slug===slug&&n.competition.active===false&&n.dependencies?.complete===true&&n.dependencies.competitionUserRows===0&&n.rounds?.length===30&&n.matches?.length===240,'selected inactive G9/full dependency scope/human0')
 need(d?.capturedUTC===p.capturedUTC&&d.method===p.method&&hash(d.rounds?.toSorted((a,b)=>a.id-b.id))===hash(n.rounds?.toSorted((a,b)=>a.id-b.id))&&hash(d.matches?.toSorted((a,b)=>a.id-b.id))===hash(n.matches?.toSorted((a,b)=>a.id-b.id))&&Array.isArray(d.players),'inventory and native rows must be one coherent SQL observation')
 need(new Set(n.rounds.map(r=>r.id)).size===30&&n.rounds.every(r=>r.competition_id===797)&&new Set(n.matches.map(m=>m.id)).size===240&&n.matches.every(m=>n.rounds.some(r=>r.id===m.round_id)),'full unique actual round/match identities')
 const counts=n.dependencies;need(counts.rounds?.length===30&&new Set(counts.rounds.map(r=>r.roundId)).size===30&&counts.rounds.every(r=>n.rounds.some(x=>x.id===r.roundId)&&['lineupRows','rosterRows','transferRows','chipRows'].every(k=>r[k]===0)&&Number.isSafeInteger(r.userRows)&&r.userRows>=0)&&counts.matches?.length===240&&new Set(counts.matches.map(m=>m.matchId)).size===240&&counts.matches.every(m=>n.matches.some(x=>x.id===m.matchId)&&['userRows','appearances','goals'].every(k=>Number.isSafeInteger(m[k])&&m[k]>=0)),'typed strict selected G9 counters; never subtract derived rows')
 const relations=Object.values(dep.relations),humans=relations.filter(r=>r.globalUser===true);need(humans.length>0&&humans.every(r=>r.count===0)&&relations.every(r=>typeof r.globalUser==='boolean'&&Number.isSafeInteger(r.count)&&r.count>=0&&hex(r.rowsSha256)),'closed complete row hashes and actual human0; preserve all nonhuman counts')
 const privacy={...d.identityPrivacy};delete privacy.capturedUTC;need(hash(dep.privacy)===hash(privacy),'full country privacy observation must match beforeimage')
 exactKeys(scoreBeforeimages,['selectedG9','offTargetG1'],'both exact score beforeimages')
 for(const [key,cid]of [['selectedG9',797],['offTargetG1',783]]){
  const state=scoreBeforeimages[key];exactKeys(state,['competitionId','roundIds','playerIds','count','snapshotText','snapshotSha256',...(cid===797?['roundCounts']:[])],'exact score state')
  const rows=text(state.snapshotText,state.snapshotSha256),ids=a=>Array.isArray(a)&&a.every(x=>Number.isSafeInteger(x)&&x>0)&&new Set(a).size===a.length&&a.every((x,i)=>i===0||x>a[i-1])
  need(state.competitionId===cid&&ids(state.roundIds)&&ids(state.playerIds)&&Array.isArray(rows)&&Number.isSafeInteger(state.count)&&state.count===rows.length,'fixed complete typed score scope/vector/count')
  const seen=new Set();for(const row of rows){exactKeys(row,['round_id','player_id','points','computed_at'],'full actual score row');const k=row.round_id+'/'+row.player_id;need(state.roundIds.includes(row.round_id)&&state.playerIds.includes(row.player_id)&&typeof row.points==='number'&&Number.isFinite(row.points)&&typeof row.computed_at==='string'&&Number.isFinite(Date.parse(row.computed_at))&&!seen.has(k),'score row scope/identity/statistic/date');seen.add(k)}
  if(cid===797){
   need(hash(state.roundIds)===hash(n.rounds.map(r=>r.id).sort((a,b)=>a-b))&&hash(state.playerIds)===hash(d.players.map(r=>r.id).sort((a,b)=>a-b))&&dep.relations['public.player_scores']?.count===state.count&&dep.relations['public.player_scores']?.rowsSha256===state.snapshotSha256,'selected score vector must equal exact projection relation/scope')
   need(Array.isArray(state.roundCounts)&&state.roundCounts.length===30&&new Set(state.roundCounts.map(r=>r.roundId)).size===30,'all exact nonhuman round contributions')
   for(const r of state.roundCounts){exactKeys(r,['roundId','scoreRows','priceChangeRows'],'nonhuman round contributions');need(n.rounds.some(x=>x.id===r.roundId)&&[r.scoreRows,r.priceChangeRows].every(x=>Number.isSafeInteger(x)&&x>=0)&&r.scoreRows===rows.filter(x=>x.round_id===r.roundId).length&&counts.rounds.find(x=>x.roundId===r.roundId).userRows===r.scoreRows+r.priceChangeRows,'literal strict round counters equal actual nonhuman contributions with human0')}
  }
 }
 return frozenJSON({projection:structuredClone(p),scoreBeforeimages:structuredClone(scoreBeforeimages),admissible:false,nativeAdmission:false,activationEligible:false})
}
export function createFcfG9Native800ReadOnlyDatabase(input={}){
 exactKeys(input,Object.hasOwn(input,'env')?['env']:[],'fixed G9 readonly options')
 const db=createFcfG9Native800PreparationDatabase({env:input.env??process.env})
 return Object.freeze({prepare(input={}){exactKeys(input,Object.hasOwn(input,'privacyKeys')?['privacyKeys']:[],'fixed G9 prepare input');return describeFcfG9Native800Preparation(db.prepare({privacyKeys:input.privacyKeys??[]}))}})
}
