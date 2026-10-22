import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync}from'node:fs'
import mlsz,{stranKroga,stranTekme}from './viri/mlsz.mjs'
import {prenesiSPonovitvami,pozabiPadle}from'./prenos.mjs'
const url='https://adatbank.mlsz.hu/league/67/4/34094/1.html'
async function withFetch(fake,fn){const prior=globalThis.fetch;globalThis.fetch=fake;pozabiPadle();try{return await fn()}finally{globalThis.fetch=prior;pozabiPadle()}}
const get=()=>prenesiSPonovitvami(url,{fetchFn:mlsz.fetch,premorMs:0,zamiki:[0,0,0]})
const typedStop=e=>e.name==='MlszZavrnitev'&&e.zavrnitev===true
for(const status of[401,403,429])test(`MLSZ HTTP ${status} stops before shared retries`,async()=>{
 let attempts=0
 await withFetch(async()=>{attempts++;return new Response('refused',{status})},async()=>{await assert.rejects(get(),e=>typedStop(e)&&e.status===status)})
 assert.equal(attempts,1)
})
for(const status of[200,503])test(`MLSZ challenge HTTP ${status} stops before overload or HTTP retry`,async()=>{
 let attempts=0
 await withFetch(async()=>{attempts++;return new Response('<html><title>Just a moment...</title><script>cf_chl_opt={}</script>',{status})},async()=>{await assert.rejects(get(),typedStop)})
 assert.equal(attempts,1)
})
test('MLSZ login-only page stops but ordinary match pages stay usable',async()=>{
 const login='<html><form action="/login"><input name="username"><input type="password"></form></html>'
 let attempts=0
 await withFetch(async()=>{attempts++;return new Response(login)},async()=>{await assert.rejects(get(),typedStop)})
 assert.equal(attempts,1)
 assert.equal(mlsz.zaPredpomnilnik(login),false)
 for(const name of['hu-adatbank-krog-67-20-33915-8.html','hu-adatbank-tekma-65-20-31672-2090950.html']){
  const raw=readFileSync(new URL(`./vzorci/${name}`,import.meta.url),'utf8')
  await withFetch(async()=>new Response(raw),async()=>{assert.equal(await(await get()).text(),raw)})
  assert.equal(mlsz.zaPredpomnilnik(raw),true)
 }
})
test('MLSZ overload text is neither a denial nor cacheable',async()=>{
 const raw='SQLSTATE[08004] [1040] Too many connections'
 await withFetch(async()=>new Response(raw),async()=>{assert.equal(await(await get()).text(),raw)})
 assert.equal(mlsz.zaPredpomnilnik(raw),false)
})
for(const reader of['round','match'])test(`MLSZ ${reader} reader stops on a challenge before overload backoff`,async()=>{
 let reads=0
 const read=async()=>{reads++;return '<html><title>Just a moment...</title></html>'}
 await assert.rejects(reader==='round'?stranKroga('67/4/34094',1,read,false,[0,0]):stranTekme(url,'match.html',read,false,[0,0]),typedStop)
 assert.equal(reads,1)
})
test('MLSZ real round content accepts a normal login header without false refusal',async()=>{
 const raw=readFileSync(new URL('./vzorci/hu-adatbank-krog-67-20-33915-8.html',import.meta.url),'utf8')+'<form action="/login"><input type="password"></form>'
 await withFetch(async()=>new Response(raw),async()=>{assert.equal(await(await get()).text(),raw)})
 assert.equal(mlsz.zaPredpomnilnik(raw),true)
})
