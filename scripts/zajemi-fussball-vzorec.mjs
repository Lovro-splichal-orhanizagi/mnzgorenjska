import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {realpathSync} from 'node:fs'
import {captureFussballScreenDirectory,verifyFussballScreenDirectory} from './fussball-screen.mjs'
export async function runFussballScreenCli(args){
 const mode=args.shift(),options={}
 if(mode==='verify'&&args.length===1)return verifyFussballScreenDirectory(resolve(args[0]))
 if(mode!=='capture')throw Error('Use capture --seed-url URL --staffel ID --season YYYY/YY --max-requests 1..80 --reports 1..3 --output NEW_DIRECTORY, or verify DIRECTORY')
 while(args.length){const k=args.shift();if(!['--seed-url','--staffel','--season','--max-requests','--reports','--output'].includes(k)||!args.length||Object.hasOwn(options,k))throw Error(`Invalid or duplicate option ${k}`);options[k]=args.shift()}
 if(!options['--output']||!/^\d+$/.test(options['--max-requests']??'')||!/^\d+$/.test(options['--reports']??''))throw Error('Explicit output, request budget and report limit required')
 const directory=resolve(options['--output']),m=await captureFussballScreenDirectory({directory,options:{seedUrl:options['--seed-url'],staffel:options['--staffel'],season:options['--season'],maxRequests:Number(options['--max-requests']),reportLimit:Number(options['--reports'])}})
 return {success:m.success,activationEligible:false,sezonskiUvozPodprt:false,requests:m.snapshot.requests,output:directory}
}
const isMain=()=>{try{return !!process.argv[1]&&realpathSync(resolve(process.argv[1]))===fileURLToPath(import.meta.url)}catch{return false}}
if(isMain())runFussballScreenCli(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.message);process.exitCode=1})
