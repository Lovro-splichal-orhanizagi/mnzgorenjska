// fssid: stran vratarjev prvaliga.rs, ki vrne 403, beremo največ enkrat na
// zagon (ne obhajamo); zapisniki se uvozijo s prvimi začetniki. Privzeto je
// stran v premoru (SLF-524), SLFF_FSSID_VRATARJI=1 jo spet vklopi.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const vzorec = readFileSync(resolve('scripts/vzorci/rs-fssid-izvestaj-75954332-dvojni-goli.html'), 'utf8')
const koren = process.cwd()
process.chdir(mkdtempSync(join(tmpdir(), 'fssid-403-')))
const fssid = join(koren, 'scripts/viri/fssid.mjs')
process.env.SLFF_FSSID_VRATARJI = '1'
const { default: vir } = await import(`${fssid}?vklop`)
delete process.env.SLFF_FSSID_VRATARJI
const { default: virPremor } = await import(`${fssid}?premor`)
const { naslovVratarjev } = await import(join(koren, 'scripts/viri/fss.mjs'))
const VRATARJI = naslovVratarjev(0).replace(/0\/$/, '')

test('fssid: po 403 na strani vratarjev je ne sprašujemo več', async () => {
  const klici = { vratarji: 0, izvestaji: 0 }
  const prenesi = async (url) => {
    if (url.startsWith(VRATARJI)) {
      klici.vratarji++
      const e = new Error(`${url} -> HTTP 403`)
      e.status = 403
      throw e
    }
    klici.izvestaji++
    return vzorec
  }
  const z = await vir.zapisniki('1-6', prenesi)
  assert.ok(klici.izvestaji >= 1)
  assert.ok(z.length >= 1, 'zapisniki se uvozijo brez strani vratarjev')
  assert.equal(klici.vratarji, 1)
})

test('fssid: stran vratarjev je v premoru, zapisniki se uvozijo brez nje', async () => {
  const klici = { vratarji: 0, izvestaji: 0 }
  const prenesi = async (url) => {
    if (url.startsWith(VRATARJI)) klici.vratarji++
    else klici.izvestaji++
    return vzorec
  }
  const z = await virPremor.zapisniki('1-6', prenesi)
  assert.ok(z.length >= 1)
  assert.equal(klici.vratarji, 0)
})
