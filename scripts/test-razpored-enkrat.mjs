// SLF-546: stran razporeda, ki jo je ta zagon pravkar prenesel, se ne bere znova
// (GitHubovi stroji so ob drugem branju iste strani dobili ~12 kB stran brez razporeda).
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { svezRazpored, SVEZ_RAZPORED_MS } from './viri/eps.mjs'
import { svezaLiga, SVEZA_LIGA_MS } from './viri/nfsbih.mjs'
import { sifra } from './viri/zapisniki.mjs'

const vzorec = (ime) => readFileSync(new URL(`./vzorci/${ime}`, import.meta.url), 'utf8')
const mapa = () => mkdtempSync(join(tmpdir(), 'razpored-enkrat-'))
const postaraj = (p, ms) => { const t = (Date.now() - ms) / 1000; utimesSync(p, t, t) }

test('eps: sveže shranjen razpored velja, star ali okrnjen ne', () => {
  const m = mapa(), ime = `razpored-${sifra('epsana.gr:748')}.html`, p = join(m, ime)
  assert.equal(svezRazpored(ime, m), null)
  writeFileSync(p, vzorec('gr-eps-razpored-epsana-748.html'))
  assert.ok(svezRazpored(ime, m)?.length > 20000)
  postaraj(p, SVEZ_RAZPORED_MS + 60000)
  assert.equal(svezRazpored(ime, m), null)
  writeFileSync(p, '<html><head><title>x</title></head><body>kratka stran</body></html>')
  assert.equal(svezRazpored(ime, m), null)
})

test('nfsbih: velja stran lige iz uvoza razporeda ali razporedVseStrani, le sveža', () => {
  const koda = 'wwin-liga-bih/54152223', html = vzorec('ba-nfsbih-razpored-54152223.html')
  for (const ime of [`razpored-${sifra(koda)}.html`, `nfsbih-liga-${sifra(koda)}.html`]) {
    const m = mapa(), p = join(m, ime)
    assert.equal(svezaLiga(koda, m), null)
    writeFileSync(p, html)
    assert.equal(svezaLiga(koda, m), html)
    postaraj(p, SVEZA_LIGA_MS + 60000)
    assert.equal(svezaLiga(koda, m), null)
  }
  const m = mapa()
  writeFileSync(join(m, `razpored-${sifra(koda)}.html`), '<html><title>Napaka</title>' + ' '.repeat(12000) + '</html>')
  assert.equal(svezaLiga(koda, m), null)
})
