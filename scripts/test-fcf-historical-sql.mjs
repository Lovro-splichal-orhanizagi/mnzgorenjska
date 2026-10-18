import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
const container=assertFcfDisposableTest()
execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d','postgres','-X','-v','ON_ERROR_STOP=1'],{
 input:readFileSync(new URL('../supabase/tests/fcf-historical-cleanup.sql',import.meta.url),'utf8'),stdio:['pipe','inherit','inherit'],
})
