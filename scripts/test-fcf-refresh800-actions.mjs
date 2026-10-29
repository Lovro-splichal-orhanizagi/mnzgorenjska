import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fcfRefresh800RuntimeFiles,assertFcfRefresh800RuntimeClosure} from './fcf-refresh800-runtime.mjs'
import {buildFcfRefresh800Approval} from './fcf-refresh800-actions.mjs'
test('runtime epoch closure includes capture and every local import independently of consumer commit',()=>{const m=fcfRefresh800RuntimeFiles(),contents=new Map(m.map(x=>[x.path,readFileSync(x.path)]));assertFcfRefresh800RuntimeClosure(m,contents);assert.throws(()=>assertFcfRefresh800RuntimeClosure(m.filter(x=>x.path!=='scripts/fcf-refresh800-capture.mjs'),contents),/incomplete/);assert.throws(()=>assertFcfRefresh800RuntimeClosure([...m,{path:'scripts/not-reviewed.mjs',sha256:'a'.repeat(64)}],contents),/extra/)})
test('approval preparation requires a reader-bound plan; data cannot grant capture authority',()=>{assert.throws(()=>buildFcfRefresh800Approval({plan:{},rulesetSnapshot:{},mainCiRunId:'1',probeLocators:[],refreshLocators:[]}),/reader-bound/)})
