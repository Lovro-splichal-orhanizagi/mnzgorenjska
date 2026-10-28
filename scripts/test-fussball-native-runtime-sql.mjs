// TEST ONLY, explicitly owned network-none clone. No default connection/env DB.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
const name='slff-fcf-g1-native-admin-20261028'
function owned(){
 const [d]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}))
 assert.equal(d.Id,'a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575')
 assert.equal(d.Config.Labels['slff.test.owner'],'fcf-g1-native-admin-20261028');assert.equal(d.HostConfig.NetworkMode,'none')
 assert.deepEqual(d.Mounts,[]);assert.deepEqual(d.NetworkSettings.Ports,{});assert.deepEqual(d.HostConfig.PortBindings,{});assert.equal(d.State.Running,true)
}
test('owned offline rollback: distinct Baden BOUND getter accepts ordinary imports and refuses immutable drift',{skip:process.env.SLFF_BADEN_RUNTIME_OWNED_SQL!=='1'},()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const sql=['supabase/migrations/20261028071000_baden_history_cards_composition.sql','supabase/migrations/20261028072000_baden_history_runtime_context.sql','supabase/tests/baden-native-history.sql','supabase/tests/baden-native-runtime.sql'].map(read).join('\n')
 owned() // Immediately before the single mutating phase; ALL SQL rolls back.
 const result=spawnSync('docker',['exec','-i','--user','postgres',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=0'],{input:'BEGIN;\n'+sql+'\nROLLBACK;\n',encoding:'utf8',maxBuffer:4*1024*1024})
 assert.equal(result.status,0,result.stderr);assert.doesNotMatch(result.stderr,/ERROR:|FATAL:/,result.stdout+'\n'+result.stderr)
 assert.match(result.stdout,/BADEN_RUNTIME_BOUND_ORDINARY_AND_DRIFT_PASS/);assert.match(result.stdout,/ROLLBACK/)
 for(const mutation of ['body','url','date','phase','round','score','imported','appearance','goal','card'])assert.match(result.stderr,new RegExp('BADEN_RUNTIME_REFUSED '+mutation+':'))
 for(const phase of ['ACTIVE','USERS']){const matched=result.stderr.match(new RegExp('BADEN_RUNTIME_'+phase+'_FIXTURE_(?:PASS|GAP:[^\n]+)'));assert.ok(matched);console.log(matched[0])}
})
