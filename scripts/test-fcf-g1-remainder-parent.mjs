// Actual retained83 fixture; all GitHub GETs replay verified local journals.
// No source fetch, new execution, generated successful parent, DB or external IO.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const sha=b=>createHash('sha256').update(b).digest('hex')
function fixture(){
 const e=process.env.FCF_G1_REMAINDER_EVIDENCE_DIR;if(!e)throw Error('Exact retained40737060608 fixture directory required')
 const map=new Map();for(const directory of [e,join(e,'authentication')])for(const line of readFileSync(join(directory,'transport-journal.ndjson'),'utf8').trim().split('\n')){const r=JSON.parse(line);if(r.status!=='get-returned')continue;const b=readFileSync(join(directory,r.file));assert.equal(sha(b),r.sha256);map.set(r.path,b)}
 const r=JSON.parse(readFileSync(join(e,'g1-terminal-reference-data.json'))),calls=[],controls={}
 const github=async(path,binary=false)=>{calls.push(path);const b=map.get(path);assert.ok(b,'actual retained GET unavailable: '+path);const v=binary?Buffer.from(b):JSON.parse(b);return controls.change?.(path,v,binary)??v}
 return {source:r.prior,parentRecords:r.latest,frozenDirectory:process.env.FCF_G1_REMAINDER_FROZEN_DIRECTORY,github,calls,controls,map}
}
test('actual frozen failed23 plus prior60 yields only fresh private raw-prefix83, stable ledger and exact217 IDs',{skip:!process.env.FCF_G1_REMAINDER_EVIDENCE_DIR},async()=>{
 assert.ok(existsSync(new URL('./fcf-g1-remainder-parent.mjs',import.meta.url)),'private parent reader must exist')
 const api=await import('./fcf-g1-remainder-parent.mjs'),f=fixture(),{controls,calls,map,...input}=f,p=await api.readFcfG1RemainderParent(input),v=api.getFcfG1RemainderParent(p)
 assert.deepEqual(v.accounting,{priorSourceGETs:83,maximumCumulativeSourceGETs:478,remainingSourceGETs:395});assert.equal(v.admissible,false);assert.equal(v.nativeAdmission,false);assert.equal(v.activationEligible,false);assert.equal(v.prefix.length,23);assert.equal(v.prefix[0].id,'4109388');assert.equal(v.prefix[22].id,'4109410');assert.equal(v.prefix[22].sha256,'7c2335342065b7e0a77b54be97fe544c3549e165bd504ef1197a2d377fbe4b28');assert.equal(v.remainingIds.length,217);assert.equal(v.remainingIds[0],'4109411');assert.equal(v.remainingIds.at(-1),'4109627');assert.equal(v.firstSourceUTC,'2026-10-28T18:09:27.203Z');assert.equal(v.sourceFreshUntil,'2026-10-29T18:09:27.203Z');assert.ok(v.sourceReferences.accountedRunIds.includes('40737060608'));assert.ok(calls.length>=100)
 const original=Buffer.from(v.prefix[0].raw);assert.ok(Buffer.isBuffer(v.prefix[0].raw));v.prefix[0].raw.fill(0);v.prefix[0].receipt.sequence=0;assert.deepEqual(api.getFcfG1RemainderParent(p).prefix[0].raw,original);assert.equal(api.getFcfG1RemainderParent(p).prefix[0].receipt.sequence,61)
 for(const copy of [{...p},JSON.parse(JSON.stringify(p)),{accounting:{priorSourceGETs:83}}])assert.throws(()=>api.getFcfG1RemainderParent(copy),/reader-issued/)
 const again=await api.reauthenticateFcfG1RemainderParent(p);assert.equal(api.getFcfG1RemainderParent(again).ledgerSha256,v.ledgerSha256)
 const now=Date.now;try{Date.now=()=>Date.parse(v.sourceFreshUntil)+1;assert.throws(()=>api.getFcfG1RemainderParent(p),/fresh|expired/)}finally{Date.now=now}
 controls.change=(path,value)=>path.endsWith('/git/ref/tags/fcf-inventory-claim/g1-after-failed-1d41b14bb719da63f6e0c431186c1d34c234cad216f4ab292f962457ac8d58df')?{...value,object:{...value.object,sha:'0'.repeat(40)}}:value
 await assert.rejects(api.reauthenticateFcfG1RemainderParent(p));assert.throws(()=>api.getFcfG1RemainderParent(p),/held/)
})
test('parent refuses caller clocks/counters/proof/list overrides before any authentication',async()=>{
 assert.ok(existsSync(new URL('./fcf-g1-remainder-parent.mjs',import.meta.url)))
 const {readFcfG1RemainderParent}=await import('./fcf-g1-remainder-parent.mjs');let calls=0
 for(const patch of [{now:Date.now()},{clock:()=>Date.now()},{priorSourceGETs:83},{proof:{}},{prefix:[]},{loader:()=>({})}])await assert.rejects(readFcfG1RemainderParent({source:{},parentRecords:{},frozenDirectory:'unused',github:async()=>{calls++},...patch}),/closed/)
 assert.equal(calls,0)
})
test('actual pinned lineage rejects byte, actor, claim, counter, timestamp and frozen head substitutions',{skip:!process.env.FCF_G1_REMAINDER_EVIDENCE_DIR},async t=>{
 const api=await import('./fcf-g1-remainder-parent.mjs')
 for(const [label,change]of [['byte',f=>{f.controls.change=(p,v,b)=>b&&p.endsWith('/12840546673/zip')?Buffer.from('tampered ZIP'):v}],['actor',f=>{f.controls.change=(p,v)=>p.endsWith('/actions/runs/40737060608')?{...v,actor:{...v.actor,id:1}}:v}],['triggering actor',f=>{f.controls.change=(p,v)=>p.endsWith('/actions/runs/40737060608')?{...v,triggering_actor:{...v.triggering_actor,login:'other'}}:v}],['claim',f=>{f.parentRecords.claim.expected.claimCommit='0'.repeat(40)}],['counter',f=>{f.parentRecords.plan.priorSourceGETs=59}],['clock relabel',f=>{f.parentRecords.plan.createdUTC=new Date().toISOString()}],['head',f=>{f.frozenDirectory=new URL('../',import.meta.url).pathname}]])await t.test(label,async()=>{const f=fixture();change(f);const {controls,calls,map,...input}=f;await assert.rejects(api.readFcfG1RemainderParent(input))})
})

