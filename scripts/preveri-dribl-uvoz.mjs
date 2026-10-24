import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {admitDriblCapture,assertDriblImportExecution,checkDriblImportCompetition,previewDriblImport,createDriblDatabaseOnlyFetch} from './dribl-import-actions.mjs'
// Installed only in import subprocesses; source collection has its separate read-only workflow.
if(process.env.SLFF_DRIBL_OFFLINE_IMPORT==='true')globalThis.fetch=createDriblDatabaseOnlyFetch({databaseOrigin:process.env.SUPABASE_URL,fetch:globalThis.fetch})
export async function runDriblImportCli(args,{db,loadCapture}={}) {
 const mode=args.shift(),allowed={guard:['expected-sha'],admit:['run','artifacts','repository','head-sha','run-id'],preview:['capture','code','output','archive-code'],'check-competition':['slug','code','expected-sha']}[mode],options={}
 if(!allowed)throw Error('Use guard, admit, preview or check-competition')
 while(args.length){const key=args.shift(),value=args.shift();if(!key?.startsWith('--')||!allowed.includes(key.slice(2))||!value||value.startsWith('--')||Object.hasOwn(options,key.slice(2)))throw Error('Invalid or duplicate import argument');options[key.slice(2)]=value}
 if(allowed.filter(k=>k!=='archive-code').some(k=>!options[k]))throw Error('Missing required import argument')
 if(mode==='guard'||mode==='check-competition')assertDriblImportExecution({expectedSha:options['expected-sha'],headSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),envFileExists:existsSync(resolve('.env'))})
 if(mode==='guard')return {verified:true,sha:options['expected-sha'],activationEligible:false}
 if(mode==='admit')return admitDriblCapture(JSON.parse(readFileSync(options.run,'utf8')),JSON.parse(readFileSync(options.artifacts,'utf8')),{repository:options.repository,headSha:options['head-sha'],runId:options['run-id']})
 if(mode==='preview'){
  const result=await previewDriblImport({directory:resolve(options.capture),code:options.code,archiveCode:options['archive-code']??null,...(loadCapture?{loadCapture}:{})})
  writeFileSync(options.output,JSON.stringify(result)+'\n',{flag:'wx',mode:0o600})
  return {verified:true,activationEligible:false,code:result.code,archiveCode:result.archiveCode,currentReports:result.current.reports.length,archiveReports:result.archive?.reports.length??0}
 }
 if(!db){if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Actions database configuration required; no .env loading');const {createClient}=await import('@supabase/supabase-js');db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})}
 return checkDriblImportCompetition({db,slug:options.slug,code:options.code})
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runDriblImportCli(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1})
