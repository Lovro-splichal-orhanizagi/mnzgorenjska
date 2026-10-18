import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('normal PR CI executes public HNS regressions and owned ACL-preserving SQL launcher before mutable race fixtures',()=>{
 const ci=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8'),code=ci.slice(ci.indexOf('  preveri:'),ci.indexOf('  varnost:')),sql=ci.slice(ci.indexOf('  varnost:'),ci.indexOf('  migracije:'))
 assert.match(code,/run: npm run test:hns-women\s/)
 assert.match(sql,/HNS_WOMEN_DISPOSABLE_TEST: '1'/);assert.match(sql,/run: npm run test:hns-women-ci\s/)
 assert.ok(sql.indexOf('npm run test:hns-women-ci')>sql.indexOf('supabase@2.117.0 db start'))
 assert.ok(sql.indexOf('npm run test:hns-women-ci')<sql.indexOf('Germany activation guard'))
 const hns=sql.slice(sql.indexOf('- name: HNS'),sql.indexOf('- name: Germany'))
 assert.ok(!hns.includes('SUPABASE_TEST_DB: postgres'));assert.ok(!hns.includes('secrets.'))
})
