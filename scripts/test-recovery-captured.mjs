import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createRecoverySource} from './viri/recovery-captured.mjs'
import {vZapisnik} from './viri/hns.mjs'
import {report} from './hns-recovery-validation.mjs'
test('report independently rejects wrong round and competition',()=>{
 let html=fs.readFileSync(new URL('./vzorci/hns-tekma-11m.html',import.meta.url),'utf8').replace('<h2>Treća NL Istok 26/27,','<h2><a href="https://semafor.hns.family/natjecanja/123/x/">Treća NL Istok 26/27</a>,')
 const z=vZapisnik(html,{id:'456',url:'https://semafor.hns.family/utakmice/456/x/'}),f={id:'456',krog:z.krog,datum:z.datum,domaci:z.domaci.ime,gostje:z.gostje.ime,izid:z.rezultat}
 assert.equal(report(html,f,'123').quality.complete,true)
 assert.throws(()=>report(html,{...f,krog:999},'123'))
 assert.throws(()=>report(html,f,'999'))
 assert.throws(()=>report(html,{...f,domaci:'NK Ponikve (Zagreb)',domaciId:'617'},'123'),/club identity/)
})
test('snapshot binds live league and body hash; source requests have no fallback',async t=>{
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'recovery-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));fs.mkdirSync(path.join(d,'blobs'))
 // Use a real schedule but no admitted reports, exercising empty batch and identity guards.
 const files=fs.readdirSync(new URL('./vzorci/',import.meta.url));const name='hns-natjecanje.html'
 const body=fs.readFileSync(new URL('./vzorci/'+name,import.meta.url)),sha=createHash('sha256').update(body).digest('hex')
 fs.writeFileSync(path.join(d,'blobs',sha+'.html'),body)
 const l={id:1,slug:'hr-test',code:'123',reports:[],pending:[],schedule:{url:'https://semafor.hns.family/natjecanja/123/x/',sha256:sha,capturedAt:new Date().toISOString()}}
 fs.writeFileSync(path.join(d,'latest.json'),JSON.stringify({schema:1,incident:'hns-20261117',source:'hns',season:'2026/27',fromDate:'2026-11-06',throughDate:'2026-11-17',leagues:[l]}))
 const c={id:1,slug:'hr-test',source_league_code:'123',source:'hns',active:true,source_policy:null,country_code:'HR'}
 const v=createRecoverySource({competition:c,directory:d});assert.deepEqual(await v.zapisniki('123'),[]);assert.throws(()=>v.fetch('https://semafor.hns.family'))
 assert.throws(()=>createRecoverySource({competition:{...c,id:2},directory:d}));assert.throws(()=>createRecoverySource({competition:{...c,active:false},directory:d}));assert.throws(()=>createRecoverySource({competition:{...c,country_code:'PL'},directory:d}))
 fs.appendFileSync(path.join(d,'blobs',sha+'.html'),'tampered');assert.throws(()=>createRecoverySource({competition:c,directory:d}),/hash mismatch/)
})
test('replay skips completed native reports; incomplete retries remain, foreign bindings stop',async()=>{
 const {missingRecoveryRecords}=await import('./viri/recovery-captured.mjs')
 const records=[{id:'1',z:{datum:'2026-11-08',krog:10}},{id:'2',z:{datum:'2026-11-08',krog:10}}]
 const rows=records.map((r,i)=>({id:i+1,zapisnik_id:r.id,imported_at:i===0?'2026-11-18':null,played_on:r.z.datum,rounds:{competition_id:10,season:'2026/27',number:10}}))
 const db={from(){return{select(){return this},async in(){return{data:rows,error:null}}}}}
 assert.deepEqual((await missingRecoveryRecords(records,{id:10},db)).map(r=>r.id),['2'])
 rows[1].imported_at='2026-11-18';assert.deepEqual(await missingRecoveryRecords(records,{id:10},db),[])
 rows[0].rounds.competition_id=999;await assert.rejects(missingRecoveryRecords(records,{id:10},db))
})
test('replay accepts a sponsor-renamed club on one side, rejects a different club',async()=>{
 const {missingRecoveryRecords}=await import('./viri/recovery-captured.mjs'),{default:hns}=await import('./viri/hns.mjs')
 const z={datum:'2026-11-08',krog:10,domaci:{ime:'NK Dubrava Zagreb'},gostje:{ime:'NK Sesvete'}}
 const records=[{id:'1',z}]
 const row=(home,away)=>({id:1,zapisnik_id:'1',imported_at:'2026-11-18',played_on:z.datum,home:{id:1,name:home},away:{id:2,name:away},rounds:{competition_id:10,season:'2026/27',number:10}})
 const run=(home,away)=>missingRecoveryRecords(records,{id:10},{from(){return{select(){return this},async in(){return{data:[row(home,away)],error:null}}}}},hns.kljucKluba)
 assert.deepEqual(await run('NK Dubrava Tim Kabel','NK Sesvete'),[])
 await assert.rejects(run('NK Lokomotiva','NK Sesvete'),/differs from captured report/)
 await assert.rejects(run('NK Dubrava Tim Kabel','NK Lokomotiva'),/differs from captured report/)
 await assert.rejects(run('NK Lokomotiva','NK Maksimir'),/differs from captured report/)
})
test('actual competition loader resolves the country for captured HNS before native import',async()=>{
 const {tekmovanje}=await import('./tekmovanje.mjs'),old=process.env.SLFF_RECOVERY_CAPTURE
 process.env.SLFF_RECOVERY_CAPTURE='test-private-capture'
 const db={from(table){let column;return {select(c){column=c;return this},eq(){return this},async maybeSingle(){return {data:table==='countries'?{code:'HR'}:column==='sezona_koledarska'?{sezona_koledarska:false}:{id:1,slug:'hr-test',country_id:2,source:'hns',active:true,source_policy:null,source_league_code:'123'},error:null}}}}}
 try{assert.equal((await tekmovanje(db,'hr-test')).country_code,'HR')}finally{if(old===undefined)delete process.env.SLFF_RECOVERY_CAPTURE;else process.env.SLFF_RECOVERY_CAPTURE=old}
})
test('native fixture guard rejects report reassignment and skips already-complete fixtures',async()=>{
 const {assertRecoveryFixture}=await import('./viri/recovery-captured.mjs')
 let row={id:1,zapisnik_id:'old-report',imported_at:'2026-11-18'}
 const db={from(){return{select(){return this},eq(){return this},async maybeSingle(){return{data:row,error:null}}}}}
 const scope={id:'new-report',roundId:1,homeTeamId:2,awayTeamId:3}
 await assert.rejects(assertRecoveryFixture(db,scope),/owns another/)
 row={id:1,zapisnik_id:null,imported_at:null};assert.equal(await assertRecoveryFixture(db,scope),true)
 row={id:1,zapisnik_id:'new-report',imported_at:'2026-11-18'};assert.equal(await assertRecoveryFixture(db,scope),false)
})
test('phase report binds exact parent competition name and season; unrelated phase is rejected',()=>{
 let html=fs.readFileSync(new URL('./vzorci/hns-tekma-11m.html',import.meta.url),'utf8').replace('<h2>Treća NL Istok 26/27,','<h2><a href="https://semafor.hns.family/natjecanja/999/x/">Treća NL Istok 26/27 1. DIO</a>,')
 const z=vZapisnik(html,{id:'456',url:'https://semafor.hns.family/utakmice/456/x/'}),f={id:'456',krog:z.krog,datum:z.datum,domaci:z.domaci.ime,gostje:z.gostje.ime,izid:z.rezultat}
 assert.equal(report(html,f,'123','Treća NL Istok 26/27').quality.complete,true)
 assert.throws(()=>report(html,f,'123','Other competition 26/27'),/competition header/)
 assert.throws(()=>report(html,f,'123','Treća NL Istok 25/26'),/competition header/)
})
test('aggregate competitions accept identical season labels and the published Croatian phase spelling',()=>{
 const original=fs.readFileSync(new URL('./vzorci/hns-tekma-11m.html',import.meta.url),'utf8')
 const cases=[
  ['Prva ŽNL Varaždin  26/27','Prva ŽNL Varaždin 26/27'],
  ['1. liga Juniori NSZŽ 26/27','1. liga juniori NSZŽ 26/27'],
  ['2. liga Kadeti A NSZŽ 26/27','2. liga kadeti A NSZŽ 26/27'],
  ['2. ŽNL NSŽSD 26/27','2. ŽNL NSŽSD 26/27 - prvi dio'],
 ]
 for(const [parent,child] of cases){
  const html=original.replace('<h2>Treća NL Istok 26/27,',`<h2><a href="https://semafor.hns.family/natjecanja/999/x/">${child}</a>,`)
  const z=vZapisnik(html,{id:'456',url:'https://semafor.hns.family/utakmice/456/x/'}),f={id:'456',krog:z.krog,datum:z.datum,domaci:z.domaci.ime,gostje:z.gostje.ime,izid:z.rezultat}
  assert.equal(report(html,f,'123',parent).quality.complete,true,parent)
  for(const wrong of [parent.replace('26/27','25/26'),'Other league 26/27',parent+' Group B'])assert.throws(()=>report(html,f,'123',wrong),/competition header/)
 }
})

