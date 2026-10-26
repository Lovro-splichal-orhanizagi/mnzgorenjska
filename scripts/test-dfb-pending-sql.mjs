// Actual native admission/finality/market regression; only explicitly disposable targets.
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
const container=process.env.SUPABASE_DB_CONTAINER,db=process.env.SUPABASE_TEST_DB
const owned=container==='supabase_db_slff_dfb_pending_20261026'&&db==='postgres'
const ci=container==='supabase_db_mnzgorenjska'&&db==='postgres'&&process.env.CI==='true'&&process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='Lovro-splichal-orhanizagi/mnzgorenjska'&&process.env.GITHUB_JOB==='varnost'
if(!owned&&!ci)throw Error('Explicit owned DFB pending database or exact disposable CI job required')
let fixture=readFileSync(new URL('../supabase/tests/vklop-dfb-regije.sql',import.meta.url),'utf8')
if(!/rollback;\s*$/.test(fixture))throw Error('Expected rollback-only native DFB fixture')
fixture=fixture.replace(/rollback;\s*$/,'')
const checks=readFileSync(new URL('../supabase/tests/dfb-pending-reports.sql',import.meta.url),'utf8')
execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-v','ON_ERROR_STOP=1','-v','regional_slug=de-regionalliga-suedwest','-v','current_clubs=18','-v','current_rounds=34'],{input:fixture+'\n'+checks,stdio:['pipe','inherit','inherit']})
