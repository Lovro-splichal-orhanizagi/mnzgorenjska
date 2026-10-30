import {withFcfG1Installed4109410} from './fcf-g1-9410-runtime.mjs'
import {isFcfG1SupplementCompetition} from '../lib/fcf-g1-supplement-installed.mjs'
import {withFcfG1InstalledSupplement} from './fcf-g1-supplement-runtime.mjs'
import {FCF_SIX_SOURCE_POLICY} from '../fcf-six-historical-policy.mjs'
import {withFcfSixHistoricalStatistics} from './fcf-six-historical.mjs'
import {withFussballHistoricalStatistics} from './fussball-historical.mjs'
import {isBadenNativeCompetition,loadFussballNativeRuntimeCapture} from '../fussball-baden-native-dispatch.mjs'
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
import {withHnsWomenStatistics} from './hns-zenske-runtime.mjs'
import {validateHnsWomenClubBindings} from './hns-zenske-binding.mjs'
import facr from './facr.mjs'
import mlsz from './mlsz.mjs'
import oefb from './oefb.mjs'
import fsb from './fsb.mjs'
import fss from './fss.mjs'
import fssid from './fssid.mjs'
import frf from './frf.mjs'
import hlf from './hlf.mjs'
import fmf from './fmf.mjs'
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
import novanet from './novanet.mjs'
import dfb from './dfb.mjs'
import {createBulkCapturedSource} from './bulk-captured.mjs'
import {createFussballPublicSource} from './fussball-public.mjs'
import {createDriblPublicSource} from './dribl-public.mjs'
import {withDfbHistoricalStatistics} from './dfb-historical.mjs'
import {withFcfHistoricalStatistics} from './fcf-historical.mjs'
import {verifyFcfInstalledHistoricalMarker} from '../fcf-historical-policy.mjs'
import {getHistoricalStatisticsPolicy} from '../lib/historical-statistics-policy.mjs'
import {zaprtje} from '../odtis-kode.mjs'
import mascot from './mascot.mjs'
import lowland from './lowland.mjs'
import eps from './eps.mjs'
import tff from './tff.mjs'
import wmzpn from './wmzpn.mjs'
import ltfutbolas from './ltfutbolas.mjs'
import fscg from './fscg.mjs'
import mfa from './mfa.mjs'
import {withMfaHistoricalStatistics} from './mfa-historical.mjs'
import {withMlszHistoricalStatistics} from './mlsz-historical.mjs'
import {withReviewedExistingHistoryStatistics} from './reviewed-existing-history.mjs'
import isthmian from './isthmian.mjs'
import pflUa from './pfl-ua.mjs'
import nsfbih from './nsfbih.mjs'
import nfsbih from './nfsbih.mjs'
import gff from './gff.mjs'
import upl from './upl.mjs'
import ffl from './ffl.mjs'
import ksi from './ksi.mjs'
import fsf from './fsf.mjs'
import modular11 from './modular11.mjs'
import gfa from './gfa.mjs'
import dbu from './dbu.mjs'
import nff from './nff.mjs'
import kff from './kff.mjs'
import pflAz from './pfl-az.mjs'
import jfl from './jfl.mjs'
import hkfa from './hkfa.mjs'
import thaileague from './thaileague.mjs'

