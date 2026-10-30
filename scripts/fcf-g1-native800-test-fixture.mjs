import {freezeRefresh800PreReserveTestEpoch} from './fcf-refresh800-reserve-zero-test-fixture.mjs'
// TEST ONLY: constructed source pages and a separately isolated synthetic
// accounting seed. No real source/history authority or private originals.
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {fcfRefresh800RuntimeFiles} from './fcf-refresh800-runtime.mjs'
import {fcfG1Native800RuntimeFiles} from './fcf-g1-native800-operator.mjs'
import {zaprtje} from './odtis-kode.mjs'
import {sixTestSchedule} from './fcf-six-test-fixture.mjs'
import {syntheticFcfRaw} from './fcf-release-test-fixture.mjs'
import {getFcfSixPolicy} from './fcf-six-historical-policy.mjs'
import {getFcfG1SupplementalPolicy} from './fcf-g1-4109409-policy.mjs'
import {getFcfG1Approved4109410Policy} from './fcf-g1-4109410-policy.mjs'
const e=(type,children,props={})=>['$',type,null,{...props,children}],slug='es-ct-segona-g1'
function unavailable(id,round,home,away,date='2026-10-04',score='- - -',group=null){const headers=[e('section',e('div',[e('a',home.name,{href:home.href}),e('div',[e('span','Acta Tancada'),e('span',score)]),e('a',away.name,{href:away.href})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/','SEGONA CATALANA','/','GRUP 1','/',`Jornada ${round}`].map(x=>e('span',x))),e('span',['Temporada',': ','2026 / 27']),e('span',['Data',': ',date.split('-').reverse().join('.')]),e('span',['Hora',': ','17.00 H'])];if(group)headers.push(e('div','',{player:{id:'1'},codgrupo:group}));return `<!doctype html><title>Acta: SYNTHETIC native800 | FCF</title><script>self.__next_f.push([1,${JSON.stringify('0:'+JSON.stringify({c:['','ca','competicio','acta',id],headers})+'\n')}])</script>`}
export function native800Documents(variant='good'){
 const known=[...getFcfSixPolicy(slug).entries.map(f=>({...f,homeName:'SYNTHETIC '+f.homeSourceClubId,awayName:'SYNTHETIC '+f.awaySourceClubId})),...[getFcfG1SupplementalPolicy(),getFcfG1Approved4109410Policy()].map(p=>({...p.fixture,homeName:p.homeName,awayName:p.awayName}))],club=(id,category,name)=>({sourceClubId:id,sourceCategoryId:category,name,href:`/ca/clubs/${id}/categories/${category}`}),headers=known.map(f=>({id:f.sourceMatchId,round:f.sourceRound,home:club(f.homeSourceClubId,f.homeSourceCategoryId,f.homeName),away:club(f.awaySourceClubId,f.awaySourceCategoryId,f.awayName)})),s=sixTestSchedule(headers),documents=[]
 for(const [r,pairs]of s.rounds.entries()){const slots=Array(8),rest=[];for(const f of pairs)if(f.id)slots[(Number(f.id)-4109388)%8]=f;else rest.push(f);for(let i=0;i<8;i++){const f=slots[i]??rest.shift(),id=String(4109388+r*8+i),home=s.clubs[f.pair[0]],away=s.clubs[f.pair[1]],policy=known.find(x=>x.sourceMatchId===id);let html
  if(policy)html=unavailable(id,r+1,home,away,policy.playedOn,id==='4109388'?'0 - 3':'- - -',id==='4109388'?'58161863':null)
  else{let played=r===1||['4109420','4109425'].includes(id);if(variant==='gk'&&(f.pair.includes(0)))played=false;html=syntheticFcfRaw({id,slug,round:variant==='calendar'&&id==='4109436'?r+2:r+1,home,away,played,nativePlayers:true});if(variant==='unapproved'&&['4109420','4109425'].includes(id))html=unavailable(id,r+1,home,away,'2026-09-20')}
  if(variant==='bom'&&id==='4109410')html='\ufeff'+html
  if(variant==='policy'&&id==='4109410')html=html.replaceAll('- - -','0 - 0')
  documents.push({id,html})
 }}return documents
}
export function isolatedNative800Tree(t){const root=mkdtempSync(join(tmpdir(),'g1-native800-SYNTHETIC-')),paths=new Set([...fcfRefresh800RuntimeFiles().map(x=>x.path),...fcfG1Native800RuntimeFiles().map(x=>x.path),...zaprtje('scripts/fcf-g1-native800-source.mjs'),...zaprtje('scripts/fcf-g1-native800-chain-test-fixture.mjs'),...zaprtje('scripts/fcf-refresh800-test-fixture.mjs'),'scripts/fcf-g1-native800-fixture-runner.mjs']);t.after(()=>rmSync(root,{recursive:true,force:true}));for(const path of paths){const dest=join(root,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,readFileSync(path))}
 // Explicit frozen pre409925 ledger epoch plus synthetic historical accounting.
 // Production CURRENT ledger always requires409925; no production bypass.
 // ZIP/claim/private WeakMap/getCaptured/source bytes remain unchanged.
 freezeRefresh800PreReserveTestEpoch(root)
 writeFileSync(join(root,'scripts/fcf-g9-calendar-probe.mjs'),`const states=new WeakMap();export async function readFcfG9CalendarCounter(){const p=Object.freeze({kind:'TEST ONLY synthetic accounting'});states.set(p,{actualSourceGETs:301,maximumCumulativeSourceGETs:478,probeAttempts:1,lastSourceEndedUTC:'2026-10-28T18:09:27.203Z',continuationAllowed:true,history:[],preProviderZeroWitness:{newSourceGETs:0,spentDiscoveryAttempts:1}});return p}export function getFcfG9CalendarCounter(p){if(!states.has(p))throw Error('test accounting brand');return structuredClone(states.get(p))}export async function readFcfG9CalendarProbe(){throw Error('no synthetic probe supported')}\n`)
 return root
}
