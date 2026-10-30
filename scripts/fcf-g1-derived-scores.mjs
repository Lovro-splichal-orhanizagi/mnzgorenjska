// Pure SQL preparation DATA validation. This module never mints source/native authority.
import {createHash} from 'node:crypto'
import {historicalStatisticsPolicySha256 as hash} from './lib/historical-statistics-policy.mjs'
import {exactKeys,frozenJSON} from './fcf-missing-inventory-artifact.mjs'
const sha=s=>createHash('sha256').update(s).digest('hex'),same=(a,b)=>hash(a)===hash(b),clone=structuredClone
const need=(ok,label)=>{if(!ok)throw Error('FCF_G1_DERIVED_SCORES: '+label)},hex=(x,n)=>typeof x==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(x)
function text(t,h,label){need(typeof t==='string'&&Buffer.byteLength(t)>1&&Buffer.byteLength(t)<=8388608&&sha(t)===h,label+' bounded TEXT/SHA');return JSON.parse(t)}
/** Pure DATA check. All human rows remain zero; score rows are separately bound,
 * not removed from round.userRows or asserted to be a zero-dependency state. */
export function describeFcfG1DerivedScores(input){
 exactKeys(input,['projection','scoreBefore'],'derived-score derived score DATA');const{projection:p,scoreBefore:b}=input,dep=text(p?.dependencySnapshotText,p?.dependencySnapshotSha256,'full dependency snapshot');need(p.native?.competition?.id===783&&p.native.dependencies?.complete===true&&same(dep.native,p.native)&&p.native.rounds?.length===30&&p.native.matches?.length===240,'complete exact G1 SQL projection')
 const relations=dep.relations,users=Object.values(relations).filter(r=>r.globalUser===true);need(users.length>0&&users.every(r=>r.count===0)&&p.native.dependencies.competitionUserRows===0,'all real human/FK dependency relations must remain zero');need(p.native.dependencies.matches.every(x=>x.userRows===0)&&p.native.dependencies.rounds.every(x=>['lineupRows','rosterRows','transferRows','chipRows'].every(k=>x[k]===0)),'zero fantasy/match user counts; no scope subtraction')
 exactKeys(b,['beforeImageText','beforeSha256','expectedBeforeText','expectedBeforeSha256','rulesSha256'],'SQL-derived scores');const rows=text(b.beforeImageText,b.beforeSha256,'actual score beforeimage'),expected=text(b.expectedBeforeText,b.expectedBeforeSha256,'SQL expected scores');need(Array.isArray(rows)&&Array.isArray(expected)&&hex(b.rulesSha256,64)&&rows.length===relations['public.player_scores']?.count&&b.beforeSha256===relations['public.player_scores'].rowsSha256,'exact full score relation beforeimage/hash')
 for(const row of rows)exactKeys(row,['round_id','player_id','points','computed_at'],'full score row');for(const row of expected){exactKeys(row,['round_id','player_id','points'],'canonical score row');need(Number.isSafeInteger(row.round_id)&&Number.isSafeInteger(row.player_id)&&typeof row.points==='number'&&Number.isFinite(row.points),'canonical score numeric identities');}
 const semantic=rs=>rs.map(r=>({round_id:r.round_id,player_id:r.player_id,points:Number(r.points)})).sort((a,b)=>a.round_id-b.round_id||a.player_id-b.player_id);need(same(semantic(rows),semantic(expected)),'SQL rules must reproduce every stored before-score; no stale/orphan rows')
 need(new Set(rows.map(r=>r.round_id+':'+r.player_id)).size===rows.length&&new Set(p.native.dependencies.rounds.map(r=>r.roundId)).size===30&&p.native.dependencies.rounds.length===30&&p.native.dependencies.matches.length===240&&new Set(p.native.dependencies.matches.map(m=>m.matchId)).size===240,'unique full score/dependency identities');
 need(new Set(p.native.rounds.map(r=>r.id)).size===30&&new Set(p.native.matches.map(m=>m.id)).size===240&&p.native.dependencies.rounds.every(r=>p.native.rounds.some(n=>n.id===r.roundId))&&p.native.dependencies.matches.every(m=>p.native.matches.some(n=>n.id===m.matchId)),'exact dependency/native identity coverage');
 const byRound=new Map();for(const row of rows){need(Number.isSafeInteger(row.round_id)&&Number.isSafeInteger(row.player_id)&&typeof row.points==='number'&&Number.isFinite(row.points)&&typeof row.computed_at==='string'&&p.native.rounds.some(r=>r.id===row.round_id),'actual target score identities');byRound.set(row.round_id,(byRound.get(row.round_id)??0)+1)}
 for(const r of p.native.dependencies.rounds)need(r.userRows===(byRound.get(r.roundId)??0),'every nonzero round counter must equal its exact derived-score set')
 for(const[name,r]of Object.entries(relations))if(!r.globalUser&&name!=='public.player_scores'&&r.count>0){need(!['public.price_changes'].includes(name),'additional derived round dependencies require separate review')}
 return frozenJSON({kind:'fcf-g1-derived-score-before',count:rows.length,...clone(b),roundCounts:p.native.dependencies.rounds.map(r=>({roundId:r.roundId,userRows:r.userRows})).sort((a,b)=>a.roundId-b.roundId),strictZeroAffectedUsersObserved:false})
}

/** Use inside an operator-owned explicit READ ONLY transaction; query is injected,
 * never a connection URL or test/live override. Returns DATA only. */
export async function prepareFcfG1DerivedScores({query,privacyKeys=[]}){
 need(typeof query==='function'&&Array.isArray(privacyKeys)&&privacyKeys.every(k=>typeof k==='string'),'readonly query and privacy keys required')
 const result=await query('select public.fcf_g1_derived_scores_prepare($1::text[]) as preparation',[privacyKeys])
 need(result?.rows?.length===1,'one SQL preparation row required')
 const preparation=result.rows[0].preparation
 exactKeys(preparation,['projection','derivedScoresBefore'],'SQL preparation')
 return frozenJSON({projection:preparation.projection,derivedScoresBefore:describeFcfG1DerivedScores({projection:preparation.projection,scoreBefore:preparation.derivedScoresBefore}),admissible:false,nativeAdmission:false,activationEligible:false})
}
