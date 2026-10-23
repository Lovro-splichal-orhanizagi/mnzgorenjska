import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vir from './nfsbih.mjs'

test('NFSBiH forwards preskoci/samoZapisnik filtering before per-report fetches', async () => {
  const calendar=await readFile(new URL('../vzorci/ba-nfsbih-razpored-54152223.html',import.meta.url),'utf8')
  const calls=[]
  const read=async url=>{calls.push(url);if(url===vir.naslovRazporeda('wwin-liga-bih/54152223'))return calendar;throw new Error(`report request must be skipped: ${url}`)}
  const result=await vir.zapisniki('wwin-liga-bih/54152223',read,{samoZapisnik:'ba54152295',preskoci:new Set(['ba54152295'])})
  assert.deepEqual(result,[])
  assert.deepEqual(calls,[vir.naslovRazporeda('wwin-liga-bih/54152223')])
})
