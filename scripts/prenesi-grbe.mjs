// Prenese grbe klubov v `public/grbi/` in jih poveže s klubi v bazi.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/prenesi-grbe.mjs
//   ... --pisi        (dejansko prenese in zapiše; brez tega samo pokaže načrt)
//   SUPABASE_URL=...  (za projekt v oblaku)
//
// Uradnih grbov MNZ Gorenjska ne objavlja. Večina klubov 1. GNL nima spletne
// strani, ima pa NK Kranj (Zarica) ob najavah tekem objavljene grbe vseh
// nasprotnikov — od tam jih vzamemo. Ključ v spodnjem seznamu je poenostavljeno
// ime kluba, kot ga vidi `uvoz-razporeda.mjs`, da se ujemata ne glede na vezaje.
//
// Klubi, ki igrajo samo mladinsko ligo, pri NK Kranj niso zbrani — njihove
// grbe vzamemo z njihovih klubskih strani.
//
// Grbi so blagovne znamke klubov; uporabljamo jih za prikaz kluba, kar je pri
// navijaških straneh običajno. Če kak klub tega ne želi, se vrstica pobriše in
// aplikacija zanj spet nariše grb iz začetnic.
//
// MNZ Ljubljana grbov ne objavlja, jih pa ima NK Vir na svoji strani zbrane za
// napovedi tekem (`tl_files/Klubski grbi/`) — od tam vzamemo 2. ljubljansko
// ligo, manjkajoča dva kluba z njunih strani. (1. LJ ligo smo dodali ročno.)
//
// Vsak prenesen grb takoj pomanjšamo na največ 256 px (`sips`, sistemsko na
// macOS) — vir jih ponuja tudi po 800 px in 1 MB, v aplikaciji pa se grb
// izriše pri ~22–32 px. Če `sips` ni na voljo, grb ostane v izvirni velikosti.
import { createClient } from '@supabase/supabase-js'
import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  statSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'

const MAPA = 'public/grbi'
const NAJVECJA_STRANICA = 256
const NKK = 'https://nkkranj.si/wp-content/uploads'
const NKV = 'https://www.nkvir.si/tl_files/Klubski%20grbi'
const NZS = 'https://www.nzs.si/sites/default/files/media/image'

