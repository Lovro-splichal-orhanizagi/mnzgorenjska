import test from 'node:test'
import assert from 'node:assert/strict'
import {viraZa} from './viri/index.mjs'
import {tekmovanje} from './tekmovanje.mjs'
const c={id:779,slug:'es-ct-elit',source:'fcf',country_code:'ES',active:true,source_policy:null,sezona_koledarska:false,source_league_code:'4106968-4107207'}
test('scheduled FCF route reads no source when existing recent fixtures are complete',async t=>{
 const old=process.env.SLFF_FCF_CURRENT_FIXTURES;process.env.SLFF_FCF_CURRENT_FIXTURES='1';t.after(()=>{if(old===undefined)delete process.env.SLFF_FCF_CURRENT_FIXTURES;else process.env.SLFF_FCF_CURRENT_FIXTURES=old})
 let queried=false
 const db={from(){const q={select(){return q},eq(){return q},gte(){return q},lte(){return q},is(){return q},not(){return q},order(){return q},async range(){queried=true;return{data:[],error:null}}};return q}}
 const p=viraZa(c,{db});assert.deepEqual(await p.zapisniki(c.source_league_code,()=>assert.fail('full-season source scan')),[]);assert.equal(queried,true)
})
test('scheduled FCF loader resolves country needed for bounded admission',async t=>{
 const old=process.env.SLFF_FCF_CURRENT_FIXTURES;process.env.SLFF_FCF_CURRENT_FIXTURES='1';t.after(()=>{if(old===undefined)delete process.env.SLFF_FCF_CURRENT_FIXTURES;else process.env.SLFF_FCF_CURRENT_FIXTURES=old})
 const db={from(table){let columns;const q={select(v){columns=v;return q},eq(){return q},async maybeSingle(){return{data:table==='countries'?{code:'ES'}:columns==='sezona_koledarska'?{sezona_koledarska:false}:{...c,country_code:undefined,country_id:2},error:null}}};return q}}
 assert.equal((await tekmovanje(db,c.slug)).country_code,'ES')
})
