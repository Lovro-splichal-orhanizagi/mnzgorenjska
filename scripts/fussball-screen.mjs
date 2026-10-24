// A bounded report sample. This is never a complete season or an import/release manifest.
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createFussballCaptureClient,fussballRoundScope} from './lib/fussball-capture.mjs'
import {createFussballParserSession,validateFussballFixture} from './fussball-season.mjs'
import {fussballLiveTags} from './viri/fussball-statistika.mjs'
import {zaprtje} from './odtis-kode.mjs'
const proof=(ok,reason)=>{if(!ok)throw Object.assign(Error(`fussball screen: ${reason}`),{code:'FUSSBALL_SCREEN_INVALID'})}
const text=bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes)
const json=x=>JSON.stringify(x)+'\n'
const hash=x=>createHash('sha256').update(x).digest('hex')
const validDate=d=>typeof d==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d
function config(options){
 const scope=fussballRoundScope(options?.seedUrl),season=options?.season?.match(/^(20\d{2})\/(\d{2})$/)
 proof(scope&&scope.staffel===options.staffel,'invalid seed/staffel scope')
 proof(season&&(+season[1]+1)%100===+season[2],'invalid season')
 proof(Number.isInteger(options.maxRequests)&&options.maxRequests>=1&&options.maxRequests<=80,'explicit request budget must be 1–80')
 proof(Number.isInteger(options.reportLimit)&&options.reportLimit>=1&&options.reportLimit<=3,'report limit must be 1–3')
 proof(validDate(options.asOfDate),'invalid pinned calendar date')
 return {seedUrl:options.seedUrl,staffel:options.staffel,season:options.season,maxRequests:options.maxRequests,reportLimit:options.reportLimit,asOfDate:options.asOfDate}
}
function inForeignContext(html,tags,tag){
 return tags.some(t=>['svg','math'].includes(t.tag)&&t.start<tag.start&&html.indexOf(`</${t.tag}>`,t.end)>tag.start)
}
function liveSelector(html,tags,name){
 const selects=tags.filter(t=>t.tag==='select'&&t.attrs.name===name)
 proof(selects.length===1,`missing unique live ${name} selector`)
 const start=selects[0],end=html.indexOf('</select>',start.end)
 proof(!inForeignContext(html,tags,start),'foreign selector context')
 proof(end>=start.end,'truncated live selector')
 const options=tags.filter(t=>t.tag==='option'&&t.start>start.end&&t.end<=end)
 proof(options.length>0&&(html.slice(start.end,end).match(/<option\b/g)??[]).length===options.length,'hidden selector options')
 return options.map(t=>({...t,label:html.slice(t.end,html.indexOf('</option>',t.end)).trim()}))
}
function validateRound(html,{info,parsed},url,options){
 const tags=fussballLiveTags(html),scope=fussballRoundScope(url),canonical=fussballRoundScope(info.url)
 proof(scope?.staffel===options.staffel&&canonical?.staffel===options.staffel,'wrong round identity')
 proof(parsed.sezona===options.season,'round season differs')
 proof(Number.isInteger(parsed.krog)&&parsed.krogi.length>0&&parsed.krogi.length<=80,'invalid round selector')
 const liveRounds=liveSelector(html,tags,'spieltag')
 proof(liveRounds.length===parsed.krogi.length,'round selector differs from live options')
 for(const [i,r] of parsed.krogi.entries()){
  const actual=liveRounds[i],route=fussballRoundScope(r.url)
  proof(route?.staffel===options.staffel&&route.round===i+1&&r.krog===i+1&&actual.attrs['data-href']===r.url&&actual.label===`${r.krog}. Spieltag`,'wrong scoped live round link')
  proof((actual.attrs.selected==='selected')===r.izbran,'selected round differs')
 }
 const selected=parsed.krogi.filter(r=>r.izbran)
 proof(selected.length===1&&selected[0].krog===parsed.krog,'ambiguous selected round')
 proof(!scope.round||scope.round===parsed.krog&&url===selected[0].url,'requested round differs from selector')
 const seasons=liveSelector(html,tags,'saison'),chosen=seasons.filter(t=>t.attrs.selected==='selected')
 proof(chosen.length===1&&chosen[0].label===`Saison ${options.season.slice(2)}`&&fussballRoundScope(chosen[0].attrs['data-href'])?.staffel===options.staffel,'selected live season differs')
 const previous=`${+options.season.slice(0,4)-1}/${options.season.slice(2,4)}`
 const previousSeasonLinks=seasons.filter(t=>t.label===`Saison ${previous.slice(2)}`).flatMap(t=>{
  const s=fussballRoundScope(t.attrs['data-href']);return s?[{season:previous,url:t.attrs['data-href'],staffel:s.staffel,verified:false}]:[]
 })
 // Require each raw parser fixture link to exist as an actual live anchor inside the live fixtures tbody.
 const blocks=tags.filter(t=>t.attrs.class?.split(/\s+/).includes('fixtures-matches-table'))
 proof(blocks.length===1,'missing live fixtures block')
 const tbody=tags.find(t=>t.tag==='tbody'&&t.start>blocks[0].end),end=tbody&&html.indexOf('</tbody>',tbody.end)
 proof(tbody&&end>tbody.end,'missing live fixtures tbody')
 const links=tags.filter(t=>t.tag==='a'&&t.start>tbody.end&&t.end<end&&!inForeignContext(html,tags,t)).map(t=>t.attrs.href?.split('#')[0])
 proof(Array.isArray(parsed.tekme)&&parsed.tekme.length>0,'empty selected round')
 for(const f of [...parsed.tekme,...parsed.prestavljene]){validateFussballFixture(f,{round:parsed.krog,rescheduled:f.krog===null});proof(links.includes(f.url),'fixture has no live report link')}
 proof(new Set(parsed.tekme.map(f=>f.id)).size===parsed.tekme.length,'duplicate primary fixture')
 return {previousSeasonLinks}
}
export async function collectFussballScreen(input){
 const options=config(input),client=input.client
 proof(client&&typeof client.read==='function'&&typeof client.snapshot==='function','bounded capture client required')
 proof(client.requestLimit===options.maxRequests,'client request budget differs from screen budget')
 const sourceErrors=new WeakSet()
 const read=async(url,kind)=>{
  try{return await client.read(url,kind)}catch(e){sourceErrors.add(e);throw e}
 }
 const parser=createFussballParserSession(read),rounds=[]
 const readRound=async url=>{
  const doc=await read(url,'round'),html=text(doc.bytes)
  const tags=fussballLiveTags(html);liveSelector(html,tags,'spieltag');liveSelector(html,tags,'saison')
  const page=await parser.round(html,{staffel:options.staffel,url})
  const extra=validateRound(html,page,url,options);rounds.push({url,round:page.parsed.krog,...extra});return page.parsed
 }
 let selected=await readRound(options.seedUrl)
 const advertisedRounds=selected.krogi.length,seedSelector=JSON.stringify(selected.krogi.map(r=>({krog:r.krog,url:r.url})))
 const played=round=>round.tekme.filter(f=>f.rezultat!==null&&f.datum<=options.asOfDate)
 if(!played(selected).length){
  // One actual earlier selector link; selecting the earliest avoids guessing an unwritten date/weekly cadence.
  const earlier=selected.krogi.find(r=>r.krog<selected.krog)
  if(earlier){selected=await readRound(earlier.url);proof(JSON.stringify(selected.krogi.map(r=>({krog:r.krog,url:r.url})))===seedSelector,'round selector changed')}
 }
 const fixtures=played(selected).slice(0,options.reportLimit),reports=[],rejectedReports=[]
 for(const fixture of fixtures){
  try{reports.push(await parser.report(fixture))}
  catch(error){if(sourceErrors.has(error))throw error;rejectedReports.push({fixture,code:error.code??'FUSSBALL_REPORT_INVALID',reason:error.message});break}
 }
 return {version:1,scope:{provider:'fussball-screen',...options},rounds,previousSeasonPairing:{verified:false,observedLinks:rounds.flatMap(r=>r.previousSeasonLinks)},reports,rejectedReports,
  coverage:{advertisedRounds,capturedRounds:rounds.length,selectedRound:selected.krog,linkedPlayedFixtures:played(selected).length,attemptedReports:reports.length+rejectedReports.length,completeReports:reports.length,rejectedReports:rejectedReports.length,sampled:true,fullSeason:false},
  activationEligible:false,sezonskiUvozPodprt:false}
}
const root=fileURLToPath(new URL('../',import.meta.url))
function codeHash(){return hash([...new Set([...zaprtje('scripts/fussball-screen.mjs'),'scripts/zajemi-fussball-vzorec.mjs','scripts/viri/fussball-datumski-glifi.json'])].sort().map(f=>`${f}\0${hash(readFileSync(resolve(root,f)))}`).join('\n'))}
const ext=kind=>kind==='font'?'woff':kind==='css'?'css':'html'
export async function captureFussballScreenDirectory({directory,options,fetchFn=globalThis.fetch}){
 const createdAt=new Date().toISOString(),opts=config({...options,asOfDate:options?.asOfDate??createdAt.slice(0,10)}),codeSha256=codeHash(),documents=[]
 mkdirSync(directory);mkdirSync(join(directory,'documents'));writeFileSync(join(directory,'attempts.jsonl'),'')
 const client=createFussballCaptureClient({maxRequests:opts.maxRequests,fetchFn,onAttempt:a=>appendFileSync(join(directory,'attempts.jsonl'),json(a)),onDocument:d=>{
  const bytes=Buffer.from(d.bytes),file=`documents/${d.sha256}.${ext(d.kind)}`;writeFileSync(join(directory,file),bytes);documents.push({...d,bytes:bytes.length,file})
 }})
 let result=null,error=null
 try{result=await collectFussballScreen({...opts,client})}catch(e){error=e}
 const raw=result&&json(result);if(raw)writeFileSync(join(directory,'screen-result.json'),raw)
 const manifest={version:1,provider:'fussball-screen',createdAt,completedAt:new Date().toISOString(),options:opts,codeSha256,success:!error,error:error?.message??null,snapshot:client.snapshot(),documents,resultSha256:raw?hash(raw):null,activationEligible:false,sezonskiUvozPodprt:false}
 writeFileSync(join(directory,'screen-manifest.json'),json(manifest));if(error)throw error;return manifest
}
function readRegular(directory,path){
 const base=realpathSync(directory),full=resolve(base,path),rel=relative(base,full)
 proof(rel&&!rel.startsWith('..')&&!path.startsWith('/'),'unsafe evidence path')
 if(path.startsWith('documents/'))proof(lstatSync(join(base,'documents')).isDirectory()&&!lstatSync(join(base,'documents')).isSymbolicLink(),'symbolic documents directory')
 proof(lstatSync(full).isFile()&&!lstatSync(full).isSymbolicLink(),'evidence must be regular file');return readFileSync(full)
}
export async function verifyFussballScreenDirectory(directory){
 const m=JSON.parse(readRegular(directory,'screen-manifest.json')),o=config(m.options),s=m.snapshot
 proof(m.version===1&&m.provider==='fussball-screen'&&m.success===true&&m.activationEligible===false&&m.sezonskiUvozPodprt===false,'failed or invalid screen evidence')
 proof(m.codeSha256===codeHash(),'screen code fingerprint differs')
 proof(s&&s.stopped===false&&s.stopReason===null&&s.requests>0&&s.requests<=o.maxRequests&&s.attempts?.length===s.requests&&m.documents?.length===s.requests,'request accounting differs')
 const journal=readRegular(directory,'attempts.jsonl').toString().trim().split('\n').map(x=>JSON.parse(x));proof(journal.length===s.requests,'journal count differs')
 const docs=new Map()
 for(const [i,d]of m.documents.entries()){
  const a=s.attempts[i],j=journal[i]
  proof(a.number===i+1&&a.status==='success'&&a.error===null&&a.httpStatus===200&&a.url===d.url&&a.kind===d.kind&&a.startedAt===d.capturedAt&&Number.isFinite(Date.parse(d.capturedAt)),'source attempt timestamp or identity differs')
  proof(j.number===a.number&&j.url===a.url&&j.kind===a.kind&&j.status==='pending','journal identity differs')
  proof(['round','report','lineup','css','font'].includes(d.kind)&&d.status===200&&/^[a-f0-9]{64}$/.test(d.sha256)&&d.file===`documents/${d.sha256}.${ext(d.kind)}`&&!docs.has(d.url),'document identity differs')
  const bytes=readRegular(directory,d.file);proof(bytes.length===d.bytes&&hash(bytes)===d.sha256,'document bytes/hash differs');docs.set(d.url,{...d,bytes})
 }
 const raw=readRegular(directory,'screen-result.json').toString();proof(hash(raw)===m.resultSha256,'screen result digest differs')
 let clock=Date.parse(m.createdAt);proof(Number.isFinite(clock)&&Number.isFinite(Date.parse(m.completedAt))&&Date.parse(m.completedAt)>=clock,'invalid capture dates')
 const client=createFussballCaptureClient({maxRequests:o.maxRequests,now:()=>clock,sleep:async ms=>{clock+=ms},fetchFn:async url=>{const d=docs.get(url);proof(d,'missing captured source document');return new Response(d.bytes,{status:d.status,headers:{'content-type':d.contentType}})}})
 const result=await collectFussballScreen({...o,client});proof(json(result)===raw&&client.snapshot().requests===s.requests,'screen differs from complete offline replay')
 return {verified:true,activationEligible:false,sezonskiUvozPodprt:false,coverage:result.coverage,requests:s.requests,resultSha256:m.resultSha256,codeSha256:m.codeSha256}
}
