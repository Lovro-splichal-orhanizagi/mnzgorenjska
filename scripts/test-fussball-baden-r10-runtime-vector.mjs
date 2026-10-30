import test from 'node:test'
import assert from 'node:assert/strict'
const api=await import('./fussball-baden-r10-runtime-vector.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const head='a'.repeat(40),treeSha='b'.repeat(40),workflow='.github/workflows/ci.yml'
const rows=[{path:workflow,type:'blob',mode:'100644',sha:'c'.repeat(40),size:1},{path:'scripts/check.mjs',type:'blob',mode:'100644',sha:'d'.repeat(40),size:2},{path:'README.md',type:'blob',mode:'100644',sha:'e'.repeat(40),size:3}]
test('runtime vector authenticates actual commit and complete code inventory with two own GETs',async()=>{
 assert.equal(typeof api.readBadenR10RuntimeVector,'function')
 const calls=[],github=async p=>{calls.push(p);return p.includes('/git/commits/')?{sha:head,tree:{sha:treeSha}}:{sha:treeSha,truncated:false,tree:rows}}
 const v=await api.readBadenR10RuntimeVector({github,head,workflow});assert.equal(v.files,2);assert.match(v.vectorSha256,/^[a-f0-9]{64}$/);assert.equal(calls.length,2)
 const other=await api.readBadenR10RuntimeVector({github:async p=>p.includes('/git/commits/')?{sha:head,tree:{sha:treeSha}}:{sha:treeSha,truncated:false,tree:[...rows,{path:'README2.md',type:'blob',mode:'100644',sha:'f'.repeat(40),size:9}]},head,workflow});assert.equal(other.vectorSha256,v.vectorSha256)
})
test('changed executed code, added test module and workflow alter the vector; incomplete trees never authenticate',async()=>{
 assert.equal(typeof api.readBadenR10RuntimeVector,'function')
 const read=tree=>api.readBadenR10RuntimeVector({github:async p=>p.includes('/git/commits/')?{sha:head,tree:{sha:treeSha}}:{sha:treeSha,truncated:false,tree},head,workflow}),base=await read(rows)
 for(const changed of [[{...rows[0],sha:'0'.repeat(40)},...rows.slice(1)],[...rows,{path:'scripts/test-fussball-new.mjs',type:'blob',mode:'100644',sha:'f'.repeat(40),size:10}]])assert.notEqual((await read(changed)).vectorSha256,base.vectorSha256)
 for(const tree of [[...rows,rows[0]],rows.filter(r=>r.path!==workflow),[{...rows[0],mode:'120000'},...rows.slice(1)],[{...rows[0],type:'tree'},...rows.slice(1)]])await assert.rejects(read(tree))
 await assert.rejects(api.readBadenR10RuntimeVector({github:async p=>p.includes('/git/commits/')?{sha:head,tree:{sha:treeSha}}:{sha:treeSha,truncated:true,tree:rows},head,workflow}))
})
