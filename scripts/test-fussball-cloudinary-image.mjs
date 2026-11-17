import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {razberiFantasyZapisnik} from './viri/fussball-statistika.mjs'

// SLF-558: Verbandsliga Baden, 14. 11. 2026. Strelca imata uporabniško naloženo
// fotografijo na res.cloudinary.com/dfb-de; prej je razčlenjevalnik zavrnil celoten zapisnik.
const read=f=>readFileSync(new URL('./vzorci/de-fussball-cloudinary-image/'+f,import.meta.url))
const witness=JSON.parse(read('provenance.json')),id=witness.matchId
const main=read('report.html').toString(),lineup=read('lineup.html').toString()
const fonts=Object.fromEntries(Object.entries(witness.fonts).map(([key,f])=>[key,{bytes:read(f.file),sha256:f.sha256}]))
const observed=[...main.matchAll(/data-responsive-image="(https:\/\/res\.cloudinary\.com\/dfb-de\/[^"]+)"/g)].map(m=>m[1])
const parse=(html=main,policy='community-v1')=>razberiFantasyZapisnik(html,lineup,{fonts,id,lineupId:id,season:witness.season,cardPolicy:policy})

test('player photo hosted on the DFB Cloudinary account no longer rejects the report',()=>{
 for(const row of witness.documents)assert.equal(createHash('sha256').update(read(row.kind+'.html')).digest('hex'),row.sha256)
 assert.equal(observed.length,2)
 for(const policy of [undefined,'community-v1']){
  const result=parse(main,policy)
  assert.equal(result.z.zapisnikId,'de-fussball-'+id)
  assert.equal(result.z.datum,'2026-11-14')
  assert.ok(result.z.goli.length>=3)
 }
})

test('Cloudinary support cannot accept foreign hosts, other accounts, insecure URLs or altered markup',()=>{
 const o=observed[0]
 for(const bad of [
  o.replace('https:','http:'),o.replace('res.cloudinary.com','res.cloudinary.com.evil.invalid'),o.replace('/dfb-de/','/other/'),
  o.replace('/user_generated_content/ugc_fbde/','/user_generated_content/other/'),o.replace('?_a=','#'),o+'&x=1',o.replace('?_a=','?'),
 ])assert.throws(()=>parse(main.replaceAll(o,bad)),/slika|struktura|atribut/)
 assert.throws(()=>parse(main.replaceAll(o,o+'" onerror="injected')))
})
