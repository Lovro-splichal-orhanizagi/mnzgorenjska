// The CI source is read only. Each mutating race group gets its own ACL clone.
import {execFileSync} from 'node:child_process'
import {withHnsDisposableDatabase} from './lib/hns-disposable-test.mjs'
const run=(file,env)=>execFileSync(process.execPath,[`scripts/${file}`],{env,stdio:'inherit'})
await withHnsDisposableDatabase(process.env,env=>{
 for(const file of ['test-hns-women-bootstrap-sql.mjs','test-hns-women-deadline-sql.mjs','test-hns-women-release-sql.mjs','test-hns-women-release-race.mjs'])run(file,env)
})
await withHnsDisposableDatabase(process.env,env=>run('test-hns-women-deadline-race.mjs',env))
console.log('PASS HNS canonical authority and both race groups in removed owned ACL-preserving clones')
