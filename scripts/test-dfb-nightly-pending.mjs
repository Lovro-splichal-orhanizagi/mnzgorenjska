import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
test('nightly DFB pending result opts in once, warns distinctly and never retries the whole league',()=>{
 const directory=mkdtempSync(join(tmpdir(),'dfb-nightly-')),bin=join(directory,'bin'),log=join(directory,'calls');mkdirSync(bin)
 writeFileSync(join(bin,'node'),`#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "$FAKE_LOG"\ncase "$1" in\n scripts/nocni-kosi.mjs) if [[ "$*" != *--zabelezi* ]]; then echo 'de-regionalliga-nordost 1 dfb'; fi;;\n scripts/uvoz-zapisnikov.mjs) if [[ "$*" == *--dfb-pending* ]]; then exit 6; else exit 1; fi;;\nesac\n`,{mode:0o755})
 try{
  const r=spawnSync('bash',[new URL('./nocni-uvoz.sh',import.meta.url).pathname],{cwd:directory,encoding:'utf8',env:{...process.env,PATH:bin+':'+process.env.PATH,DRZAVA:'DE',KOS:'1',KOSOV:'1',ROK_MIN:'190',FAKE_LOG:log}})
  assert.equal(r.status,0,r.stdout+r.stderr)
  const calls=readFileSync(log,'utf8').split('\n').filter(Boolean)
  assert.equal(calls.filter(s=>s.startsWith('scripts/uvoz-zapisnikov.mjs')).length,1)
  assert.match(r.stdout,/DFB.*pending|DFB.*čaka/i)
  assert.ok(!calls.some(s=>s.includes('--zabelezi')),'pending is not a complete refresh')
 }finally{rmSync(directory,{recursive:true,force:true})}
})
