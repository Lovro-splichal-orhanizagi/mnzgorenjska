import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
test('ordinary pricer exports complete read-only expected vector without changing ties, defaults, locks or provenance',t=>{
 const dir=mkdtempSync(join(tmpdir(),'fcf-pricer-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const out=join(dir,'prices.json'),loader=join(dir,'db.mjs')
 const players=Array.from({length:5},(_,i)=>({id:i+1,full_name:'SYNTHETIC '+i,position:'MID',position_source:'ugibanje',value:4.5,value_start:null,value_locked:i===4,reg_st:100+i})),stats=players.slice(0,3).map((p,i)=>({player_id:p.id,season:'2026/27',minutes:90,goals:i===2?2:0,points:1,matches:1,clean_sheets:0,yellow_cards:0,red_cards:0}))
 writeFileSync(loader,`const players=${JSON.stringify(players)},stats=${JSON.stringify(stats)};globalThis.fetch=async(input,init={})=>{if((init.method??'GET')!=='GET')throw Error('write refused');const u=new URL(input),table=u.pathname.split('/').pop();let x;if(table==='players')x=players;else if(table==='player_season_stats')x=stats;else if(table==='federations')x=[];else if(table==='competitions')x=u.searchParams.has('slug')||u.searchParams.has('id')?{id:783,slug:'es-ct-segona-g1',name:'SYNTHETIC',source:'fcf',country_id:34,active:false,sezona_koledarska:false}:[{id:783,slug:'es-ct-segona-g1',source:'fcf'}];else throw Error('unexpected table');return new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}})};`)
 const result=spawnSync(process.execPath,['--import',loader,'scripts/ovrednoti-igralce.mjs','--tekmovanje','es-ct-segona-g1','--sezona','2026/27','--release-plan',out],{cwd:new URL('..',import.meta.url),env:{...process.env,SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'},encoding:'utf8',timeout:30000})
 assert.equal(result.status,0,result.stderr);const r=JSON.parse(readFileSync(out));assert.equal(r.players.length,5);assert.equal(r.computedCount,3)
 assert.equal(r.players[0].value,4);assert.equal(r.players[1].value,4,'ties retain lower-bound percentile');assert.equal(r.players[2].value,12);assert.equal(r.players[3].value,4.5);assert.equal(r.players[3].value_start,null);assert.equal(r.players[4].value,4.5);assert.ok(r.players.every(p=>p.position_source==='ugibanje'))
 assert.match(r.modelSha256,/^[a-f0-9]{64}$/)
})
