// Prepare one fresh current-season capture before ordinary nightly native import.
// No DB writes, archive collection, registration or activation. Source collection
// inherits the existing serial six-second client, actual 1..4000 request budget,
// original-byte evidence, no retries and terminal refusal/transport handling.
import {existsSync,readFileSync,lstatSync,mkdirSync,cpSync,renameSync,rmSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {GERMANY_BULK_CANDIDATES,validateGermanyCandidate,loadGermanyPack} from './bulk-germany-source.mjs'
import {captureFussballDirectory} from './fussball-capture-evidence.mjs'
import {loadFussballImportCapture,parseFussballLeagueCode} from './fussball-import.mjs'

import {isFussballCommunityCandidate,isFussballCommunityCompetition,fussballCardPolicyForCandidate} from './fussball-community-policy.mjs'
const fail=message=>Object.assign(new Error(`fussball nightly: ${message}`),{exitCode:1,dataHold:true})
const proof=(ok,message)=>{if(!ok)throw fail(message)}
const time=now=>{const value=typeof now==='function'?now():now,n=value instanceof Date?value.getTime():value;proof(Number.isFinite(n),'invalid clock');return n}
const cacheRoot=slug=>resolve('scripts/.predpomnilnik/fussball-public',slug)

export async function seedFussballNightly({candidate,bulkDirectory,cacheDirectory,loadPack=loadGermanyPack}={}){
 proof(candidate?.active===false,'initial cache seed requires inactive competition')
 const reviewed=assertFussballNightlyCompetition({...candidate,active:true})
 const pack=await loadPack(bulkDirectory,{candidate:reviewed,requireFresh:false})
 proof(pack.candidate?.source_league_code===reviewed.source_league_code&&pack.candidate.slug===reviewed.slug&&Boolean(pack.candidate.communityCards)===Boolean(reviewed.communityCards)&&pack.seasons?.some(s=>s.code===reviewed.source_league_code),'verified bulk seed scope differs')
 const cache=cacheDirectory??cacheRoot(reviewed.slug),seed=join(cache,'bulk-seed'),next=join(cache,'bulk-seed-next')
 mkdirSync(cache,{recursive:true});proof(lstatSync(cache).isDirectory()&&!lstatSync(cache).isSymbolicLink(),'cache root must be regular directory')
 rmSync(next,{recursive:true,force:true});cpSync(bulkDirectory,next,{recursive:true})
 rmSync(seed,{recursive:true,force:true});renameSync(next,seed)
 return {directory:resolve(seed),source_league_code:reviewed.source_league_code,seeded:true}
}

export function assertFussballNightlyCompetition(row){
 proof(row?.active===true&&row.source==='fussball-public'&&row.country_code==='DE'&&(row.source_policy===null||isFussballCommunityCompetition(row))&&Number.isSafeInteger(row.id)&&row.id>0&&Number.isSafeInteger(row.country_id)&&row.country_id>0,'requires exact active German public competition without source policy')
 const matches=GERMANY_BULK_CANDIDATES.filter(c=>c.slug===row.slug&&c.source===row.source&&c.source_league_code===row.source_league_code)
 proof(matches.length===1,'current tuple is absent from reviewed catalog')
 proof(isFussballCommunityCandidate(matches[0])===isFussballCommunityCompetition(row),'native card policy differs from reviewed current tuple')
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
export async function prepareFussballNightly({candidate,directory,maxRequests=4000,now=Date.now,captureDirectory=captureFussballDirectory,loadCapture=loadFussballImportCapture,fetchFn,cacheDirectory}={}){
 const reviewed=assertFussballNightlyCompetition(candidate),scope=parseFussballLeagueCode(reviewed.source_league_code)
 proof(typeof directory==='string'&&directory.length>0&&!existsSync(directory),'output must identify a new capture directory')
 proof(Number.isInteger(maxRequests)&&maxRequests>=1&&maxRequests<=4000,'request budget must be 1..4000')
 proof(typeof captureDirectory==='function'&&typeof loadCapture==='function','capture and replay functions required')
 const cardPolicy=fussballCardPolicyForCandidate(reviewed)
 const asOfDate=new Date(time(now)).toISOString().slice(0,10)
 const cache=cacheDirectory??cacheRoot(reviewed.slug),latest=join(cache,'latest'),previous=join(cache,'previous'),next=join(cache,'next'),seed=join(cache,'bulk-seed')
 mkdirSync(cache,{recursive:true})
 proof(lstatSync(cache).isDirectory()&&!lstatSync(cache).isSymbolicLink(),'cache root must be a regular directory')
 if(!existsSync(latest)&&existsSync(previous))renameSync(previous,latest)
 if(existsSync(latest))proof(lstatSync(latest).isDirectory()&&!lstatSync(latest).isSymbolicLink(),'latest cache must be a regular directory')
 try{
  await captureDirectory({directory,options:{seedUrl:reviewed.seedUrl,...scope,maxRequests,reportLimit:null,asOfDate,...(cardPolicy?{cardPolicy}:{})},...(fetchFn?{fetchFn}:{}),...(existsSync(latest)?{reuseDirectory:latest}:existsSync(seed)?{reuseBulkDirectory:seed}:{})})
  const batch=await loadCapture(directory,{...scope,current:true,now:time(now),...(cardPolicy?{cardPolicy}:{})})
  proof(batch?.provider==='fussball-public'&&batch.staffel===scope.staffel&&batch.season===scope.season&&batch.activationEligible===false&&Array.isArray(batch.reports)&&batch.reports.length+(batch.pendingReports?.length??0)>0&&batch.cardPolicy===cardPolicy&&(!cardPolicy?!(batch.pendingReports?.length):Array.isArray(batch.pendingReports)&&Array.isArray(batch.cardEnvelopes)&&batch.pendingReports.every(r=>r.statisticsPending===true&&r.cardEnvelope&&!Object.hasOwn(r,'nastopi')&&!Object.hasOwn(r.z??{},'goli')))&&Array.isArray(batch.schedule)&&batch.schedule.length>0&&Array.isArray(batch.identities)&&batch.identities.length>0,'fresh complete native capture proof missing or wrong scope')
  // Keep only the latest complete capture, with a bounded crash-recovery swap.
  // Its flat original network receipts do not copy a chain of older captures.
  rmSync(next,{recursive:true,force:true});cpSync(directory,next,{recursive:true})
  rmSync(previous,{recursive:true,force:true})
  if(existsSync(latest))renameSync(latest,previous)
  renameSync(next,latest);rmSync(previous,{recursive:true,force:true});rmSync(seed,{recursive:true,force:true})
  return {directory:resolve(directory),source_league_code:reviewed.source_league_code,...scope,reports:batch.reports.length,...(cardPolicy?{pendingReports:batch.pendingReports.length}:{}),provenance:batch.provenance}
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
export async function runFussballNightlyCli(args,{readCompetition:read=readCompetition,prepare=prepareFussballNightly,seed=seedFussballNightly,hasCache=slug=>['latest','bulk-seed'].some(p=>existsSync(join(cacheRoot(slug),p)))}={}){
 args=[...args]
 const seedMode=args[0]==='seed';if(seedMode)args.shift()
 const options={},allowed=seedMode?['tekmovanje','bulk-capture']:['tekmovanje','output','max-requests']
 while(args.length){
  const flag=args.shift(),value=args.shift(),key=flag?.slice(2)
  proof(flag?.startsWith('--')&&allowed.includes(key)&&value&&!value.startsWith('--')&&!Object.hasOwn(options,key),'invalid or duplicate argument')
  options[key]=value
 }
 proof(allowed.every(k=>options[k]),'missing required seed or capture arguments')
 proof(/^de-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.tekmovanje)&&(seedMode||/^[1-9]\d{0,3}$/.test(options['max-requests'])&&Number(options['max-requests'])<=4000),'invalid competition or 1..4000 request bound')
 const candidate=await read(options.tekmovanje)
 proof(candidate?.slug===options.tekmovanje,'database competition differs from requested slug')
 if(seedMode)return seed({candidate,bulkDirectory:options['bulk-capture']})
 assertFussballNightlyCompetition(candidate)
 // The initial importer must seed the durable original-byte capture. An active
 // league with a lost/cold cache cannot silently reread already complete reports.
 proof(hasCache(candidate.slug),'seed verified original capture cache before nightly import')
 return prepare({candidate,directory:options.output,maxRequests:Number(options['max-requests'])})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 runFussballNightlyCli(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=error.exitCode===4?4:1})
}
