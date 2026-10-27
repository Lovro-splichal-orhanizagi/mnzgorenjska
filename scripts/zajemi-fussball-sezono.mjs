import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {captureFussballDirectory,verifyFussballDirectory} from './fussball-capture-evidence.mjs'

export async function runFussballCaptureCli(args){
 const mode=args.shift(),options={}
 if(mode==='verify'&&args.length===1)return verifyFussballDirectory(resolve(args[0]))
 if(mode!=='capture')throw Error('Use capture --seed-url URL --staffel ID --season YYYY/YY --max-requests N --reports all|N --output DIRECTORY, or verify DIRECTORY')
 while(args.length){const key=args.shift();if(!['--seed-url','--staffel','--season','--max-requests','--reports','--output','--card-policy'].includes(key)||!args.length||Object.hasOwn(options,key))throw Error(`Invalid or duplicate option ${key}`);options[key]=args.shift()}
 if(!options['--output']||!/^\d+$/.test(options['--max-requests']??'')||!(/^(?:all|\d+)$/.test(options['--reports']??'')))throw Error('Explicit output, request budget and report scope required')
 const result=await captureFussballDirectory({directory:resolve(options['--output']),options:{seedUrl:options['--seed-url'],staffel:options['--staffel'],season:options['--season'],maxRequests:Number(options['--max-requests']),...(options['--card-policy']?{cardPolicy:options['--card-policy']}:{}),reportLimit:options['--reports']==='all'?null:Number(options['--reports'])},onProgress:p=>console.log(JSON.stringify(p))})
 return {success:result.success,activationEligible:false,requests:result.snapshot.requests,resultSha256:result.resultSha256,output:resolve(options['--output'])}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)runFussballCaptureCli(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1})
