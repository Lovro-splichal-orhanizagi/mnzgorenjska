// Vir: Lietuvos futbolas — lietuvosfutbolas.lt (portal rezultatov LFF).
//
// LFF in regijske zveze vodijo tekmovanja v COMET; portal jih izriše s
// strežnika v predlogi Auris (kot lff.lv, razčlenjevalnik je skupen:
// `comet-auris.mjs`). Glej CLAUDE.md (Litva — vir ltfutbolas).
//
// SEZONA je koledarsko leto (april–oktober): "2026" (`sezona_koledarska`).
// Vir jo vzame iz datumov razporeda (najpogostejše leto).
//
// ŠIFRA LIGE je id tekmovanja COMET (`/varzybos/<id>/<slug>/`): II lyga A
// divizionas 2026 = `23383524`. Vsaka sezona ima svojega. Stran pod
// `/varzybos/megeju/<slug>/` kaže le tekočo sezono, zato beremo po id-ju in
// preverimo, da povezave klubov na strani nosijo isti `?cid=`.
//
// ZAPISNIK `/rungtynes/<slug>-<id>/`, zavihek "Rungtynių protokolas": vsak
// igralec ima povezavo `/zaidejai/<slug>-<id>/` — id gre v `reg_st`.
// Krajevni čas je vilenski (EET), ljubljanski je uro manj.
//
// robots.txt ni (/robots.txt preusmeri na naslovnico). Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki), zapisnikov, starejših od tedna, ne
// beremo znova. Ob izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj.
import { vLjubljanskiCas } from './frf.mjs'
import {
  CometZavrnitev, beri, delVira, jeIzziv, kljucKluba, kratkoIme, letoTekem, nastopi, tabelaVsehTekem,
  tekmeTabele, tekmovanjeStrani, vKroge,
} from './comet-auris.mjs'

const OSNOVNI = 'https://lietuvosfutbolas.lt'

export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^(\d+)$/)
  if (!m) throw new Error(`ltfutbolas: šifra lige je id tekmovanja (npr. 23383524), ne "${koda}"`)
  return m[1]
}

export const naslovLige = (koda) => `${OSNOVNI}/varzybos/${razbijKodo(koda)}/lyga/`
export const naslovZapisnika = (id, pot = null) =>
  pot ? `${OSNOVNI}${pot}` : `${OSNOVNI}/rungtynes/rungtynes-${String(id).replace(/^lt/, '')}/`

/** Tekme strani tekmovanja; stran drugega tekmovanja ustavi uvoz. */
export function tekmeLige(koda, html) {
  const id = razbijKodo(koda)
  const tabela = tabelaVsehTekem(html)
  if (!tabela) throw new Error(`ltfutbolas: ${naslovLige(koda)} nima tabele vseh tekem — uvoz ustavljen`)
  const na = tekmovanjeStrani(tabela)
  if (na !== id) throw new Error(`ltfutbolas: ${naslovLige(koda)} kaže tekmovanje ${na ?? '?'}, ne ${id} — uvoz ustavljen`)
  return tekmeTabele(tabela)
}

export const razcleniRazpored = (koda, html) => vKroge(tekmeLige(koda, html), vLjubljanskiCas)

const skupno = delVira({
  ime: 'ltfutbolas',
  predpona: 'lt',
  naslovLige,
  naslovZapisnika,
  tekmeLige,
  sezonaLige: letoTekem,
})
export const sifraZapisnika = skupno.sifraZapisnika

const vir = {
  ime: 'ltfutbolas',
  polnoIme: 'Lietuvos futbolas (lietuvosfutbolas.lt)',
  drzava: 'LT',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new CometZavrnitev(`ltfutbolas: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(koda, await beri('ltfutbolas', prenesi, naslovLige(koda), skupno.imeLige(koda), true))
  },
  zapisniki: skupno.zapisniki,
  kontumacije: skupno.kontumacije,

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba,
  kratkoIme,
  poenostavi: kljucKluba,
}

export default vir
