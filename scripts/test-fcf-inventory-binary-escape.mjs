import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,rmSync,chmodSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'

const root=dirname(fileURLToPath(import.meta.url)),module=join(root,'fcf-inventory-github.mjs')
const repo='repos/Lovro-splichal-orhanizagi/mnzgorenjska/',binaryA=repo+'releases/assets/690729624',binaryB=repo+'releases/assets/690729625',jsonPath=repo+'releases/416653899'
const expected=Buffer.from([0x1b,0x5b,0x33,0x31,0x6d,0x00,0xff])

function exercise(support,mode='ok'){
 const dir=mkdtempSync(join(tmpdir(),'fcf-inventory-binary-escape-')),bin=join(dir,'gh')
 const fake=`#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);fs.appendFileSync('calls.jsonl',JSON.stringify(args)+'\\n');
if(args[0]==='api'&&args[1]==='--help'){process.stdout.write(${JSON.stringify(support?'API help\\n  --allow-escape-sequences  output escape sequences\\n':'older API help with no escape option\\n')});process.exit(0)}
const endpoint=args[args.indexOf('--method')+2];if(process.env.TEST_MODE==='failure'&&endpoint==='${binaryA}'){process.stderr.write('HTTP 404 synthetic');process.exit(1)}
if(${support}&&endpoint.startsWith('repos/Lovro-splichal-orhanizagi/mnzgorenjska/releases/assets/')&&!args.includes('--allow-escape-sequences')){process.stderr.write('the response contains terminal escape sequences');process.exit(1)}
if(endpoint==='${jsonPath}')process.stdout.write('{"kind":"metadata"}');else process.stdout.write(Buffer.from(${JSON.stringify([...expected])}));
`
 writeFileSync(bin,fake);chmodSync(bin,0o700)
 try{
  const code=`import {getFcfInventoryGithub as get} from ${JSON.stringify(new URL('file://'+module).href)};try{const a=await get(${JSON.stringify(binaryA)},true);const j=await get(${JSON.stringify(jsonPath)},false);const b=await get(${JSON.stringify(binaryB)},true);process.stdout.write(JSON.stringify({a:[...a],j,b:[...b]}))}catch(e){process.stdout.write(JSON.stringify({errorStatus:e.status??null,errorMessage:e.message}))}`
  const output=execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:dir,env:{...process.env,PATH:`${dir}:${process.env.PATH}`,TEST_MODE:mode},encoding:'utf8',maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']})
  return {dir,value:JSON.parse(output),calls:readFileSync(join(dir,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse)}
 }catch(error){return {dir,error}}
}

const results=[]
try{
 for(const support of [false,true]){
  const r=exercise(support);results.push(r);assert.ok(!r.error)
  assert.deepEqual(Buffer.from(r.value.a),expected);assert.deepEqual(Buffer.from(r.value.b),expected);assert.deepEqual(r.value.j,{kind:'metadata'})
  assert.equal(r.calls.filter(x=>x[0]==='api'&&x[1]==='--help').length,1,'binary capability is inspected once and cached')
  const gets=r.calls.filter(x=>x.includes('--method'));assert.equal(gets.length,3)
  const endpoint=x=>x[x.indexOf('--method')+2]
  const binaries=gets.filter(x=>endpoint(x)===binaryA||endpoint(x)===binaryB);assert.equal(binaries.length,2)
  assert.ok(binaries.every(x=>x.includes('Accept: application/octet-stream')))
  assert.ok(binaries.every(x=>x.includes('--allow-escape-sequences')===support),'escape flag is used only when local help advertises it')
  assert.ok(!gets.find(x=>endpoint(x)===jsonPath).includes('--allow-escape-sequences'),'JSON requests stay unchanged')
  assert.equal(r.calls.filter(x=>x.includes('--method')&&endpoint(x)===jsonPath).length,1)
 }
 const failed=exercise(false,'failure');results.push(failed)
 assert.ok(!failed.error);assert.equal(failed.value.errorStatus,404);assert.equal(failed.value.errorMessage,'FCF_INVENTORY: authenticated GitHub GET failed')
 process.stdout.write('binary escape compatibility: old/new fake gh preserve exact ESC bytes, cache help once, leave JSON GET unchanged, and retain HTTP error handling\n')
}finally{for(const r of results)rmSync(r.dir,{recursive:true,force:true})}
