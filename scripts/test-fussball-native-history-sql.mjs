// TEST ONLY. Never connects through environment credentials or a default DB.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {badenCanonical} from './lib/fussball-native-history-policy.mjs'
const name='slff-fcf-g1-native-admin-20261028'
function owned(){
 const [d]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}))
 assert.equal(d.Id,'a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575')
 assert.equal(d.Config.Labels['slff.test.owner'],'fcf-g1-native-admin-20261028');assert.equal(d.HostConfig.NetworkMode,'none')
 assert.deepEqual(d.Mounts,[]);assert.deepEqual(d.NetworkSettings.Ports,{});assert.deepEqual(d.HostConfig.PortBindings,{});assert.equal(d.State.Running,true)
}
test('owned offline clone: forward DDL and exact Baden preparation transaction',{skip:process.env.SLFF_BADEN_OWNED_SQL!=='1'},()=>{
 owned() // Must precede EACH mutating phase; all SQL here is one rollback phase.
 const migration=readFileSync(new URL('../supabase/migrations/20261028180000_baden_history_cards_composition.sql',import.meta.url),'utf8')
 const cases=readFileSync(new URL('../supabase/tests/baden-native-history.sql',import.meta.url),'utf8')
 const result=spawnSync('docker',['exec','-i','--user','postgres',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=0'],{input:`BEGIN;\n${migration}\n${cases}\nROLLBACK;\n`,encoding:'utf8',maxBuffer:4*1024*1024})
 assert.equal(result.status,0,result.stderr);assert.doesNotMatch(result.stderr,/ERROR:|FATAL:/,result.stdout+'\n'+result.stderr)
 const payload=JSON.parse(result.stdout.split('\n').find(s=>s.trimStart().startsWith('BADEN_HASH_JSON:')).trim().slice('BADEN_HASH_JSON:'.length))
 for(const [field,digest]of [['policy','policySha256'],['markers','markerInventorySha256'],['bindings','bindingSha256']])assert.equal(createHash('sha256').update(badenCanonical(payload[field])).digest('hex'),payload[digest])
 assert.match(result.stdout,/BADEN_TEST_POSITIVE_AND_NEGATIVE_PASS/);assert.match(result.stdout,/ROLLBACK/)
})
