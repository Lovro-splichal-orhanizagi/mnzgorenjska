import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createHash,randomBytes} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {assertFcfDisposableTest} from './lib/fcf-disposable-test.mjs'

const migration=new URL('../supabase/migrations/20261024210000_dribl_source_identities.sql',import.meta.url)
const quote=s=>`'${s.replaceAll("'","''")}'`
const idsArray=ids=>`array[${ids.map(quote).join(',')}]::text[]`
const player=(n,tenant='1RwNlWemjr')=>`dribl:${tenant}:user:${String(n).padStart(10,'0')}`
const key=id=>parseInt(createHash('sha256').update(id).digest('hex').slice(0,13),16)+2**52
function owned(env){
 assert.equal(env.DRIBL_IDENTITIES_DISPOSABLE_TEST,'1','Explicit Dribl disposable opt-in required')
 return assertFcfDisposableTest({...env,FCF_HISTORY_DISPOSABLE_TEST:'1'})
}
test('Dribl identity SQL requires an explicitly owned disposable container',()=>{
 const base={DRIBL_IDENTITIES_DISPOSABLE_TEST:'1',SUPABASE_DB_CONTAINER:'supabase_db_slff_fcf_historical_test_20261018_fresh'}
 assert.equal(owned(base),base.SUPABASE_DB_CONTAINER)
 for(const patch of [{DRIBL_IDENTITIES_DISPOSABLE_TEST:undefined},{SUPABASE_DB_CONTAINER:'supabase_db_production'},{SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska'}])assert.throws(()=>owned({...base,...patch}))
 assert.equal(owned({...base,SUPABASE_DB_CONTAINER:'supabase_db_mnzgorenjska',GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Lovro-splichal-orhanizagi/mnzgorenjska'}),'supabase_db_mnzgorenjska')
})
test('private Dribl identities preserve tenant namespaces, atomicity and service permissions',{
 skip:process.env.DRIBL_IDENTITIES_DISPOSABLE_TEST!=='1'&&'Explicit owned disposable Dribl SQL test only',
},async t=>{
 const container=owned(process.env)
 const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:8*1024**2})
 const labels=JSON.parse(docker(['inspect',container,'--format','{{json .Config.Labels}}']))
 assert.equal(labels['com.supabase.cli.project'],container.replace(/^supabase_db_/,''))
 const database=`slff_dribl_identity_${process.pid}_${randomBytes(5).toString('hex')}`
 const sql=(query,db=database)=>execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',db,'-X','-qAt','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:30000,maxBuffer:8*1024**2}).trim()
 sql(`create database ${database} template template0;`,'postgres')
 try{
  if(existsSync(migration))sql(readFileSync(migration,'utf8'))
  assert.equal(sql("select to_regprocedure('public.dribl_reserve_player_ids(text[])') is not null"),'t','Dribl reservation migration must exist')
  await t.test('actual published user IDs agree with JS SHA52 and are repeatable',()=>{
   const ids=['dribl:1RwNlWemjr:user:bd9XzXARK4','dribl:1RwNlWemjr:user:RNEgPGBpad',player('1'),player('1','2RwNlWemjr')]
   const reserve=()=>JSON.parse(sql(`set role service_role;select json_agg(r order by source_id) from public.dribl_reserve_player_ids(${idsArray(ids)})r`))
   const expected=ids.map(source_id=>({source_id,reg_st:key(source_id)})).sort((a,b)=>a.source_id<b.source_id?-1:1)
   assert.deepEqual(reserve(),expected);assert.deepEqual(reserve(),expected)
   assert.notEqual(key(player('1')),key(player('1','2RwNlWemjr')))
   assert.equal(sql('select count(*) from private_dribl.identity_map'),'4')
  })
  await t.test('private rows cannot be read or changed and RPC is service-only',()=>{
   for(const role of ['anon','authenticated','service_role']){
    const operations=['select * from private_dribl.identity_map',`insert into private_dribl.identity_map values (${quote(player('8'))},4503599627370496)`,'delete from private_dribl.identity_map']
    if(role!=='service_role')operations.push(`select * from public.dribl_reserve_player_ids(${idsArray([player('8')])})`)
    for(const operation of operations)sql(`set role ${role};do $$begin begin execute ${quote(operation)};exception when insufficient_privilege then return;end;raise exception 'unexpected private access';end$$;`)
   }
   assert.equal(sql("select relrowsecurity from pg_class where oid='private_dribl.identity_map'::regclass"),'t')
   assert.equal(sql("select count(*) from pg_policy where polrelid='private_dribl.identity_map'::regclass"),'0')
  })
  await t.test('invalid arrays and unobserved identity namespaces reject without partial writes',()=>{
   const before=sql('select count(*) from private_dribl.identity_map')
   for(const input of ['null::text[]',"'{}'::text[]",'array[null]::text[]',idsArray([player('2'),player('2')]),idsArray([player('2'),'dribl:1RwNlWemjr:member:1234567890']),idsArray([player('2'),player('3')+'\n']),idsArray(['dribl:1RwNlWemjr:user:short']),`array[${idsArray([player('2')])}]`,`'[0:0]={${player('2')}}'::text[]`]){
    sql(`set role service_role;do $$begin begin perform * from public.dribl_reserve_player_ids(${input});exception when invalid_parameter_value then return;end;raise exception 'accepted invalid input';end$$;`)
   }
   assert.equal(sql('select count(*) from private_dribl.identity_map'),before)
  })
  await t.test('numeric collision and changed existing mapping roll back the complete reservation',()=>{
   const first=player('a'),victim=player('z'),occupant=player('y')
   sql(`insert into private_dribl.identity_map values (${quote(occupant)},${key(victim)})`)
   sql(`set role service_role;do $$begin begin perform * from public.dribl_reserve_player_ids(${idsArray([first,victim])});exception when unique_violation then return;end;raise exception 'accepted numeric collision';end$$;`)
   assert.equal(sql(`select count(*) from private_dribl.identity_map where source_id in (${quote(first)},${quote(victim)})`),'0')
   const changed=player('x');sql(`insert into private_dribl.identity_map values (${quote(changed)},${key(changed)+1})`)
   sql(`set role service_role;do $$begin begin perform * from public.dribl_reserve_player_ids(${idsArray([first,changed])});exception when check_violation then return;end;raise exception 'accepted changed mapping';end$$;`)
   assert.equal(sql(`select count(*) from private_dribl.identity_map where source_id=${quote(first)}`),'0')
  })
 }finally{sql(`drop database ${database} with(force);`,'postgres')}
})
