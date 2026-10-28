import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync,realpathSync,writeFileSync,chmodSync,rmSync,symlinkSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import http from 'node:http'
import https from 'node:https'
import {syncBuiltinESMExports} from 'node:module'
import {activationFixture} from './fcf-future-activation-test-fixture.mjs'
import {encodeFcfTargetWire} from './fcf-target-child-offline.mjs'
import {sha} from './fcf-missing-inventory-test-fixture.mjs'
const api=await import('./fcf-future-target-child-offline.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {}}),enabled=['FCF_POST_SIX_EVIDENCE_DIR','FCF_FUTURE_SOURCE_EVIDENCE_DIR','FCF_SIX_ORIGINAL_AUTHORIZATION_WIRE','FCF_SIX_ACCOUNTING_WIRE','FCF_HISTORICAL_RETAINED_DIR'].every(k=>process.env[k])
test('new automatic preload refuses missing parent file before main starts',()=>{
 assert.equal(typeof api.installFcfFutureTargetChildOffline,'function');const env={...process.env};delete env.FCF_FUTURE_TARGET_OFFLINE_FILE;delete env.FCF_FUTURE_TARGET_OFFLINE_SHA256
 const r=spawnSync(process.execPath,['--import','./scripts/fcf-future-target-preload.mjs','-e',"console.log('UNSAFE_MAIN')"],{env,encoding:'utf8',timeout:30000});assert.notEqual(r.status,0);assert.doesNotMatch(r.stdout,/UNSAFE_MAIN/);assert.match(r.stderr,/FCF_FUTURE_CHILD/)
})
test('future child authenticates private raw file and expires SAME proof per football GET',{skip:enabled?false:'Genuine retained OLD accounting/original authorization required'},async t=>{
 const f=await activationFixture(t),rollout=JSON.parse(f.original.rolloutText),outer={wire:encodeFcfTargetWire(f.wire),targetSlug:'es-ct-tercera-g9',sourceCommit:'b'.repeat(40),targetPacketText:rollout.targetPacketText,targetPacketSha256:rollout.targetPacketSha256},dir=realpathSync(mkdtempSync(join(tmpdir(),'future-child-test-'))),path=join(dir,'parent.json');t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const save=value=>{const bytes=Buffer.from(JSON.stringify(value));writeFileSync(path,bytes,{mode:0o600});return {SUPABASE_URL:'https://synthetic.supabase.co',FCF_FUTURE_TARGET_OFFLINE_FILE:path,FCF_FUTURE_TARGET_OFFLINE_SHA256:sha(bytes)}}
 const env=save(outer);chmodSync(path,0o644);assert.throws(()=>api.installFcfFutureTargetChildOffline({env,network:()=>{throw Error('IO')},now:f.wire.now}),/FCF_/);chmodSync(path,0o600)
 const link=join(dir,'link.json');symlinkSync(path,link);assert.throws(()=>api.installFcfFutureTargetChildOffline({env:{...env,FCF_FUTURE_TARGET_OFFLINE_FILE:link},now:f.wire.now}),/FCF_/)
 for(const change of [x=>x.targetSlug='es-ct-segona-g1',x=>x.sourceCommit='c'.repeat(40),x=>x.targetPacketSha256='0'.repeat(64),x=>x.extra=true,x=>x.wire={verified:true}]){const x=structuredClone(outer);change(x);assert.throws(()=>api.installFcfFutureTargetChildOffline({env:save(x),now:f.wire.now}),/FCF_/)}
 const valid=save(outer),originalFetch=globalThis.fetch,methods=[http,https].flatMap(m=>['get','request'].map(k=>[m,k,m[k]]));t.after(()=>{globalThis.fetch=originalFetch;for(const [m,k,v]of methods)m[k]=v;syncBuiltinESMExports()})
 let now=f.wire.now;const calls=[];t.mock.method(Date,'now',()=>now)
 const view=api.installFcfFutureTargetChildOffline({env:valid,network:async(url,options)=>{calls.push([url,options]);return new Response('[]')},now:f.wire.now})
 const url='https://www.fcf.cat/ca/competicio/acta/4118354';assert.equal((await fetch(url)).status,200);assert.equal(calls.length,0);assert.equal(view.schedule().length,240)
 await fetch('https://synthetic.supabase.co/rest/v1/players?competition_id=eq.797');assert.equal(calls.length,1);assert.equal(calls[0][1].redirect,'manual')
 await fetch('https://synthetic.supabase.co/rest/v1/players?id=eq.1',{method:'PATCH',body:JSON.stringify({position:'MID',position_source:'ugibanje'})});await fetch('https://synthetic.supabase.co/rest/v1/players?id=eq.1',{method:'PATCH',body:JSON.stringify({value:5,value_start:5})});await fetch('https://synthetic.supabase.co/rest/v1/position_priors?on_conflict=player_id,position',{method:'POST',body:JSON.stringify([{player_id:1,position:'MID',score:.7,updated_at:new Date(now).toISOString()}])});await fetch('https://synthetic.supabase.co/rest/v1/position_priors?player_id=in.(1)',{method:'DELETE'});assert.equal(calls.length,5)
 for(const u of ['https://www.fcf.cat/ca/competicio/acta/4109388','https://www.fcf.cat/api/x',url+'?unexpected=1','https://other.example/','https://synthetic.supabase.co/rest/v1/rpc/fcf_future_current_target_check','https://synthetic.supabase.co/auth/v1/admin/users'])await assert.rejects(fetch(u),/FCF_/)
 await assert.rejects(fetch('https://synthetic.supabase.co/rest/v1/competitions?id=eq.797',{method:'PATCH',body:'{"active":true}'}),/FCF_/)
 assert.throws(()=>https.get(url),/FCF_/);assert.throws(()=>http.get('http://www.fcf.cat/ca/competicio/acta/4118354'),/FCF_/);assert.equal(calls.length,5)
 now+=86400001;await assert.rejects(fetch(url),/FCF_/);await assert.rejects(fetch(url),/FCF_/);assert.equal(calls.length,5)
})
