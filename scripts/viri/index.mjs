// Izbira vira podatkov po `competitions.source`.
//
// En vir = ena datoteka v tej mapi. Nov vir (druga zveza, druga država)
// pomeni novo datoteko in eno vrstico spodaj — uvoznih skript se ne dotika.
//
// Zavestno je to preprost slovar in ne samodejno branje mape: tako je iz kode
// razvidno, kateri viri obstajajo, in tipkarska napaka v `source` pade takoj
// z razumljivo napako namesto na pol poti skozi uvoz.
import mnzg from './mnzg.mjs'
import mnzlj from './mnzlj.mjs'
import mnzce from './mnzce.mjs'
import mnzpt from './mnzpt.mjs'
import mnzms from './mnzms.mjs'
import mnzle from './mnzle.mjs'
import mnzmb from './mnzmb.mjs'
import mnzng from './mnzng.mjs'
import nzs from './nzs.mjs'
import sportnet from './sportnet.mjs'
import hns from './hns.mjs'
import facr from './facr.mjs'
import mlsz from './mlsz.mjs'
import oefb from './oefb.mjs'
import fsb from './fsb.mjs'
import fss from './fss.mjs'
import fssid from './fssid.mjs'
import frf from './frf.mjs'
import hlf from './hlf.mjs'
import pzpn from './pzpn.mjs'
import jalgpall from './jalgpall.mjs'
import lff from './lff.mjs'
import ffm from './ffm.mjs'
import fcf from './fcf.mjs'
import fas from './fas.mjs'
import aft from './aft.mjs'
import ncefl from './ncefl.mjs'
import hoffKm from './hoff-km.mjs'
import askf from './askf.mjs'
import ffa from './ffa.mjs'
import mascot from './mascot.mjs'
import lowland from './lowland.mjs'
import eps from './eps.mjs'
import tff from './tff.mjs'
import wmzpn from './wmzpn.mjs'
import ltfutbolas from './ltfutbolas.mjs'
import fscg from './fscg.mjs'
import mfa from './mfa.mjs'
import isthmian from './isthmian.mjs'