function correctionCase(){
 const z={datum:'2026-11-18',krog:10,rezultat:{domaci:1,gostje:1},domaci:{ime:'NK First'},gostje:{ime:'NK Second'}}
 const records=[{id:'114652522',z},{id:'114652523',z:structuredClone(z)}]
 const rows=records.map((r,i)=>({id:58085+i,zapisnik_id:r.id,imported_at:i===0?'2026-10-24':null,played_on:i===0?'2026-10-24':z.datum,home_goals:0,away_goals:0,home:{name:z.domaci.ime},away:{name:z.gostje.ime},rounds:{competition_id:10,season:'2026/27',number:10}}))
 const db={from(table){assert.equal(table,'matches');return{select(columns){assert.ok(columns.includes('home_goals')&&columns.includes('away_goals'));return this},async in(){return{data:rows,error:null}}}}}
 return {records,rows,db,c:{id:10,slug:'hr-test'},key:x=>x}
}
test('recurring imported source date/score correction is held without changing the match or stopping other reports',async()=>{
 const {missingRecoveryRecords}=await import('./viri/recovery-captured.mjs')
 const {records,rows,db,c,key}=correctionCase(),before=structuredClone(rows),holds=[]
 assert.deepEqual((await missingRecoveryRecords(records,c,db,key,{recurring:true,onHold:h=>holds.push(h)})).map(r=>r.id),['114652523'])
 assert.deepEqual(rows,before)
 assert.deepEqual(holds,[{kind:'already-imported-source-change',league:'hr-test',matchId:58085,reportId:'114652522',stored:{playedOn:'2026-10-24',homeGoals:0,awayGoals:0},captured:{playedOn:'2026-11-18',homeGoals:1,awayGoals:1}}])
 rows[0].played_on='2026-11-18';holds.length=0
 await missingRecoveryRecords(records,c,db,key,{recurring:true,onHold:h=>holds.push(h)})
 assert.equal(holds.length,1,'score-only corrections also require review')
 rows[0].home_goals=1;rows[0].away_goals=1;holds.length=0
 await missingRecoveryRecords(records,c,db,key,{recurring:true,onHold:h=>holds.push(h)})
 assert.deepEqual(holds,[],'unchanged completed reports need no hold')
})
test('recurring exact report placeholders can change dates; historical dates and all other identities stay strict',async()=>{
 const {missingRecoveryRecords}=await import('./viri/recovery-captured.mjs')
 const {records,rows,db,c,key}=correctionCase()
 rows[0].imported_at=null
 assert.equal((await missingRecoveryRecords(records,c,db,key,{recurring:true})).length,2)
 await assert.rejects(missingRecoveryRecords(records,c,db,key))
 for(const mutate of [m=>m.rounds.competition_id=999,m=>m.rounds.season='2025/26',m=>m.rounds.number=9,m=>m.home.name='Other FC']){
  const original=structuredClone(rows[0]);mutate(rows[0])
  await assert.rejects(missingRecoveryRecords(records,c,db,key,{recurring:true,onHold:()=>assert.fail('identity errors cannot become holds')}))
  rows[0]=original
 }
})
test('recurring corrections cannot be silently skipped if hold persistence fails',async()=>{
 const {missingRecoveryRecords}=await import('./viri/recovery-captured.mjs')
 const {records,db,c,key}=correctionCase()
 await assert.rejects(missingRecoveryRecords(records,c,db,key,{recurring:true}))
 await assert.rejects(missingRecoveryRecords(records,c,db,key,{recurring:true,onHold:async()=>{throw Error('disk full')}}),/disk full/)
})
test('manual review artifacts preserve and deduplicate holds atomically per shard',async t=>{
 const {persistRecoveryHold,missingRecoveryRecords}=await import('./viri/recovery-captured.mjs')
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'recovery-holds-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}))
 const {records,rows,db,c,key}=correctionCase()
 const run=()=>missingRecoveryRecords(records,c,db,key,{recurring:true,onHold:hold=>persistRecoveryHold(d,hold,{shard:2})})
 await run();await run();rows[1].imported_at='2026-11-18';await run()
 const value=JSON.parse(fs.readFileSync(path.join(d,'manual-review-2.json'),'utf8'))
 assert.equal(value.schema,1);assert.equal(value.source,'hns');assert.equal(value.holds.length,2)
 assert.deepEqual(fs.readdirSync(d),['manual-review-2.json'])
 assert.throws(()=>persistRecoveryHold(d,value.holds[0],{shard:'../escape'}))
})
