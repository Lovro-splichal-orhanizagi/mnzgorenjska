import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {unpackVerifiedArchive,sha256} from './dfb-artifacts.mjs'
function archive(t,entries){
 const dir=mkdtempSync(join(tmpdir(),'fcf-history-zip-'));t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const file=join(dir,'test.zip')
 execFileSync('python3',['-c',`import json,sys,zipfile,stat
with zipfile.ZipFile(sys.argv[1],'w',compression=zipfile.ZIP_DEFLATED) as z:
 for e in json.loads(sys.argv[2]):
  i=zipfile.ZipInfo(e['name']);i.create_system=3;i.external_attr=((stat.S_IFLNK if e.get('symlink') else stat.S_IFREG)|0o600)<<16
  z.writestr(i,e.get('body','{}') if 'size' not in e else b'x'*e['size'])`,file,JSON.stringify(entries)],{stdio:['ignore','pipe','pipe']})
 return readFileSync(file)
}
function unpack(bytes,digest='sha256:'+sha256(bytes)){return unpackVerifiedArchive(bytes,digest,'fcf-history')}
test('verified FCF artifact admits fixed block boundaries and native out-of-order IDs',t=>{
 const bytes=archive(t,[{name:'manifest.json'},...['4109388','4109627','4116188','4116314','4116427','4118349','4118588'].map(id=>({name:`acta-${id}.html`,body:'source bytes'}))])
 const files=unpack(bytes);assert.equal(files.size,8);assert.equal(files.get('acta-4116314.html').toString(),'source bytes')
 assert.throws(()=>unpack(bytes,'sha256:'+'0'.repeat(64)),/digest/)
 // The existing DFB protocols retain their closed names.
 for(const kind of ['capture','replay'])assert.throws(()=>unpackVerifiedArchive(bytes,'sha256:'+sha256(bytes),kind),/entry/)
})
for(const name of ['../manifest.json','/manifest.json','nested/manifest.json','acta-4109387.html','acta-4109628.html','acta-4116428.html','acta-4118589.html','acta-04116314.html','prenosi.json','packet.json'])test(`FCF artifact refuses foreign path/member ${name}`,t=>{
 const bytes=archive(t,[{name}]);assert.throws(()=>unpack(bytes),/entry/)
})
test('FCF ZIP refuses duplicate names before any extraction',t=>{
 const bytes=archive(t,[{name:'manifest.json'},{name:'manifest.json'}]);assert.throws(()=>unpack(bytes),/entry/)
})
test('FCF ZIP refuses a symlink even under an allowed source filename',t=>{
 const bytes=archive(t,[{name:'acta-4116314.html',symlink:true,body:'../private'}]);assert.throws(()=>unpack(bytes),/regular|symlink/)
})
test('FCF ZIP enforces the original source 2MiB body bound',t=>{
 const bytes=archive(t,[{name:'acta-4116314.html',size:2097153}]);assert.throws(()=>unpack(bytes),/size|Buffer|ENOBUFS|LIMIT/)
})