const VIRI = {
  mnzg,
  mnzlj,
  mnzce,
  mnzpt,
  mnzms,
  mnzle,
  mnzmb,
  mnzng,
  // Edini vir, ki ni medobcinska zveza: drzavne lige na nzs.si.
  nzs,
  // Prvi vir zunaj Slovenije: Slovaška (SFZ) prek javnega API-ja Sportneta.
  sportnet,
  // Hrvaška (HNS in županijske zveze) prek HNS Semaforja.
  hns,
  // Češka (FAČR) prek javnega dela IS FAČR; doseže ga le posrednik v EU.
  facr,
  // Madžarska (MLSZ in županijske zveze) prek MLSZ adatbank.
  mlsz,
  // Avstrija (ÖFB in deželne zveze) prek oefb.at.
  oefb,
  // Srbija: Fudbalski savez Beograda (fsb.org.rs), brez šifer igralcev.
  fsb,
  // Srbija: državni ligi FSS (fss.rs), vratar s prvaliga.rs.
  fss,
  // Srbija: regijske lige (Srpska liga Istok, Zapad, Vojvodina) po bloku šifer
  // tekem COMET na fss.rs; datumi neodigranih z regijskih strani ali ocenjeni.
  fssid,
  // Romunija: portal županijskih zvez (frf-ajf.ro), brez dresov in vratarja.
  frf,
  // Romunija: uradna platforma FRF (hailafotbal.ro), digitalni zapisniki od 2026/27,
  // z dresi, vratarjem in šifro igralca; bere jo brskalnik brez glave.
  hlf,
  // Poljska: uradni zapisniki PZPN (Extranet) prek javnega gradnika vojvodske zveze.
  pzpn,
  // Estonija (EJL) prek jalgpall.ee: šifre igralcev, pozicije iz postavitve,
  // koledarska sezona.
  jalgpall,
  // Latvija (LFF) prek lff.lv: brez šifer igralcev (ime + klub), vratar (G),
  // koledarska sezona.
  lff,
  // Severna Makedonija (FFM) prek ffm.mk: predloga kot fss.rs, brez šifer igralcev,
  // vratar je prvi začetnik (namig).
  ffm,
  // Španija (Katalonija): Federació Catalana de Futbol prek zapisnikov fcf.cat
  // (drevo RSC v strani); liga je blok šifer zapisnikov, šifra osebe, vratar.
  fcf,
  // Španija (Asturija): FutbolAsturiano.es (WordPress SportsPress), ne zveza;
  // liga je blok šifer objav tekem ene sezone, igralec s potjo profila.
  fas,
  // Ukrajina (Ternopilska oblast): Асоціація футболу Тернопільщини prek
  // aft.com.ua; postave iz novic (ponatis Газета 1), koledarska sezona.
  aft,
  // Anglija (step 5–6): Northern Counties East League prek ncefl.org.uk; brez
  // šifer igralcev (ime + klub), krog je teden (stran krogov ne pozna).
  ncefl,
  // Ukrajina (Hmeljnicka oblast): ХОАФ prek hoff.km.ua (WordPress): razpored je
  // tabela strani lige, zapisnik objava tekme (REST), imena brez šifer.
  'hoff-km': hoffKm,
  // Turčija: pokrajinske amaterske zveze ASKF (platforma FYS: Çanakkale, Aydın);
  // razpored s postbacki ASP.NET, šifra licence TFF igralca.
  askf,
  // Armenija: Football Federation of Armenia (ffa.am), Prva liga; brez šifer
  // igralcev (ime + klub), vratar je prvi začetnik (namig).
  ffa,
  // Grčija: regionalne zveze EPS na platformi Mascotnet (deset domen, šifra
  // `<domena>:<diorganosi>`), brez šifer igralcev, vratar prvi začetnik (namig).
  // Pisno dovoljenje upravljavca (Lovro, oktober 2026).
  mascot,
  // Škotska (5. raven): Scottish Lowland Football League prek Match Centra
  // slfl.co.uk (COMET); krogi iz šifer tekem, brez šifer igralcev. Pisno dovoljenje.
  lowland,
  // Grčija: regionalne zveze EPS na skupni platformi results.php (ena domena na
  // zvezo, šifra `<domena>:<league_id>`), player_id, brez dresov in vratarja.
  eps,
  // Turčija (TFF) prek tff.org: 2. Lig, 3. Lig in PGL; šifra osebe (kisiId),
  // brez vratarja in pozicij, stran v windows-1254.
  tff,
  // Poljska: Warmińsko-Mazurski ZPN (wmzpn.pl) — zapisniki PZPN Extranet prek
  // okna strani (admin-ajax match_history), šifre oseb PZPN kot pri pzpn.
  wmzpn,
  // Litva (LFF) prek lietuvosfutbolas.lt in Črna gora (regije FSCG) prek
  // centar/sjever/jug.fscg.me: ista predloga COMET (Auris), `comet-auris.mjs`.
  ltfutbolas,
  fscg,
  // Malta (MFA) prek javnega JSON API-ja Match Centra (api.mfa.com.mt, COMET):
  // šifra osebe, vratar, menjave z minuto; krog iz zaporedja šifer tekem.
  mfa,
  // Anglija (step 3–4): Isthmian, Northern Premier in Southern League prek skupnega
  // javnega JSON platforme (glava x-tenant-id); šifra osebe, vratar.
  isthmian,
}

/**
 * Vrne vir za dano tekmovanje.
 *
 * @param {{ source?: string, slug?: string }} tekmovanje vrstica iz `competitions`
 */
export function viraZa(tekmovanje) {
  const ime = tekmovanje?.source ?? 'mnzg'
  const vir = VIRI[ime]
  if (!vir) {
    const znani = Object.keys(VIRI).join(', ')
    throw new Error(
      `Tekmovanje "${tekmovanje?.slug ?? '?'}" navaja vir "${ime}", ki ga ne poznam. Znani viri: ${znani}.`,
    )
  }
  return vir
}

/** Vsi znani viri — za izpise in preverjanje. */
export const znaniViri = () => Object.keys(VIRI)

export default VIRI
