import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {vZapisnik,nastopi} from './viri/dfb.mjs'
const provenance=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-unattributed-provenance.json',import.meta.url)))
const html=id=>readFileSync(new URL(`./vzorci/de-dfb-unattributed-${id}.html`,import.meta.url),'utf8')
const parse=(id,body=html(id))=>vZapisnik(body,{liga:id==='2402201'?'regionalliga-west':'regionalliga-bayern'})
// A change that drops whole reports, creates reserves or assigns guessed yellows must fail these actual captures.
for(const [id,goals,subs,yellows,reds,unknown] of [['2402201',4,10,6,1,1],['2401588',5,10,4,0,1],['2401579',1,9,3,0,0]])test(`authentic ${id} keeps all trustworthy statistics`,()=>{
 const p=provenance.find(p=>p.matchId===`de-dfb-${id}`)
 assert.equal(createHash('sha256').update(html(id)).digest('hex'),p.sha256)
 const z=parse(id)
 assert.equal(z.goli.length,goals);assert.equal(z.menjave.length,subs);assert.equal(z.rumeni.length,yellows);assert.equal(z.rdeci.length,reds)
 assert.equal(z.nepripisaniRumeni?.length??0,unknown)
 assert.deepEqual([z.domaci,z.gostje].map(t=>[t.postava.length,t.postava.filter(p=>p.vratar).length]),[[11,1],[11,1]])
 const a=nastopi(z)
 if(id==='2402201')assert.ok(!a.some(p=>p.ime==='Florian Mayer'))
 else assert.ok(a.filter(p=>p.ime==='Matthias Ostrzolek').every(p=>p.rumeni===0))
 if(unknown){const e=z.nepripisaniRumeni[0];assert.equal(e.profileId,id==='2402201'?'352879':'112345');assert.equal(e.clock,id==='2402201'?"90+4'":"29'");assert.equal(e.reason,id==='2402201'?'unknown-role':'player-coach');assert.equal(z.opozorila.filter(x=>x.startsWith('SLFF_UNATTRIBUTED_YELLOW_V1:')).length,1)}
})
// Mutate only the rows containing the specified public recipient in both independently checked sections.
function cardKind(body,profile,kind){return body.replace(/<div class="m-MatchDetails-history-item"[\s\S]*?(?=<div class="m-MatchDetails-history-item"|<\/article>)/g,row=>row.includes(`/profil/${profile}?`)?row.replace('icon-card--yellow',`icon-card--${kind}`):row)}
test('unproven and ambiguous dismissal capacity stays blocking',()=>{
 for(const [id,p] of [['2402201','352879'],['2401588','112345']])for(const kind of ['red','yellow-red'])assert.throws(()=>parse(id,cardKind(html(id),p,kind)))
})
test('same-name player-coach requires explicit equal roster and coach profile IDs',()=>{
 const b=html('2401588'),needle='/profil/112345?';const indices=[...b.matchAll(/\/profil\/112345\?/g)].map(m=>m.index)
 for(const replacement of ['/profil/999999?','/other/112345?']){const i=indices[2];assert.throws(()=>parse('2401588',b.slice(0,i)+replacement+b.slice(i+needle.length)),/vloga|identitet/)}
})
test('yellow exception preserves malformed structure, timing, section identity, goals and keeper gates',()=>{
 const b=html('2402201')
 for(const changed of [b.replace("90+4'","90+3'"),b.replaceAll("90+4'","91+4'"),b.replace(' (T)',''),b.replace('            2:2','            9:2'),b.slice(0,-30)])assert.throws(()=>parse('2402201',changed))
})
test('warning codec validates bounded event evidence and rejects forged or malformed warnings',async()=>{
 const codec=await import('../src/lib/nepripisaniRumeni.mjs').catch(()=>({}))
 assert.equal(typeof codec.encodeUnattributedYellow,'function','shared warning encoder is implemented')
 const e=parse('2402201').nepripisaniRumeni[0],warning=codec.encodeUnattributedYellow(e)
 assert.deepEqual(codec.parseUnattributedYellow(warning),e)
 for(const patch of [{side:2},{minute:91},{reason:'red'},{profileId:'<html>'},{eventSha256:'x'},{ordinal:-1},{sourceUrl:'https://evil.example/'},{clock:"90+40'"},{rawHtml:'secret'}, {matchId:'de-dfb-9999999'}]){
  const invalid={...e,...patch};assert.equal(codec.parseUnattributedYellow('SLFF_UNATTRIBUTED_YELLOW_V1:'+JSON.stringify(invalid)),null);assert.throws(()=>codec.encodeUnattributedYellow(invalid))
 }
 for(const invalid of [null,{},'SLFF_UNATTRIBUTED_YELLOW_V1:{','SLFF_UNATTRIBUTED_YELLOW_V1:'+ ' '.repeat(2049)])assert.equal(codec.parseUnattributedYellow(invalid),null)
 assert.deepEqual(codec.unattributedYellowEvents([warning,warning,'other']),[e])
})
test('opposite-side and conflicting profile identities cannot become unassigned yellows',()=>{
 const b=html('2402201')
 assert.throws(()=>parse('2402201',b.replaceAll('Florian Mayer','Silas Ostrzinski').replaceAll('/profil/352879?','/profil/392394?')),/identitet/)
 assert.throws(()=>parse('2401588',html('2401588').replace('/profil/112345?','/profil/999999?')),/identitet/)
})
test('a yellow section must retain the same public profile as the timeline',()=>{
 assert.throws(()=>parse('2402201',html('2402201').replace('/profil/352879?','/profil/999999?')),/dogod|identitet/)
})
test('two named ordinary yellows without dismissal remain a contradiction',()=>{
 const b=html('2402201').replaceAll('Florian Mayer','Paul Polauke').replaceAll('/profil/352879?','/profil/386163?')
 assert.throws(()=>parse('2402201',b),/podvojen rumeni/)
})

