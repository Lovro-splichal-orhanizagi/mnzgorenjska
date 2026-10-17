import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {vZapisnik,nastopi} from './viri/dfb.mjs'
const actual=id=>readFileSync(new URL(`./vzorci/de-dfb-suedwest-${id}.html`,import.meta.url),'utf8')
const parse=html=>vZapisnik(html,{liga:'regionalliga-suedwest'})
for(const [id,scores,names] of [
 ['2426312',[[0,1],[0,2]],['Maximilian Schmid','Maximilian Wolfram']],
 ['2426309',[[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4]],null],
 ['2402963',[[1,0],[1,1],[2,1],[2,2],[2,3],[3,3],[4,3]],null],
])test(`authentic Südwest ${id}: only intermediate score labels change`,()=>{
 const z=parse(actual(id))
 assert.deepEqual(z.goli.map(g=>g.rezultat),scores)
 if(names)assert.deepEqual(z.goli.map(g=>g.ime),names)
 assert.equal(z.popravki.length,2)
 assert.equal(z.domaci.postava.length,11);assert.equal(z.gostje.postava.length,11)
 if(id==='2402963')assert.match(z.opozorila.join(' '),/90\+7.*90\+8|90\+8.*90\+7/)
})
test('authentic 2402984: real halftime entrant dismissed once with one rounded recorded minute',()=>{
 const z=parse(actual('2402984')),a=nastopi(z),p=a.filter(x=>x.ime==='Jonas Brändle')
 assert.equal(p.length,1)
 assert.deepEqual([p[0].minutaOd,p[0].minutaDo,p[0].minute,p[0].rdeci],[45,46,1,1])
 assert.equal(z.rdeci.filter(x=>x.ime==='Jonas Brändle').length,1)
 assert.equal(z.menjave.filter(x=>x.noter.ime==='Jonas Brändle'&&x.ven.ime==='Ole Deininger').length,1)
 for(const [incoming,outgoing] of [['Ferdinand Schmidt','Marko Pilic'],['Simon Klostermann','Luca Battista'],['Jonas Brändle','Ole Deininger']])assert.equal(z.menjave.filter(x=>x.minuta===45&&x.noter.ime===incoming&&x.ven.ime===outgoing).length,1)
 assert.deepEqual(z.menjave.filter(x=>x.minuta===45).map(x=>x.noter.ime),['Jonas Brändle','Ferdinand Schmidt','Simon Klostermann'])
 assert.match(z.opozorila.join(' '),/zaokrožen/)
})

const registry=JSON.parse(readFileSync(new URL('./viri/dfb-korekcije.json',import.meta.url)))
const chronology=JSON.parse(readFileSync(new URL('./viri/dfb-kronologija.json',import.meta.url))).matches[0]
const goalSegments=(html,change)=>html.replace(/(<div class="m-MatchDetails-history-event-text-segment">)([\s\S]*?)(<\/div>)/g,(whole,start,body,end)=>start+change(body)+end)
const fix=(html,entry,changes=entry.corrections)=>goalSegments(html,body=>{
 for(const c of changes)if(body.includes(entry.goals[c.index].scorer)&&body.includes(c.from.join(':')))return body.replace(c.from.join(':'),c.to.join(':'))
 return body
})
for(const entry of registry.matches.filter(e=>e.metadata.url.includes('/regionalliga-suedwest/')))test(`Südwest ${entry.id}: complete original/corrected states bind metadata and both goal sections`,()=>{
 const html=actual(entry.id),z=parse(html),fixed=parse(fix(html,entry))
 assert.deepEqual(fixed.popravki,[])
 assert.deepEqual(fixed.goli.map(g=>g.rezultat),z.goli.map(g=>g.rezultat))
 assert.deepEqual(z.goli.map(g=>[g.ime,g.ekipaIdx,g.minuta,g.avtogol,g.enajstmetrovka]),entry.goals.map(g=>[g.scorer,g.side,g.normalizedClock[0],g.ownGoal,g.penalty]))
 if(entry.id==='2402963')assert.match(fixed.opozorila.join(' '),/90\+7.*90\+8|90\+8.*90\+7/)
 for(const c of entry.corrections){assert.deepEqual(z.goli[c.index].popravekIzida.izvorno,entry.goals[c.index]);assert.deepEqual(z.goli[c.index].popravekIzida.dokazniDokumenti,entry.evidenceFiles)}
 for(const changed of [fix(html,entry,[entry.corrections[0]]),html.replace(entry.goals[0].scorer,'Different Scorer'),html.replaceAll(entry.goals[0].scorer,'Different Scorer'),html.replaceAll(`${entry.metadata.time} Uhr`,'13:59 Uhr'),html.replaceAll(entry.metadata.teams[0].id,'different-team'),html.replaceAll(`(${entry.metadata.halfScore.join(':')})`,'(9:9)'),html.replaceAll(entry.goals.at(-1).clock,"90+9'"),html.replaceAll('Spieltag','Another Round')]){
  assert.notEqual(changed,html);assert.throws(()=>parse(changed))
 }
})