const VIRI = {
  // Ukrajina: Profesionalna nogometna liga prek pfl.ua.
  'pfl-ua': pflUa,
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
  // Moldavija (FMF) prek fmf.md: zapisniki COMET kot PDF (pdftotext), šifra osebe
  // COMET, vratar (G).
  fmf,
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
  // Španija (Galicija / Aragón): Novanet, preverjeni izidi in identitete.
  novanet,
  // Nemčija: javni zapisniki DFB Datencenter, Regionalliga Nordost.
  dfb,
  // FUSSBALL.DE: complete original-byte capture; configured per competition.
  'fussball-public': createFussballPublicSource,
  // Australia: closed replay of complete Football NSW Dribl captures.
  'dribl-public': createDriblPublicSource,
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
  // Bosna in Hercegovina: NS FBiH prek nsfbih.ba (COMET, Prva in Druga liga
  // FBiH), brez šifer igralcev (ime + klub), vratar je prvi začetnik (namig).
  nsfbih,
  // Bosna in Hercegovina, državna raven: NFSBiH prek nfsbih.ba (WWIN liga BiH;
  // isti COMET, druga stran), ime + klub (šifra v povezavi ni stalna), vratar "(GK)".
  nfsbih,
  // Gruzija (GFF) prek liga.gff.ge: Liga 3 in 4, brez šifer igralcev (ime + klub),
  // vratar je prvi začetnik (namig), koledarska sezona, Crawl-delay 10 s.
  gff,
  // Ukrajina: Українська Прем'єр-Ліга (upl.ua) — koledar prvenstva in raport arbitra;
  // šifra igralca, vratar iz postavitve.
  upl,
  // Ukrajina (Lvivska oblast): Львівська асоціація футболу prek ffl.org.ua;
  // postave iz novic (članek lige na dan), 10 s med zahtevki (Crawl-delay).
  ffl,
  // Islandija (KSÍ) prek ksi.is: šifre igralcev, vratar (M), koledarska sezona.
  ksi,
  // Ferski otoki (FSF) prek javnega posrednika COMET na fsf.fo (JSON, ki ga
  // stran kliče sama): šifre oseb, vratar, koledarska sezona, druge ekipe ("B36 II").
  fsf,
  // ZDA: USL League Two prek Modular11 (prvi vir zunaj Evrope); razpored je
  // GET seznam tekem divizije, zapisnik JSON v strani tekme, krog je teden.
  modular11,
  // Gibraltar (GFA) prek gibraltarfa.com (HTML): šifra osebe iz profila, kartoni
  // brez minute, drugi polčas pri viru zamaknjen za +45.
  gfa,
  // Danska: Dansk Boldspil-Union prek dbu.dk/resultater (HTML), pulje po sezoni,
  // brez šifer igralcev (ime + klub); krogi iz datumov. Pisno dovoljenje DBU.
  dbu,
  // Norveška (NFF) prek fotball.no (FIKS): šifra osebe, koledarska sezona,
  // nižje lige pogosto brez menjav; zajem s pisnim dovoljenjem NFF.
  nff,
  // Kazahstan (KFF) prek kffleague.kz: JSON v drevesu RSC strani tekme, šifra
  // osebe, pozicije iz postave, koledarska sezona.
  kff,
  // Azerbajdžan: PFL (I in II Liqa) prek javnega API-ja pfl.az (razpored) in
  // zapisnikov PDF (pdftotext); brez šifer igralcev, vratar je prvi začetnik (namig).
  'pfl-az': pflAz,
  // Japonska: Japan Football League (4. raven) prek jfl.or.jp — razpored in stran
  // tekme (HTML, ista vsebina kot uradni PDF), brez šifer igralcev (ime + klub),
  // pozicije GK/DF/MF/FW iz postave, čas Tokio → Ljubljana.
  jfl,
  // Hongkong (HKFA) prek strežniško izrisanih strani hkfa.com: stanje `__NUXT__`
  // brez eval (`nuxt.mjs`), stalna šifra igralca, čas Asia/Hong_Kong, krog je teden.
  hkfa,
  // Tajska: Thai League 2 in 3 prek javnega API-ja, ki ga kliče thaileague.co.th
  // (razpored), in zapisnikov PDF (pdftotext + ikone dogodkov iz toka strani);
  // brez šifer igralcev, pozicije iz zapisnika.
  thaileague,
}

/**
 * Vrne vir za dano tekmovanje.
 *
 * @param {{ source?: string, slug?: string }} tekmovanje vrstica iz `competitions`
 */
