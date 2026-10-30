import {freezeRefresh800PreReserveTestEpoch} from './fcf-refresh800-reserve-zero-test-fixture.mjs'
// TEST ONLY: constructed source pages and a separately isolated synthetic
// accounting seed. No real source/history authority or private originals.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {fcfRefresh800RuntimeFiles} from './fcf-refresh800-runtime.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {sixTestSchedule} from './fcf-six-test-fixture.mjs'
import {syntheticFcfRaw} from './fcf-release-test-fixture.mjs'
import {getFcfSixPolicy} from './fcf-six-historical-policy.mjs'
const e=(type,children,props={})=>['$',type,null,{...props,children}],slug='es-ct-tercera-g9'
function unavailable(id,round,home,away,date='2026-10-04',score='- - -',group=null){const headers=[e('section',e('div',[e('a',home.name,{href:home.href}),e('div',[e('span','Acta Tancada'),e('span',score)]),e('a',away.name,{href:away.href})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/','TERCERA CATALANA','/','GRUP 9','/',`Jornada ${round}`].map(x=>e('span',x))),e('span',['Temporada',': ','2026 / 27']),e('span',['Data',': ',date.split('-').reverse().join('.')]),e('span',['Hora',': ','17.00 H'])];if(group)headers.push(e('div','',{player:{id:'1'},codgrupo:group}));return `<!doctype html><title>Acta: SYNTHETIC native800 | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify({c:['','ca','competicio','acta',id],headers})+'\n')}])</script>`}
export function nativeG9Documents(variant='good'){
 const known=getFcfSixPolicy(slug).entries.map(f=>({...f,homeName:'SYNTHETIC '+f.homeSourceClubId,awayName:'SYNTHETIC '+f.awaySourceClubId})),club=(id,category,name)=>({sourceClubId:id,sourceCategoryId:category,name,href:`/ca/clubs/${id}/categories/${category}`}),headers=known.map(f=>({id:f.sourceMatchId,round:f.sourceRound,home:club(f.homeSourceClubId,f.homeSourceCategoryId,f.homeName),away:club(f.awaySourceClubId,f.awaySourceCategoryId,f.awayName)})),s=sixTestSchedule(headers),documents=[]
 for(const [r,pairs]of s.rounds.entries()){const slots=Array(8),rest=[];for(const f of pairs)if(f.id)slots[(Number(f.id)-4118349)%8]=f;else rest.push(f);for(let i=0;i<8;i++){const f=slots[i]??rest.shift(),id=String(4118349+r*8+i),home=s.clubs[variant==='pair'&&id==='4118588'?s.rounds[0][0].pair[0]:f.pair[0]],away=s.clubs[variant==='pair'&&id==='4118588'?s.rounds[0][0].pair[1]:f.pair[1]],policy=known.find(x=>x.sourceMatchId===id);let html
  if(policy)html=unavailable(id,r+1,home,away,policy.playedOn,`${policy.observedHomeScore} - ${policy.observedAwayScore}`,'58161880')
  else{let played=r===2;if(variant==='gk'&&(f.pair.includes(0)))played=false;html=syntheticFcfRaw({id,slug,round:variant==='calendar'&&id==='4118397'?r+2:r+1,home,away,played,nativePlayers:true});if(variant==='unapproved'&&['4118373'].includes(id))html=unavailable(id,r+1,home,away,'2026-09-20')}
  if(variant==='bom'&&id==='4118352')html='\ufeff'+html
  if(variant==='policy'&&id==='4118352')html=html.replaceAll('3 - 0','0 - 0')
  if(variant==='wrongscope'&&id==='4118373')html=html.replaceAll('GRUP 9','GRUP 8')
  if(variant==='missingheader'&&id==='4118373')html=html.replaceAll('Acta del partit','unknown header')
  documents.push({id,html})
 }}return variant==='missing'?documents.slice(0,-1):documents
}
export function isolatedNativeG9Tree(t){const root=mkdtempSync(join(tmpdir(),'g9-native800-SYNTHETIC-')),paths=new Set([...fcfRefresh800RuntimeFiles().map(x=>x.path),...zaprtje('scripts/fcf-g9-native800-source.mjs'),...zaprtje('scripts/fcf-refresh800-test-fixture.mjs'),'scripts/fcf-g9-native800-fixture-runner.mjs']);t.after(()=>rmSync(root,{recursive:true,force:true}));for(const path of paths){const dest=join(root,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,readFileSync(path))}
 // Explicit frozen pre409925 ledger epoch plus synthetic historical accounting.
 // Production CURRENT ledger always requires409925; no production bypass.
 // ZIP/claim/private WeakMap/getCaptured/source bytes remain unchanged.
 freezeRefresh800PreReserveTestEpoch(root)
 writeFileSync(join(root,'scripts/fcf-g9-calendar-probe.mjs'),`const states=new WeakMap();export async function readFcfG9CalendarCounter(){const p=Object.freeze({kind:'TEST ONLY synthetic accounting'});states.set(p,{actualSourceGETs:301,maximumCumulativeSourceGETs:478,probeAttempts:1,lastSourceEndedUTC:'2026-10-28T18:09:27.203Z',continuationAllowed:true,history:[],preProviderZeroWitness:{newSourceGETs:0,spentDiscoveryAttempts:1}});return p}export function getFcfG9CalendarCounter(p){if(!states.has(p))throw Error('test accounting brand');return structuredClone(states.get(p))}export async function readFcfG9CalendarProbe(){throw Error('no synthetic probe supported')}\n`)
 return root
}
