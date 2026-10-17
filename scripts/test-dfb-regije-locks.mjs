// Hold a successful preflight transaction and prove concurrent writes block.
import { spawn, execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const container=process.env.SUPABASE_DB_CONTAINER
if(!container)throw Error('Explicit disposable SUPABASE_DB_CONTAINER required')
const args=['exec','-i',container,'psql','-U','postgres','-d',process.env.SUPABASE_TEST_DB??'postgres','-X','-v','ON_ERROR_STOP=1']
const sql=readFileSync(new URL('../supabase/tests/vklop-dfb-regije.sql',import.meta.url),'utf8').split('do $$ declare r jsonb; begin')[0]
const child=spawn('docker',[...args,'-v','regional_slug=de-regionalliga-nord','-v','current_clubs=18','-v','current_rounds=34'],{stdio:['pipe','pipe','pipe']})
let errors='',output=''
child.stderr.on('data',d=>errors+=d)
const ready=new Promise((ok,no)=>{
 child.stdout.on('data',d=>{output+=d;if(output.includes('REGIONAL_GATE_HELD'))ok()})
 child.on('exit',code=>{if(!output.includes('REGIONAL_GATE_HELD'))no(Error(`Gate failed ${code}: ${errors}`))})
})
child.stdin.write(sql+'\nselect pg_temp.de_check();\n\\echo REGIONAL_GATE_HELD\n')
await ready
try{
 for(const table of ['teams','players','rounds','matches','appearances','goals']){
  assert.throws(()=>execFileSync('docker',args,{input:`begin; lock table public.${table} in row exclusive mode nowait; rollback;`,encoding:'utf8',stdio:['pipe','pipe','pipe']}),e=>e.stderr.includes('could not obtain lock on relation'),table)
 }
 assert.throws(()=>execFileSync('docker',args,{input:"set lock_timeout='200ms'; update competitions set active=true where slug='de-regionalliga-nord';",encoding:'utf8',stdio:['pipe','pipe','pipe']}),e=>e.stderr.includes('lock timeout'))
 console.log('PASS regional preflight holds all statistics tables and target competition through commit')
}finally{child.stdin.end('rollback;\n')}
await new Promise((ok,no)=>child.on('exit',code=>code===0?ok():no(Error(errors))))
