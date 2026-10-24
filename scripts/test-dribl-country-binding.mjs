import test from 'node:test'
import assert from 'node:assert/strict'
import {tekmovanje} from './tekmovanje.mjs'

function database(country){
 const calls=[]
 return {calls,from(table){let columns
  return {select(value){columns=value;return this},eq(){return this},async maybeSingle(){
   calls.push(table)
   if(table==='countries')return {data:country?{code:country}:null,error:null}
   return {data:columns==='sezona_koledarska'?{sezona_koledarska:true}:{id:9999,slug:'au-nsw-test',source:'dribl-public',country_id:44,source_policy:null},error:null}
  }}
 }}
}
test('Dribl competition resolves its actual country before creating a capture-bound source',async()=>{
 const db=database('AU'),row=await tekmovanje(db,'au-nsw-test')
 assert.equal(row.country_code,'AU');assert.equal(row.country_id,44)
 assert.equal(db.calls.filter(t=>t==='countries').length,1)
})
test('missing Dribl country metadata fails before any import source is constructed',async()=>{
 await assert.rejects(tekmovanje(database(null),'au-nsw-test'),/country|držav/i)
})