export function viraZa(tekmovanje, {installedHistoricalMarkers=null,installedG1Supplement=null,db=null}={}) {
  const ime = tekmovanje?.source ?? 'mnzg'
  if(isBadenNativeCompetition(tekmovanje)){
    const context=installedHistoricalMarkers??tekmovanje.fussballHistoricalContext
    const base=process.env.SLFF_BULK_CAPTURE?createBulkCapturedSource({competition:tekmovanje,db,directory:process.env.SLFF_BULK_CAPTURE,installedHistoricalMarkers:context}):{...createFussballPublicSource({competition:tekmovanje,db,loadCapture:(directory,{staffel,season})=>loadFussballNativeRuntimeCapture({context,competition:tekmovanje,directory,code:staffel+':'+season})}),fussballHistoricalContext:context}
    const wrapped=withFussballHistoricalStatistics(base,tekmovanje,{installedHistoricalMarkers:context})
    wrapped.historicalSourceFiles=[...new Set(zaprtje('scripts/viri/fussball-historical.mjs'))]
    return wrapped
  }
  if (process.env.SLFF_BULK_CAPTURE) return createBulkCapturedSource({competition:tekmovanje,db,directory:process.env.SLFF_BULK_CAPTURE})
  const vir = ['fussball-public','dribl-public'].includes(ime) ? VIRI[ime]({competition:tekmovanje,db}) : VIRI[ime]
  if (!vir) {
    const znani = Object.keys(VIRI).join(', ')
    throw new Error(
      `Tekmovanje "${tekmovanje?.slug ?? '?'}" navaja vir "${ime}", ki ga ne poznam. Znani viri: ${znani}.`,
    )
  }
  if(tekmovanje?.source_policy===FCF_SIX_SOURCE_POLICY){
    const supplement=isFcfG1SupplementCompetition(tekmovanje)?withFcfG1InstalledSupplement(vir,tekmovanje,{installedG1Supplement}):null
    const extra=supplement?withFcfG1Installed4109410(supplement.provider,tekmovanje,{readBlock:supplement.readBlock}):null
    const wrapped=withFcfSixHistoricalStatistics(extra?.provider??supplement?.provider??vir,tekmovanje,{installedHistoricalMarkers,...(extra?{readBlock:extra.readBlock}:supplement?{readBlock:supplement.readBlock}:{})})
    wrapped.historicalSourceFiles=[...new Set([...zaprtje('scripts/viri/fcf-six-historical.mjs'),...zaprtje('scripts/fcf-six-historical-policy.mjs'),...(supplement?[...zaprtje('scripts/viri/fcf-g1-supplement-runtime.mjs'),'scripts/policies/fcf-g1-4109409-supplement.json',...zaprtje('scripts/viri/fcf-g1-9410-runtime.mjs'),'scripts/policies/fcf-g1-4109410-supplement.json']:[])])]
    return wrapped
  }
  const policy=getHistoricalStatisticsPolicy(tekmovanje?.slug)
  if(!policy && tekmovanje?.source_policy==null)return vir
  if(!policy || tekmovanje.source!==policy.provider || tekmovanje.source_policy!==policy.sourcePolicy)throw Error('historical provider: invalid competition/provider/policy tuple')
  let wrapped,files
  if(ime==='dfb') {
    const adapter=withDfbHistoricalStatistics(vir,tekmovanje)
    wrapped={...adapter,zapisniki:(code,read,options={})=>adapter.zapisniki(code,read,{...options,installedHistoricalMarkers})}
    Object.defineProperty(wrapped,'nepopolni',{enumerable:true,get:()=>adapter.nepopolni})
    files=zaprtje('scripts/viri/dfb-historical.mjs')
  }else if(ime==='fcf') {
    wrapped=withFcfHistoricalStatistics(vir,tekmovanje,{installedHistoricalMarkers,verifyInstalledMarker:verifyFcfInstalledHistoricalMarker})
    files=[...zaprtje('scripts/viri/fcf-historical.mjs'),...zaprtje('scripts/fcf-historical-policy.mjs')]
  }else if(ime==='mfa') {
    wrapped=withMfaHistoricalStatistics(vir,tekmovanje,{installedHistoricalMarkers})
    files=zaprtje('scripts/viri/mfa-historical.mjs')
  }else if(ime==='mlsz') {
    wrapped=withMlszHistoricalStatistics(vir,tekmovanje,{installedHistoricalMarkers})
    files=zaprtje('scripts/viri/mlsz-historical.mjs')
  }else if(ime==='isthmian'||ime==='hlf'||ime==='nfsbih'||ime==='fmf') {
    wrapped=withReviewedExistingHistoryStatistics(vir,tekmovanje,{installedHistoricalMarkers})
    files=zaprtje('scripts/viri/reviewed-existing-history.mjs')
  }else if(ime==='hns') {
    const reviewedClubBindings=validateHnsWomenClubBindings(tekmovanje,{competitionId:tekmovanje.id,sourceCompetitionId:tekmovanje.source_league_code,clubs:tekmovanje.reviewedClubBindings},installedHistoricalMarkers?.markers??[])
    wrapped={...withHnsWomenStatistics(vir,tekmovanje,{installedHistoricalMarkers}),reviewedClubBindings}
    files=[...zaprtje('scripts/viri/hns-zenske-runtime.mjs'),...zaprtje('scripts/viri/hns-zenske-binding.mjs')]
  }else throw Error('historical provider: reviewed runtime adapter is not available for this policy')
  wrapped.historicalSourceFiles=[...new Set(files)]
  return wrapped
}

/** Vsi znani viri — za izpise in preverjanje. */
export const znaniViri = () => Object.keys(VIRI)

export default VIRI