// The actual traversal must use fresh HTML for an exact historical repair and
// honor a previously imported old skip before parsing an unrelated bad report.
import vir from './viri/dfb.mjs'
function westPages() {
  const clubs=['rot-weiss-oberhausen',...Array.from({length:17},(_,i)=>`club-${i+1}`)]
  const circle=[...clubs],matches=[]
  for(let r=0;r<17;r++){
    for(let i=0;i<9;i++){
      const pair=[circle[i],circle[17-i]]
      matches.push({round:r+1,home:pair[0],away:pair[1]})
      matches.push({round:r+18,home:pair[1],away:pair[0]})
    }
    circle.splice(1,0,circle.pop())
  }
  const pages=new Map()
  for(const club of clubs){
    const rows=matches.flatMap((m,i)=>{
      if(m.home!==club&&m.away!==club)return []
      const id=String(9000000+i),url=`https://datencenter.dfb.de/datencenter/regionalliga-west/2025-2026/${m.round}-spieltag/${m.home}-${m.away}-${id}`
      const cell=(side,slug)=>`<div class="c-MatchTable-team c-MatchTable-team--${side}"><a href="https://datencenter.dfb.de/competitions/regionalliga-west/seasons/2025-2026/teams/${slug}">${slug}</a></div>`
      return [`<div class="c-MatchTable-row"><div id="match_${id}"><div class="c-MatchTable-description">Samstag, 01.08.2025 14:00 Uhr</div></div>${cell('home',m.home)}<div class="c-MatchTable-score"><a href="${url}">- : -</a></div>${cell('away',m.away)}</div>`]
    })
    const url=`https://datencenter.dfb.de/competitions/regionalliga-west/seasons/2025-2026/teams/${club}`
    pages.set(url,`<!doctype html><html><head><link rel="canonical" href="${url}"></head><body><div class="c-MatchTable">${rows.join('').replace(/900000([01])">- : -<\/a>/g,'900000$1">0 : 0</a>')}</div></body></html>`)
  }
  return pages
}