const GRBI = {
  'bled bohinj hirter': `${NKK}/2026/07/grb-hirter-bled.png`,
  britof: `${NKK}/2026/07/grb-britof.png`,
  'eltron preddvor': `${NKK}/2026/07/grb-sd-storzic-preddvor.png`,
  'jezero medvode': `${NKK}/2026/07/grb-jezero-medvode.png`,
  'kranjska gora': `${NKK}/2026/07/kranjska-gora.png`,
  'niko zelezniki': `${NKK}/2026/07/niko-zelezniki.png`,
  polet: `${NKK}/2026/07/polet.png`,
  'sava kranj': `${NKK}/2026/07/grb-nk-sava-kranj.png`,
  'topdom dom trade bitnje': `${NKK}/2026/07/bitnje.png`,
  'trzic 2012': `${NKK}/2026/07/trzic-2012.png`,
  'velesovo cerklje': `${NKK}/2026/07/grb-velesovo-cerklje.png`,
  visoko: `${NKK}/2026/07/grb-sd-visoko.png`,
  'zarica kranj': `${NKK}/2026/06/Grb-nk_zarica_kranj.png`,

  // samo mladinska liga
  jesenice: `${NKK}/2026/07/grb-jesenice.png`,
  sencur:
    'https://sportnodrustvo-sencur.si/resources/files/pic/Drago/razno/grb.jpg.JPG',
  'sobec lesce': 'http://www.nk-lesce.si/wp-content/themes/nklesce/images/logo.png',
  'eksist ziri': 'https://nklub-ziri.si/wp-content/uploads/2018/11/site-icon.png',

  // MNZ Ljubljana, 2. liga — člani. Ključi so podvojeni, ker arhiv klub
  // ponekod vpiše s predpono ("ŠD Vir"), drugod brez ("Vir"); odvečen ključ,
  // ki se ne ujame z nobenim klubom, ne škodi.
  kamnik: `${NKV}/kamnik_90x90.png`,
  'termit moravce': `${NKV}/moravce_90x90.png`,
  moravce: `${NKV}/moravce_90x90.png`,
  'sd vir': `${NKV}/vir_90x90.png`,
  vir: `${NKV}/vir_90x90.png`,
  komenda: `${NKV}/komenda_90x90.png`,
  crnuce: `${NKV}/crnuce_90x90.png`,
  sentjernej: `${NKV}/sentjernej_90x90.png`,
  'nk iak kresnice': `${NKV}/kresnice_90x90.png`,
  'iak kresnice': `${NKV}/kresnice_90x90.png`,
  kresnice: `${NKV}/kresnice_90x90.png`,
  'nk ugar ribnica':
    'https://www.nkugar.si/wp-content/uploads/2025/08/logo-nk-ugar-pravi-2.png',
  'ugar ribnica':
    'https://www.nkugar.si/wp-content/uploads/2025/08/logo-nk-ugar-pravi-2.png',
  ribnica:
    'https://www.nkugar.si/wp-content/uploads/2025/08/logo-nk-ugar-pravi-2.png',
  ihan: 'https://nkihan.si/wp-content/uploads/2021/02/1932.png',

  // Z NZS, a pod drugim imenom, zato jih `prenesi-grbe-nzs.mjs` ne ujame sam
  // (ta sprejme le enako zaporedje besed). Vsak par je preverjen na roko.
  // Namerno NI: Fama Vipava (ni NK Vipava), Kovinar Maribor (ni NK Maribor),
  // Bistrica v Prekmurju (ni Slovenska Bistrica), Šmartno 1928 in Jeruzalem.
  'beltinci klima tratnjek': `${NZS}/NDBeltinci.svg`,
  'bilje tabor': `${NZS}/NDBilje.svg`,
  'brezice 1919 terme catez': `${NZS}/Brezice.svg`,
  'eltron sencur': `${NZS}/SDSencur.svg`,
  'grajena anpro': `${NZS}/Grajena.svg`,
  'iblo podvinci': `${NZS}/Podvinci.svg`,
  mura: `${NZS}/NSMura.svg`,
  primorje: `${NZS}/NDPrimorje.svg`,
  race: `${NZS}/nk-race-raster.png`,
  'sd gorisnica': `${NZS}/Gorisica.svg`,
  slovan: `${NZS}/NDSlovan.svg`,
  'tkk tolmin': `${NZS}/NKTolmin.svg`,
  'zidgrad idrija': `${NZS}/NDIdrija.png`,
  // Iz mladinskih lig NZS (U15), ki jih skripta za NZS ne pregleduje.
  centiba: `${NZS}/Centiba.png`,
  marjeta: `${NZS}/Marjeta.svg`,

  // Regionalne lige (septembra 2026). Viri: seznami ekip MNZ Maribor
  // (/tekmovanje/<liga>/mostva), klubi MNZ Murska Sobota, Ljubljana, Nova
  // Gorica in Koper, pokal in starejse sezone NZS ter klubske strani. Ime je
  // pri vsakem grbu v isti znacki ali na strani kluba; dvomljivih ni.
  adria:
    'https://wp.mnzgorica.si/wp-content/uploads/2026/07/NK_Adria-1024x909.webp',
  'aluvar gancani':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/9de/thumb_252_100_100_0_0_auto.png',
  apace:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/778/910/thumb_241_100_100_0_0_auto.png',
  'apace akz rikardo':
    'https://www.nzs.si/sites/default/files/media/image/Apace.svg',
  'aqua izakovci':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/77a/20a/thumb_258_100_100_0_0_auto.png',
  bakovci:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/77a/510/thumb_261_100_100_0_0_auto.png',
  'bistrc irbis':
    'https://www.nzs.si/sites/default/files/media/image/ND-Bistrc-Logo.png',
  bistrica:
    'https://www.nzs.si/sites/default/files/media/image/Bistrica.png',
  brda:
    'https://wp.mnzgorica.si/wp-content/uploads/2026/07/nk-brda-logo-300x300.png',
  brunsvik:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_brunsvik.png',
  bukovci:
    'https://www.nzs.si/sites/default/files/media/image/Bukovci.svg',
  cankova:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/463/thumb_248_100_100_0_0_auto.png',
  cerknica:
    'https://www.nk-cerknica.si/wp-content/uploads/2017/11/logo-nk-cerknica-120.png',
  cirkulane:
    'https://www.nzs.si/sites/default/files/media/image/Cirkulane.svg',
  crensovci:
    'https://www.nzs.si/sites/default/files/media/image/crensovci.svg',
  cven:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/64f/03c/923/thumb_378_100_100_0_0_auto.png',
  dobrovnik:
    'https://www.nzs.si/sites/default/files/media/image/Dobrovnik.png',
  doklezovje:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/e53/thumb_255_100_100_0_0_auto.png',
  'dornava digitalpartner si':
    'https://www.nzs.si/sites/default/files/media/image/Dornava.png',
  'drava intera':
    'https://www.nzs.si/sites/default/files/media/image/logo-ns-intera-drava-512-512.png',
  dravograd:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_koroska_dravograd.png',
  duplek:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_duplek.png',
  'fram bitifit':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_fram.png',
  'fuzinar ravne':
    'https://www.nzs.si/sites/default/files/media/image/RavneFuzinar.svg',
  'galeb ankaran':
    'https://www.nzs.si/sites/default/files/media/image/Ankaran.svg',
  goricanka:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/f81/thumb_256_100_100_0_0_auto.png',
  grad:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/778/f59/thumb_245_100_100_0_0_auto.png',
  granicar:
    'https://www.nzs.si/sites/default/files/media/image/Granicar.png',
  hajdose:
    'https://www.nzs.si/sites/default/files/media/image/Hajdose.svg',
  hodos:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/5a5/thumb_249_100_100_0_0_auto.png',
  hotiza:
    'https://www.nzs.si/sites/default/files/media/image/Hotiza.svg',
  'ilirija zavarovalnica triglav':
    'https://www.nzs.si/sites/default/files/media/image/NDIlirija1911.svg',
  'jadran hrpelje kozina':
    'https://www.mnzkoper.com/wp-content/uploads/1999/11/kozina.gif',
  jakob:
    'https://mnzmaribor.si/wp-content/uploads/jakob-novi.png',
  'jeruzalem slovenija':
    'https://www.nzs.si/sites/default/files/media/image/Ormoz.svg',
  'jeruzalem slovenija ormoz':
    'https://www.nzs.si/sites/default/files/media/image/Ormoz.svg',
  'jurovski dol':
    'https://mnzmaribor.si/wp-content/uploads/sd_sv_jurij_logo.png',
  'kema puconci murexin':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/77a/414/thumb_260_100_100_0_0_auto.png',
  'kety emmi impol bistrica':
    'https://www.nzs.si/sites/default/files/media/image/NKBistrica.svg',
  komen:
    'https://www.nzs.si/sites/default/files/media/image/Komen.svg',
  korte:
    'https://www.nzs.si/sites/default/files/media/image/Korte_0.svg',
  kosana:
    'https://www.nzs.si/sites/default/files/media/image/SDKosana.svg',
  kungota:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_kungota.png',
  'lenart dank chen center':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_lenart.jpg',
  leskovec:
    'https://www.nzs.si/sites/default/files/media/image/Leskovec.png',
  lipa:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/77a/319/thumb_259_100_100_0_0_auto.png',
  'makole bar miha':
    'https://www.nzs.si/sites/default/files/media/image/Makole.svg',
  'malecnik asfalterstvo brus':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_malecnik.png',
  'malibu panonija ga ka':
    'https://www.nzs.si/sites/default/files/media/image/Panonija.svg',
  'maripol starse':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_starse.png',
  'marles limbus pekre':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_limbus_pekre.png',
  'miklavz at 24':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_miklavz.png',
  'mlinopek krizevci':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/778/c48/thumb_243_100_100_0_0_auto.png',
  'mons claudius':
    'https://www.nzs.si/sites/default/files/media/image/Rogatec.png',
  'nafta 1903':
    'https://www.nzs.si/sites/default/files/media/image/NKNafta.svg',
  nedelica:
    'https://www.nzs.si/sites/default/files/media/image/Nedelica.svg',
  'nk krim':
    'https://www.mnzljubljana-zveza.si/source/grbi/158_NK%20Krim.jpg',
  'nk lasko':
    'https://www.nk-lasko.si/wp-content/uploads/2025/01/NKLaskoGrb.jpg',
  'nk ljubno ob savinji':
    'https://www.nzs.si/sites/default/files/media/image/Ljubno.png',
  'nk pobrezje':
    'https://mnzmaribor.si/wp-content/uploads/NK_Pobre%C5%BEje.png',
  'nk smarje pri jelsah':
    'https://www.nzs.si/sites/default/files/media/image/Smarjeprijelsah.svg',
  'nk sostanj':
    'https://nk-sostanj.si/wp/wp-content/uploads/2019/08/NK-Sostanj-logo-300x295.png',
  'novogradnje mb tabor':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_mb_tabor.png',
  'olimpija dolga vas':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/9f2/ed6/thumb_266_100_100_0_0_auto.png',
  paloma:
    'https://mnzmaribor.si/wp-content/uploads/nk-paloma-grb.png',
  peca:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_peca.png',
  piran:
    'https://www.nzs.si/sites/default/files/media/image/NKPiran.png',
  pohorje:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_pohorje.png',
  polana:
    'https://www.nzs.si/sites/default/files/media/image/NKPolana.svg',
  pragersko:
    'https://nkpragersko.si/nk-pragersko-grb.png',
  prepolje:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_prepolje.png',
  'proteus postojna':
    'https://nkproteus.si/wp-content/uploads/2025/08/cropped-proteus-logo-small-200x200.png',
  pusca:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/673/eee/df8/thumb_424_100_100_0_0_auto.png',
  'radenska slatina':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/778/a74/thumb_242_100_100_0_0_auto.png',
  radgona:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/778/de6/thumb_244_100_100_0_0_auto.png',
  radlje:
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_radlje_ob_dravi.png',
  rakican:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/cac/thumb_254_100_100_0_0_auto.png',
  rence:
    'https://wp.mnzgorica.si/wp-content/uploads/2026/07/ND_rence_logo-300x300.jpeg',
  'roho krovstvo tit':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_rogoza.png',
  roma:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/778/4ce/thumb_240_100_100_0_0_auto.png',
  'rosnja loka':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_loka_rosnja.png',
  salovci:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/842/thumb_251_100_100_0_0_auto.png',
  'sd bogojina':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/746/thumb_250_100_100_0_0_auto.png',
  'sd gerecja vas':
    'https://www.nzs.si/sites/default/files/media/image/GerecjaVas.png',
  'serdica kl sinko':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/77a/0bd/thumb_257_100_100_0_0_auto.png',
  skorba:
    'https://www.nzs.si/sites/default/files/media/image/Skorba.png',
  'slivnica pizzeria lili':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_slivnica.png',
  'slovenj gradec':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nd_slovenj_gradec.png',
  'slovenja vas':
    'https://www.nzs.si/sites/default/files/media/image/SlovenjaVas.svg',
  'spodnja polskava':
    'https://www.nzs.si/sites/default/files/media/image/SpodnjaPolskava.svg',
  stojnci:
    'https://www.nzs.si/sites/default/files/media/image/Stojnci_0.svg',
  'tab akumulator':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_akumulator.png',
  'tehnotim pesnica':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/sd_partizan_pesnica.png',
  tisina:
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/773/3bc/thumb_234_100_100_0_0_auto.png',
  'tromejnik montpreis':
    'https://www.mnzveza-ms.si/storage/app/uploads/public/5f5/779/329/thumb_247_100_100_0_0_auto.png',
  turnisce:
    'https://www.nzs.si/sites/default/files/media/image/Turnisce.png',
  'unior zrece':
    'https://www.nzs.si/sites/default/files/media/image/Zrece.svg',
  'vodice sempas':
    'https://wp.mnzgorica.si/wp-content/uploads/2026/07/NK_Vodice_Sempas-243x300.jpeg',
  'zase videm':
    'https://www.nzs.si/sites/default/files/media/image/Videm.svg',
  zavrc:
    'https://www.nzs.si/sites/default/files/media/image/Zavrc.svg',
  'zgornja polskava':
    'https://www.nzs.si/sites/default/files/media/image/DTVZGPolskava.svg',

  // Manj gotovi: zdruzene ekipe dobijo grb enega od klubov, veterani grb
  // matičnega kluba, Kovinar grb, ki mu ga dodeli MNZ Maribor (nk_tezno.png).
  // Dodani, ker je grb iz začetnic slabši od skoraj pravega; napako javijo.
  'makole majsperk':
    'https://www.nzs.si/sites/default/files/media/image/Makole.svg',
  'mojstrovina bistrica':
    'https://www.nzs.si/sites/default/files/media/image/NKBistrica.svg',
  'nafta veterani':
    'https://www.nzs.si/sites/default/files/media/image/NKNafta.svg',
  'nd mozirje zdruzena savinjska':
    'https://www.nzs.si/sites/default/files/media/image/Mozirje.svg',
  'nd polzela zdruzena savinjska':
    'https://www.nzs.si/sites/default/files/media/image/Polzela.svg',
  'nk kovinar maribor':
    'https://mnzmaribor.si/wp-content/uploads/2020/06/nk_tezno.png',
  'nk zalec sentjur':
    'https://www.nkzalec.si/wp-content/uploads/2017/08/nkzalec_grb.png',
  'ns svoboda kisovec zagorje':
    'https://www.mnzljubljana-zveza.si/source/grbi/167_NK%20Zagorje.gif',
}

