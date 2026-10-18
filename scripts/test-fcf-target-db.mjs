import test from 'node:test'
import assert from 'node:assert/strict'
const api=await import('./fcf-target-db.mjs').catch(()=>({}))
test('readonly inventory executes real explicit READ ONLY/ROLLBACK and parameter-safe fixed RPC',async()=>{
 assert.equal(typeof api.createFcfTargetDatabase,'function');let captured
 const db=api.createFcfTargetDatabase({env:{SUPABASE_DB_URL:'postgresql://local:test@127.0.0.1:5432/postgres'},execute:(_file,args,options)=>{captured={args,options};return Buffer.from('{"groups":[]}\n')}})
 assert.deepEqual(await db.inventory('es-ct-segona-g1',[]),{groups:[]})
 assert.match(captured.options.input,/BEGIN READ ONLY;/);assert.match(captured.options.input,/SET LOCAL ROLE service_role;/);assert.match(captured.options.input,/ROLLBACK;/)
 assert.equal(captured.args.includes('postgresql://local:test@127.0.0.1:5432/postgres'),false,'secret passed only in process environment')
 assert.throws(()=>db.inventory('es-ct-tercera-g2',[]),/FCF_DB/)
})
test('mutations use only fixed HTTPS RPC once and distinguish ambiguous completion',async()=>{
 const calls=[],db=api.createFcfTargetDatabase({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'},network:async(url,options)=>{calls.push([url,options]);return new Response('{"stage":"imported"}')}})
 assert.deepEqual(await db.mutate('import',{p_rollout_text:'{}',p_sha256:'a'.repeat(64)}),{stage:'imported'});assert.equal(calls.length,1);assert.equal(calls[0][1].redirect,'manual')
 await assert.rejects(db.mutate('unknown',{}),/FCF_DB/)
 const lost=api.createFcfTargetDatabase({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'},network:async()=>{throw Error('sensitive token must not escape')}})
 await assert.rejects(lost.mutate('import',{}),e=>e.message==='FCF_DB: ambiguous database response; read back receipt before retry'&&e.ambiguous===true)
 const proxy=api.createFcfTargetDatabase({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'},network:async()=>new Response('',{status:502})})
 await assert.rejects(proxy.mutate('import',{}),e=>e.ambiguous===true)
})
test('private/public malformed endpoints, redirects and caller SQL never become transport authority',async()=>{
 assert.throws(()=>api.createFcfTargetDatabase({env:{SUPABASE_DB_URL:'postgresql://local:test@public.example:5432/postgres'}}),/FCF_DB/)
 const db=api.createFcfTargetDatabase({env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'},network:async()=>new Response('',{status:302,headers:{location:'https://www.fcf.cat/'}})})
 await assert.rejects(db.mutate('check',{}),/FCF_DB.*redirect/)
})
