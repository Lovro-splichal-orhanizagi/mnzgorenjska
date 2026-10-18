import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {vZapisnik} from './viri/ncefl.mjs'
const now=Date.parse('2026-10-18T21:30:00Z'),retained=process.env.NCEL_RETAINED_DIR
const row=(p,i)=>`<tr><td>${p.shirt??i+1}</td><td>${p.name??'Alex Player'+String.fromCharCode(65+i)}</td><td>${p.goals?'<img src="/images/Ball20.png"> '+p.goals:''}</td><td>${p.yellow?'<img src="/images/yellowcard.gif">':''}</td><td>${p.off?'<img src="/images/down.gif"> '+p.off:''}${p.on?'<img src="/images/up.gif"> '+p.on:''}</td></tr>`
function html({score=[1,0],headers=['Alex PlayerB 20',''],home={},away={},homeMissing=false}={}){
 const side=(name,header)=>`<a class="nomobile" href="/teams/${name}/">${name}<br></a><font class="goalscorers">${header}</font>`
 const players=(changes,missing=false)=>missing?'':Array.from({length:11},(_,i)=>row(changes[i+1]??{},i)).join('')+`<tr><td>Substitutes</td></tr>`+row({name:'Bench Player',shirt:12,on:61},11)
 return `<table><tr><td class="header">Match Details</td></tr><tr><td><a href="/matches/day/2025/20251018/">Date</a></td></tr><tr valign="top"><td></td><td>${side('Home',headers[0])}</td><td><font class="teamfixtures">${score[0]}-${score[1]}</font></td><td>${side('Away',headers[1])}</td></tr></table><div class="col-lg-6"><table>${players(home,homeMissing)}</table></div><div class="col-lg-6"><table>${players(away)}</table></div><div class="col-lg-4">Sidebar</div>`
}
const parse=x=>vZapisnik(html(x),{id:'control',leto:2025,danes:now})
const total=(z,side)=>z.goli.filter(g=>(g.avtogol?1-g.ekipaIdx:g.ekipaIdx)===side).length
const duplicate={2:{name:'Same Person',goals:1},3:{name:'Same Person',goals:1}}
test('complete native header excludes additional icon-only events and preserves other report stats',()=>{
 const z=parse({home:{2:{goals:1,yellow:true,off:61},3:{goals:1}}})
 assert.equal(z.goli.length,1);assert.deepEqual(z.goli[0],{ekipaIdx:0,st:2,ime:'PlayerB Alex',minuta:20,avtogol:false,enajstmetrovka:false});assert.equal(z.nepopoln,false)
 assert.equal(z.rumeni.length,1);assert.equal(z.menjave[0].minuta,61);assert.equal(z.domaci.postava.length,11);assert.equal(z.domaci.postava.find(p=>p.st===2).ven,61);assert.equal(z.domaci.rezerve[0].noter,61)
})
test('partial unambiguous header preserves ordinary icon fallback with unknown event minute',()=>{
 const z=parse({score:[2,0],home:{2:{goals:1},3:{goals:1}}});assert.equal(total(z,0),2);assert.deepEqual(z.goli.map(g=>[g.st,g.minuta]),[[2,20],[3,null]])
})
test('icon-only unambiguous events retain normal fallback',()=>{
 const z=parse({score:[2,0],headers:['',''],home:{2:{goals:1},3:{goals:1}}});assert.deepEqual(z.goli.map(g=>[g.st,g.minuta]),[[2,null],[3,null]])
})
test('complete event inventory is per side while another side can require fallback',()=>{
 const z=parse({score:[1,2],home:{2:{goals:1},3:{goals:1}},away:{2:{goals:1},3:{goals:1}}});assert.equal(total(z,0),1);assert.equal(total(z,1),2)
})
test('complete own-goal header preserves actual opponent/type/minute without an extra normal icon goal',()=>{
 const z=parse({headers:['Alex PlayerB 42og',''],away:{2:{goals:1}}});assert.deepEqual(z.goli,[{ekipaIdx:1,st:2,ime:'PlayerB Alex',minuta:42,avtogol:true,enajstmetrovka:false}]);assert.equal(total(z,0),1);assert.equal(total(z,1),0)
})
test('complete multigoal header preserves each minute and penalty type',()=>{
 const z=parse({score:[3,0],headers:['Alex PlayerB 11, 25pen, 77',''],home:{2:{goals:3}}});assert.deepEqual(z.goli.map(g=>[g.minuta,g.enajstmetrovka]),[[11,false],[25,true],[77,false]]);assert.equal(z.goli.every(g=>g.st===2),true)
})
test('a complete header scorer absent from the lineup remains genuinely unattributed',()=>{
 const z=parse({headers:['Missing Person 37pen',''],home:{2:{goals:1}}});assert.deepEqual(z.goli,[{ekipaIdx:0,st:null,ime:null,minuta:37,avtogol:false,enajstmetrovka:true}]);assert.match(z.opozorila.join(' '),/ni v postavi/)
})
test('a complete header with duplicate lineup names retains one official unattributed event',()=>{
 const z=parse({headers:['Same Person 20',''],home:duplicate});assert.deepEqual(z.goli,[{ekipaIdx:0,st:null,ime:null,minuta:20,avtogol:false,enajstmetrovka:false}]);assert.equal(z.nepopoln,false);assert.match(z.opozorila.join(' '),/dvoum/)
})
test('ambiguous opponent name in a complete own-goal event never selects the first shirt',()=>{
 const z=parse({headers:['Same Person 42og',''],away:duplicate});assert.deepEqual(z.goli,[{ekipaIdx:1,st:null,ime:null,minuta:42,avtogol:true,enajstmetrovka:false}]);assert.match(z.opozorila.join(' '),/dvoum/)
})
test('partial ambiguous header remains incomplete even if unique fallback can reconcile the total',()=>{
 const z=parse({score:[2,0],headers:['Same Person 20',''],home:{...duplicate,4:{goals:1}}});assert.equal(z.nepopoln,true);assert.equal(z.goli.find(g=>g.minuta===20).st,null);assert.equal(z.goli.some(g=>g.st===2||g.st===3),false);assert.match(z.opozorila.join(' '),/nepopoln/i)
})
test('icon-only ambiguous names stay held rather than inventing identified scorers',()=>{
 const z=parse({score:[2,0],headers:['',''],home:duplicate});assert.equal(z.nepopoln,true);assert.equal(z.goli.some(g=>g.st===2||g.st===3),false)
})
test('missing lineup remains incomplete while a native goal is retained without a fabricated player',()=>{
 const z=parse({homeMissing:true});assert.equal(z.nepopoln,true);assert.equal(z.goli.length,1);assert.equal(z.goli[0].st,null);assert.equal(z.goli[0].ime,null);assert.equal(z.goli[0].minuta,20)
})
for(const[id,sha,score,minute]of[['55756','a660219f74b0cee6310e5f64fb6659fdf5b9c4c962bd52ab2b5e6c6db90d7a3f',[5,0],54],['56246','ed096dfa9d6ce84efdbd3951cac8769c84dc40924d53905ff7cc7eacee15cfde',[1,3],61]])test(`actual retained NCEL ${id} has official header events and no guessed duplicate identity`,{skip:!retained},()=>{
 const raw=readFileSync(join(retained,id+'.html'));assert.equal(createHash('sha256').update(raw).digest('hex'),sha);const z=vZapisnik(raw.toString('utf8'),{id,leto:2025,danes:now})
 assert.deepEqual(z.rezultat,{domaci:score[0],gostje:score[1]});assert.deepEqual([total(z,0),total(z,1)],score);assert.equal(z.nepopoln,false);const event=z.goli.find(g=>g.minuta===minute);assert.equal(event.st,null);assert.equal(event.ime,null);assert.match(z.opozorila.join(' '),/dvoum/);assert.equal(z.goli.filter(g=>g.minuta===null).length,0)
})

for(const[id,score]of[['57203',[2,1]],['57239',[3,1]],['57280',[3,3]],['57512',[4,1]]])test(`ordinary retained NCEL ${id} keeps complete unique header events`,()=>{
 const z=vZapisnik(readFileSync(new URL(`./vzorci/gb-ncefl-tekma-${id}.html`,import.meta.url),'utf8'),{id,leto:2026,danes:now})
 assert.deepEqual(z.rezultat,{domaci:score[0],gostje:score[1]});assert.deepEqual([total(z,0),total(z,1)],score);assert.equal(z.nepopoln,false);assert.deepEqual(z.opozorila,[]);assert.equal(z.domaci.postava.length,11);assert.equal(z.gostje.postava.length,11)
})
