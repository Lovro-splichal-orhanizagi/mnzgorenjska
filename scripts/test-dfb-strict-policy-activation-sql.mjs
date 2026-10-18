// Explicitly owned disposable database; every fixture and activation rolls back.
import {execFileSync}from'node:child_process'
import {readFileSync}from'node:fs'
const container=process.env.SUPABASE_DB_CONTAINER,db=process.env.SUPABASE_TEST_DB
if(!container||!db)throw Error('Explicit disposable container AND database required')
execFileSync('docker',['exec','-i',container,'psql','-U',process.env.SUPABASE_DB_USER??'supabase_admin','-d',db,'-X','-v','ON_ERROR_STOP=1'],{
 input:readFileSync(new URL('../supabase/tests/dfb-strict-policy-activation.sql',import.meta.url),'utf8'),stdio:['pipe','inherit','inherit'],
})
