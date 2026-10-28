// Pure/static compatibility check only. Never opens a DB or executes G13 repair.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
const expected=[['private_baden_history.club_bindings','competition_id','competitions'],['private_baden_history.club_bindings','team_id','teams'],['private_baden_history.prepared','competition_id','competitions'],['private_baden_history.prepared','opening_round_id','rounds']]
const sort=rows=>[...rows].sort((a,b)=>a.join('\0')<b.join('\0')?-1:a.join('\0')>b.join('\0')?1:0)
test('closed G13 Baden entries equal the four actual180000 migration root foreign keys',()=>{
 const ddl=read('../supabase/migrations/20261028180000_baden_history_cards_composition.sql'),actual=[]
 for(const [,name,body]of ddl.matchAll(/create table private_baden_history\.(\w+)\(([\s\S]*?)\);/g))for(const [,col,target]of body.matchAll(/\b(\w+)\s+bigint\b[^,]*?\breferences public\.(competitions|rounds|teams)\(id\)/g))actual.push(['private_baden_history.'+name,col,target])
 assert.deepEqual(sort(actual),expected)
 const registry=JSON.parse(read('./fcf-g13-fks.json'));assert.deepEqual(registry.filter(([rel])=>rel.startsWith('private_baden_history.')),expected);assert.deepEqual(registry.slice(0,4),expected);assert.equal(new Set(registry.map(x=>JSON.stringify(x))).size,registry.length)
})
test('Baden references enter the existing locked zero-affected historical-reference guard',()=>{
 const sql=read('./fcf-g13-repair.sql'),guard=sql.match(/if fk\.rel like 'private_dfb_pending\.%'[\s\S]*?end if;/)?.[0];assert.ok(guard)
 assert.match(guard,/or fk\.rel like 'private_baden_history\.%'/)
 assert.match(guard,/select count\(\*\) from %s where %I in\(select id from g13_ids where kind=%L\)/);assert.match(guard,/g13_assert\(n=0,'historical state present'\)/)
 assert.ok(sql.indexOf("execute format('lock table %s in row share mode'")<sql.indexOf(guard));assert.ok(sql.indexOf("order by to_jsonb(t)::text collate \"C\" for update'")<sql.indexOf(guard))
})
test('closed unknown-FK refusal, root IDs and post-lock catalog recheck remain intact',()=>{
 const sql=read('./fcf-g13-repair.sql');assert.match(sql,/except select rel,col,target from g13_refs/);assert.match(sql,/select rel,col,target from g13_refs except select/);assert.match(sql,/'unknown or missing FK'/);assert.match(sql,/catalog=pg_temp\.g13_catalog\(\),'FK catalog changed while acquiring locks'/);assert.match(sql,/\('competitions',801\),\('teams',8371\),\('teams',10388\)/)
})
