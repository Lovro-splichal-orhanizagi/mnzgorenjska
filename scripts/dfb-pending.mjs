// Current active DFB nightly repair only. Parser rejects are evidence, never native statistics.
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const require=(ok,message)=>{if(!ok)throw Error('DFB pending: '+message)}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export function requireDfbPendingScope({competition:c,leagueCode,sourceOverride,singleReport,limit,cleanup}={}){
 require(c?.source==='dfb'&&c.country_code==='DE'&&c.active===true&&Number.isSafeInteger(c.id)&&c.id>0&&/^de-regionalliga-[a-z]+$/.test(c.slug??''),'active registered German DFB competition required')
 require(leagueCode===c.source_league_code&&/^regionalliga-[a-z]+\/\d{4}-\d{4}$/.test(leagueCode??''),'exact current source season required')
 require(!sourceOverride&&!singleReport&&!limit&&!cleanup,'archive, override, single-report, limited or cleanup mode forbidden')
}
export async function createDfbPendingContext({db,competition,leagueCode,directory,rawByUrl,now=()=>new Date()}={}){
 requireDfbPendingScope({competition,leagueCode})
 const invoke=async(name,args)=>{const {data,error}=await db.rpc(name,args);if(error)throw Error(`DFB pending ${name}: ${error.message}`);return data}
 const scope={p_competition_id:competition.id,p_code:leagueCode}
 const rows=await invoke('get_dfb_pending_reports',scope)
 require(Array.isArray(rows)&&rows.length<=1000,'invalid pending inventory')
 const remaining=new Map(),due=new Set(),deferred=new Set()
 for(const row of rows){require(/^de-dfb-\d+$/.test(row.report_id??'')&&/^[a-f0-9]{64}$/.test(row.raw_sha256??'')&&Number.isFinite(Date.parse(row.next_retry_at))&&!remaining.has(row.report_id),'invalid or duplicate pending identity/retry time');remaining.set(row.report_id,row.raw_sha256)
  if(Date.parse(row.next_retry_at)<=+now()&&due.size<10)due.add(row.report_id);else deferred.add(row.report_id)
 }
 return {remaining,due,deferred,
  async reject({fixture,status,reason}){
   require(['DFB_INVALID_REPORT','DFB_INCOMPLETE_REPORT','DFB_UNSUPPORTED_FORMAT','DFB_PENDING_REPORT'].includes(status),'unrecognized parser rejection')
   const raw=rawByUrl?.get(fixture?.url)
   require(Buffer.isBuffer(raw)&&raw.length>0&&raw.length<=2*1024*1024,'original bytes missing or oversized')
   const reportId='de-dfb-'+fixture.id,sha256=hash(raw),observed_at=now().toISOString()
   require(/^de-dfb-\d+$/.test(reportId),'invalid source report identity')
   const metadata={version:1,competition:{id:competition.id,slug:competition.slug,source:competition.source,source_league_code:leagueCode},report_id:reportId,fixture,status,reason,raw_sha256:sha256,observed_at}
   const dir=join(directory,competition.slug,reportId);mkdirSync(dir,{recursive:true})
   const path=join(dir,sha256+'.bin')
   if(existsSync(path))require(hash(readFileSync(path))===sha256,'existing quarantine bytes changed');else writeFileSync(path,raw,{flag:'wx'})
   const meta=join(dir,sha256+'.json');if(!existsSync(meta))writeFileSync(meta,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'})
   // DB validates current scope, exact existing fixture and digest again. Failure is fatal.
   const result=await invoke('mark_dfb_report_pending',{...scope,p_fixture:fixture,p_status:status,p_reason:reason,p_sha256:sha256,p_raw_base64:raw.toString('base64'),p_observed_at:observed_at})
   require(Number.isSafeInteger(result?.match_id)&&result.match_id>0&&Number.isSafeInteger(result.round_id)&&result.round_id>0,'pending write receipt missing')
   remaining.set(reportId,sha256)
   return result
  },
  async complete({id,matchId,warnings}){
   if(!remaining.has(String(id)))return false
   const receipt=await invoke('complete_dfb_pending_report',{...scope,p_match_id:matchId,p_report_id:String(id),p_sha256:remaining.get(String(id)),p_warnings:warnings})
   require(receipt===true,'successful resolution receipt missing')
   remaining.delete(String(id));return true
  },
 }
}
