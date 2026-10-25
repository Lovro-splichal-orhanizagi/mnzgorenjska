// Prepare one fresh current-season capture before ordinary nightly native import.
// No DB writes, archive collection, registration or activation. Source collection
// inherits the existing serial six-second client, actual 1..4000 request budget,
// original-byte evidence, no retries and terminal refusal/transport handling.
import {existsSync,readFileSync,lstatSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {GERMANY_BULK_CANDIDATES,validateGermanyCandidate} from './bulk-germany-source.mjs'
import {captureFussballDirectory} from './fussball-capture-evidence.mjs'
import {loadFussballImportCapture,parseFussballLeagueCode} from './fussball-import.mjs'

const fail=message=>Object.assign(new Error(`fussball nightly: ${message}`),{exitCode:1,dataHold:true})
const proof=(ok,message)=>{if(!ok)throw fail(message)}
const time=now=>{const value=typeof now==='function'?now():now,n=value instanceof Date?value.getTime():value;proof(Number.isFinite(n),'invalid clock');return n}

export function assertFussballNightlyCompetition(row){
 proof(row?.active===true&&row.source==='fussball-public'&&row.country_code==='DE'&&row.source_policy===null&&Number.isSafeInteger(row.id)&&row.id>0&&Number.isSafeInteger(row.country_id)&&row.country_id>0,'requires exact active German public competition without source policy')
 const matches=GERMANY_BULK_CANDIDATES.filter(c=>c.slug===row.slug&&c.source===row.source&&c.source_league_code===row.source_league_code)
 proof(matches.length===1,'current tuple is absent from reviewed catalog')
 // Archives are deliberately not required for already-admitted nightly current
 // updates. Initial bulk admission separately requires both complete seasons.
 return validateGermanyCandidate(matches[0])
}
function stoppedCapture(directory){
 try{
  const file=join(directory,'manifest.json'),s=lstatSync(file)
  return s.isFile()&&!s.isSymbolicLink()&&JSON.parse(readFileSync(file,'utf8')).snapshot?.stopped===true
 }catch{return false}
}
export async function prepareFussballNightly({candidate,directory,maxRequests=4000,now=Date.now,captureDirectory=captureFussballDirectory,loadCapture=loadFussballImportCapture,fetchFn}={}){
 const reviewed=assertFussballNightlyCompetition(candidate),scope=parseFussballLeagueCode(reviewed.source_league_code)
 proof(typeof directory==='string'&&directory.length>0&&!existsSync(directory),'output must identify a new capture directory')
 proof(Number.isInteger(maxRequests)&&maxRequests>=1&&maxRequests<=4000,'request budget must be 1..4000')
 proof(typeof captureDirectory==='function'&&typeof loadCapture==='function','capture and replay functions required')
 const asOfDate=new Date(time(now)).toISOString().slice(0,10)
 try{
  await captureDirectory({directory,options:{seedUrl:reviewed.seedUrl,...scope,maxRequests,reportLimit:null,asOfDate},...(fetchFn?{fetchFn}:{})})
  const batch=await loadCapture(directory,{...scope,current:true,now:time(now)})
  proof(batch?.provider==='fussball-public'&&batch.staffel===scope.staffel&&batch.season===scope.season&&batch.activationEligible===false&&Array.isArray(batch.reports)&&batch.reports.length>0&&Array.isArray(batch.schedule)&&batch.schedule.length>0&&Array.isArray(batch.identities)&&batch.identities.length>0,'fresh complete native capture proof missing or wrong scope')
  return {directory:resolve(directory),source_league_code:reviewed.source_league_code,...scope,reports:batch.reports.length,provenance:batch.provenance}
 }catch(error){
  if(stoppedCapture(directory)||error.sourceStop)throw Object.assign(new Error(`fussball nightly source stopped: ${error.message}`),{sourceStop:true,exitCode:4})
  throw Object.assign(error,{exitCode:1,dataHold:true})
 }
}

async function readCompetition(slug){
 proof(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY,'Actions database configuration required')
 const [{createClient},{tekmovanje},{fetchZaBazo}]=await Promise.all([import('@supabase/supabase-js'),import('./tekmovanje.mjs'),import('./prenos.mjs')])
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false},global:{fetch:fetchZaBazo()}})
 return tekmovanje(db,slug)
}
/** --output is NEW_DIR. Export that path as SLFF_FUSSBALL_CAPTURE only on exit0. */
export async function runFussballNightlyCli(args,{readCompetition:read=readCompetition,prepare=prepareFussballNightly}={}){
 const options={},allowed=['tekmovanje','output','max-requests']
 args=[...args]
 while(args.length){
  const flag=args.shift(),value=args.shift(),key=flag?.slice(2)
  proof(flag?.startsWith('--')&&allowed.includes(key)&&value&&!value.startsWith('--')&&!Object.hasOwn(options,key),'invalid or duplicate argument')
  options[key]=value
 }
 proof(allowed.every(k=>options[k]),'required: --tekmovanje SLUG --output NEW_DIR --max-requests N')
 proof(/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.tekmovanje)&&/^[1-9]\d{0,3}$/.test(options['max-requests'])&&Number(options['max-requests'])<=4000,'invalid competition or 1..4000 request bound')
 const candidate=await read(options.tekmovanje)
 proof(candidate?.slug===options.tekmovanje,'database competition differs from requested slug')
 assertFussballNightlyCompetition(candidate)
 return prepare({candidate,directory:options.output,maxRequests:Number(options['max-requests'])})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 runFussballNightlyCli(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=error.exitCode===4?4:1})
}
