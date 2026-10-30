// Eestikeelne `racun` (allikas: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Logi sisse',
    naslovRegistracija: 'Registreeru',
    naslovPozabljeno: 'Unustatud parool',
    googleNiNaVoljo: 'Google’iga sisselogimine pole praegu saadaval. Kasuta e-posti.',
    appleNiNaVoljo: 'Apple’iga sisselogimine pole praegu saadaval. Kasuta e-posti.',
    poslanaPonastavitev:
      'Saatsime sulle parooli lähtestamise lingi. Vaata oma postkasti (ka rämpsposti).',
    racunUstvarjen:
      'Sinu konto on loodud. Saatsime sinu e-postile kinnituslingi: ava see ja tule tagasi.',
    prijavljenKot: 'Oled sisse logitud kui {email}.',
    posljiPotrditevZnova: 'Saada kinnituskiri uuesti',
    potrditevPoslanaZnova:
      'Saatsime uue kinnituskirja. Vaata ka rämpsposti kausta.',
    zGooglom: 'Jätka Google’iga',
    zApplom: 'Jätka Apple’iga',
    aliZEposto: 'või e-postiga',
    prikaznoIme: 'Kuvatav nimi',
    eposta: 'E-post',
    geslo: 'Parool',
    posiljam: 'Saadan …',
    ustvariRacun: 'Loo konto',
    posljiPovezavo: 'Saada link',
    gumbPrijava: 'Logi sisse',
    zeImasRacun: 'Sul on juba konto? Logi sisse',
    nimasRacuna: 'Kontot veel pole? Registreeru',
    pozabljenoGeslo: 'Unustasid parooli?',
    nazajNaPrijavo: '← Tagasi sisselogimisse',
    predlogEposte: 'Kas mõtlesid {eposta}?',
  },
  napake: {
    napacnaPrijava: 'Vale e-posti aadress või parool.',
    niPotrjen: 'Sinu e-posti aadress pole veel kinnitatud. Klõpsa lingil sõnumis, mille sulle saatsime.',
    zeRegistriran: 'See e-posti aadress on juba registreeritud. Logi sisse või lähtesta parool.',
    prevecPoskusov: 'Liiga palju katseid. Oota paar minutit ja proovi uuesti.',
    sibkoGeslo: 'Parool on liiga nõrk. Kasuta vähemalt 6 märki, parem tähtede ja numbrite segu.',
    istoGeslo: 'Uus parool peab vanast erinema.',
    neveljavenNaslov: 'E-posti aadress pole kehtiv.',
  },
  novoGeslo: {
    naslov: 'Uus parool',
    gesliSeNeUjemata: 'Paroolid ei ühti.',
    preverjam: 'Kontrollin linki …',
    neveljavna:
      'Link on kehtetu või aegunud. Taotle uut parooli lähtestamist <prijava>sisselogimise</prijava> lehel.',
    novoGeslo: 'Uus parool',
    ponovi: 'Korda parooli',
    shranjujem: 'Salvestan …',
    shrani: 'Salvesta parool',
  },
  opomniki: {
    naslov: 'Teavitused',
    napakaNalaganja: 'Seadeid ei õnnestunud laadida.',
    napakaShranjevanja: 'Salvestamine ebaõnnestus. Proovi uuesti.',
    nalagam: 'Laadin …',
    moraPrijava: 'Meeldetuletuste muutmiseks pead <prijava>sisse logima</prijava>.',
    opis: 'Enne iga vooru tähtaega saadame aadressile {email} lühikese sõnumi, et sa ei unustaks oma meeskonda uuendada.',
    posiljaj: 'Meeldetuletused e-postiga',
    shranjujem: 'Salvestan …',
    vklopljeni: 'Meeldetuletused on sisse lülitatud.',
    izklopljeni: 'Me ei saada sulle enam meeldetuletusi.',
    odjavaVprasanje: 'Ei soovi enam SLFF-i kirju (tähtaja meeldetuletused ja teated meeskonna kohta)?',
    odjavaGumb: 'Loobun kirjadest',
    odjavaNapaka: 'See link pole kehtiv. Logi sisse ja lülita meeldetuletused seadetes välja.',
    push: 'Tõuketeavitused',
    pushOpis: 'Päev enne tähtaega annab telefon teada, kui sinu koosseis pole valmis.',
    pushVklopljena: 'Tõuketeavitused on sisse lülitatud.',
    pushIzklopljena: 'Me ei saada sulle enam tõuketeavitusi.',
    pushZavrnjeno: 'Teavitused on telefonis välja lülitatud. Lülita need sisse: Seaded → SLFF → Teavitused.',
    pushDovoli: 'Luba teavitused',
    povezava: 'Teavituste seaded',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Kinnitan …',
    preverjam: 'Kontrollin linki …',
    neveljavna: 'See link pole enam kehtiv või on juba kasutatud. <prijava>Logi sisse</prijava> või küsi uut.',
  },
  // Nastavitve računa (slff.eu/account).
  nastavitve: {
    naslov: 'Konto seaded',
    moraPrijava: 'Konto muutmiseks pead <prijava>sisse logima</prijava>.',
    nalagam: 'Laadin …',
    napakaNalaganja: 'Seadeid ei õnnestunud laadida.',
    shranjujem: 'Salvestan …',
    shranjeno: 'Salvestatud.',
    napakaShranjevanja: 'Salvestamine ebaõnnestus. Proovi uuesti.',
    profilNaslov: 'Profiil',
    mojProfil: 'Vaata oma avalikku profiili',
    prikaznoIme: 'Kuvatav nimi',
    imeOpis: 'Teised näevad seda edetabelites. 3 kuni 24 märki, muuta saad seda üks kord 7 päeva jooksul.',
    imeNaslednjic: 'Nime saad uuesti muuta: {datum}.',
    shraniIme: 'Salvesta nimi',
    avatar: 'Avatar',
    avatarOpis: 'Vali värv ning initsiaalid või jalgpalliikoon.',
    barva: 'Värv',
    barvaN: 'Värv {n}',
    slika: 'Pilt',
    zacetnice: 'Initsiaalid',
    ikone: {
      zoga: 'Pall',
      gol: 'Värav',
      pokal: 'Karikas',
      copat: 'Jalgpallijalats',
      rokavice: 'Väravavahi kindad',
      dres: 'Särk',
      zastavica: 'Nurgalipp',
      navijac: 'Fänn',
    },
    klubNaslov: 'Klubi, keda toetad',
    klubOpis: 'See on näha sinu profiilil ja sinu punktid lähevad arvesse klubi fännide edetabelis.',
    klubIsci: 'Otsi klubi …',
    klubNiZadetkov: 'Ühtegi klubi ei leitud.',
    klubBrez: 'Sa pole veel klubi valinud.',
    klubOdstrani: 'Eemalda klubi',
    jezikNaslov: 'Keel ja riik',
    jezikOpis: 'Lehe keel ja riik, mille liigasid sa näed. Valik kehtib selles brauseris.',
    obvestilaNaslov: 'Teavitused',
    zasebnostNaslov: 'Privaatsus',
    javniProfil: 'Avalik profiil',
    javniProfilOpis: 'Teised näevad sinu profiilil sinu meeskondi, klubi ja saavutusi. Väljalülitatud profiil näitab ainult kuvatavat nime.',
    prijavaNaslov: 'Sisselogimine ja parool',
    prijavljenZ: 'Oled sisse logitud aadressiga {email}.',
    geslo: 'Muuda parooli',
    gesloOpis: 'Saadame sulle e-postiga lingi, millega saad määrata uue parooli.',
    gesloPoslano: 'Saatsime lingi aadressile {email}. Vaata oma postkasti (ka rämpsposti).',
    gesloNapaka: 'Linki ei õnnestunud saata. Proovi mõne minuti pärast uuesti.',
    eposta: 'E-posti aadressi muutmiseks kirjuta meile: <eposta>info@slff.eu</eposta>.',
    napake: {
      dolzina: 'Kuvatav nimi peab olema 3 kuni 24 märki pikk.',
      znaki: 'Kuvatav nimi sisaldab lubamatuid märke.',
      rezervirano: 'See nimi on reserveeritud SLFF-i meeskonnale. Vali muu nimi.',
      neprimerno: 'See nimi ei ole sobiv. Vali muu nimi.',
      prepogosto: 'Kuvatavat nime saad muuta üks kord 7 päeva jooksul.',
      zasedeno: 'See kuvatav nimi on juba kasutusel.',
    },
  },
  // Javna stran profila (slff.eu/u/<id>).
  profil: {
    naslov: 'Profiil',
    niProfila: 'Sellist profiili pole. Võib-olla on konto kustutatud.',
    nazaj: 'Edetabelisse',
    zaseben: 'See profiil on privaatne.',
    tvojZaseben: 'Sinu profiil on privaatne: teised näevad ainult kuvatavat nime.',
    uredi: 'Muuda profiili',
    clanOd: 'Liige alates {datum}',
    navija: 'Toetab',
    ekipe: 'Meeskonnad',
    brezEkip: 'Aktiivsetes liigades pole veel meeskonda.',
    mesto: '{mesto}. koht ({ekip} meeskonnast)',
    miniLige: 'Ühised miniliigad',
    dosezki: 'Saavutused',
    sezone: 'Hooajad',
    krogi: 'Mängitud voorud',
    najboljsiKrog: 'Parim voor',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Kustuta konto',
    moraPrijava: 'Konto kustutamiseks pead <prijava>sisse logima</prijava>.',
    opis: 'Kustutame konto {email}: sinu profiili, kõik sinu koosseisud koos punktide ajalooga, sinu hääled ja sinu loodud miniliigad. Seda ei saa tagasi võtta. Kustutamisega lõpeb ka kinnitatud mängija märk ja tellimus peatub ilma tagastuseta.',
    gumb: 'Kustuta konto',
    potrdi: 'Jah, kustuta jäädavalt',
    preklici: 'Tühista',
    brisem: 'Kustutan …',
    napaka: 'Kontot ei õnnestunud kustutada: {napaka}',
  },
  pravno: {
    naslov: 'Privaatsus ja tingimused',
    zadnjaSprememba: 'Viimati muudetud: 30. oktoober 2026',
    kajJeNaslov: 'Mis on SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) on fännide tehtud fantaasialiiga kohalikele amatöörliigadele. Seda veavad vabatahtlikud ja see pole seotud piirkondlike jalgpalliliitude, riikliku jalgpalliliidu ega klubidega. Mäng on tasuta, ilma panuste ja auhindadeta.',
    podatkiNaslov: 'Milliseid andmeid me hoiame',
    podatkiEposta:
      '<b>E-posti aadress ja parool.</b> Neid on vaja sisselogimiseks. Parool hoitakse krüpteeritult ja me ei näe seda.',
    podatkiIme:
      '<b>Kuvatav nimi ja meeskonna nimi.</b> Mõlemad on edetabelis näha. Kui sa ei taha oma nime kasutada, kasuta hüüdnime.',
    podatkiEkipa:
      '<b>Sinu meeskond ja hääled.</b> Sinu koosseis, kapten, üleminekud ja hääled resultatiivsete söötude või positsioonide üle.',
    podatkiNaprava:
      '<b>Seadme tunnus teavituste jaoks.</b> Kui lubad mobiilirakenduses teavitused, hoiame tunnust, millega saadame sulle enne vooru tähtaega meeldetuletuse. See kustutatakse väljalogimisel.',
    neHranimo:
      'Me ei hoia sinu telefoninumbrit ega kaardiandmeid; aadressi hoiame ainult siis, kui tellid trükitud märgi (vt allpool). Me ei kasuta jälgimisküpsiseid ega reklaamitööriistu. Sinu brauser hoiab sinu sisselogimise seanssi, abivestluse vestluse tunnust, kui selle avad, ja seansimärke, mis hoiavad ära lehe kahekordse loendamise. Kui palju inimesi millist lehte avas, hoitakse ainult päeva kogusummana, ilma sinu nime, konto, seadme või IP-aadressita. Üldist külastusstatistikat (millised lehed, kust külastajad tulevad, seadme tüüp ja riik, mõned tegevused, näiteks meeskonna kokkupanek) kogub <b>Umami</b> meie oma serveris: küpsisteta, IP-aadressi hoidmata ja külastusi sinu kontoga sidumata. Kui sinu brauseris on sisse lülitatud "Do Not Track", ei salvestata midagi. Kui oled sisse logitud, salvestame mõned sammud mängus (nt meeskonna koostamine, rakenduse avamine, otsus teavituste kohta, suletud aken) koos sinu kontoga, et näha, kus mäng takerdub. Hoiame neid 90 päeva, need kustuvad koos kontoga ja „Ära jälgi“ korral ei salvesta me midagi.',
    dostopNaslov: 'Kellel on andmetele juurdepääs',
    dostop:
      'Andmeid hoitakse meie oma serveris ettevõttes <b>Hetzner</b> (Saksamaa, EL); liiklus käib läbi <b>Cloudflare</b>’i (kaitse ja lehe edastamine). Kinnitus- ja parooli lähtestamise kirjad saadetakse meie oma meiliserverist (samuti Hetzneris) ja mobiilirakenduse teavitused läbi <b>Google Firebase Cloud Messaging</b>’u (ainult seadme tunnus ja teavituse tekst). Abivestlus all paremas nurgas töötab teenusel <b>HelpStack</b>: see saab, mida sinna kirjutad, ja kui oled sisse logitud, sinu kuvatava nime, et teaksime, kellele vastame. Kui vestluse assistent sind aitab, näeb ta ka, millisel lehel ja millises liigas oled ning kas sinu meeskond vastab reeglitele. Sinu e-posti aadressi me edasi ei anna. Me ei jaga sinu andmeid kellegi teisega ega müü neid.',
    statistikaNaslov: 'Andmed jalgpallurite kohta',
    statistika:
      'Meie kajastatavate liigade jalgpallurite kohta näitame nime, klubi, särginumbrit, mänge, minuteid, väravaid ja kaarte. Allikas on lehe jaluses nimetatud jalgpalliliidu avalikult kättesaadavad ametlikud mänguprotokollid. Positsioonid ja resultatiivsed söödud, mida mänguprotokollides pole, otsustab kogukond hääletusega, seega võivad need olla valed. Sellest arvutame mängija punktid ja hinna mängus. Kui midagi on valesti, klõpsa mängijal ja anna teada.',
    statistikaPodlaga:
      'Eesmärk on tasuta fantaasiamäng fännidele. Õiguslik alus on õigustatud huvi (IKÜM art 6 lg 1 p f): lasta fännidel mängida mängu, mis põhineb nende liiga avaldatud tulemustel. Andmeid näitame seni, kuni mängija mängib meie kajastatavas liigas. Austria liigades peidame, nagu teeb ÖFB, mängija nime 18 kuud pärast tema viimast mängu.',
    statistikaUgovor:
      'Mängija võib töötlemisele vastu vaielda või nõuda kustutamist: kirjuta aadressile <eposta>info@slff.eu</eposta> ja lisa link mängija lehele. 14 päeva jooksul asendame tema nime neutraalse tähisega kõigis selle riigi liigades, kus ta meil on, ka hilisemates importides. Statistika jääb, ilma nimeta. Sama teeme jalgpalliliidu taotlusel.',
    grbi:
      'Klubide vapid kuuluvad klubidele ja neid näidatakse ainult meeskonna tuvastamiseks. Klubi, kes seda ei soovi, võib meile kirjutada ja me eemaldame vapi.',
    fotografijeNaslov: 'Fotod',
    fotografije:
      'Avalehe foto on teinud Abigail Keenan ja see on avaldatud teenuses <unsplash>Unsplash</unsplash> selle litsentsi alusel, mis lubab vaba kasutust. Fotol pole meie liigade mängijaid.',
    praviceNaslov: 'Sinu õigused',
    pravice:
      'Saad oma konto ja kõik oma andmed igal ajal ise kustutada: vali kontomenüüs <b>Kustuta konto</b> (slff.eu/account). Kuvatava nime parandamiseks või kui kustutamine ebaõnnestub, kirjuta meile aadressile <eposta>info@slff.eu</eposta>. Konto kustutamisel kaob ka sinu meeskond edetabelist. Kinnitatud mängija märgi ostu kirje jääb alles 10 aastaks, nagu nõuab raamatupidamisseadus, ja tarneaadress ülaltoodud reegli järgi.',
    pravilaNaslov: 'Mängureeglid',
    pravila:
      'Üks inimene, üks konto. Hääletus resultatiivsete söötude ja positsioonide üle on mõeldud päris parandusteks: meelega valed hääled rikuvad mängu kõigile ja võivad viia konto eemaldamiseni. Punktiarvestus ja hinnad võivad hooaja jooksul muutuda, kui midagi osutub ebaõiglaseks; sellistest muudatustest anname teada.',
    jamstvoNaslov: 'Garantiid pole',
    jamstvo:
      'Leht töötab nii, nagu töötab. Anname endast parima, et andmed oleksid õiged ja leht kättesaadav, kuid garanteerida me seda ei saa: mänguprotokollid võivad hilineda ja statistikas võib olla vigu. See kehtib tasuta mängu kohta. Tasulistele teenustele kehtivad jaotise Tasulised teenused tingimused ja sinu seadusest tulenevad tarbijaõigused.',
    kajJePlacljivo:
      'Ainus tasuline asi on vabatahtlik kinnitatud mängija märk (vt allpool Tasulised teenused).',
    podatkiPlacilo:
      '<b>Kinnitatud mängija märgi ost (ainult kui ostad).</b> Ostu kirjet (mida, millal, summa ja sinu kliendi tunnus Stripe’is) hoiame 10 aastat, nagu nõuab raamatupidamisseadus. Trükitud märgi tarneaadressi hoiame 90 päeva pärast saatmist või tellimuse tühistamist ja kõige rohkem 12 kuud pärast tellimist, seejärel jääb alles ainult riik.',
    dostopStripe:
      'Kinnitatud mängija märgi makseid töötleb <b>Stripe</b> (Stripe Payments Europe, Iirimaa): see saab sinu nime, e-posti, arveldusaadressi ja trükitud märgi puhul tarneaadressi. Kaardiandmed sisestad otse Stripe’is, meie neid ei näe.',
    placljivoNaslov:
      'Tasulised teenused: kinnitatud mängijad',
    placljivoUvod:
      'Mäng on ja jääb tasuta. Tasuline on ainult vabatahtlik kinnitatud mängija märk, mida saab osta mängija, kes on kinnitanud, et profiil on tema oma. Märk ei mõjuta kunagi punkte, hindu, fantaasiameeskondi ega mängureegleid. Need tingimused kehtivad selle ostu kohta.',
    prodajalec:
      '<b>Müüja:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Sloveenia, kantud Ljubljana ringkonnakohtu registrisse. Registrikood 9850538000, KMKR number SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Mida ostad.</b> Sinise linnukese mängija nime juurde ja profiili lisad (pikem kirjeldus, lingid, bänner, värv, esiletõstetud mäng või statistika, sõnum fännidele). Aastatellimus maksab 9,99 € ja uueneb igal aastal automaatselt. Igavene ost maksab ühekordselt 29 € ja kehtib seni, kuni SLFF seda teenust pakub. Igavese ostu juurde saad lisada trükitud nimega märgi hinnaga 5 €, millele lisandub postikulu 2 € (Sloveenia) või 4 € (muu ELi riik). Saadame ainult ELi riikidesse, kohaletoimetamine võtab tavaliselt 2-3 nädalat. Kõik hinnad sisaldavad käibemaksu.',
    placilo:
      '<b>Makse.</b> Makset töötleb Stripe. Me ei näe ega hoia sinu kaardiandmeid. Osta saad ainult siis, kui oled vähemalt 18-aastane. Leping on sõlmitud, kui Stripe makse kinnitab.',
    odpoved:
      '<b>Tellimuse lõpetamine.</b> Tellimuse saad igal ajal lõpetada nupuga Halda tellimust oma konto lehel (slff.eu/account) või mängija profiilil. Lõpetamine jõustub makstud aasta lõpus, seni jääb märk alles. Juba alanud aasta eest raha ei tagastata, välja arvatud allpool toodud juhtudel.',
    odstop:
      '<b>Taganemisõigus.</b> Digitaalne sisu (linnuke ja lisad) antakse kohe pärast makset. Enne makset nõustud sõnaselgelt kohese üleandmisega ja kinnitad, et kaotad sellega 14 päeva taganemisõiguse (direktiivi 2011/83/EL artikli 16 punkt m, Sloveenia ZVPot-1). Trükitud märk valmistatakse sinu juhiste järgi (nimi märgil), seega selle puhul taganemisõigust ei ole (artikli 16 punkt c). Seadusest tulenevad õigused jäävad: kui märk saabub kahjustatult, valesti või ei saabu üldse, kirjuta meile ja vahetame selle tasuta või tagastame raha.',
    konec:
      '<b>Millal märk lõpeb.</b> Märk lõpeb, kui selgub, et profiil ei ole sinu oma ja tühistame kinnituse, kui mängija nimi peidetakse tema või liidu soovil või kui kustutad oma konto. Tellimus peatub siis automaatselt ja tasu enam ei võeta. Kui vaidlustad makse oma pangas (chargeback), märk eemaldatakse.',
    vracila:
      '<b>Tagastused.</b> Kuritarvituse või vale profiilikinnituse korral raha ei tagastata. Kui märk lõpeb meie vea tõttu, liidu soovil või seetõttu, et lõpetame teenuse, tagastame aastatellimuse kasutamata kuude eest proportsionaalse osa. Igavese ostu puhul tagastame esimese 12 kuu jooksul pärast ostu kogu summa, hiljem proportsionaalse osa ostust arvates 5 aastast järelejäänud ajast. Trükitud märki ja postikulu teenuse lõpetamisel ei tagastata (märk jääb sulle), ainult puuduse korral.',
    pritozbe:
      '<b>Küsimused ja kaebused.</b> Kirjuta aadressile <eposta>info@slff.eu</eposta>, vastame 8 tööpäeva jooksul. Me ei tunnusta ühtegi tarbijavaidluste kohtuvälise lahendamise üksust. Kehtib Sloveenia õigus; see ei võta sinult kaitset, mida annab sinu elukohariigi õigus.',
    scoutNaslov: 'SLFF Club ja Scouti moodul',
    scoutKaj:
      'Samadest avalikest mängu protokollidest arvutame täiskasvanute liigade mängijatele näitajaid: mänguminutite osakaal, väravad, mõju väljakul, lastud väravad, kaardid ja areng hooaegade lõikes, kohandatud liiga tugevusele. Need on mänguandmete näitajad, mitte isiku hinnang. Neid näevad SLFF Scouti tellimusega klubid, kes otsivad mängijaid; otsuse teeb alati inimene klubis. Noorteliigasid me mängijate otsinguks ei töötle. Kes on kunagi mänginud noorteliigas, on välja jäetud, kuni tal on mänguminuteid täiskasvanute liigas ja ta sisestab oma profiilil sünniaasta, mille järgi ta saab sel aastal vähemalt 19-aastaseks.',
    scoutPodlaga:
      'Õiguslik alus on õigustatud huvi (GDPR artikli 6 lõike 1 punkt f): aidata klubidel leida mängijaid avalikult avaldatud tulemuste põhjal. Arvutame näitajad iga päev uuesti ja säilitame ainult viimased arvutused. Klubide vaatamisi hakkame logima 12 kuud, et vältida kuritarvitamist ja et saaksime mängijale tema soovil öelda, millised klubid teda vaatasid.',
    scoutPrivolitev:
      'Ülevõetud profiiliga mängija saab lisada, et ta on valmis üleminekuks, oma sünniaasta, soovitud piirkonnad ja loa temaga ühendust võtta. See on nõusolek (GDPR artikli 6 lõike 1 punkt a): seda näevad ainult Scouti klubid, selle saab igal ajal profiilil tagasi võtta ja tagasivõtmisel kustutame andmed.',
    scoutUgovor:
      'Vastuväide: klõpsa ülevõetud profiilil Peida mind Scoutist või kirjuta aadressile <eposta>info@slff.eu</eposta> ja lisa link mängija lehele. 14 päeva jooksul peidame mängija Scoutist kõigis meie selle riigi liigades, ka hilisematel importidel. Fantaasiamängus jääb ta alles.',
    klubOrodje:
      'SLFF Club: tellimusega klubi näeb oma mängijaid, ka noormängijaid: mänge protokollidest ja kohalolekut, mille ta ise sisestab. Kohaloleku vastutav töötleja on klubi; meie töötleme seda tema juhiste järgi ja kustutame 24 kuud pärast sündmust. Saada kohalolekut puudutav taotlus klubile või meile; edastame selle. Vastuväide Scoutile peidab sind teiste klubide, mitte sinu oma klubi eest.',
    trgovinaNaslov: 'SLFF pood (shop.slff.eu)',
    trgovinaKaj:
      'Ostu korral töötleme nime, e-posti, tarneaadressi, ostetud tooteid ja summasid ning sisselogimisel ka sinu SLFF-i kontot. Makset töötleb Stripe: kaardiandmeid me ei näe ega säilita. Nime ja aadressi saab kohaletoimetamiseks Pošta Slovenije. Kuritarvituste piiramiseks säilitame lõpetamata ostu korral ajutiselt IP-aadressi räsi (pöördumatu); see kustutatakse makse või ostu aegumise korral. Isikupärastamise tekst (nimi, number) ja fantasy-meeskonna nimi tootel on tellimuse osa; teksti saab ka trükikoda, kes toote valmistab. Poe külastusi (vaadatud lehed, ostukorvi lisatud tooted, alustatud ja lõpetatud makse) loendab Umami nagu slff.eu lehel: ilma küpsisteta ja ilma IP-aadressita.',
    trgovinaPodlaga:
      'Õiguslik alus on lepingu täitmine (GDPR artikli 6 lõike 1 punkt b) ja seadusest tulenevad kohustused (raamatupidamine, maksud), IP-aadressi räsi puhul õigustatud huvi kuritarvituste ennetamiseks (GDPR artikli 6 lõike 1 punkt f). Vastutav töötleja on SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'Tellimuste ja arvete andmeid säilitame nii kaua, kui käibemaksuseadus ja raamatupidamisnõuded nõuavad (10 aastat pärast arve väljastamise aastat). Tellimuse teavituste e-posti kasutame ainult selle tellimuse jaoks. Juurdepääsuks, parandamiseks või vastuväiteks kirjuta <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Klubi ametlik konto',
    aktiven: 'See konto esindab klubi {klub}.',
    pravice: 'Klubina saad muuta positsioone, lisada mängijaid ja kinnitada oma mängijate profiile.',
    vprasanje: 'Kas esindad klubi?',
    pojasnilo: 'Kui logid sisse klubi ametliku aadressiga, mis meil on, saad klubikonto automaatselt. Kui meil seda pole, taotle seda allpool ja me kontrollime.',
    klub: 'Klubi',
    isciKlub: 'Otsi klubi …',
    vloga: 'Sinu roll klubis',
    vloge: {
      predsednik: 'president',
      tajnik: 'sekretär',
      trener: 'treener',
      vodstvo: 'klubi juhatus',
      drugo: 'muu',
    },
    dokaz: 'Link, kus aadress on avaldatud (veebileht, Facebook, liit)',
    opomba: 'Märkus (vabatahtlik)',
    naslovRacuna: 'Aadress, mida kontrollime: {email}',
    poslji: 'Saada taotlus',
    caka: 'Taotlus klubile {klub} ootab ülevaatamist.',
    cakaBrezKluba: 'Sinu aadress on ametlike hulgas, kuid peame selle veel klubiga siduma. Teeme selle varsti korda.',
    cakaPolno: 'Klubil on juba 5 kontot. Vaatame üle ja anname teada.',
    zavrnjeno: 'Taotlus lükati tagasi: {razlog}',
    nepotrjen: 'Kinnita kõigepealt oma konto e-post.',
    napake: {
      zeKlub: 'Sa esindad juba klubi.',
      caka: 'Sinu taotlus ootab juba otsust.',
    },
  },
}
