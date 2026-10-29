// Exact owned disconnected clone only. Every DDL/DML phase explicitly rolls back.
import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {fcfProjectionOptionalBadenCompatibilitySQL} from './lib/fcf-projection-optional-compat.mjs'
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
 new Function('test','readFileSync','execFileSync','assertFcfDisposableTest','process','fcfProjectionOptionalBadenCompatibilitySQL',code)((name,options,fn)=>fn(),readFileSync,(command,args,options)=>{assert.equal(command,'docker');requests.push(options.input)},()=>container,{env:{FCF_HISTORY_DISPOSABLE_TEST:'1'}},fcfProjectionOptionalBadenCompatibilitySQL)
 assert.equal(requests.length,2)
 for(const sql of requests){assert.ok(sql.includes('f607b30f1cfbad5b57d7259c6aa1c561c8de8ff78ccb40101446256d0954e5ea'),'optional compatibility must recognize exact9410 epoch');const control=String.fromCharCode(92);assert.ok(sql.includes('as baden_forward '+control+'gset\n'+control+'if :baden_forward\n'));assert.ok(!sql.includes(control+control+'gset'));assert.ok(sql.indexOf('BADEN_FCF_PROJECTION: exact additive capture delta required')<sql.indexOf('create temporary table projection_legacy'));assert.match(sql,/rollback;$/)}
})

// Pure reconstruction of the exact installed epochs; never executes SQL.
test('exact9410 body preserves all Baden183 guards and appends only two protected tables/five FKs',()=>{
 const sha=s=>createHash('sha256').update(s).digest('hex'),old=read('supabase/migrations/20261028170000_fcf_g1_supplement_native.sql').split('$projection$')[1],forward=read('supabase/migrations/20261028183000_baden_fcf_projection_compat.sql'),supplement=read('supabase/migrations/20261029141000_fcf_g1_9410_durable.sql').split('$projection$')[1],addition=supplement.split('$addition$')[1]
 assert.equal(sha(old),'1d7d488ebaa2e871b04e87978ab8549864b2e8e09e4d0bfc97800007ea8fbfb1')
 const baden=old.replace('\nbegin\n',()=> '\nbegin\n'+forward.split('$addition$')[1]).replace(' -- Removed cleanup goal identities retain target/match association for deleted',()=>forward.split('$guard$')[1]+' -- Removed cleanup goal identities retain target/match association for deleted')
 assert.equal(sha(baden),'ef80eb6449eb91f4e12c24ec2db13ae13a2b595a7c97ca65b60215af0876a99f')
 let joined=baden.replace('\nbegin\n',()=> '\nbegin\n'+addition);if(supplement.includes('$fkparents_old$'))joined=joined.replace(supplement.split('$fkparents_old$')[1],()=>supplement.split('$fkparents_new$')[1]);assert.ok(joined.includes("c.confrelid in('private_fcf_g1_9410.markers'::regclass,'private_fcf_g1_9410.receipts'::regclass)"),'exact9410 must enumerate both new private incoming FK parents');assert.equal(sha(joined),'f607b30f1cfbad5b57d7259c6aa1c561c8de8ff78ccb40101446256d0954e5ea');assert.equal(joined.replace(addition,'').replace(supplement.split('$fkparents_new$')[1],()=>supplement.split('$fkparents_old$')[1]),baden);assert.equal((addition.match(/"definition":"FOREIGN KEY/g)??[]).length,5)
 const full=read('supabase/migrations/20261029141000_fcf_g1_9410_durable.sql'),observer=full.split('$projection$')[3],observerAddition=observer.split('$addition$')[1],oldObserver=baden.replace(' if cid=783 then perform private_fcf_future_target_release.quiet_g9();end if;\n',''),newObserver=oldObserver.replace('\nbegin\n',()=> '\nbegin\n'+observerAddition).replace(observer.split('$fkparents_old$')[1],()=>observer.split('$fkparents_new$')[1]).replace("'supplementalMarker',public.get_installed_fcf_g1_supplement(),","'supplementalMarker',public.get_installed_fcf_g1_supplement(),'supplement4109410Marker',public.get_installed_fcf_g1_4109410_supplement(),");assert.equal(sha(newObserver),'083cc0d98ad3d6b775ead5db2bebe645f28a4f6dae7fa9766240dac5d2d55bee');assert.ok(observer.includes(sha(newObserver)));assert.ok(newObserver.includes("c.confrelid in('private_fcf_g1_9410.markers'::regclass,'private_fcf_g1_9410.receipts'::regclass)"))
 const sql=fcfProjectionOptionalBadenCompatibilitySQL(),exact=sql.split('\\if :fcf_exact9410\n')[1].split('\\else\n')[0]
 for(const [name,label]of [['registry','protected'],['shapes','two-table'],['expected_fk','five FK']]){const expected=JSON.parse(addition.match(new RegExp(name+":="+name+"\\|\\|'([^']+)'"))[1]);if(name==='registry'){assert.deepEqual(Object.keys(expected).sort(),['private_fcf_g1_9410.markers','private_fcf_g1_9410.receipts']);for(const r of Object.values(expected))assert.deepEqual(r,{where:'true',user:false,round:'false',match:'false'})}else assert.ok(exact.includes(JSON.stringify(expected)),label+' metadata must match exact applied9410 delta')}
 assert.match(exact,/actual_shapes=/);assert.ok(exact.includes("or confrelid in('private_fcf_g1_9410.markers'::regclass,'private_fcf_g1_9410.receipts'::regclass)"),'optional helper must close both incoming parents too');assert.match(exact,/except all/);assert.match(exact,/no rewrite/);assert.doesNotMatch(exact,/execute replace|create or replace|alter table/i)
 assert.ok(sql.includes('\\else\n'+forward+'\n\\endif'),'17/183 branch remains byte-identical and unknown bodies retain original HOLD')
})

test('fresh-GHA projection fixture verifies protected9410 snapshots and rejects9410/Baden schema drift',()=>{
 const sql=read('supabase/tests/fcf-future-native-projection.sql')
 for(const text of ['optional compatibility leaves exact9410 body unchanged','relations,private_fcf_g1_9410.markers,count','relations,private_fcf_g1_9410.receipts,count','alter table private_fcf_g1_9410.markers add column','alter table private_fcf_g1_9410.receipts add column','references private_fcf_g1_9410.markers(match_id)','references private_fcf_g1_9410.receipts(match_id)','alter table private_baden_history.prepared add column','all9410/Baden shape and FK probes roll back exactly'])assert.ok(sql.includes(text),text)
})

test('both projection fixtures retain empty-child FK controls for9410 markers and receipts',()=>{
 for(const file of ['supabase/tests/fcf-future-native-projection.sql','supabase/tests/fcf-g1-readonly-projection.sql']){const sql=read(file);for(const table of ['markers','receipts'])assert.ok(sql.includes('references private_fcf_g1_9410.'+table+'(match_id)'),file+' '+table)}
})