test('2402984 proof preserves original grouped event signatures, raw clock, identities and JSON replay',()=>{
 const z=parse(actual('2402984')),proof=z.popravkiKronologije[0]
 assert.equal(proof.izvornaUra,"46'");assert.equal(proof.par,2)
 assert.equal(proof.vstop.profileId,'368170');assert.equal(proof.izstop.profileId,null)
 assert.equal(proof.izvorniVrstniRed.rdeci<proof.izvorniVrstniRed.menjava,true)
 assert.equal(proof.izvorniDogodki.menjava.includes('Ferdinand Schmidt'),true)
 assert.equal(proof.izvorniDogodki.menjava.includes('Simon Klostermann'),true)
 assert.deepEqual(proof.dokazniDokumenti,chronology.evidenceFiles)
 const again=JSON.parse(JSON.stringify(z));assert.deepEqual(again,z);assert.deepEqual(nastopi(again),nastopi(z))
})

test('Südwest chronology dependencies belong to release fingerprint',async()=>{
 const {sourceFiles,parserSha256}=await import('./vklopi-dfb-regijo.mjs')
 assert(sourceFiles.includes('scripts/viri/dfb-kronologija.json'))
 for(const e of [...registry.matches.filter(e=>e.metadata.url.includes('/regionalliga-suedwest/')),chronology])for(const f of e.evidenceFiles)assert(sourceFiles.includes('scripts/'+f.file.replace('../','')))
 assert.match(parserSha256(),/^[a-f0-9]{64}$/)
})

// A fingerprint or identity gate removed from the chronology path must expose
// these mutations; none may create an appearance by reinterpreting a bench red.
test('2402984 rejects every unreviewed semantic dimension and false incoming inference',()=>{
 const html=actual('2402984')
 const changes=[
  ['profile',html.replaceAll('/profil/368170','/profil/999999')],
  ['incoming name',html.replaceAll('Jonas Brändle','Another Entrant')],
  ['outgoing identity',html.replaceAll('Ole Deininger','Another Outgoing')],
  ['different full clock',html.replaceAll("46'","46+1'")],
  ['different minute',html.replaceAll("46'","47'")],
  ['date',html.replaceAll('16. November 2025','17. November 2025')],
  ['kickoff',html.replaceAll('14:00 Uhr','13:59 Uhr')],
  ['round',html.replaceAll('17. Spieltag','18. Spieltag')],
  ['team',html.replaceAll('tsg-balingen','different-team')],
  ['lineup person',html.replaceAll('Marko Pilic','Different Starter')],
  ['keeper role',html.replace('Elvin Kovac (T)','Elvin Kovac')],
  ['official',html.replaceAll('m-MatchDetails-referees','m-MatchDetails-referees-changed')],
  ['wrong side',html.replace('m-MatchDetails-history-event m-MatchDetails-history-event--away','m-MatchDetails-history-event m-MatchDetails-history-event--home')],
  ['wrong direction',html.replaceAll('m-MatchDetails-icon-caret-right--green','m-MatchDetails-icon-caret-right--red')],
  ['missing dedicated entry',html.slice(0,html.lastIndexOf('Jonas Brändle'))+html.slice(html.lastIndexOf('Jonas Brändle')).replace('Jonas Brändle','Missing Incoming')],
  ['mixed card sections',html.replace('m-MatchDetails-icon-card--red','m-MatchDetails-icon-card--yellow')],
  ['missing real entry',html.replaceAll('>Jonas Brändle</a>&nbsp;für','>Unused Reserve</a>&nbsp;für')],
  ['prior dismissal',html.replace("46'","45'")],
 ]
 // Staff markup varies by source; mutate its actual published name.
 const rows=[...html.matchAll(/<div class="m-MatchDetails-history-item">/g)].map(m=>m.index)
 const redRow=rows.find(i=>{const end=rows.find(j=>j>i)??html.length;return html.slice(i,end).includes('Jonas Brändle')&&html.slice(i,end).includes('m-MatchDetails-icon-card--red')})
 const next=rows.find(i=>i>redRow),rawRed=html.slice(redRow,next)
 assert(rawRed.includes("46'"))
 changes.push(['additional prior dismissal',html.slice(0,redRow)+rawRed.replace("46'","45'")+html.slice(redRow)])
 const subRow=rows.find(i=>{const end=rows.find(j=>j>i)??html.length;return html.slice(i,end).includes('Jonas Brändle')&&html.slice(i,end).includes('m-MatchDetails-icon-playing--substitute-in')})
 const subEnd=rows.find(i=>i>subRow),rawSub=html.slice(subRow,subEnd)
 changes.push(['additional reentry',html.slice(0,subEnd)+rawSub+html.slice(subEnd)])
 const staff=html.match(/<tfoot>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]
 assert(staff);changes.push(['staff',html.replaceAll(staff,'Changed Coach')])
 for(const [dimension,changed]of changes){assert.equal(changed===html,false,dimension);assert.throws(()=>parse(changed),undefined,dimension)}
 assert.throws(()=>parse(html.replaceAll('2402984','2402983')),/vstop izključenega/)
 const otherLeague=html.replaceAll('regionalliga-suedwest','regionalliga-bayern').replaceAll('Regionalliga Südwest','Regionalliga Bayern')
 assert.throws(()=>vZapisnik(otherLeague,{liga:'regionalliga-bayern'}),/vstop izključenega/)
})

