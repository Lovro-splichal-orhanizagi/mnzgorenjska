// fss: stran vratarjev prvaliga.rs je v premoru (17. 11. 2026 403 na vseh 212
// zahtev, SLF-528): beremo jo le iz predpomnilnika. Z SLFF_FSSID_VRATARJI=1
// je spet vklopljena, prva zavrnitev pa jo izklopi do konca zagona.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const liga = readFileSync(resolve('scripts/vzorci/rs-fss-liga-prva-2026-27.html'), 'utf8')
const izvestaj = readFileSync(resolve('scripts/vzorci/rs-fss-izvestaj-75576384-kapetan-vratar.html'), 'utf8')
const vratarjiHtml = readFileSync(resolve('scripts/vzorci/rs-fss-vratarji-75576384.html'), 'utf8')
const koren = process.cwd()
process.chdir(mkdtempSync(join(tmpdir(), 'fss-403-')))
const fss = join(koren, 'scripts/viri/fss.mjs')
process.env.SLFF_FSSID_VRATARJI = '1'
const { default: vir, naslovVratarjev, naslovLige } = await import(`${fss}?vklop`)
delete process.env.SLFF_FSSID_VRATARJI
const { default: virPremor } = await import(`${fss}?premor`)
const VRATARJI = naslovVratarjev(0).replace(/0\/$/, '')
const KODA = 'prva-liga'

const prenosnik = (klici, vratarji) => async (url) => {
  if (url.startsWith(VRATARJI)) { klici.vratarji++; return vratarji(url) }
  if (url === naslovLige(KODA)) return liga
  klici.izvestaji++
  return izvestaj
}

test('fss: po 403 na strani vratarjev je ne sprašujemo več', async () => {
  const klici = { vratarji: 0, izvestaji: 0 }
  const z = await vir.zapisniki(KODA, prenosnik(klici, (url) => {
    const e = new Error(`${url} -> HTTP 403`)
    e.status = 403
    throw e
  }))
  assert.ok(klici.izvestaji >= 2, 'liga ima več tekem')
  assert.ok(z.length >= 2, 'zapisniki se uvozijo brez strani vratarjev')
  assert.equal(klici.vratarji, 1)
})

test('fss: v premoru stran vratarjev le iz predpomnilnika', async () => {
  const klici = { vratarji: 0, izvestaji: 0 }
  const z = await virPremor.zapisniki(KODA, prenosnik(klici, () => vratarjiHtml))
  assert.ok(z.length >= 2)
  assert.equal(klici.vratarji, 0)
  assert.ok(z.every((x) => x.z.opozorila.includes('vratarjev ni (prvaliga.rs)')))

  // Shranjena stran vratarjev se še vedno prebere.
  const id = z[0].id
  mkdirSync('scripts/.predpomnilnik/fss', { recursive: true })
  const { sifra } = await import(join(koren, 'scripts/viri/zapisniki.mjs'))
  writeFileSync(`scripts/.predpomnilnik/fss/fss-vratarji-${sifra(KODA)}-${id}.html`, vratarjiHtml)
  const z2 = await virPremor.zapisniki(KODA, prenosnik(klici, () => vratarjiHtml))
  assert.equal(klici.vratarji, 0)
  assert.ok(!z2.find((x) => x.id === id).z.opozorila.includes('vratarjev ni (prvaliga.rs)'))
})