test('negative-only filesystem boundary rejects a clean-looking changed frozen reader before child/authentication',{skip:!process.env.FCF_G1_REMAINDER_EVIDENCE_DIR},async()=>{
 const f=fixture(),path=new URL('./fcf-g1-remainder-parent.mjs',import.meta.url),pins=JSON.parse(readFileSync(new URL('./fcf-g1-remainder-parent-reference.json',import.meta.url))),code=readFileSync(path,'utf8').replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href)).replace(/\bexport /g,'')+'\nreturn {readFcfG1RemainderParent};'
 const localRead=(p,...a)=>typeof p==='string'&&p.endsWith('/scripts/fcf-missing-inventory-claim.mjs')?Buffer.from('TEST ONLY changed pinned body'):readFileSync(p,...a)
 const git=(command,args)=>args.includes('--show-toplevel')?f.frozenDirectory:args.includes('HEAD')?pins.sourceCommit:''
 const {realpathSync}=await import('node:fs'),{isAbsolute}=await import('node:path'),{createInterface}=await import('node:readline')
 const api=new Function('readFileSync','realpathSync','join','isAbsolute','execFileSync','spawn','createHash','createInterface','process',code)(localRead,realpathSync,join,isAbsolute,git,()=>{throw Error('child must never start')},createHash,createInterface,process),{controls,calls,map,...input}=f
 await assert.rejects(api.readFcfG1RemainderParent(input),/frozen relevant body drift/);assert.equal(calls.length,0)
})
