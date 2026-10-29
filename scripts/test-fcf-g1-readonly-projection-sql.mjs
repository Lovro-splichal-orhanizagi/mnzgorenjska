// CI disposable DB only; every synthetic fixture/DDL change explicitly rolls back.
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'
test('fresh schema G1 observer preserves imported G9, counts users and rejects schema/FK drift',{skip:process.env.FCF_HISTORY_DISPOSABLE_TEST!=='1'},()=>{
 const container=assertFcfDisposableTest(),sql=readFileSync(new URL('../supabase/tests/fcf-g1-readonly-projection.sql',import.meta.url),'utf8')
 execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',process.env.FCF_TARGET_TEST_DB??'postgres','-X','-q','-v','ON_ERROR_STOP=1'],{input:'BEGIN;\n'+sql+'\nROLLBACK;',timeout:180000,maxBuffer:8*1024*1024})
})
