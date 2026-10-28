import test from 'node:test'
import {nativeRuntimeFixture,isolatedTestModule} from './fussball-native-runtime-test-fixture.mjs'
import * as fcfSupplement from './lib/fcf-g1-supplement-installed.mjs'
import * as communityPolicy from './fussball-community-policy.mjs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'
import {replayFussballCardEnvelope} from './viri/fussball-card-envelope.mjs'
const api=await import('./fussball-community-runtime.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const read=file=>readFileSync(new URL('./vzorci/de-fussball-community/'+file,import.meta.url))
const witness=JSON.parse(read('provenance.json'))
const fonts=Object.fromEntries(Object.entries(witness.fonts).map(([id,f])=>[id,{bytes:read(f.file),sha256:f.sha256}]))
const html=read('report.html').toString()
const envelope=razberiFantasyZapisnik(html,read('lineup.html').toString(),{fonts,id:witness.matchId,lineupId:witness.matchId,season:witness.season,cardPolicy:'community-v1'}).cardEnvelope
const candidates=envelope.roster.map((p,i)=>({source_id:p.sourceId,player_id:1000+i,team_id:p.side?202:101}))
const red=envelope.cards.find(c=>c.type==='second_yellow')
const recipient=envelope.roster.find(p=>p.side===red.side&&!p.goalkeeper&&!p.starter&&!html.includes(p.sourceId.split('-').at(-1)))
const yellow=envelope.cards.find(c=>c.type==='yellow'&&c.side===red.side&&c.ordinal<red.ordinal)
const choices={[red.eventKey]:recipient.sourceId,[yellow.eventKey]:recipient.sourceId}
const job={match_id:789,envelope,candidates,revision_sha256:envelope.revisionSha256,resolutions:choices,resolution_sha256:'a'.repeat(64)}
function database({failApply=false}={}){
 const calls=[];return {calls,rpc:async(name,args)=>{calls.push({name,args});if(name==='apply_fussball_card_report')return failApply?{error:{message:'ambiguous connection failure'}}:{data:{applied:true,match_id:789,revision_sha256:envelope.revisionSha256,resolution_sha256:job.resolution_sha256}};if(name==='defer_fussball_card_replay')return {data:true};throw Error('Unexpected RPC '+name)}}
}
test('native card replay maps exact historical identities and keeps a dismissed reserve at zero minutes',()=>{
 assert.equal(typeof api.buildFussballCardNativeRows,'function')
 const report=replayFussballCardEnvelope(envelope,choices),rows=api.buildFussballCardNativeRows({envelope,report,candidates,matchId:789})
 const id=candidates.find(p=>p.source_id===recipient.sourceId).player_id,row=rows.appearances.find(p=>p.player_id===id)
 assert.equal(row.minutes_played,0);assert.equal(row.red_card_minute,68);assert.equal(row.yellow_cards,1);assert.equal(row.red_cards,1)
 assert.equal(rows.appearances.reduce((n,a)=>n+a.minutes_played,0),1980)
 assert.ok(rows.appearances.every(a=>Object.hasOwn(a,'penalties_saved')&&Object.hasOwn(a,'red_card_minute')))
 for(const change of [c=>{c[0].player_id=c[1].player_id},c=>{c[0].team_id=999},c=>{c.pop()}]){const bad=structuredClone(candidates);change(bad);assert.throws(()=>api.buildFussballCardNativeRows({envelope,report,candidates:bad,matchId:789}))}
})
test('valid recipient replay uses one atomic apply RPC with the exact revision and consensus token',async()=>{
 assert.equal(typeof api.processFussballCardJob,'function');const db=database()
 const result=await api.processFussballCardJob({db,competitionId:44,code:'03188V27L800000JVS5489BTVU7GTVLE-G:2026/27',job})
 assert.equal(result.status,'APPLIED');assert.equal(db.calls.length,1);assert.equal(db.calls[0].name,'apply_fussball_card_report')
 assert.equal(db.calls[0].args.p_revision_sha,envelope.revisionSha256);assert.equal(db.calls[0].args.p_resolution_sha,job.resolution_sha256)
})
test('a contradictory second-yellow vote is deferred without writing guessed individual statistics',async()=>{
 assert.equal(typeof api.processFussballCardJob,'function');const db=database()
 const result=await api.processFussballCardJob({db,competitionId:44,code:'03188V27L800000JVS5489BTVU7GTVLE-G:2026/27',job:{...job,resolutions:{[red.eventKey]:recipient.sourceId}}})
 assert.equal(result.status,'HOLD');assert.deepEqual(db.calls.map(c=>c.name),['defer_fussball_card_replay'])
})
test('corrupt original evidence fails before any mutation and ambiguous database apply is never retried',async()=>{
 assert.equal(typeof api.processFussballCardJob,'function');const db=database(),bad=structuredClone(job);bad.envelope.bundle.report.base64=Buffer.from('changed').toString('base64')
 await assert.rejects(api.processFussballCardJob({db,competitionId:44,code:'03188V27L800000JVS5489BTVU7GTVLE-G:2026/27',job:bad}));assert.equal(db.calls.length,0)
 const broken=database({failApply:true});await assert.rejects(api.processFussballCardJob({db:broken,competitionId:44,code:'03188V27L800000JVS5489BTVU7GTVLE-G:2026/27',job}),/ambiguous|apply/i)
 assert.deepEqual(broken.calls.map(c=>c.name),['apply_fussball_card_report'])
})
test('ordinary import admits only a private source-bound installed community context and preserves typed pending bodies',async t=>{
 const c={id:44,country_id:4,active:false,date_only_deadline_policy:null,slug:'de-verbandsliga-baden',source:'fussball-public',country_code:'DE',source_policy:'fussball-community-cards-v1',source_league_code:'03188V27L800000JVS5489BTVU7GTVLE-G:2026/27'}
 const f=nativeRuntimeFixture(t,c),binding=f.observed.cards
 const {loadHistoricalStatisticsImportContext,assertHistoricalReportImportable,skipIncompleteArchiveReport}=isolatedTestModule('./lib/historical-statistics-import.mjs',{...communityPolicy,...fcfSupplement,...f.api,join},['loadHistoricalStatisticsImportContext','assertHistoricalReportImportable','skipIncompleteArchiveReport'])
 await assert.rejects(loadHistoricalStatisticsImportContext(f.db,c),/fresh private hosted composition/)
 const ctx=await loadHistoricalStatisticsImportContext(f.db,c,{nativeComposition:f.token})
 assert.deepEqual(ctx.competition.communityCardBinding,binding);assert.ok(f.calls.includes('source'));assert.ok(f.calls.includes('get_fussball_historical_runtime'))
 const pending={id:envelope.reportId,url:envelope.sourceUrl,statisticsPending:true,cardEnvelope:envelope,z:{zapisnikId:envelope.reportId,sezona:envelope.season,nepopoln:false}}
 assert.doesNotThrow(()=>assertHistoricalReportImportable({competition:ctx.competition,report:pending}))
 const archivePending={...pending,z:{...pending.z,nepopoln:true}}
 assert.equal(skipIncompleteArchiveReport({competition:ctx.competition,report:archivePending,currentSeason:false}),false,'typed pending archive must reach native registration')
 assert.equal(skipIncompleteArchiveReport({competition:{...c,source_policy:null},report:archivePending,currentSeason:false}),true,'ordinary incomplete archive still skips')
 assert.equal(skipIncompleteArchiveReport({competition:ctx.competition,report:{...archivePending,statisticsPending:false},currentSeason:false}),true,'untyped partial archive is never admitted')
 assert.throws(()=>assertHistoricalReportImportable({competition:ctx.competition,report:{...pending,nastopi:[]}}),/pending|statistics|rows/i)
 f.controls.mutate=v=>{v.cards.installed=false};await assert.rejects(loadHistoricalStatisticsImportContext(f.db,c,{nativeComposition:f.token}),/installed|policy|binding/i)
})
