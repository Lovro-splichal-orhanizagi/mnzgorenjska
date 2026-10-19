import {readFileSync, writeFileSync} from 'node:fs'
import {resolve, dirname} from 'node:path'
import {auditFussballCohort} from './lib/fussball-cohort.mjs'

try {
  const [input, output, ...extra]=process.argv.slice(2)
  if (!input || !output || extra.length) throw Error('Usage: node scripts/preveri-fussball-kohorto.mjs <capture-index.json> <result.json>')
  if (resolve(input)===resolve(output)) throw Error('Output must differ from capture index')
  const result=auditFussballCohort(JSON.parse(readFileSync(input,'utf8')), {baseDirectory:dirname(resolve(input))})
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify({completeInventories:result.completeInventories, leagues:result.leagues.map(l=>({key:l.key,status:l.status,supportedReports:l.supportedReports,missingRounds:l.missingRounds.length,missingReports:l.missingReports.length,issues:l.issues.length,durationMs:l.durationMs})),seasonCoverageVerified:false,activationEligible:false}))
  process.exitCode=result.completeInventories===result.leagues.length?0:3
} catch (error) {
  console.error(error.message)
  process.exitCode=1
}
