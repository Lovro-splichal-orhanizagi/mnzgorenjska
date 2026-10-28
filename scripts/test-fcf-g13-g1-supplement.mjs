// Narrow compatibility regression. The explicit owned clone path never COMMITs.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {sessionSQL} from './fcf-g13-repair.mjs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
const expected=['away_team_id','home_team_id','match_id','round_id'].map(col=>['private_fcf_g1_supplement.markers',col,col==='match_id'?'matches':col==='round_id'?'rounds':'teams'])
test('closed G13 registry includes exactly the four supplemental root foreign keys in sorted order',()=>{
 const registry=JSON.parse(read('./fcf-g13-fks.json'))
 assert.deepEqual(registry.filter(([rel])=>rel.startsWith('private_fcf_g1_supplement.')),expected)
 const start=registry.findIndex(([rel])=>rel==='private_fcf_g1_supplement.markers')
 assert.deepEqual(registry.slice(start,start+4),expected)
 assert.ok(registry[start-1][0]<expected[0][0]&&registry[start+4][0]>expected[0][0])
})
test('actual supplemental DDL agrees with G13 catalog and immutable references hold before repair',{skip:process.env.FCF_G13_G1_OWNED_SQL_TEST!=='1'},()=>{
 const container='slff-fcf-g1-native-admin-20261028'
 const ownership=JSON.parse(execFileSync('docker',['inspect','--format','{"id":{{json .Id}},"owner":{{json (index .Config.Labels "slff.test.owner")}},"network":{{json .HostConfig.NetworkMode}},"mounts":{{json .Mounts}},"ports":{{json .NetworkSettings.Ports}},"bindings":{{json .HostConfig.PortBindings}},"running":{{json .State.Running}}}',container],{encoding:'utf8'}))
 assert.deepEqual(ownership,{id:'a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575',owner:'fcf-g1-native-admin-20261028',network:'none',mounts:[],ports:{},bindings:{},running:true})
 // Clone predates these two tables; use only their exact reviewed CREATE TABLE DDL.
 const scout=read('../supabase/migrations/20261027180000_scout_ekipa.sql')
 const prerequisites=['scout.dogodki','scout.prisotnost'].map(name=>{
  const body=scout.match(new RegExp('create table '+name.replaceAll('.','\\.')+' \\([\\s\\S]*?\\n\\);'))?.[0]
  assert.ok(body,'exact Scout prerequisite missing')
  return `select to_regclass('${name}') is null as missing \\gset\n\\if :missing\n${body}\n\\endif\n`
 }).join('\n')
 const sql='BEGIN ISOLATION LEVEL READ COMMITTED;set local client_min_messages=warning;\n'+prerequisites+'\n'+read('../supabase/migrations/20261028042000_fcf_future_g1_native.sql')+'\n'+read('../supabase/migrations/20261028170000_fcf_g1_supplement_native.sql')+'\n'+sessionSQL()+'\n'+read('../supabase/tests/fcf-g13-g1-supplement.sql')+'\nROLLBACK;\n'
 const out=execFileSync('docker',['exec','-i','--user','postgres',container,'psql','-X','-U','supabase_admin','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024})
 assert.match(out,/G13_SUPPLEMENT_COMPAT_PASS/)
 console.log(out.trim())
})
