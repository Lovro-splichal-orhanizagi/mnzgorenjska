import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {realpathSync,readFileSync} from 'node:fs'
import {captureFussballBatchScreenDirectory,verifyFussballBatchScreenDirectory} from './fussball-batch-screen.mjs'

export async function runFussballBatchScreenCli(args){
 const mode=args.shift(),flags={}
 if(mode==='verify'&&args.length===1)return verifyFussballBatchScreenDirectory(resolve(args[0]))
 if(mode!=='capture')throw Error('Use capture --leagues OBSERVED_TUPLES.json --max-requests 1..80 --reports 1..3 --output NEW_DIRECTORY, or verify DIRECTORY')
 while(args.length){const k=args.shift();if(!['--leagues','--max-requests','--reports','--output'].includes(k)||!args.length||Object.hasOwn(flags,k))throw Error(`Invalid or duplicate option ${k}`);flags[k]=args.shift()}
 if(!flags['--leagues']||!flags['--output']||!/^\d+$/.test(flags['--max-requests']??'')||!/^\d+$/.test(flags['--reports']??''))throw Error('Explicit league scopes, output, total request budget and report limit required')
 const leagues=JSON.parse(readFileSync(resolve(flags['--leagues']),'utf8')),directory=resolve(flags['--output'])
 const m=await captureFussballBatchScreenDirectory({directory,options:{leagues,maxRequests:Number(flags['--max-requests']),reportLimit:Number(flags['--reports'])}})
 const result=JSON.parse(readFileSync(resolve(directory,'batch-result.json'),'utf8'))
 return {success:m.success,leagues:result.leagues.map(({scope,status,attempted,reason})=>({scope,status,attempted,reason,activationEligible:false,sezonskiUvozPodprt:false})),activationEligible:false,sezonskiUvozPodprt:false,requests:m.snapshot.requests,output:directory}
}
const isMain=()=>{try{return !!process.argv[1]&&realpathSync(resolve(process.argv[1]))===fileURLToPath(import.meta.url)}catch{return false}}
if(isMain())runFussballBatchScreenCli(process.argv.slice(2)).then(x=>{console.log(JSON.stringify(x));if(x.success===false)process.exitCode=1}).catch(e=>{console.error(e.message);process.exitCode=1})
