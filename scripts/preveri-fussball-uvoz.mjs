import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {tekmovanje} from './tekmovanje.mjs'
import {admitFussballAudit,admitFussballPairedAudit,assertFussballImportCompetition} from './fussball-import-actions.mjs'
import {loadFussballImportCapture,parseFussballLeagueCode} from './fussball-import.mjs'
import {GERMANY_BULK_CANDIDATES} from './bulk-germany-source.mjs'
import {fussballCardPolicyForCandidate} from './fussball-community-policy.mjs'
import {loadFussballCurrentOnlyCapture,fussballCurrentOnlyManifest,CURRENT_ONLY_ANY} from './fussball-tekoca-pot.mjs'

const catalogFor=code=>{const c=GERMANY_BULK_CANDIDATES.filter(c=>c.source_league_code===code);if(c.length!==1)throw Error('Code is not exactly one reviewed German catalog tuple');return c[0]}
// Path B: catalog community-card leagues run current-only; unknown reports stay unknown.
export async function previewFussballImport(capture,code,{load=loadFussballImportCapture,loadCurrentOnly=loadFussballCurrentOnlyCapture,candidate}={}){
 const scope=parseFussballLeagueCode(code),cardPolicy=fussballCardPolicyForCandidate(candidate??GERMANY_BULK_CANDIDATES.find(c=>c.source_league_code===code))
 return cardPolicy?loadCurrentOnly(capture,{...scope,current:true,cardPolicy,unknownBefore:CURRENT_ONLY_ANY}):load(capture,{...scope,current:true})
}
export function gitMainDrift(auditSha,headSha,git=args=>execFileSync('git',args,{encoding:'utf8',timeout:60000})){
 if(!/^[a-f0-9]{40}$/.test(auditSha??'')||auditSha===headSha)return undefined
 let ancestor=true;try{git(['merge-base','--is-ancestor',auditSha,headSha])}catch{ancestor=false}
 return {ancestor,changed:ancestor?git(['diff','--name-only',auditSha,headSha]).split('\n').filter(Boolean):[]}
}
async function writer(){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Writer database configuration is required')
 const {createClient}=await import('@supabase/supabase-js')
 return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
}
export async function checkFussballCompetition(db,{slug,code},{read=tekmovanje}={}){
 let data=await read(db,slug)
 // A new catalog community-card league gets its current-only policy here (path B).
 if(data?.source_policy===null&&fussballCardPolicyForCandidate(catalogFor(code))){
  assertFussballImportCompetition(data,{slug,code})
  const {error}=await db.rpc('install_fussball_card_policy',{p_competition_id:data.id,p_current_code:code,p_archive_codes:[]})
  if(error)throw Error(`Current-only card policy install failed: ${error.message}`)
  data=await read(db,slug)
 }
 assertFussballImportCompetition(data,{slug,code})
 const {count,error:teamError}=await db.from('fantasy_teams').select('id',{count:'exact',head:true}).eq('competition_id',data.id)
 if(teamError||count!==0)throw Error('Manual bootstrap requires no existing fantasy teams')
 return {competitionId:data.id,slug:data.slug,inactive:true,sourceCode:data.source_league_code,currentOnly:data.fussball_current_only===true}
}
export async function activateFussballCurrentOnly(db,{slug,batch},{read=tekmovanje,fetchFn=fetch,publicUrl=process.env.SLFF_PUBLIC_URL,publicKey=process.env.SLFF_PUBLIC_ANON_KEY}={}){
 const c=await read(db,slug)
 if(c?.active!==false||c.fussball_current_only!==true||c.source!=='fussball-public')throw Error('Activation requires the inactive current-only German league')
 const manifest=fussballCurrentOnlyManifest(batch,{currentCode:c.source_league_code})
 // Never retried: an ambiguous response is resolved by the readback below.
 const {data:result,error}=await db.rpc('vklopi_fussball_tekoco',{p_slug:slug,p_manifest:manifest})
 if(error||result?.vklopljena!==true)throw Error(`Activation refused: ${error?.message??result?.razlog??'no result'}`)
 if(!publicUrl||!publicKey)throw Error('Public readback configuration is required')
 const response=await fetchFn(`${publicUrl}/rest/v1/competitions_view?slug=eq.${encodeURIComponent(slug)}&select=slug,active,prvi_fantasy_krog`,{headers:{apikey:publicKey,Authorization:`Bearer ${publicKey}`}})
 const rows=response.ok?await response.json():null
 if(!Array.isArray(rows)||rows.length!==1||rows[0].active!==true||rows[0].prvi_fantasy_krog!==result.prvi_krog)throw Error('Public readback differs from activation; review persisted state')
 return {slug,active:true,openingRound:result.prvi_krog,openingDate:result.prvi_krog_datum,unknownReports:manifest.unknownReports.length,admissionSha256:result.admission_sha256}
}

export async function runFussballImportCli(args){
 const mode=args.shift(),allowed={admit:['run','artifacts','repository','head-sha','run-id'],'admit-pair':['run','artifacts','repository','head-sha','run-id'],preview:['capture','code','output'],'check-competition':['slug','code'],activate:['slug','preview']}[mode],options={}
 if(!allowed)throw Error('Use admit, preview, check-competition or activate with their explicit named arguments')
 while(args.length){const key=args.shift(),value=args.shift();if(!key?.startsWith('--')||!allowed.includes(key.slice(2))||!value||value.startsWith('--')||Object.hasOwn(options,key.slice(2)))throw Error('Invalid or duplicate import argument');options[key.slice(2)]=value}
 if(allowed.some(key=>!options[key]))throw Error('Missing required import argument')
 if(['admit','admit-pair'].includes(mode)){
  const run=JSON.parse(readFileSync(options.run,'utf8')),inventory=JSON.parse(readFileSync(options.artifacts,'utf8'))
  const identity={repository:options.repository,headSha:options['head-sha'],runId:options['run-id']}
  if(mode==='admit-pair')return admitFussballPairedAudit(run,inventory,identity)
  return admitFussballAudit(run,inventory,{...identity,mainDrift:gitMainDrift(run?.head_sha,options['head-sha'])})
 }
 if(mode==='preview'){
  const batch=await previewFussballImport(resolve(options.capture),options.code)
  writeFileSync(options.output,JSON.stringify(batch)+'\n',{flag:'wx'})
  return {verified:true,activationEligible:false,staffel:batch.staffel,season:batch.season,reports:batch.reports.length,pendingReports:batch.pendingReports?.length??0,unknownReports:batch.unknownReports?.length??0,players:batch.identities.length,provenance:batch.provenance}
 }
 const db=await writer()
 if(mode==='activate')return activateFussballCurrentOnly(db,{slug:options.slug,batch:JSON.parse(readFileSync(options.preview,'utf8'))})
 return checkFussballCompetition(db,{slug:options.slug,code:options.code})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runFussballImportCli(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1})
