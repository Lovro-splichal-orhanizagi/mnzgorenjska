// FUSSBALL pot B (odločitev lastnika 1. 11. 2026): liga gre v igro samo s tekočo
// sezono. Zapisnik, ki ga strogi razčlenjevalnik zavrne, in pretekla tekma brez
// objavljenega izida ostaneta NEZNANA: uradna glava ostane, statistik ne
// izpeljemo in ne ugibamo. To velja samo pred prvim fantasy krogom
// (`unknownBefore`); pozneje zavrnitev ustavi uvoz kot doslej.
// Zajemne datoteke (fussball-import/capture-evidence) so pripete v drugih
// verigah, zato je ta pot ovoj okoli njih, ne njihova sprememba.
import {createHash} from 'node:crypto'
import {readFileSync,lstatSync,mkdirSync,cpSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {verifyFussballDirectory} from './fussball-capture-evidence.mjs'
import {buildFussballImportBatch} from './fussball-import.mjs'

const need=(ok,m)=>{if(!ok)throw Error(`fussball pot B: ${m}`)}
const hash=b=>createHash('sha256').update(b).digest('hex')
const validDate=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s
const score=r=>r===null||['domaci','gostje'].every(k=>Number.isInteger(r?.[k])&&r[k]>=0&&r[k]<=99)
export const CURRENT_ONLY_ANY='9999-12-31'

export function buildFussballCurrentOnlyBatch(result,{staffel,season,cardPolicy,unknownBefore}={}){
 if(unknownBefore==null)return buildFussballImportBatch(result,{staffel,season,cardPolicy})
 need(unknownBefore===CURRENT_ONLY_ANY||validDate(unknownBefore),'invalid unknown-report cutoff')
 const s=result?.schedule,c=result?.coverage,asOf=result?.scope?.asOfDate
 need(Array.isArray(s?.fixtures)&&Array.isArray(s.rounds)&&Array.isArray(result.rejectedReports)&&c?.unscoredFixtures&&validDate(asOf),'invalid capture result shape')
 const byId=new Map(s.fixtures.map(f=>[f?.id,f]))
 need(byId.size===s.fixtures.length,'duplicate fixture identity')
 const allowed=f=>validDate(f?.datum)&&f.datum<unknownBefore&&f.datum<asOf
 const unknown=[],drop=new Set()
 for(const r of result.rejectedReports){
  const f=byId.get(r?.fixture?.id)
  need(f&&JSON.stringify(f)===JSON.stringify(r.fixture)&&f.rezultat!==null&&!drop.has(f.id)&&typeof r.code==='string','rejected report outside the published schedule')
  need(allowed(f),`rejected report ${f.zapisnikId} on/after the unknown-report cutoff`)
  drop.add(f.id);unknown.push({fixture:f,reason:r.code})
 }
 for(const f of s.fixtures)if(f.rezultat===null&&!Object.hasOwn(f,'administrativeResult')&&f.datum<asOf){
  need(allowed(f),`past fixture ${f.zapisnikId} without result on/after the unknown-report cutoff`)
  drop.add(f.id);unknown.push({fixture:f,reason:'FUSSBALL_RESULT_UNPUBLISHED'})
 }
 for(const {fixture:f}of unknown)need(/^[A-Z0-9]{32}$/.test(f.id)&&f.zapisnikId===`de-fussball-${f.id}`&&s.rounds.includes(f.krog)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(f.ura??'')&&typeof f.domaci==='string'&&f.domaci.trim()&&typeof f.gostje==='string'&&f.gostje.trim()&&f.domaci!==f.gostje&&score(f.rezultat),'invalid unknown fixture header')
 const rejected=unknown.filter(u=>u.fixture.rezultat!==null).length,unscored=unknown.length-rejected,u=c.unscoredFixtures
 // The strict builder still checks every remaining report, round and count.
 const strict={...result,schedule:{...s,fixtures:s.fixtures.filter(f=>!drop.has(f.id))},rejectedReports:[],
  coverage:{...c,fixtures:c.fixtures-unknown.length,playedFixtures:c.playedFixtures-rejected,attemptedReports:c.attemptedReports-rejected,rejectedReports:c.rejectedReports-rejected,unscoredFixtures:{...u,total:u.total-unscored,past:u.past-unscored}}}
 const batch=buildFussballImportBatch(strict,{staffel,season,cardPolicy})
 const schedule=batch.schedule.map(r=>({...r,tekme:[...r.tekme,...unknown.filter(x=>x.fixture.krog===r.stevilka).map(({fixture:f})=>({...structuredClone(f),izid:f.rezultat?[f.rezultat.domaci,f.rezultat.gostje]:null,odigrana:f.rezultat!==null,kontumacija:false}))]}))
 return {...batch,schedule,unknownReports:unknown.map(({fixture:f,reason})=>({reportId:f.zapisnikId,url:f.url,round:f.krog,date:f.datum,home:f.domaci,away:f.gostje,score:f.rezultat?{domaci:f.rezultat.domaci,gostje:f.rezultat.gostje}:null,reason}))}
}

function regular(directory,file){const p=join(directory,file),st=lstatSync(p);need(st.isFile()&&!st.isSymbolicLink(),'capture file must be regular');return readFileSync(p)}

/** Same verification as loadFussballImportCapture, with the path-B builder. */
export async function loadFussballCurrentOnlyCapture(directory,{staffel,season,current=true,now=Date.now(),cardPolicy,unknownBefore}={},{verifyDirectory=verifyFussballDirectory,requireCodeMatch=true}={}){
 const receipt=await verifyDirectory(directory,{requireCodeMatch})
 need(receipt.scope?.staffel===staffel&&receipt.scope?.season===season,'verified capture belongs to another league or season')
 const bytes=regular(directory,'result.json'),manifest=JSON.parse(regular(directory,'manifest.json'))
 need(/^[a-f0-9]{64}$/.test(receipt.resultSha256??'')&&hash(bytes)===receipt.resultSha256&&manifest.resultSha256===receipt.resultSha256,'verified capture changed after replay')
 need(manifest.options?.cardPolicy===cardPolicy&&manifest.options?.reportLimit===null,'capture card policy or full-season intent differs')
 if(current){const start=Date.parse(manifest.createdAt),end=Date.parse(manifest.completedAt);need(start<=end&&end<=now&&now-start<=24*3600_000,'current capture is stale or has future timestamps')}
 const batch=buildFussballCurrentOnlyBatch(JSON.parse(bytes),{staffel,season,cardPolicy,unknownBefore})
 return {...batch,provenance:{resultSha256:receipt.resultSha256,codeSha256:receipt.codeSha256,createdAt:manifest.createdAt,completedAt:manifest.completedAt,requests:receipt.requests}}
}

// Nightly cache. The pinned capture code admits a reuse cache only through a
// strict batch (no unknown reports) or through the paired-cache reader, which
// delegates verification to `loadBulkPack` and reads `current/` as a version-1
// document index. The wrapper therefore keeps the real capture in `capture/`
// (verified here with the path-B builder) and an index of the same original
// documents and receipts in `current/`. No source bytes or receipts change.
const cacheIndex=(bytes)=>{const m=JSON.parse(bytes);return {...m,version:1,kind:'fussball-current-only-cache-index',indexOf:{version:m.version,manifestSha256:hash(bytes)}}}
export function writeFussballCurrentOnlyCache(captureDirectory,target,candidate){
 need(candidate?.slug&&candidate.source_league_code&&candidate.seedUrl,'catalog candidate required')
 mkdirSync(target);cpSync(captureDirectory,join(target,'capture'),{recursive:true});cpSync(captureDirectory,join(target,'current'),{recursive:true})
 writeFileSync(join(target,'current','manifest.json'),JSON.stringify(cacheIndex(regular(captureDirectory,'manifest.json')))+'\n')
 writeFileSync(join(target,'manifest.json'),JSON.stringify({provider:'germany-paired-fussball',kind:'fussball-current-only-cache',candidate:{slug:candidate.slug,source_league_code:candidate.source_league_code,seedUrl:candidate.seedUrl,communityCards:candidate.communityCards===true}})+'\n',{flag:'wx'})
 return target
}
export async function loadFussballCurrentOnlyCache(directory,{candidate}={},{verifyDirectory=verifyFussballDirectory}={}){
 const m=JSON.parse(regular(directory,'manifest.json'))
 need(m.kind==='fussball-current-only-cache'&&m.provider==='germany-paired-fussball'&&m.candidate?.source_league_code===candidate?.source_league_code&&m.candidate.slug===candidate.slug,'current-only cache scope differs')
 const [staffel,season]=candidate.source_league_code.split(':'),capture=join(directory,'capture')
 // Code may have changed since the capture; cache admission replays old bytes.
 await loadFussballCurrentOnlyCapture(capture,{staffel,season,current:false,cardPolicy:candidate.communityCards?'community-v1':undefined,unknownBefore:CURRENT_ONLY_ANY},{verifyDirectory,requireCodeMatch:false})
 const real=regular(capture,'manifest.json'),index=JSON.parse(regular(directory,'current/manifest.json'))
 need(JSON.stringify(index)===JSON.stringify(cacheIndex(real)),'cache index differs from the verified capture')
 for(const d of index.documents??[])need(hash(regular(directory,'current/'+d.file))===d.sha256,'cache index original differs')
 return {candidate:structuredClone(m.candidate),seasons:[{code:candidate.source_league_code}]}
}

export function fussballCurrentOnlyManifest(batch,{currentCode}={}){
 need(batch?.provider==='fussball-public'&&`${batch.staffel}:${batch.season}`===currentCode&&Array.isArray(batch.unknownReports)&&/^[a-f0-9]{64}$/.test(batch.provenance?.resultSha256??''),'path-B batch with provenance required')
 return {version:1,kind:'fussball-current-only',currentCode,sourceResultSha256:batch.provenance.resultSha256,unknownReports:batch.unknownReports.map(r=>({reportId:r.reportId,round:r.round,date:r.date,home:r.home,away:r.away,score:r.score,reason:r.reason}))}
}
