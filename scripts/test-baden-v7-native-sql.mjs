// TEST ONLY: every migration and synthetic fixture is explicitly rolled back.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync,spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
const name='slff-fcf-g1-native-admin-20261028'
function owned(){
 const [d]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}))
 assert.equal(d.Id,'a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575');assert.equal(d.Config.Labels['slff.test.owner'],'fcf-g1-native-admin-20261028');assert.equal(d.State.Running,true);assert.equal(d.HostConfig.NetworkMode,'none');assert.deepEqual(d.Mounts,[]);assert.deepEqual(d.NetworkSettings.Ports,{});assert.deepEqual(d.HostConfig.PortBindings,{})
}
test('owned rollback: installed Spanish G1 NULL survives Baden W policies and both legitimate writer roles without schema USAGE',{skip:process.env.SLFF_BADEN_V7_OWNED_SQL!=='1'},()=>{
 const files=['supabase/migrations/20261028170000_fcf_g1_supplement_native.sql','supabase/tests/fcf-g1-supplement-native.sql','supabase/migrations/20261028180000_baden_history_cards_composition.sql','supabase/migrations/20261028181000_baden_history_runtime_context.sql','supabase/migrations/20261028182000_baden_composed_native_admission.sql','supabase/tests/baden-v7-native-bridge.sql']
 const retainedAclCheck=readFileSync(new URL('../supabase/tests/match-result-check-acl.sql',import.meta.url),'utf8').split('create temporary table acl_fixture')[0].replace(/^begin;\s*$/m,'')
 const sql=files.map(path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')+(path.includes('182000_')?'\n'+retainedAclCheck:'')).join('\n')
 owned()
 const result=spawnSync('docker',['exec','-i','--user','postgres',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=0'],{input:'BEGIN;\n'+sql+'\nROLLBACK;\n',encoding:'utf8',maxBuffer:8*1024*1024})
 assert.equal(result.status,0,result.stderr);assert.doesNotMatch(result.stderr,/ERROR:|FATAL:/,result.stdout+'\n'+result.stderr)
 assert.match(result.stdout,/BADEN_COMPOSED_NATIVE_ACTIVE_USERS_PASS/);assert.match(result.stdout,/BADEN_V7_TWO_ROLES_CLOSED_SCHEMAS_AND_G1_COEXISTENCE_PASS/);assert.match(result.stdout,/ROLLBACK/)
 console.log(result.stderr.trim())
})
