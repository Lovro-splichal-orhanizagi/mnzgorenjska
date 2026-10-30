// G9 preparation DATA only. Existing coherent READ ONLY RPC; no mutation API.
import {createHash} from 'node:crypto'
import {createFcfFutureTargetDatabase} from './fcf-future-target-db.mjs'
import {exactKeys,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
const slug='es-ct-tercera-g9',sha=t=>createHash('sha256').update(t).digest('hex'),need=(v,m)=>{if(!v)throw Error('FCF_G9_NATIVE800_PREPARE: '+m)},hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
function text(t,h){need(typeof t==='string'&&Buffer.byteLength(t)>1&&Buffer.byteLength(t)<=8388608&&hex(h)&&sha(t)===h,'exact bounded SQL TEXT/SHA');return JSON.parse(t)}
export function describeFcfG9Native800Preparation(projection){
 const p=projection;exactKeys(p,['schemaVersion','kind','capturedUTC','method','databaseInventory','native','dependencySnapshotText','dependencySnapshotSha256','pricingSnapshot'],'G9 SQL projection')
 need(p.schemaVersion===1&&p.kind==='fcf-future-native-projection'&&p.method==='explicitBEGIN_READ_ONLY_ROLLBACK'&&Number.isFinite(Date.parse(p.capturedUTC))&&Date.parse(p.capturedUTC)<=Date.now()&&Date.now()-Date.parse(p.capturedUTC)<=300000,'fresh coherent explicit readonly G9 projection')
 const dep=text(p.dependencySnapshotText,p.dependencySnapshotSha256),d=p.databaseInventory,n=p.native
 exactKeys(dep,['schemaVersion','classification','native','catalog','shapes','relations','goalAssociations','privacy','pricingSnapshotText'],'full SQL dependency snapshot');exactKeys(p.pricingSnapshot,['snapshotText','snapshotSha256'],'SQL pricing snapshot');text(p.pricingSnapshot.snapshotText,p.pricingSnapshot.snapshotSha256)
 need(dep.schemaVersion===1&&dep.classification==='fcf-future-projection-current-v1'&&hash(dep.native)===hash(n)&&dep.pricingSnapshotText===p.pricingSnapshot.snapshotText&&Array.isArray(dep.catalog)&&dep.catalog.length>0&&dep.shapes&&Object.keys(dep.shapes).length>0&&Array.isArray(dep.goalAssociations)&&dep.relations&&Object.keys(dep.relations).length>0,'complete native/catalog/shape/relation/price beforeimage')
 need(n?.competition?.id===797&&n.competition.slug===slug&&n.competition.active===false&&n.dependencies?.complete===true&&n.dependencies.competitionUserRows===0&&n.rounds?.length===30&&n.matches?.length===240,'selected inactive G9/full dependency scope/human0')
 need(d?.capturedUTC===p.capturedUTC&&d.method===p.method&&hash(d.rounds?.toSorted((a,b)=>a.id-b.id))===hash(n.rounds?.toSorted((a,b)=>a.id-b.id))&&hash(d.matches?.toSorted((a,b)=>a.id-b.id))===hash(n.matches?.toSorted((a,b)=>a.id-b.id))&&Array.isArray(d.players),'inventory and native rows must be one coherent SQL observation')
 need(new Set(n.rounds.map(r=>r.id)).size===30&&n.rounds.every(r=>r.competition_id===797)&&new Set(n.matches.map(m=>m.id)).size===240&&n.matches.every(m=>n.rounds.some(r=>r.id===m.round_id)),'full unique actual round/match identities')
 const counts=n.dependencies;need(counts.rounds?.length===30&&new Set(counts.rounds.map(r=>r.roundId)).size===30&&counts.rounds.every(r=>n.rounds.some(x=>x.id===r.roundId)&&['lineupRows','rosterRows','transferRows','chipRows','userRows'].every(k=>r[k]===0))&&counts.matches?.length===240&&new Set(counts.matches.map(m=>m.matchId)).size===240&&counts.matches.every(m=>n.matches.some(x=>x.id===m.matchId)&&m.userRows===0),'exact strict selected G9 counters; never subtract derived rows')
 const relations=Object.values(dep.relations),humans=relations.filter(r=>r.globalUser===true);need(humans.length>0&&humans.every(r=>r.count===0)&&relations.every(r=>Number.isSafeInteger(r.count)&&r.count>=0&&hex(r.rowsSha256)),'closed complete row hashes and actual human0; preserve all nonhuman counts')
 const privacy={...d.identityPrivacy};delete privacy.capturedUTC;need(hash(dep.privacy)===hash(privacy),'full country privacy observation must match beforeimage')
 return frozenJSON({projection:structuredClone(p),admissible:false,nativeAdmission:false,activationEligible:false})
}
export function createFcfG9Native800ReadOnlyDatabase(input={}){
 exactKeys(input,Object.hasOwn(input,'env')?['env']:[],'fixed G9 readonly options')
 const db=createFcfFutureTargetDatabase({env:input.env??process.env,targetSlug:slug})
 return Object.freeze({prepare(input={}){exactKeys(input,Object.hasOwn(input,'privacyKeys')?['privacyKeys']:[],'fixed G9 prepare input');return describeFcfG9Native800Preparation(db.projection(slug,input.privacyKeys??[]))}})
}
