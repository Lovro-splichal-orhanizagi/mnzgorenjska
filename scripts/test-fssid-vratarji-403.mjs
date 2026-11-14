// fssid: stran vratarjev prvaliga.rs, ki vrne 403, beremo največ enkrat na
// zagon (ne obhajamo); zapisniki se uvozijo s prvimi začetniki.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const vzorec = readFileSync(resolve('scripts/vzorci/rs-fssid-izvestaj-75954332-dvojni-goli.html'), 'utf8')
const koren = process.cwd()
process.chdir(mkdtempSync(join(tmpdir(), 'fssid-403-')))
const { default: vir } = await import(join(koren, 'scripts/viri/fssid.mjs'))
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
