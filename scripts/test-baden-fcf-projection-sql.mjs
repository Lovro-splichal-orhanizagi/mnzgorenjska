// Exact owned disconnected clone only. Every DDL/DML phase explicitly rolls back.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
const container='slff-fcf-g1-native-admin-20261028',baseId='a2e0f1bf6705b117356d75f1b4caa4e82b48a26874b9b9e8c10382a86f9d1575'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
function owned(){const d=JSON.parse(execFileSync('docker',['inspect','--format','{"id":{{json .Id}},"owner":{{json (index .Config.Labels "slff.test.owner")}},"running":{{json .State.Running}},"network":{{json .HostConfig.NetworkMode}},"mounts":{{json .Mounts}},"ports":{{json .NetworkSettings.Ports}},"bindings":{{json .HostConfig.PortBindings}}}',container],{encoding:'utf8'}));assert.deepEqual(d,{id:baseId,owner:'fcf-g1-native-admin-20261028',running:true,network:'none',mounts:[],ports:{},bindings:{}})}
function run(sql){assert.match(sql,/^BEGIN/i);assert.match(sql,/ROLLBACK;\s*$/i);owned();return execFileSync('docker',['exec','-i','--user','postgres',container,'psql','-X','-U','supabase_admin','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']})}
const empty797=`DO $$declare f record;n bigint;begin
 for f in select ns.nspname,t.relname,a.attname,c.convalidated,cardinality(c.conkey)children,cardinality(c.confkey)parents,pa.attname parentcol from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace ns on ns.oid=t.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=c.conkey[1]join pg_attribute pa on pa.attrelid=c.confrelid and pa.attnum=c.confkey[1]where c.contype='f'and c.confrelid='public.competitions'::regclass loop
  if not f.convalidated or f.children<>1 or f.parents<>1 or f.parentcol<>'id'then raise exception 'TEST unsupported competition FK';end if;
  execute format('select count(*)from %I.%I where %I in(766,797)',f.nspname,f.relname,f.attname)into n;if n<>0 then raise exception 'TEST existing797 dependent: %.%',f.nspname,f.relname;end if;
 end loop;
 for f in select ns.nspname,t.relname,a.attname from pg_attribute a join pg_class t on t.oid=a.attrelid join pg_namespace ns on ns.oid=t.relnamespace where t.relkind in('r','p')and a.attnum>0 and not a.attisdropped and(ns.nspname in('public','scout')or ns.nspname like 'private\\_%'escape '\\')and a.attname in('competition_id','insider_competition_id')loop
  execute format('select count(*)from %I.%I where %I in(766,797)',f.nspname,f.relname,f.attname)into n;if n<>0 then raise exception 'TEST existing797 direct/nonFK dependency';end if;
 end loop;
 if exists(select 1 from scout.dnevnik where parametri->>'competition_id'in('766','797')or parametri->>'selekcija'in('766','797'))then raise exception 'TEST existing797 JSON user association';end if;
end$$;`
function snapshot(){
 const tables=JSON.parse(run(`BEGIN READ ONLY;${empty797}\nselect jsonb_agg(jsonb_build_array(n.nspname,c.relname)order by n.nspname,c.relname)from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in('r','p')and(n.nspname in('public','scout')or n.nspname like 'private\\_%'escape '\\'or(n.nspname='auth'and c.relname='users'));ROLLBACK;`))
 const quote=x=>'"'+x.replaceAll('"','""')+'"',literal=x=>"'"+x.replaceAll("'","''")+"'"
 const rows=tables.map(([ns,t])=>`select ${literal(ns+'.'+t)} rel,count(*)n,encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(x)order by to_jsonb(x)::text collate "C"),'[]')::text,'UTF8')),'hex')sha from ${quote(ns)}.${quote(t)}x`).join(' union all ')
 return JSON.parse(run(`BEGIN READ ONLY;select jsonb_build_object('headers',(select jsonb_agg(to_jsonb(c)order by id)from competitions c where id in(766,797)),'headerSha',(select encode(sha256(convert_to(jsonb_agg(to_jsonb(c)order by id)::text,'UTF8')),'hex')from competitions c where id in(766,797)),'relations',(select jsonb_agg(to_jsonb(r)order by rel)from(${rows})r),'g13Count',(select count(*)from matches m join rounds r on r.id=m.round_id where r.competition_id=801),'g13',(select encode(sha256(convert_to(jsonb_agg(to_jsonb(m)order by m.id)::text,'UTF8')),'hex')from matches m join rounds r on r.id=m.round_id where r.competition_id=801),'fkCatalog',(select jsonb_agg(jsonb_build_object('rel',conrelid::regclass::text,'parent',confrelid::regclass::text,'definition',pg_get_constraintdef(oid),'validated',convalidated,'deferrable',condeferrable,'deferred',condeferred)order by conrelid::regclass::text,conname)from pg_constraint where contype='f'));ROLLBACK;`))
}
for(const repeat of [false,true])test(`owned rollback FCF projection with Baden forward183 (${repeat?'already installed':'fresh forward'})`,{skip:process.env.BADEN_FCF_PROJECTION_OWNED_TEST!=='1'},()=>{
 const before=snapshot();assert.equal(before.g13Count,272);console.log('BEFORE_HEADER_SHA '+before.headerSha);if(process.env.BADEN_FCF_EVIDENCE_DIR)writeFileSync(process.env.BADEN_FCF_EVIDENCE_DIR+'/'+(repeat?'repeat':'fresh')+'-before.json',JSON.stringify(before,null,2)+'\n')
 const files=['20261028042000_fcf_future_g1_native.sql','20261028170000_fcf_g1_supplement_native.sql','20261028180000_baden_history_cards_composition.sql','20261028181000_baden_history_runtime_context.sql','20261028182000_baden_composed_native_admission.sql']
 let setup=files.map(n=>read('supabase/migrations/'+n)).join('\n')
 setup+='\ncreate temporary table capture_meta as select proowner,proacl,proconfig,provolatile,prosecdef from pg_proc where oid=\'private_fcf_future_projection.capture(text,text[])\'::regprocedure;\n'
 if(process.env.BADEN_FCF_TEST_OMIT_FORWARD!=='1'){setup+='\n'+read('supabase/migrations/20261028183000_baden_fcf_projection_compat.sql');if(repeat)setup+='\n'+read('supabase/migrations/20261028183000_baden_fcf_projection_compat.sql')}
 try{const out=run('BEGIN;set local client_min_messages=warning;\n'+empty797+'\n'+setup+'\n'+read('supabase/tests/baden-fcf-projection-compat.sql')+'\nROLLBACK;');assert.match(out,/BADEN_FCF_PROJECTION_COMPAT_PASS/);console.log(out.trim())}
 finally{const after=snapshot();assert.deepEqual(after,before,'all retained headers/FKs/row counts/full hashes and original272 G13 fixtures restored exactly');if(process.env.BADEN_FCF_EVIDENCE_DIR)writeFileSync(process.env.BADEN_FCF_EVIDENCE_DIR+'/'+(repeat?'repeat':'fresh')+'-after.json',JSON.stringify(after,null,2)+'\n')}
})

test('CI optional and installed harnesses apply the exact latest forward before the unchanged projection fixture',()=>{
 const path=new URL('./test-fcf-future-native-projection-sql.mjs',import.meta.url),source=readFileSync(path,'utf8'),requests=[]
 const code=source.replace(/^import .*\n/gm,'').replaceAll('import.meta.url',JSON.stringify(path.href))
 new Function('test','readFileSync','execFileSync','assertFcfDisposableTest','process',code)((name,options,fn)=>fn(),readFileSync,(command,args,options)=>{assert.equal(command,'docker');requests.push(options.input)},()=>container,{env:{FCF_HISTORY_DISPOSABLE_TEST:'1'}})
 assert.equal(requests.length,2)
 for(const sql of requests){const control=String.fromCharCode(92);assert.ok(sql.includes('as baden_forward '+control+'gset\n'+control+'if :baden_forward\n'));assert.ok(!sql.includes(control+control+'gset'));assert.ok(sql.indexOf('BADEN_FCF_PROJECTION: exact additive capture delta required')<sql.indexOf('create temporary table projection_legacy'));assert.match(sql,/rollback;$/)}
})
