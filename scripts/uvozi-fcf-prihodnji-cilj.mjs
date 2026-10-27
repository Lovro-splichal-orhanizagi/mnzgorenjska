import {runFcfFutureTargetActions} from './fcf-future-target-actions.mjs'
const args=process.argv.slice(2)
try{if(args.length!==2||args[0]!=='--mode')throw Error('closed mode required');const result=await runFcfFutureTargetActions({mode:args[1]});process.exitCode=result.code}catch(error){process.stderr.write(error?.ambiguous?'FCF_FUTURE_WRITER: ambiguous commit; read back the private receipt before retry.\n':'FCF_FUTURE_WRITER: stage held; no success receipt.\n');process.exitCode=1}
