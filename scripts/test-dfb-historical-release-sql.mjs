// Explicit disposable database only; every generated fixture and mutation rolls back.
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
const container=process.env.SUPABASE_DB_CONTAINER,db=process.env.SUPABASE_TEST_DB
if(!container||!db)throw Error('Explicit disposable container AND test database required')
const fixture=readFileSync(new URL('../supabase/tests/vklop-dfb-regije.sql',import.meta.url),'utf8').split('create function pg_temp.de_check(')[0]
const sql=fixture+readFileSync(new URL('../supabase/tests/dfb-historical-release.sql',import.meta.url),'utf8')
execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-v','ON_ERROR_STOP=1','-v','regional_slug=de-regionalliga-suedwest','-v','current_clubs=18','-v','current_rounds=34'],{input:sql,stdio:['pipe','inherit','inherit']})
