import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {inflateSync} from 'node:zlib'
import {preslikavaPisave, dekodirajIme} from './viri/fussball-pisava.mjs'
const font=id=>readFileSync(new URL(`./vzorci/de-fussball-${id}.woff`,import.meta.url))
test('fussball: post3 date font decodes actual header using identified glyph outlines',()=>{
 const p=preslikavaPisave(font('vcfjwdpb'))
 assert.equal(dekodirajIme('\ue85c\uea5f\ueaf8\ue8ab\uebf8\ue821\ue79a\ue9f7 \ue894\ue934\ue742\ue934\uea45\uedc1\uea5a\ueb0f\ue6b8\ue7f8',p),'SONNTAG, 11.10.2026')
 assert.equal(dekodirajIme('\ue798\ue938\ue787\ueda4\ue8b7 \ue836\ue745\uedb0',p),'15:00 UHR')
})
test('fussball: real score fields use the field-specific post2 font',()=>{
 assert.equal(dekodirajIme('\ue6a7 : \ue66f',preslikavaPisave(font('q73uvs1t'))),'2 : 3')
 assert.equal(dekodirajIme('\ue65a : \ue65d',preslikavaPisave(font('wqnnkp26'))),'2 : 3')
 assert.notEqual(dekodirajIme('\ue6a7 : \ue66f',preslikavaPisave(font('rki8aouq'))),'2 : 3')
})
test('fussball: rotated date cmap still resolves by shape, not codepoint',()=>{
 const a=preslikavaPisave(font('vcfjwdpb')),b=preslikavaPisave(font('ilpaevbo'))
 assert.notEqual(a.sha256,b.sha256)
 // Same date glyph in another real font maps from a different private code.
 assert.notDeepEqual([...a.znaki],[...b.znaki])
 assert.equal(new Set([...b.znaki.values()].filter(x=>/^\d$/.test(x))).size,10)
})

test('fussball: WOFF signature and table names cannot alias through high-bit ASCII',()=>{
 const signature=Buffer.from(font('q73uvs1t'));signature[0]|=0x80
 assert.throws(()=>preslikavaPisave(signature),/WOFF/)
 const tag=Buffer.from(font('q73uvs1t'));tag[44]|=0x80
 assert.throws(()=>preslikavaPisave(tag),/tabel|WOFF/)
})

// Repack captured tables after a controlled byte mutation; no page scripts run.
function changedTable(input,tag,mutate){
 const entries=[]
 for(let i=0;i<input.readUInt16BE(12);i++){
  const p=44+i*20,o=input.readUInt32BE(p+4),len=input.readUInt32BE(p+8),original=input.readUInt32BE(p+12)
  let data=Buffer.from(input.subarray(o,o+len))
  if(len!==original)data=inflateSync(data)
  const name=input.toString('ascii',p,p+4)
  if(name===tag)mutate(data)
  entries.push({name,data})
 }
 let offset=44+20*entries.length
 for(const e of entries){e.offset=offset;offset+=(e.data.length+3)&~3}
 const out=Buffer.alloc(offset);input.copy(out,0,0,44);out.writeUInt32BE(offset,8)
 for(const [i,e]of entries.entries()){
  const p=44+20*i;out.write(e.name,p);out.writeUInt32BE(e.offset,p+4);out.writeUInt32BE(e.data.length,p+8);out.writeUInt32BE(e.data.length,p+12);e.data.copy(out,e.offset)
 }
 return out
}
test('fussball: a changed date glyph cannot fall back to its former glyph index',()=>{
 const original=font('vcfjwdpb')
 // Capture has short loca: glyph17 is the independently identified digit1.
 let start
 changedTable(original,'loca',b=>{start=b.readUInt16BE(17*2)*2})
 const changed=changedTable(original,'glyf',b=>{b[start+10]^=1})
 assert.throws(()=>dekodirajIme('\ue798',preslikavaPisave(changed)),/glif/)
 const broken=changedTable(original,'loca',b=>b.writeUInt16BE(0,18*2))
 assert.throws(()=>preslikavaPisave(broken),/glyf|loca/)
})
