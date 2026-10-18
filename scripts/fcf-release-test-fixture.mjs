// Synthetic calendar controls plus optional exact private reviewed marker bytes.
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {tokRsc,vrsticeRsc,glavaStrani} from './viri/fcf.mjs'
import {getHistoricalStatisticsPolicy} from './lib/historical-statistics-policy.mjs'
export const now=Date.parse('2026-10-18T14:00:00Z')
export const digest=x=>createHash('sha256').update(x).digest('hex')
const scopes=[['es-ct-segona-g1',783,4109388],['es-ct-tercera-g2',790,4116188],['es-ct-tercera-g9',797,4118349]]
const base=readFileSync(new URL('./vzorci/es-fcf-acta-primera-3791085.html',import.meta.url),'utf8')
const original={
 '4109388':['request-3-acta-4109388.html','2026-10-18T12:31:53.340Z','2026-10-18T12:31:53.882Z'],
 '4116215':['request-2-acta-4116215.html','2026-10-18T12:31:49.885Z','2026-10-18T12:31:50.338Z'],
 '4118352':['request-6-acta-4118352.html','2026-10-18T12:32:03.718Z','2026-10-18T12:32:04.175Z'],
 '4118358':['request-7-acta-4118358.html','2026-10-18T12:32:07.176Z','2026-10-18T12:32:07.646Z'],
}
const walk=(x,f)=>f(Array.isArray(x)?x.map(v=>walk(v,f)):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v,f)])):x)
const e=(type,children,props={})=>['$',type,null,{...props,children}]
function rounds(){
 const wheel=Array.from({length:16},(_,i)=>i),out=[]
 for(let r=0;r<15;r++){
  out.push(Array.from({length:8},(_,i)=>r%2?[wheel[15-i],wheel[i]]:[wheel[i],wheel[15-i]]))
  wheel.splice(1,0,wheel.pop())
 }
 return [...out,...out.map(xs=>xs.map(([a,b])=>[b,a]))]
}
function raw({id,slug,round,home,away,played,nativePlayers=false}){
 const day=round<=5?'20.09.2026':round===6?'24.10.2026':'01.05.2027'
 const headers=[e('section',e('div',[e('a',home.name,{href:home.href}),e('div',[e('span',played?'Acta Tancada':'Pendent'),e('span',played?'1 - 2':'- - -')]),e('a',away.name,{href:away.href})]),{title:'Acta del partit'}),e('div',['COMPETICIÓ','/',slug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA','/',`GRUP ${slug.split('-g')[1]}`,'/',`Jornada ${round}`].map(x=>e('span',x))),e('span',['Temporada',': ','2026 / 27']),e('span',['Data',': ',day]),e('span',['Hora',': ','16.00 H'])]
 let roots
 if(played){
  roots=walk([...vrsticeRsc(tokRsc(base))],x=>typeof x==='string'?x==='PRIMERA CATALANA'?(slug.includes('segona')?'SEGONA CATALANA':'TERCERA CATALANA'):x==='GRUP 1'?`GRUP ${slug.split('-g')[1]}`:x==='2025 / 26'?'2026 / 27':x==='2025/26'?'2026/27':x==='30'?String(round):x==='Jornada 30'?`Jornada ${round}`:/^\d{2}\.\d{2}\.2026$/.test(x)?day:x==='BANYOLES, C.E.'?home.name:x==='TORROELLA, U.E.'?away.name:x:x)
  roots=walk(roots,x=>Array.isArray(x)&&x[0]==='$'&&x[3]?.title==='Acta del partit'?headers[0]:x)
  roots.find(([key])=>key==='0')[1].c=['','ca','competicio','acta',id]
  if(nativePlayers)roots=walk(roots,x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.hasOwn(x,'nombre')&&/^\d+$/.test(String(x.id??''))?{...x,id:String(Number(x.id)+(Number(id)%1000+1)*1000000000)}:x)
 }else roots=[['0',{c:['','ca','competicio','acta',id],headers}]]
 return `<!doctype html><title>Acta: SYNTHETIC packet control | FCF</title><script>self.__next_f.push([1,${JSON.stringify(roots.map(([k,v])=>k+':'+JSON.stringify(v)).join('\n')+'\n')}])</script>`
}
export function packetFixture(retained=process.env.FCF_HISTORICAL_RETAINED_DIR,{nativePlayers=false}={}){
 const groups=scopes.map(([slug,id,start])=>{
  const policy=getHistoricalStatisticsPolicy(slug),schedule=rounds(),labels=new Map(),occupied=new Set(),assigned=new Map()
  for(const entry of policy.entries){
   const pair=schedule[entry.sourceRound-1].find(xs=>xs.every(x=>!occupied.has(x)))
   const official=retained?glavaStrani(readFileSync(join(retained,original[entry.sourceMatchId][0]),'utf8')):null
   pair.forEach((x,side)=>{
    occupied.add(x);const club=side?entry.awaySourceClubId:entry.homeSourceClubId,category=side?entry.awaySourceCategoryId:entry.homeSourceCategoryId
    labels.set(x,{name:official?(side?official.gostje:official.domaci):`SYNTHETIC CLUB ${x}`,href:`/ca/clubs/${club}/categories/${category}`})
   })
   assigned.set(entry.sourceMatchId,{round:entry.sourceRound,pair})
  }
  for(let i=0;i<16;i++)if(!labels.has(i))labels.set(i,{name:`SYNTHETIC CLUB ${i}`,href:`/ca/clubs/${900000+i}/categories/${800000+i}`})
  const remaining=schedule.flatMap((xs,r)=>xs.map(pair=>({round:r+1,pair}))).filter(x=>![...assigned.values()].some(a=>a.round===x.round&&JSON.stringify(a.pair)===JSON.stringify(x.pair)))
  const documents=Array.from({length:240},(_,i)=>{
   const sourceId=String(start+i),entry=policy.entries.find(e=>e.sourceMatchId===sourceId),fixture=assigned.get(sourceId)??remaining.shift()
   let html,receipt,lineage
   if(entry&&retained){
    const [file,startedUTC,capturedUTC]=original[sourceId];html=readFileSync(join(retained,file),'utf8')
    receipt={id:sourceId,competitionSlug:slug,sourceUrl:entry.sourceUrl,bytes:Buffer.byteLength(html),rawSha256:digest(html),startedUTC,capturedUTC,cacheMtimeUTC:null}
    lineage={kind:'reviewed-original',sourceCommit:'f7efba26c31f76372b5aab1e976061631fbaebda'}
   }else{
    html=raw({id:sourceId,slug,round:fixture.round,home:labels.get(fixture.pair[0]),away:labels.get(fixture.pair[1]),played:fixture.round===3,nativePlayers})
    receipt={id:sourceId,competitionSlug:slug,sourceUrl:`https://www.fcf.cat/ca/competicio/acta/${sourceId}`,bytes:Buffer.byteLength(html),rawSha256:digest(html),startedUTC:fixture.round<=6&&fixture.round!==3?'2026-10-18T13:00:00Z':null,capturedUTC:fixture.round<=6&&fixture.round!==3?'2026-10-18T13:00:01Z':null,cacheMtimeUTC:fixture.round<=6&&fixture.round!==3?null:'2026-10-18T13:00:00Z'}
    lineage={kind:'actions-artifact',verified:true,repository:'Lovro-splichal-orhanizagi/mnzgorenjska',workflow:'.github/workflows/uvoz-fcf-zgodovina.yml',runId:'123',artifactId:'456',artifactDigest:'sha256:'+'b'.repeat(64),commit:'a'.repeat(40)}
   }
   return{id:sourceId,expectedSourceRound:fixture.round,html,receipt,lineage}
  })
  return{competition:{id,slug,source:'fcf',source_policy:'es-fcf-reviewed-history-v1',source_league_code:`${start}-${start+239}`,active:false,sezona_koledarska:false,firstFantasyPlayedOn:'2026-10-24'},documents}
 })
 const beforeImageText='{"matches": [], "points": 8.10}'
 const databaseInventory={capturedUTC:'2026-10-18T13:55:00Z',method:'explicitBEGIN_READ_ONLY_ROLLBACK',groups:groups.map(g=>({id:g.competition.id,slug:g.competition.slug,active:false,source:'fcf',sourceLeagueCode:g.competition.source_league_code,sezona_koledarska:false,source_policy:null,nativeImportedIDs:g.documents.filter(d=>d.expectedSourceRound===3||Object.hasOwn(original,d.id)).map(d=>d.id)}))}
 return{sourceCommit:'a'.repeat(40),now,beforeImageText,beforeSha256:digest(beforeImageText),databaseInventory,groups}
}

export function calendarFixture(){
 return rounds().flatMap((rows,r)=>rows.map(pair=>({round:r+1,clubs:pair.map(i=>({sourceClubId:String(i+1),sourceCategoryId:String(100+i),name:`SYNTHETIC CLUB ${i}`})),statisticsStatus:r===2?'available':'pending',appearances:r===2?[{ekipaIdx:0,zacetnik:true,vratar:true},{ekipaIdx:1,zacetnik:true,vratar:true}]:null})))
}
