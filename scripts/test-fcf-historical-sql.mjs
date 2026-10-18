import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
if (process.env.FCF_HISTORY_DISPOSABLE_TEST !== '1' || !/^slff_fcf_historical_test_[a-z0-9_]+$/.test(process.env.SUPABASE_DB_CONTAINER ?? '')) throw Error('Explicit owned FCF disposable container required')
execFileSync('docker',['exec','-i',process.env.SUPABASE_DB_CONTAINER,'psql','-U','supabase_admin','-d','postgres','-X','-v','ON_ERROR_STOP=1'],{
 input:readFileSync(new URL('../supabase/tests/fcf-historical-cleanup.sql',import.meta.url),'utf8'),stdio:['pipe','inherit','inherit'],
})