test('targeted historical repair requests fresh HTML for exactly the selected report',async()=>{
 const pages=westPages(),calls=[]
 assert.ok(pages.size>0)
 await assert.rejects(()=>vir.zapisniki('regionalliga-west/2025-2026',async(url,file,fresh)=>{if(pages.has(url))return pages.get(url);calls.push({url,file,fresh});throw Error('boundary reached')},{samoZapisnik:'de-dfb-9000001'}),/boundary reached/)
 assert.equal(calls.length,1);assert.equal(calls[0].file,'match-9000001.html');assert.equal(calls[0].fresh,true)
})
test('old nightly reports are skipped before fetching while a warned configured-window report is fresh',async()=>{
 const pages=westPages(),calls=[]
 await assert.rejects(()=>vir.zapisniki('regionalliga-west/2025-2026',async(url,file,fresh)=>{if(pages.has(url))return pages.get(url);calls.push({file,fresh});throw Error('boundary reached')},{preskoci:new Set(['de-dfb-9000000']),sveziZapisniki:new Set(['de-dfb-9000001'])}),/boundary reached/)
 assert.deepEqual(calls,[{file:'match-9000001.html',fresh:true}])
 const skipped=await vir.zapisniki('regionalliga-west/2025-2026',async(url)=>{assert.ok(pages.has(url),'old imported reports must not be fetched');return pages.get(url)},{preskoci:new Set(['de-dfb-9000000','de-dfb-9000001'])})
 assert.deepEqual(skipped,[])
})
import {runInNewContext} from 'node:vm'
import {unattributedYellowEvents} from '../src/lib/nepripisaniRumeni.mjs'
// Execute the real importer traversal block, replacing only its database and
// source boundary. A late query/filter would expose stale HTML to the parser.
for(const [days,expectedCutoff] of [['21','2026-09-26'],[null,'2026-10-10']])test(`importer bounds recent warning refreshes to ${days??'default 7'} days before source traversal`,async()=>{
 const source=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
 const body=source.slice(source.indexOf('// --- seznam zapisnikov'),source.indexOf('// --- nespremenjeni zapisniki'))
 const warning=parse('2402201').opozorila.find(w=>w.startsWith('SLFF_')),options=[];let cutoff
 const FixedDate=class extends Date{static now(){return Date.parse('2026-10-17T12:00:00Z')}}
 const db={from(table){assert.equal(table,'matches');let old=false;const q={select(){return q},eq(k,v){assert.equal(k,'rounds.competition_id');assert.equal(v,99);return q},lt(){old=true;return q},gte(key,value){assert.equal(key,'rounds.played_on');cutoff=value;return q},not(){return q},order(){return q},range(){return q},then(resolve){resolve({data:old?[{zapisnik_id:'de-dfb-old'}]:[{zapisnik_id:'de-dfb-2402201',import_warnings:[warning]},{zapisnik_id:'de-dfb-complete',import_warnings:[]}]})}};return q}}
 const args={sveze:days}
 await runInNewContext(`(async()=>{${body}})()`,{db,tekmovanje:{id:99},vir:{ime:'dfb',async zapisniki(liga,read,o){options.push(o);return []}},liga:'regionalliga-west/2025-2026',prenesi(){},arg:k=>args[k]??null,omeji:null,console:{log(){}},Date:FixedDate,Set,unattributedYellowEvents,vseVrstice:async build=>(await build(0,999)).data})
 assert.ok(options[0]?.sveziZapisniki.has('de-dfb-2402201'))
 assert.ok(!options[0].sveziZapisniki.has('de-dfb-complete'))
 assert.equal(options[0].preskoci.has('de-dfb-old'),days!==null)
 assert.equal(cutoff,expectedCutoff)
})
import {readdirSync} from 'node:fs'
import {zaprtje} from './odtis-kode.mjs'
import {dodajStrelceSKlopi} from './zapisnik.mjs'
test('actual importer persists warnings, replaces a corrected deduction once, and skips unchanged repairs',async()=>{
 const source=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
 const body=source.slice(source.indexOf('// --- seznam zapisnikov'),source.indexOf('// --- preračun točk po krogih'))
 let fingerprint='{}',row=null,appearances=[],replacements=0,z=parse('2402201')
 const db={from(table){let operation='read',values,old=false;const q={
  select(){return q},eq(){return q},not(){return q},in(){return q},order(){return q},range(){return q},lt(){old=true;return q},gte(){return q},
  upsert(v){operation='upsert';values=v;return q},update(v){operation='update';values=v;return q},single(){return q},
  then(resolve){if(table==='matches'&&operation!=='read'){row={...row,...values,id:7};resolve({data:{id:7},error:null})}else if(table==='matches')resolve({data:old?[]:row?[row]:[],error:null});else if(table==='goals')resolve({data:[],error:null});else throw Error(`unexpected table ${table}`)}
 };return q},async rpc(name,p){assert.equal(name,'zamenjaj_nastope_tekme');assert.equal(p.p_match_id,7);appearances=structuredClone(p.p_nastopi);replacements++;return {error:null}}}
 const ids=new Map(),idFor=key=>{if(!ids.has(key))ids.set(key,ids.size+1);return ids.get(key)}
 const run=async()=>runInNewContext(`(async()=>{${body};if(napak)throw Error('import failed')})()`,{
  db,tekmovanje:{id:99,slug:'test',source:'dfb'},vir:{ime:'dfb',nastopi,async zapisniki(){return [{id:z.zapisnikId,url:z.url,z:structuredClone(z)}]}},liga:'regionalliga-west/2025-2026',prenesi(){},arg:k=>k==='zapisnik'?'de-dfb-2402201':null,omeji:null,tekocaSezona:false,virIme:null,unattributedYellowEvents,
  console:{log(){},warn(){},error(...args){throw Error(args.join(' '))}},process:{stdout:{write(){}}},Date,Set,Map,createHash,readdirSync,zaprtje,dodajStrelceSKlopi,MAPA:'memory',
  readFileSync:(path,...args)=>String(path)==='memory/odtisi-test.json'?fingerprint:readFileSync(path,...args),writeFileSync:(path,data)=>{assert.equal(path,'memory/odtisi-test.json');fingerprint=data},
  vseVrstice:async build=>(await build(0,999)).data,klubId:async name=>idFor(name),krogId:async()=>5,igralecId:async(team,name)=>idFor(`${team}|${name}`),
 })
 await run();assert.equal(replacements,1);assert.equal(unattributedYellowEvents(row.import_warnings).length,1);assert.equal(appearances.reduce((n,a)=>n+a.yellow_cards,0),6)
 await run();assert.equal(replacements,1,'unchanged warning report must not write again')
 z=parse('2402201',html('2402201').replaceAll('Florian Mayer','Justin Ospelt').replaceAll('/profil/352879?','/profil/357377?'))
 await run();assert.equal(replacements,2);assert.equal(unattributedYellowEvents(row.import_warnings).length,0);assert.equal(appearances.reduce((n,a)=>n+a.yellow_cards,0),7)
 await run();assert.equal(replacements,2,'second corrected pass must not duplicate a penalty');assert.equal(appearances.reduce((n,a)=>n+a.yellow_cards,0),7)
})
test('an unknown name carrying an existing roster profile is a contradiction, not a missing role',()=>{
 assert.throws(()=>parse('2402201',html('2402201').replaceAll('/profil/352879?','/profil/357377?')),/identitet/)
})
test('same profile in a non-coaching official role does not prove player-coach capacity',()=>{
 const b=html('2401588').replace('Trainer/in','Physiotherapeut/in')
 assert.throws(()=>parse('2401588',b),/vloga/)
})
test('a repeated coach entry can omit its optional profile without contradicting the explicit entry',()=>{
 const b=html('2401588').replace('Matthias Ostrzolek</a> <br>','Matthias Ostrzolek</a> <br> Matthias Ostrzolek <br>')
 assert.notEqual(b,html('2401588'));assert.equal(parse('2401588',b).nepripisaniRumeni.length,1)
})
test('same-name opponents with different profiles retain their proven side and known yellow',()=>{
 const b=html('2402201').replaceAll('Florian Mayer','Justin Ospelt').replaceAll('/profil/352879?','/profil/357377?').replaceAll('Silas Ostrzinski','Justin Ospelt')
 const z=parse('2402201',b)
 assert.equal(z.nepripisaniRumeni,undefined);assert.equal(z.rumeni.length,7)
 assert.ok(z.rumeni.some(e=>e.ime==='Justin Ospelt'&&e.ekipaIdx===1))
})

