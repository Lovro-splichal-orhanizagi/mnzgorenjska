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