// Pomanjša datoteko na kvadrat NAJVECJA_STRANICA px (ohrani razmerje, ne
// poveča manjših). `sips` je na macOS, `convert` (ImageMagick) na ubuntu-latest
// v GitHub Actions, kjer skripta tece z zivim kljucem. Brez obeh ostane izvirnik.
const manjka = new Set()
function zmanjsaj(pot) {
  const orodja = [
    ['sips', ['--resampleHeightWidthMax', String(NAJVECJA_STRANICA), pot]],
    ['convert', [pot, '-resize', `${NAJVECJA_STRANICA}x${NAJVECJA_STRANICA}>`, pot]],
  ].filter(([ukaz]) => !manjka.has(ukaz))
  for (const [ukaz, arg] of orodja) {
    try {
      execFileSync(ukaz, arg, { stdio: 'ignore' })
      return
    } catch (e) {
      if (e.code === 'ENOENT') manjka.add(ukaz)
      else console.log(`  (${ukaz} ni zmanjšal ${pot.split('/').pop()}: ${e.message.split('\n')[0]})`)
    }
  }
}

function izEnv() {
  try {
    const vsebina = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    return Object.fromEntries(
      vsebina
        .split(String.fromCharCode(10))
        .map((v) => v.trim())
        .filter((v) => v.includes('=') && !v.startsWith('#'))
        .map((v) => {
          const i = v.indexOf('=')
          return [v.slice(0, i).trim(), v.slice(i + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const env = izEnv()
const BASE =
  process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE) {
  console.error('Manjka SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const pisi = process.argv.includes('--pisi')
// Privzeto samo klubi brez grba: grbov z NZS in ze prenesenih ne prepisujemo,
// vir pa se lahko medtem spremeni ali izgine. `--vse` jih prenese znova.
const vse = process.argv.includes('--vse')
const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })

// Enako poenostavljanje kot pri uvozu razporeda: brez ločil in velikih črk.
const poenostavi = (ime) =>
  ime
    .toLowerCase()
    .replace(/[^a-zčšž0-9]+/g, ' ')
    .trim()

// Šumniki gredo v osnovne črke, da se ključi in imena datotek ujemajo.
const kljuc = (ime) =>
  poenostavi(ime).replace(/č/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z')

// Grb ni vedno PNG (grb ŠD Šenčur je JPEG), ime datoteke pa naj pove resnico.
const koncnica = (url) =>
  (url.match(/\.(png|jpe?g|svg|webp)(?:$|\?)/i)?.[1] ?? 'png')
    .toLowerCase()
    .replace('jpeg', 'jpg')

const { data: klubi, error } = await db.from('teams').select('id, name, logo_url')
if (error) {
  console.error(error.message)
  process.exit(1)
}

const nacrt = []
for (const k of klubi) {
  if (k.logo_url && !vse) continue
  const vir = GRBI[kljuc(k.name)]
  if (!vir) {
    console.log(`  ${k.name}: grba ni v seznamu — ostane grb iz začetnic`)
    continue
  }
  const datoteka = kljuc(k.name).split(' ').join('-')
  nacrt.push({ klub: k, vir, pot: `/grbi/${datoteka}.${koncnica(vir)}` })
}

console.log(`\nGrbov za prenos: ${nacrt.length} / ${klubi.length} klubov`)
for (const n of nacrt) console.log(`  ${n.klub.name} → ${n.pot}`)

if (!pisi) {
  console.log('\nTo je le načrt. Za prenos in zapis dodaj --pisi')
  process.exit(0)
}

if (!existsSync(MAPA)) mkdirSync(MAPA, { recursive: true })

let preneseno = 0
for (const n of nacrt) {
  try {
    const odgovor = await fetch(n.vir)
    if (!odgovor.ok) throw new Error(`${odgovor.status}`)
    const slika = Buffer.from(await odgovor.arrayBuffer())
    const datoteka = `${MAPA}/${n.pot.split('/').pop()}`
    writeFileSync(datoteka, slika)
    zmanjsaj(datoteka)
    const koncna = statSync(datoteka).size

    const { error: eKlub } = await db
      .from('teams')
      .update({ logo_url: n.pot })
      .eq('id', n.klub.id)
    if (eKlub) throw new Error(eKlub.message)

    const izvirna = Math.round(slika.length / 1024)
    const zdaj = Math.round(koncna / 1024)
    console.log(
      `  ✓ ${n.klub.name} (${zdaj} kB${zdaj !== izvirna ? `, prej ${izvirna} kB` : ''})`,
    )
    preneseno++
  } catch (e) {
    console.log(`  ✗ ${n.klub.name}: ${e.message}`)
  }
}

console.log(`\nPrenesenih grbov: ${preneseno}`)