import ncel from './viri/ncefl.mjs'
test('importer preserves the NCEL numeric clock default and fresh reads for a recent match',async t=>{
 // A third-argument DFB options object must not replace NCEL's numeric clock.
 // Use the actual importer and actual NCEL traversal; replace only source HTTP.
 t.mock.method(Date,'now',()=>Date.parse('2026-07-26T12:00:00Z'))
 const source=readFileSync(new URL('./uvoz-zapisnikov.mjs',import.meta.url),'utf8')
 const body=source.slice(source.indexOf('// --- seznam zapisnikov'),source.indexOf('// --- nespremenjeni zapisniki'))
 const league=readFileSync(new URL('./vzorci/gb-ncefl-liga-nceldivisionone-2026.html',import.meta.url),'utf8'),reads=[]
 const prenesi=async(url,file,fresh)=>{
  if(url==='https://www.ncefl.org.uk/matches/nceldivisionone/2026/')return league
  assert.equal(url,'https://www.ncefl.org.uk/matches/day/2026/20260725/57218/')
  reads.push(fresh);throw Error('observed report freshness; stop before report parse')
 }
 await assert.rejects(()=>runInNewContext(`(async()=>{${body}})()`,{
  vir:ncel,liga:'nceldivisionone/2026',prenesi,arg:()=>null,omeji:null,console:{log(){}},Date,Set,
 }),/observed report freshness/)
 assert.deepEqual(reads,[true],'recent NCEL report must bypass the stale cache')
})
