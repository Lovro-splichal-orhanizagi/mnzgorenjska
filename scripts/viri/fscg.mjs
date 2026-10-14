// Vir: Fudbalski savez Crne Gore — regijske strani centar/sjever/jug.fscg.me.
//
// Treća liga (najnižja članska raven v Črni gori) se igra v treh regijah:
// Regionalna liga Centar, Prvenstvo Sjeverne in Južne regije. Udruženja
// klubova jih vodijo v COMET in objavijo na svojih poddomenah v predlogi
// Auris (razčlenjevalnik je skupen: `comet-auris.mjs`). Glej CLAUDE.md
// (Črna gora — vir fscg).
//
// SEZONA je jesen–pomlad ("2026/27"), iz najzgodnejšega datuma razporeda.
//
// ŠIFRA LIGE je `<regija>/<slug>/<tekmovanje>`: `centar/seniorska-liga/9331975`
// — poddomena, pot strani `/takmicenja/<slug>/` in id tekmovanja COMET. Stran
// kaže le tekočo sezono; id v šifri je varovalo: ko stran preklopi na novo
// sezono (drug id v `data-genid`), se uvoz ustavi in šifro je treba popraviti.
//
// ARHIV: `<regija>/arhiva/<tekmovanje>` → `/takmicenja/arhiva/?cid=<id>`.
// Stran arhiva izriše katerokoli tekmovanje COMET po id-ju (v meniju "Arhiva
// takmičenja" so le stare državne lige, regijskih ni), zato id-je prejšnjih
// sezon najdeš drugje — npr. v posnetkih strani lige na web.archive.org
// (`data-genid`). 2025/26: Centar `8303239`, Sjever `8327709`, Jug `8373775`;
// 2024/25: Sjever `7390107`, Jug `7487412`. Tudi tu velja varovalo `data-genid`.
//
// ZAPISNIK `/utakmice/<slug>-<id>/`: igralci brez povezav na profil (le ime
// in dres; identiteta ime + klub kot pri fss), minuta v `div.minute`, gol z
// 11 m ima razred `penalty`. Čas je ljubljanski (CET).
//
// robots.txt ni (/robots.txt preusmeri na naslovnico). Beremo odkrito
// (User-Agent SLFF, 3 s med zahtevki). Zapisnik zadnjega tedna beremo sveže,
// do 45 dni še enkrat sveže, če stran iz predpomnilnika nima postav ali se
// goli ne ujemajo z izidom (`zapisnikSvez`), starejših ne beremo znova. Ob
// izzivu, CAPTCHI, 403 ali 429 se uvoz ustavi — ne obhajaj.
import {
  CometZavrnitev, beri, delVira, jeIzziv, kljucKluba, kratkoIme, nastopi, sezonaTekem, tabelaVsehTekem,
  tekmeTabele, tekmovanjeStrani, vKroge,
} from './comet-auris.mjs'

export const REGIJE = ['centar', 'sjever', 'jug']

export function razbijKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z]+)\/([a-z0-9-]+)\/(\d+)$/)
  if (!m || !REGIJE.includes(m[1]))
    throw new Error(`fscg: šifra lige je "<regija>/<slug>/<tekmovanje>" (regija ${REGIJE.join(', ')}; npr. centar/seniorska-liga/9331975), ne "${koda}"`)
  return { regija: m[1], slug: m[2], tekmovanje: m[3] }
}

const osnovni = (regija) => `https://${regija}.fscg.me`
export const naslovLige = (koda) => {
  const { regija, slug, tekmovanje } = razbijKodo(koda)
  return slug === 'arhiva' ? `${osnovni(regija)}/takmicenja/arhiva/?cid=${tekmovanje}` : `${osnovni(regija)}/takmicenja/${slug}/`
}

/** Tekme strani tekmovanja; stran z drugim tekmovanjem (nova sezona) ustavi uvoz. */
export function tekmeLige(koda, html) {
  const { tekmovanje } = razbijKodo(koda)
  const tabela = tabelaVsehTekem(html)
  if (!tabela) throw new Error(`fscg: ${naslovLige(koda)} nima tabele vseh tekem — uvoz ustavljen`)
  const na = tekmovanjeStrani(tabela)
  if (na !== tekmovanje) throw new Error(`fscg: ${naslovLige(koda)} kaže tekmovanje ${na ?? '?'}, ne ${tekmovanje} — nova sezona? Popravi šifro lige. Uvoz ustavljen`)
  return tekmeTabele(tabela)
}

export const razcleniRazpored = (koda, html) => vKroge(tekmeLige(koda, html))

/** Stran tekme; regija pride iz šifre lige, pot z razporeda. */
export const naslovZapisnika = (id, pot, koda) => {
  const o = osnovni(razbijKodo(koda).regija)
  return pot ? `${o}${pot}` : `${o}/utakmice/utakmica-${String(id).replace(/^me/, '')}/`
}

const skupno = delVira({
  ime: 'fscg',
  predpona: 'me',
  naslovLige,
  naslovZapisnika,
  tekmeLige,
  sezonaLige: sezonaTekem,
})
export const sifraZapisnika = skupno.sifraZapisnika

const vir = {
  ime: 'fscg',
  polnoIme: 'Fudbalski savez Crne Gore — regije (centar/sjever/jug.fscg.me)',
  drzava: 'ME',
  osnovniNaslov: 'https://fscg.me',
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  premorMs: 3000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (koda, id) => naslovZapisnika(id, null, koda),
  jeIzziv,
  zavrnitev: (sporocilo, status = null) => new CometZavrnitev(`fscg: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    return razcleniRazpored(koda, await beri('fscg', prenesi, naslovLige(koda), skupno.imeLige(koda), true))
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
