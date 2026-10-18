import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,rmSync,readFileSync,statSync,symlinkSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {buildFcfFinalAuditPlan,collectFcfFinalAudit} from './fcf-final-audit.mjs'
const helper=await import('./fcf-history-evidence.mjs').catch(()=>({}))
const now=Date.parse('2026-10-18T14:00:00Z'),commit='a'.repeat(40)
function plan(){return buildFcfFinalAuditPlan({now,sourceCommit:commit,groups:[['es-ct-segona-g1',4109388,29],['es-ct-tercera-g2',4116188,28],['es-ct-tercera-g9',4118349,26]].map(([slug,start,n])=>({competition:{slug,source:'fcf',active:false,sezona_koledarska:false,source_league_code:`${start}-${start+239}`},verifiedSourceIds:Array.from({length:n},(_,i)=>String(start+i)),cache:Array.from({length:240},(_,i)=>({id:String(start+i),rawSha256:'c'.repeat(64),cacheMtimeUTC:'2026-10-17T10:00:00Z',header:{krog:Math.floor(i/8)+1,datum:new Date(Date.UTC(2026,8,19+Math.floor(i/8)*7)).toISOString().slice(0,10),izid:i<n?{domaci:0,gostje:0}:null,zaprt:i<n,sezona:'2026/27',tekmovanje:slug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA',skupina:`GRUP ${slug.split('-g')[1]}`},lineage:{verified:true,repository:'Lovro-splichal-orhanizagi/mnzgorenjska',artifactId:'100',artifactDigest:'sha256:'+'d'.repeat(64),runId:'200',commit:'e'.repeat(40)}}))}))})}
function fixture(t){const root=realpathSync(mkdtempSync(join(tmpdir(),'fcf-evidence-')));t.after(()=>rmSync(root,{recursive:true,force:true}));return{root,plan:plan(),execution:{repository:'Lovro-splichal-orhanizagi/mnzgorenjska',ref:'refs/heads/main',commit,runId:'123',runAttempt:'2'}}}
function create(f){assert.equal(typeof helper.createFcfAuditRetention,'function','actual raw retention sink must exist');return helper.createFcfAuditRetention(f)}
test('actual collector bytes are retained before parser failure and diagnostic cannot claim completion',async t=>{
 const f=fixture(t),sink=create(f),bytes=Buffer.from('original\r\nč bytes');let calls=0
 await assert.rejects(()=>collectFcfFinalAudit({plan:f.plan,onAttempt:sink.attempt,onCapture:sink.capture,clock:()=>now,request:async()=>{calls++;return new Response(bytes)},pause:async()=>{},parse:()=>{assert.deepEqual(readFileSync(join(sink.directory,'acta-4109417.html')),bytes);throw Error('strict source defect')}}),/strict source defect/)
 sink.abort();const m=JSON.parse(readFileSync(join(sink.directory,'manifest.json')))
 assert.equal(calls,1);assert.equal(m.status,'failed');assert.equal(m.captures.length,1);assert.equal(m.planSha256,f.plan.planSha256);assert.equal(m.captures[0].rawSha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(m.captures[0].capturedUTC,'2026-10-18T14:00:00.000Z')
 assert.equal(statSync(sink.directory).mode&0o777,0o700);assert.equal(statSync(join(sink.directory,'acta-4109417.html')).mode&0o777,0o600)
 assert.throws(()=>sink.abort(),/FCF_EVIDENCE/)
})
test('complete collector output binds retained bytes, exact plan and Actions attempt',async t=>{
 const f=fixture(t),sink=create(f),result=await collectFcfFinalAudit({plan:f.plan,onAttempt:sink.attempt,onCapture:sink.capture,clock:()=>now,request:async()=>new Response('normal bytes'),pause:async()=>{},parse:({id})=>({id})})
 sink.finish(result);const m=JSON.parse(readFileSync(join(sink.directory,'manifest.json')))
 assert.equal(m.status,'complete');assert.equal(m.actualSourceGETs,61);assert.deepEqual(m.execution,f.execution);assert.equal(m.captures.length,61)
})
test('missing or altered receipt cannot finish a raw-evidence packet',t=>{const f=fixture(t),sink=create(f);assert.throws(()=>sink.finish({sourceCommit:commit,planSha256:f.plan.planSha256,actualSourceGETs:61,captures:[]}),/FCF_EVIDENCE/);sink.abort()})
for(const [name,patch]of[['foreign commit',f=>f.execution.commit='b'.repeat(40)],['foreign repo',f=>f.execution.repository='other/repo'],['feature ref',f=>f.execution.ref='refs/heads/feature'],['bad attempt',f=>f.execution.runAttempt='0'],['changed plan',f=>f.plan.maximumSourceGETs=62]])test(`retention refuses ${name} before creating output`,t=>{const f=fixture(t);patch(f);assert.throws(()=>create(f),/FCF_EVIDENCE|FCF_AUDIT/)})
test('pre-existing output and ancestor symlink refuse without overwriting evidence',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'fcf-historical-audit'));assert.throws(()=>create(f),/FCF_EVIDENCE/)
 const other=fixture(t),link=join(other.root,'link');symlinkSync(f.root,link);assert.throws(()=>create({...other,root:link}),/FCF_EVIDENCE/)
})
test('unplanned and repeated raw identities never produce another file',async t=>{
 const f=fixture(t),sink=create(f),bytes=Buffer.from('normal bytes'),receipt={id:'4109417',competitionSlug:'es-ct-segona-g1',expectedSourceRound:4,sourceUrl:'https://www.fcf.cat/ca/competicio/acta/4109417',startedUTC:'2026-10-18T14:00:00Z',capturedUTC:'2026-10-18T14:00:00Z',bytes:bytes.length,rawSha256:createHash('sha256').update(bytes).digest('hex')}
 assert.throws(()=>sink.capture({...receipt,id:'4109388'},bytes),/FCF_EVIDENCE/);const{id,competitionSlug,expectedSourceRound,sourceUrl,startedUTC}=receipt;sink.attempt({id,competitionSlug,expectedSourceRound,sourceUrl,startedUTC});sink.capture(receipt,bytes);assert.throws(()=>sink.capture(receipt,bytes),/FCF_EVIDENCE/);sink.abort()
})

test('failed HTTP403 diagnostic counts its actual attempted GET separately from retained captures',async t=>{
 const f=fixture(t),sink=create(f);let calls=0
 await assert.rejects(()=>collectFcfFinalAudit({plan:f.plan,onAttempt:sink.attempt,onCapture:sink.capture,clock:()=>now,request:async()=>{calls++;return new Response('refused',{status:403})},pause:async()=>{},parse:()=>{throw Error('must not parse refusal')}}),/FCF_AUDIT/)
 sink.abort();const m=JSON.parse(readFileSync(join(sink.directory,'manifest.json')))
 assert.equal(calls,1);assert.equal(m.status,'failed');assert.equal(m.actualSourceGETs,1);assert.equal(m.captures.length,0)
 assert.equal(m.attempts.length,1);assert.equal(m.attempts[0].sourceUrl,'https://www.fcf.cat/ca/competicio/acta/4109417')
})
