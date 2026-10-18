import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
const container=process.env.SUPABASE_DB_CONTAINER
if(!container||process.env.HISTORICAL_STATISTICS_DISPOSABLE_TEST!=='1')throw Error('Explicit owned disposable DB required')
execFileSync('docker',['exec','-i',container,'psql','-U',process.env.SUPABASE_DB_USER??'postgres','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1'],{input:readFileSync(new URL('../supabase/tests/hns-women-deadline.sql',import.meta.url)),stdio:['pipe','inherit','inherit']})
