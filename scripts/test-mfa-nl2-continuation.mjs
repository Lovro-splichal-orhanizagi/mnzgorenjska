import test from 'node:test'
import assert from 'node:assert/strict'
import mfa, {vseTekme,krogiSezone} from './viri/mfa.mjs'
import {normalizeMfaNl2Continuation} from './viri/mfa-nl2-continuation.mjs'

// Sanitized retained /matches metadata. No individual statistics are fixtures.
const pair=()=>[
 {id:50920555,homeTeam:{id:39633,name:'Msida St.Joseph'},awayTeam:{id:39613,name:'Dingli Swallows'},startDate:'2025-11-08T15:30:00.0000000Z',competitionId:'50920420',competitionTypeId:6234492,status:'PLAYED'},
 {id:51962893,homeTeam:{id:39633,name:'Msida St.Joseph'},awayTeam:{id:39613,name:'Dingli Swallows'},startDate:'2026-01-13T18:00:00.0000000Z',competitionId:'50920420',competitionTypeId:6234492,status:'PLAYED'},
]
function reader(fixtures,code='6234492/2026',reads=[]) {
 return async url=>{
  reads.push(url)
  if(url===`https://api.mfa.com.mt/api/competitions/${code.split('/')[0]}/standings?season=${code.split('/')[1]}`)return JSON.stringify({phases:[{groups:[{id:'50920420'}]}]})
  if(url.includes('/pastMatches?'))return JSON.stringify(fixtures)
  if(url.includes('/upcomingMatches?'))return '[]'
  throw Error(`unexpected report read: ${url}`)
 }
}
const load=(fixtures,code='6234492/2026')=>vseTekme(code,reader(fixtures,code),{mapa:null})

test('exact archive retains one final fixture and both source identities without mutating raw metadata',async()=>{
 const raw=pair(),before=JSON.stringify(raw),fixtures=await load(raw)
 assert.equal(fixtures.length,1)
 assert.equal(fixtures[0].id,51962893)
 assert.equal(fixtures[0].startDate,'2026-01-13T18:00:00.0000000Z')
 assert.equal(fixtures[0].sourceUrl,'https://matchcentre.mfa.com.mt/match/51962893')
 assert.deepEqual(fixtures[0].sourceMatchIds,['50920555','51962893'])
 assert.equal(fixtures[0].requiresHistoricalMarker,true)
 assert.equal(JSON.stringify(raw),before)
})

test('canonical source ID occupies original ordering slot and preserves unrelated round assignments for every input order',async()=>{
 // Four clubs/two fixtures a round: original fixture is manually round2.
 // This is a small slot regression, NOT invented evidence for real132/22/round4.
 const [original,final]=pair()
 const other=(id,home,away)=>({...original,id,homeTeam:{id:home,name:String(home)},awayTeam:{id:away,name:String(away)}})
 const raw=[other(50920550,39633,40000),other(50920551,39613,40001),other(50920554,40000,40001),original,other(50920556,39633,40001),other(50920557,39613,40000),final]
 const expected=[[50920550,1],[50920551,1],[50920554,2],[51962893,2],[50920556,3],[50920557,3]]
 for(const input of [raw,[...raw].reverse(),[raw[6],raw[2],raw[0],raw[5],raw[3],raw[1],raw[4]]]) {
  assert.deepEqual(krogiSezone(await load(input)).map(({krog,t})=>[t.id,krog]),expected)
 }
})

for(const [name,change] of [
 ['missing original',xs=>xs.shift()],['missing final',xs=>xs.pop()],
 ['unknown final ID',xs=>{xs[1].id=51962894}],
 ['wrong final source URL',xs=>{xs[1].sourceUrl='https://example.test/wrong'}],
 ...['competitionId','competitionTypeId','status','startDate'].flatMap(field=>[0,1].map(i=>[`${field} segment${i}`,xs=>{xs[i][field]=field==='startDate'?'2026-01-14T18:00:00Z':'wrong'}])),
 ...['homeTeam','awayTeam'].flatMap(field=>[0,1].map(i=>[`${field} segment${i}`,xs=>{xs[i][field].id=99999}])),
 ['unknown same-pair report',xs=>xs.push({...xs[1],id:51962894})],
])test(`exact archive rejects contradictory or missing metadata: ${name}`,async()=>{
 const raw=pair();change(raw)
 await assert.rejects(load(raw),/NL II continuation/)
})

for(const code of ['6234492/2027','6234492/2025','6234492/2026/50920420','58539/2026','2601248/2026','2601267/2026'])test(`other source code stays unchanged: ${code}`,async()=>{
 const raw=pair(),type=Number(code.split('/')[0]);for(const t of raw)t.competitionTypeId=type
 assert.deepEqual(await load(raw,code),raw)
})

test('base archive report import holds before result or lineup without an installed marker skip',async()=>{
 const reads=[]
 await assert.rejects(mfa.zapisniki('6234492/2026',reader(pair(),'6234492/2026',reads),{mapa:null}),/requires.*historical marker/i)
 assert.equal(reads.some(url=>/\/(result|lineup)$/.test(url)),false)
})

test('existing preskoci flow skips canonical fixture before either report read',async()=>{
 const reads=[]
 assert.deepEqual(await mfa.zapisniki('6234492/2026',reader(pair(),'6234492/2026',reads),{mapa:null,preskoci:new Set(['mt50920555','mt51962893'])}),[])
 assert.equal(reads.some(url=>/\/(result|lineup)$/.test(url)),false)
})


test('pure normalization accepts frozen raw metadata and never alters unrelated objects',()=>{
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
 const raw=freeze(pair()),before=JSON.stringify(raw)
 const normalized=normalizeMfaNl2Continuation('6234492/2026',raw)
 assert.equal(JSON.stringify(raw),before)
 assert.notEqual(normalized[0],raw[1])
 assert.equal(normalized[0].homeTeam,raw[1].homeTeam)
 for(const code of ['6234492/2027','58539/2026'])assert.equal(normalizeMfaNl2Continuation(code,raw),raw)
 assert.throws(()=>normalizeMfaNl2Continuation('6234492/2026',[...raw,raw[0]]),/exactly one source segment/)
})

test('schedule carries one final header and marker requirement rather than a second abandoned fixture',async()=>{
 const rounds=await mfa.razporedVseStrani('6234492/2026',reader(pair()))
 assert.equal(rounds.length,1)
 assert.deepEqual(rounds[0].tekme,[{
  domaci:'Msida St.Joseph',gostje:'Dingli Swallows',datum:'2026-01-13',ura:'19:00',kontumacija:false,odigrana:true,mfaId:51962893,
  requiresHistoricalMarker:true,sourceMatchIds:['50920555','51962893'],sourceUrl:'https://matchcentre.mfa.com.mt/match/51962893',
 }])
})
