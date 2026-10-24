#!/usr/bin/env node
// Explicit source capture, closed offline verification, or native preview. No database client.
import {readFileSync,lstatSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {captureDriblDirectory,verifyDriblDirectory,validateDriblCaptureOptions,parseDriblScopeCode,driblScopeCode} from './dribl-capture.mjs'
import {loadDriblImportCapture} from './dribl-import.mjs'
const proof=(ok,message)=>{if(!ok)throw Error('dribl CLI: '+message)}
const local=p=>{proof(typeof p==='string'&&p.length>0&&!/^[a-z][a-z\d+.-]*:/i.test(p),'local artifact path required');return resolve(p)}
const summaries=r=>r.leagues.map(l=>({code:l.code,verdict:l.verdict,fullImportEligible:l.fullImportEligible,coverage:l.coverage,inventoryComplete:l.inventory.complete,issues:l.issues}))
export function parseDriblCliArgs(args){
 proof(Array.isArray(args),'arguments required')
 if(args[0]==='verify'){proof(args.length===2,'usage: verify <directory>');return {command:'verify',directory:local(args[1])}}
 if(args[0]==='preview'){proof(args.length===4&&args[2]==='--scope','usage: preview <directory> --scope tenant:season:competition:league');return {command:'preview',directory:local(args[1]),scope:parseDriblScopeCode(args[3])}}
 proof(args[0]==='capture'&&args.length>=9&&args.length%2===1,'usage: capture --scopes <local JSON array> --max-requests 1..1000 --reports all|1..3 --output <NEW directory> [--max-pages 1..100]')
 const flags=new Map()
 for(let i=1;i<args.length;i+=2){proof(['--scopes','--max-requests','--reports','--output','--max-pages'].includes(args[i])&&!flags.has(args[i])&&typeof args[i+1]==='string','unknown, missing or duplicate option');flags.set(args[i],args[i+1])}
 for(const key of ['--scopes','--max-requests','--reports','--output'])proof(flags.has(key),'missing '+key)
 const file=local(flags.get('--scopes')),s=lstatSync(file);proof(s.isFile()&&!s.isSymbolicLink()&&s.size<=100_000,'bounded regular scope JSON file required')
 const scopes=JSON.parse(readFileSync(file,'utf8')),reports=flags.get('--reports');proof(reports==='all'||/^[1-3]$/.test(reports),'reports must be all or 1..3')
 proof(/^[1-9]\d{0,3}$/.test(flags.get('--max-requests')),'integer total request budget required')
 if(flags.has('--max-pages'))proof(/^[1-9]\d{0,2}$/.test(flags.get('--max-pages')),'integer page budget required')
 const options=validateDriblCaptureOptions({scopes,maxRequests:Number(flags.get('--max-requests')),reportLimit:reports==='all'?null:Number(reports),maxPages:flags.has('--max-pages')?Number(flags.get('--max-pages')):100,asOfDate:new Date().toISOString().slice(0,10)})
 const directory=local(flags.get('--output'));proof(!existsSync(directory),'output must be a new directory')
 return {command:'capture',directory,options}
}
export async function runDriblCli(args){
 const c=parseDriblCliArgs(args)
 if(c.command==='capture'){
  const m=await captureDriblDirectory({directory:c.directory,options:c.options}),r=JSON.parse(readFileSync(resolve(c.directory,'result.json'),'utf8'))
  return {exitCode:0,value:{directory:c.directory,success:m.success,requests:m.snapshot.requests,stopped:m.snapshot.stopped,codeSha256:m.codeSha256,resultSha256:m.resultSha256,activationEligible:false,leagues:summaries(r)}}
 }
 const receipt=await verifyDriblDirectory(c.directory)
 if(c.command==='verify')return {exitCode:0,value:{verified:true,requests:receipt.requests,codeSha256:receipt.codeSha256,resultSha256:receipt.resultSha256,activationEligible:false,leagues:summaries(receipt.result)}}
 const code=driblScopeCode(c.scope),league=receipt.result.leagues.find(l=>l.code===code);proof(league,'scope is not part of this capture')
 if(!league.fullImportEligible)return {exitCode:2,value:{verdict:'HOLD',code,fullImportEligible:false,issues:league.issues,activationEligible:false}}
 return {exitCode:0,value:await loadDriblImportCapture(c.directory,{...c.scope,current:true})}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const r=await runDriblCli(process.argv.slice(2));process.stdout.write(JSON.stringify(r.value,null,2)+'\n');process.exitCode=r.exitCode}catch(e){process.stderr.write(e.message+'\n');process.exitCode=e.exitCode===4?4:1}
}
