import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {tekmovanje} from './tekmovanje.mjs'
import {admitFussballAudit,assertFussballImportCompetition} from './fussball-import-actions.mjs'
import {loadFussballImportCapture,parseFussballLeagueCode} from './fussball-import.mjs'

export async function runFussballImportCli(args){
 const mode=args.shift(),allowed={admit:['run','artifacts','repository','head-sha','run-id'],preview:['capture','code','output'],'check-competition':['slug','code']}[mode],options={}
 if(!allowed)throw Error('Use admit, preview or check-competition with their explicit named arguments')
 while(args.length){const key=args.shift(),value=args.shift();if(!key?.startsWith('--')||!allowed.includes(key.slice(2))||!value||value.startsWith('--')||Object.hasOwn(options,key.slice(2)))throw Error('Invalid or duplicate import argument');options[key.slice(2)]=value}
 if(allowed.some(key=>!options[key]))throw Error('Missing required import argument')
 if(mode==='admit')return admitFussballAudit(JSON.parse(readFileSync(options.run,'utf8')),JSON.parse(readFileSync(options.artifacts,'utf8')),{repository:options.repository,headSha:options['head-sha'],runId:options['run-id']})
 if(mode==='preview'){
  const batch=await loadFussballImportCapture(resolve(options.capture),{...parseFussballLeagueCode(options.code),current:true})
  writeFileSync(options.output,JSON.stringify(batch)+'\n',{flag:'wx'})
  return {verified:true,activationEligible:false,staffel:batch.staffel,season:batch.season,reports:batch.reports.length,players:batch.identities.length,provenance:batch.provenance}
 }
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Writer database configuration is required')
 const {createClient}=await import('@supabase/supabase-js')
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
 const data=await tekmovanje(db,options.slug)
 assertFussballImportCompetition(data,{slug:options.slug,code:options.code})
 const {count,error:teamError}=await db.from('fantasy_teams').select('id',{count:'exact',head:true}).eq('competition_id',data.id)
 if(teamError||count!==0)throw Error('Manual bootstrap requires no existing fantasy teams')
 return {competitionId:data.id,slug:data.slug,inactive:true,sourceCode:data.source_league_code}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runFussballImportCli(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1})
