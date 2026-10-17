import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {vZapisnik,nastopi} from './viri/dfb.mjs'
const provenance=JSON.parse(readFileSync(new URL('./vzorci/de-dfb-west-clock-provenance.json',import.meta.url)))
const html=readFileSync(new URL(`./vzorci/${provenance.file}`,import.meta.url),'utf8')
const parse=body=>vZapisnik(body,{liga:'regionalliga-west'})
test('West original 2402377 supports published clocks through 90+39 without changing statistical minutes',()=>{
 assert.equal(createHash('sha256').update(html).digest('hex'),provenance.sha256)
 const z=parse(html)
 assert.equal(z.domaci.postava.length+z.gostje.postava.length,22)
 assert.equal(z.domaci.postava.filter(p=>p.vratar).length+z.gostje.postava.filter(p=>p.vratar).length,2)
 assert.equal(z.menjave.length,6);assert.equal(z.rumeni.length,4);assert.equal(z.goli.length,0)
 assert.deepEqual(z.opozorila,[])
 assert.ok(nastopi(z).every(p=>p.minute>=0&&p.minute<=90))
 assert.ok(z.menjave.filter(m=>m.minuta===90).length>=5)
})
test('West extended added-time cap still rejects 40, invalid phase clocks and inconsistent section clocks',()=>{
 for(const clock of ['90+40','91+39','46+39'])assert.throws(()=>parse(html.replaceAll("90+39'",`${clock}'`)))
 assert.throws(()=>parse(html.replace("90+39'","90+38'")),/ujem|dogod|karton/)
})