test('unresolved Südwest XII and ordinary-yellow contradictions stay blocked',()=>{
 assert.throws(()=>parse(actual('2402929')),/11|enajst|postav/)
 assert.throws(()=>parse(actual('2403004')),/podvojen rumeni/)
})

test('raw capture and primary proof provenance preserves original bytes and UTC',async()=>{
 const {createHash}=await import('node:crypto'),p=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-suedwest-provenance.json',import.meta.url)))
 assert(!/headers|cookie|session/i.test(JSON.stringify(p)))
 for(const row of p.documents){assert.equal(createHash('sha256').update(readFileSync(new URL('./vzorci/'+row.file,import.meta.url))).digest('hex'),row.sha256);assert(Number.isFinite(Date.parse(row.at)))}
 assert(p.documents.filter(p=>p.captureRun).every(p=>p.at<'2026-10-17T21:00:00Z'))
})

test('every primary document is checked on cached parser use; release binds registry and all bytes',async()=>{
 const {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join,dirname}=await import('node:path'),{pathToFileURL}=await import('node:url')
 const {sourceFiles,parserSha256}=await import('./vklopi-dfb-regijo.mjs'),base=new URL('../',import.meta.url)
 const dir=mkdtempSync(join(tmpdir(),'slff-suedwest-proof-')),target=p=>join(dir,p)
 try{
  for(const file of sourceFiles){mkdirSync(dirname(target(file)),{recursive:true});copyFileSync(new URL(file,base),target(file))}
  // Preserve import.meta-relative proof reads and fingerprint files, while
  // resolving executable imports to their already-tested repository modules.
  for(const path of ['scripts/viri/dfb.mjs','scripts/vklopi-dfb-regijo.mjs']){
   const url=new URL(path,base),source=readFileSync(url,'utf8').replace(/from '([^']+)'/g,(whole,spec)=>spec.startsWith('.')?`from '${new URL(spec,url).href}'`:whole)
   writeFileSync(target(path),source)
  }
  const isolated=await import(pathToFileURL(target('scripts/viri/dfb.mjs')).href)
  const release=await import(pathToFileURL(target('scripts/vklopi-dfb-regijo.mjs')).href)
  const fingerprint=release.parserSha256()
  const entries=[...registry.matches.filter(e=>e.metadata.url.includes('/regionalliga-suedwest/')),chronology]
  for(const e of entries){
   const source=actual(e.id);isolated.vZapisnik(source,{liga:'regionalliga-suedwest'})
   for(const file of e.evidenceFiles){
    const path='scripts/'+file.file.replace('../',''),bytes=readFileSync(target(path)),before=release.parserSha256()
    try{
     writeFileSync(target(path),Buffer.concat([bytes,Buffer.from('changed')]))
     assert.notEqual(release.parserSha256(),before)
     assert.throws(()=>isolated.vZapisnik(source,{liga:'regionalliga-suedwest'}),/spremenjen primarni dokaz/)
     if(e.corrections)assert.throws(()=>isolated.vZapisnik(fix(source,e),{liga:'regionalliga-suedwest'}),/spremenjen primarni dokaz/)
     rmSync(target(path))
     assert.throws(()=>release.parserSha256())
     assert.throws(()=>isolated.vZapisnik(source,{liga:'regionalliga-suedwest'}),/manjkajoč primarni dokaz/)
     if(e.corrections)assert.throws(()=>isolated.vZapisnik(fix(source,e),{liga:'regionalliga-suedwest'}),/manjkajoč primarni dokaz/)
    }finally{writeFileSync(target(path),bytes)}
   }
  }
  const path=target('scripts/viri/dfb-kronologija.json'),bytes=readFileSync(path)
  writeFileSync(path,Buffer.concat([bytes,Buffer.from('\n')]))
  assert.notEqual(release.parserSha256(),fingerprint)
  rmSync(path);assert.throws(()=>release.parserSha256());writeFileSync(path,bytes)
  // Any omitted load-bearing dependency changes the attested source closure.
  for(const file of ['scripts/viri/dfb-kronologija.json',...chronology.evidenceFiles.map(f=>'scripts/'+f.file.replace('../',''))]){
   const i=release.sourceFiles.indexOf(file);assert(i>=0);release.sourceFiles.splice(i,1)
   assert.notEqual(release.parserSha256(),fingerprint);release.sourceFiles.splice(i,0,file)
  }
  assert.equal(release.parserSha256(),fingerprint)
  assert.match(parserSha256(),/^[a-f0-9]{64}$/)
 }finally{rmSync(dir,{recursive:true,force:true})}
})
