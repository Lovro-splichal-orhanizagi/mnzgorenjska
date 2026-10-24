import test from 'node:test'
import assert from 'node:assert/strict'
import {tekmovanje} from './tekmovanje.mjs'
import {viraZa} from './viri/index.mjs'
import {assertFussballImportCompetition} from './fussball-import-actions.mjs'

const code='031EKNM2HG00000LVS5489BUVUR5FS5A-G:2026/27'
const row={id:9999,slug:'de-test',country_id:44,source:'fussball-public',source_policy:null,source_league_code:code,active:false}
function database({source='fussball-public',country='DE',countryError=null}={}){
 const calls=[]
 return {calls,from(table){let columns=null,key=null,value=null
  return {select(s){columns=s;return this},eq(k,v){key=k;value=v;return this},async maybeSingle(){
   calls.push({table,columns,key,value})
   if(table==='countries')return {data:country===null?null:{code:country},error:countryError}
   return {data:columns==='sezona_koledarska'?{sezona_koledarska:false}:{...row,source},error:null}
  }}
 }}
}
test('actual competition reader resolves the numeric country FK before native source construction',async()=>{
 const db=database(),competition=await tekmovanje(db,'de-test')
 assert.equal(competition.country_id,44)
 assert.equal(competition.country_code,'DE','country code is resolved from countries, not mistaken for its FK')
 assert.equal(viraZa(competition,{db}).ime,'fussball-public')
 assert.equal(assertFussballImportCompetition(competition,{slug:'de-test',code}),competition)
 assert.deepEqual(db.calls.filter(c=>c.table==='countries'),[{table:'countries',columns:'code',key:'id',value:44}])
})
test('missing, failed or non-German country resolution cannot pass source or bootstrap guards',async()=>{
 for(const options of [{country:null},{countryError:{message:'country unavailable'}}])await assert.rejects(tekmovanje(database(options),'de-test'),/country|držav/i)
 const competition=await tekmovanje(database({country:'PL'}),'de-test')
 assert.throws(()=>viraZa(competition),/scope/i)
 assert.throws(()=>assertFussballImportCompetition(competition,{slug:'de-test',code}),/German/i)
 for(const patch of [{country_id:'DE',country_code:'DE'},{country_id:null,country_code:'DE'},{country_id:44,country_code:undefined}])assert.throws(()=>viraZa({...row,...patch}))
})
test('existing providers keep their original row contract and do not acquire another country query',async()=>{
 const db=database({source:'dfb'}),competition=await tekmovanje(db,'de-test')
 assert.equal(competition.source,'dfb');assert.equal(competition.country_id,44)
 assert.equal(Object.hasOwn(competition,'country_code'),false)
 assert.equal(db.calls.filter(c=>c.table==='countries').length,0)
})
