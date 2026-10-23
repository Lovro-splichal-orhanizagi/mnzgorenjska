import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vir from './isthmian.mjs'

const data = JSON.parse(readFileSync(new URL('../vzorci/gb-isthmian-stran-north-2026-27.json', import.meta.url), 'utf8'))
const body = JSON.stringify(data)
const code = 'npl/67d7d0c1749090308acc1021/2026-27'
const read = async () => body

test('Isthmian accepts skip options and omits those source match ids before parsing', async () => {
  const reports = await vir.zapisniki(code, read, { preskoci: new Set(data.items.map(item => `gb${item.id}`)) })
  assert.deepEqual(reports, [])
})

test('Isthmian preserves the prior numeric today argument', async () => {
  const reports = await vir.zapisniki(code, read, Date.parse('2026-10-23T00:00:00Z'))
  assert.ok(reports.length > 0)
})
