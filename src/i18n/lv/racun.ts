// Latviešu `racun` (avots: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Pieteikšanās',
    naslovRegistracija: 'Reģistrācija',
    naslovPozabljeno: 'Aizmirsta parole',
    googleNiNaVoljo: 'Pieteikšanās ar Google pašlaik nav pieejama. Izmanto e-pastu.',
    appleNiNaVoljo: 'Pieteikšanās ar Apple pašlaik nav pieejama. Izmanto e-pastu.',
    poslanaPonastavitev:
      'Nosūtījām tev saiti paroles atjaunošanai. Pārbaudi e-pastu (arī mēstules).',
    racunUstvarjen:
      'Konts ir izveidots. Uz e-pastu nosūtījām apstiprinājuma saiti: atver to un atgriezies.',
    prijavljenKot: 'Tu esi pieteicies kā {email}.',
    posljiPotrditevZnova: 'Nosūtīt apstiprinājuma e-pastu vēlreiz',
    potrditevPoslanaZnova:
      'Nosūtījām jaunu apstiprinājuma e-pastu. Paskaties arī mēstuļu mapē.',
    zGooglom: 'Turpināt ar Google',
    zApplom: 'Turpināt ar Apple',
    aliZEposto: 'vai ar e-pastu',
    prikaznoIme: 'Redzamais vārds',
    eposta: 'E-pasts',
    geslo: 'Parole',
    posiljam: 'Sūtu …',
    ustvariRacun: 'Izveidot kontu',
    posljiPovezavo: 'Sūtīt saiti',
    gumbPrijava: 'Pieteikties',
    zeImasRacun: 'Tev jau ir konts? Piesakies',
    nimasRacuna: 'Tev nav konta? Reģistrējies',
    pozabljenoGeslo: 'Aizmirsi paroli?',
    nazajNaPrijavo: '← Atpakaļ uz pieteikšanos',
    predlogEposte: 'Vai domāji {eposta}?',
  },
  napake: {
    napacnaPrijava: 'Nepareiza e-pasta adrese vai parole.',
    niPotrjen: 'E-pasta adrese vēl nav apstiprināta. Noklikšķini uz saites vēstulē, ko tev nosūtījām.',
    zeRegistriran: 'Šī e-pasta adrese jau ir reģistrēta. Piesakies vai atjauno paroli.',
    prevecPoskusov: 'Pārāk daudz mēģinājumu. Pagaidi dažas minūtes un mēģini vēlreiz.',
    sibkoGeslo: 'Parole ir pārāk vāja. Izmanto vismaz 6 rakstzīmes, vēlams burtu un ciparu sajaukumu.',
    istoGeslo: 'Jaunajai parolei jāatšķiras no vecās.',
    neveljavenNaslov: 'E-pasta adrese nav derīga.',
  },
  novoGeslo: {
    naslov: 'Jauna parole',
    gesliSeNeUjemata: 'Paroles nesakrīt.',
    preverjam: 'Pārbaudu saiti …',
    neveljavna:
      'Saite nav derīga vai ir novecojusi. <prijava>Pieteikšanās</prijava> lapā vēlreiz pieprasi paroles atjaunošanu.',
    novoGeslo: 'Jauna parole',
    ponovi: 'Atkārto paroli',
    shranjujem: 'Saglabāju …',
    shrani: 'Saglabāt paroli',
  },
  opomniki: {
    naslov: 'Paziņojumi',
    napakaNalaganja: 'Iestatījumus neizdevās ielādēt.',
    napakaShranjevanja: 'Saglabāšana neizdevās. Mēģini vēlreiz.',
    nalagam: 'Ielādēju …',
    moraPrijava: 'Lai rediģētu atgādinājumus, tev <prijava>jāpiesakās</prijava>.',
    opis: 'Pirms kārtas termiņa mēs tev nosūtīsim īsu ziņu uz {email}, lai tu neaizmirstu sakārtot komandu.',
    posiljaj: 'E-pasta atgādinājumi',
    shranjujem: 'Saglabāju …',
    vklopljeni: 'Atgādinājumi ir ieslēgti.',
    izklopljeni: 'Mēs tev vairs nesūtīsim atgādinājumus.',
    odjavaVprasanje: 'Vairs nevēlies saņemt SLFF e-pastus (atgādinājumus pirms termiņa un paziņojumus par komandu)?',
    odjavaGumb: 'Atrakstīties',
    odjavaNapaka: 'Saite nav derīga. Piesakies un izslēdz atgādinājumus iestatījumos.',
    push: 'Push paziņojumi',
    pushOpis: 'Dienu pirms termiņa telefons tev paziņos, ja komanda vēl nav gatava.',
    pushVklopljena: 'Push paziņojumi ir ieslēgti.',
    pushIzklopljena: 'Mēs tev vairs nesūtīsim push paziņojumus.',
    pushZavrnjeno: 'Paziņojumi telefonā ir izslēgti. Ieslēdz tos sadaļā Iestatījumi → SLFF → Paziņojumi.',
    pushDovoli: 'Atļaut paziņojumus',
    povezava: 'Paziņojumu iestatījumi',
  },
  potrditev: {
    naslov: 'Apstiprinu …',
    preverjam: 'Pārbaudu saiti …',
    neveljavna: 'Saite vairs nav derīga vai jau ir izmantota. <prijava>Piesakies</prijava> vai pieprasi jaunu.',
  },
  nastavitve: {
    naslov: 'Konta iestatījumi',
    moraPrijava: 'Lai rediģētu kontu, tev <prijava>jāpiesakās</prijava>.',
    nalagam: 'Ielādēju …',
    napakaNalaganja: 'Iestatījumus neizdevās ielādēt.',
    shranjujem: 'Saglabāju …',
    shranjeno: 'Saglabāts.',
    napakaShranjevanja: 'Saglabāšana neizdevās. Mēģini vēlreiz.',
    profilNaslov: 'Profils',
    mojProfil: 'Skatīt savu publisko profilu',
    prikaznoIme: 'Redzamais vārds',
    imeOpis: 'Citi to redz tabulās. No 3 līdz 24 rakstzīmēm, mainīt to vari reizi 7 dienās.',
    imeNaslednjic: 'Vārdu atkal varēsi mainīt {datum}.',
    shraniIme: 'Saglabāt vārdu',
    avatar: 'Avatārs',
    avatarOpis: 'Izvēlies krāsu un iniciāļus vai futbola ikonu.',
    barva: 'Krāsa',
    barvaN: 'Krāsa {n}',
    slika: 'Attēls',
    zacetnice: 'Iniciāļi',
    ikone: {
      zoga: 'Bumba',
      gol: 'Vārti',
      pokal: 'Kauss',
      copat: 'Futbola buts',
      rokavice: 'Vārtsarga cimdi',
      dres: 'Krekls',
      zastavica: 'Stūra karodziņš',
      navijac: 'Līdzjutējs',
    },
    klubNaslov: 'Klubs, kuram jūti līdzi',
    klubOpis: 'Tas redzams tavā profilā, un tavi punkti skaitās klubam līdzjutēju tabulā.',
    klubIsci: 'Meklē klubu …',
    klubNiZadetkov: 'Neviens klubs netika atrasts.',
    klubBrez: 'Tu vēl neesi izvēlējies klubu.',
    klubOdstrani: 'Noņemt klubu',
    jezikNaslov: 'Valoda un valsts',
    jezikOpis: 'Lapas valoda un valsts, kuras līgas tu redzi. Izvēle attiecas uz šo pārlūku.',
    obvestilaNaslov: 'Paziņojumi',
    zasebnostNaslov: 'Privātums',
    javniProfil: 'Publiskais profils',
    javniProfilOpis: 'Citi tavā profilā redz tavas komandas, klubu un sasniegumus. Ja profils ir izslēgts, redzams tikai redzamais vārds.',
    prijavaNaslov: 'Pieteikšanās un parole',
    prijavljenZ: 'Tu esi pieteicies ar {email}.',
    geslo: 'Mainīt paroli',
    gesloOpis: 'Mēs tev uz e-pastu nosūtīsim saiti, ar kuru varēsi iestatīt jaunu paroli.',
    gesloPoslano: 'Saiti nosūtījām uz {email}. Pārbaudi e-pastu (arī mēstules).',
    gesloNapaka: 'Saiti neizdevās nosūtīt. Mēģini vēlreiz pēc dažām minūtēm.',
    eposta: 'Lai mainītu e-pasta adresi, raksti mums uz <eposta>info@slff.eu</eposta>.',
    napake: {
      dolzina: 'Redzamajā vārdā jābūt no 3 līdz 24 rakstzīmēm.',
      znaki: 'Redzamais vārds satur neatļautas rakstzīmes.',
      rezervirano: 'Šis vārds ir rezervēts SLFF komandai. Izvēlies citu.',
      neprimerno: 'Šis vārds nav piemērots. Izvēlies citu.',
      prepogosto: 'Redzamo vārdu vari mainīt reizi 7 dienās.',
      zasedeno: 'Šis redzamais vārds jau ir aizņemts.',
    },
  },
  profil: {
    naslov: 'Profils',
    niProfila: 'Šāda profila nav. Iespējams, konts ir izdzēsts.',
    nazaj: 'Uz kopvērtējumu',
    zaseben: 'Šis profils ir privāts.',
    tvojZaseben: 'Tavs profils ir privāts: citi redz tikai tavu redzamo vārdu.',
    uredi: 'Rediģēt profilu',
    clanOd: 'Dalībnieks kopš {datum}',
    navija: 'Jūt līdzi',
    ekipe: 'Komandas',
    brezEkip: 'Aktīvajās līgās vēl nav komandas.',
    mesto: '{mesto}. vieta no {ekip}',
    miniLige: 'Kopīgās minilīgas',
    dosezki: 'Sasniegumi',
    sezone: 'Sezonas',
    krogi: 'Aizvadītās kārtas',
    najboljsiKrog: 'Labākā kārta',
  },
  izbris: {
    naslov: 'Konta dzēšana',
    moraPrijava: 'Lai dzēstu kontu, tev <prijava>jāpiesakās</prijava>.',
    opis: 'Mēs izdzēsīsim kontu {email}: profilu, visas tavas komandas ar punktu vēsturi, balsis un minilīgas, ko esi izveidojis. Dzēšanu nevar atsaukt. Dzēšot kontu, beidzas arī pārbaudīta spēlētāja nozīmīte, un abonements apstājas bez atmaksas.',
    gumb: 'Dzēst kontu',
    potrdi: 'Jā, dzēst uz visiem laikiem',
    preklici: 'Atcelt',
    brisem: 'Dzēšu …',
    napaka: 'Kontu neizdevās izdzēst: {napaka}',
  },
  pravno: {
    naslov: 'Privātums un noteikumi',
    zadnjaSprememba: 'Pēdējās izmaiņas: 2026. gada 30. oktobris',
    kajJeNaslov: 'Kas ir SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) ir līdzjutēju veidota fantāzijas līga vietējām amatieru futbola līgām. To vada brīvprātīgie, un tā nav saistīta ar reģionālajām futbola federācijām, nacionālo futbola federāciju vai klubiem. Spēle ir bez maksas, bez naudas likmēm un balvām.',
    podatkiNaslov: 'Kādi dati tiek glabāti',
    podatkiEposta:
      '<b>E-pasta adrese un parole.</b> Tās vajadzīgas, lai pieteiktos. Parole tiek glabāta šifrēta, un mēs to neredzam.',
    podatkiIme:
      '<b>Redzamais vārds un komandas nosaukums.</b> Tie ir redzami kopvērtējumā. Ja nevēlies rādīt savu vārdu, izmanto segvārdu.',
    podatkiEkipa:
      '<b>Tava komanda un balsis.</b> Sastāvs, kapteinis, transfēri un balsis par rezultatīvajām piespēlēm vai pozīcijām.',
    podatkiNaprava:
      '<b>Ierīces žetons paziņojumiem.</b> Ja mobilajā lietotnē atļauj paziņojumus, mēs saglabājam žetonu, ar kuru tev nosūtām atgādinājumu pirms kārtas termiņa. Izrakstoties mēs to izdzēšam.',
    neHranimo:
      'Mēs neglabājam tālruņa numuru vai kartes datus; adresi glabājam tikai tad, ja pasūti drukātu nozīmīti (skatīt zemāk). Mēs neizmantojam izsekošanas sīkdatnes un reklāmas rīkus. Pārlūkā tiek saglabāta tava pieteikšanās sesija, palīdzības tērzēšanas sarunas atzīme, ja to atver, un sesijas atzīmes, ar kurām lapas apmeklējumu saskaitām tikai vienreiz. Cik cilvēku atvēruši kuru lapu, mēs skaitām tikai kā dienas kopsummu, bez tava vārda, konta, ierīces vai IP adreses. Vispārējo apmeklējumu statistiku (kuras lapas, no kurienes apmeklētāji nāk, ierīces veids un valsts, dažas darbības, piemēram, komandas sastādīšana) reģistrē <b>Umami</b> mūsu serverī: bez sīkdatnēm, IP adresi tas nesaglabā un apmeklējumu nesasaista ar tavu kontu. Ja pārlūkā ir ieslēgta opcija «Neizsekot», netiek reģistrēts nekas. Kad esi pieteicies, mēs saglabājam dažus soļus spēlē (piem., komandas sastādīšanu, lietotnes atvēršanu, lēmumu par paziņojumiem, aizvērtu logu) kopā ar tavu kontu, lai redzētu, kur spēle iestrēgst. Glabājam tos 90 dienas, tie tiek dzēsti kopā ar kontu, un ar “Do Not Track” mēs neko nesaglabājam.',
    dostopNaslov: 'Kam dati ir pieejami',
    dostop:
      'Dati atrodas mūsu serverī pie pakalpojumu sniedzēja <b>Hetzner</b> (Vācija, ES), datu plūsma uz to iet caur <b>Cloudflare</b> (aizsardzība un lapu piegāde). Apstiprinājuma un paroles atjaunošanas vēstules iet caur mūsu pasta serveri (arī Hetzner), paziņojumi mobilajā lietotnē caur <b>Google Firebase Cloud Messaging</b> (tikai ierīces žetons un paziņojuma teksts). Palīdzības tērzēšana apakšējā labajā stūrī darbojas caur <b>HelpStack</b>: tur nonāk tas, ko tajā uzraksti, un, ja esi pieteicies, tavs redzamais vārds, lai zinātu, kam atbildam. Kad palīgs tērzēšanā tev palīdz, tas var redzēt arī, kurā lapā un kurā līgā tu esi un vai tava komanda ir derīga. E-pastu mēs tam nenododam. Nevienam citam datus nenododam un nepārdodam.',
    statistikaNaslov: 'Dati par futbolistiem',
    statistika:
      'Par mūsu aptverto līgu futbolistiem mēs rādām vārdu, klubu, krekla numuru, spēles, minūtes, vārtus un kartītes. Avots ir publiski pieejamie oficiālie spēļu protokoli, ko publicē federācija, kas norādīta lapas kājenē. Pozīcijas un rezultatīvās piespēles, kuru protokolā nav, nosaka kopiena balsojot, tāpēc tās var būt nepareizas. No tā mēs aprēķinām spēlētāja punktus un cenu spēlē. Ja kaut kas nav pareizi, noklikšķini uz spēlētāja un paziņo mums.',
    statistikaPodlaga:
      'Mērķis ir bezmaksas fantāzijas spēle līdzjutējiem. Juridiskais pamats ir leģitīmās intereses (VDAR 6. panta 1. punkta f) apakšpunkts): ļaut līdzjutējiem spēlēt spēli, kas balstīta uz viņu līgas publiski pieejamiem rezultātiem. Datus rādām, kamēr spēlētājs spēlē kādā no mūsu aptvertajām līgām. Austrijas līgās, tāpat kā ÖFB, spēlētāja vārdu paslēpjam 18 mēnešus pēc viņa pēdējās spēles.',
    statistikaUgovor:
      'Spēlētājs var iebilst pret apstrādi vai pieprasīt dzēšanu: raksti uz <eposta>info@slff.eu</eposta> un pievieno saiti uz spēlētāja lapu. 14 dienu laikā viņa vārdu aizstāsim ar neitrālu apzīmējumu visās šīs valsts līgās, kurās viņu atrodam, arī turpmākajos importos. Statistika paliek bez vārda. To pašu darām pēc federācijas pieprasījuma.',
    grbi:
      'Klubu ģerboņi pieder attiecīgajiem klubiem un tiek rādīti tikai komandas atpazīšanai. Klubs, kas to nevēlas, lai mums uzraksta, un mēs ģerboni noņemsim.',
    fotografijeNaslov: 'Fotoattēli',
    fotografije:
      'Sākumlapas fotoattēla autore ir Abigail Keenan, un tas ir publicēts <unsplash>Unsplash</unsplash> ar viņu licenci, kas atļauj brīvu izmantošanu. Tajā nav redzami mūsu līgu spēlētāji.',
    praviceNaslov: 'Tavas tiesības',
    pravice:
      'Kontu un visus savus datus vari jebkurā brīdī izdzēst pats: konta izvēlnē izvēlies <b>Konta dzēšana</b> (slff.eu/account). Lai labotu redzamo vārdu vai ja dzēšana neizdodas, raksti mums uz <eposta>info@slff.eu</eposta>. Pēc dzēšanas no kopvērtējuma pazūd arī tava komanda. Pārbaudīta spēlētāja nozīmītes pirkuma ieraksts paliek 10 gadus, kā to prasa grāmatvedības likumi, bet piegādes adrese saskaņā ar iepriekš minēto noteikumu.',
    pravilaNaslov: 'Spēles noteikumi',
    pravila:
      'Viens cilvēks, viens konts. Balsošana par rezultatīvajām piespēlēm un pozīcijām ir paredzēta īstiem labojumiem; apzināti nepareiza balsošana sabojā spēli visiem un var novest pie konta dzēšanas. Punktu skaitīšana un cenas sezonas laikā var mainīties, ja izrādās, ka kaut kas ir netaisnīgi; par šādām izmaiņām paziņosim.',
    jamstvoNaslov: 'Bez garantijas',
    jamstvo:
      'Lapa darbojas, kā darbojas. Mēs cenšamies, lai dati būtu pareizi un lapa pieejama, bet garantēt to nevaram: protokoli mēdz kavēties, un statistikā var būt kļūdas. Tas attiecas uz bezmaksas spēli. Maksas pakalpojumiem piemēro noteikumus sadaļā Maksas pakalpojumi un tavas likumā noteiktās patērētāja tiesības.',
    kajJePlacljivo:
      'Vienīgais maksas elements ir neobligātā pārbaudīta spēlētāja nozīmīte (skatīt zemāk Maksas pakalpojumi).',
    podatkiPlacilo:
      '<b>Pārbaudīta spēlētāja nozīmītes pirkums (tikai ja pērc).</b> Pirkuma ierakstu (ko, kad, summa un tavs Stripe klienta identifikators) glabājam 10 gadus, kā to prasa grāmatvedības likumi. Drukātās nozīmītes piegādes adresi glabājam 90 dienas pēc nosūtīšanas vai pasūtījuma atcelšanas un ne ilgāk kā 12 mēnešus pēc pasūtījuma, pēc tam paliek tikai valsts.',
    dostopStripe:
      'Pārbaudīta spēlētāja nozīmītes maksājumus apstrādā <b>Stripe</b> (Stripe Payments Europe, Īrija): tas saņem tavu vārdu, e-pastu, norēķinu adresi un drukātai nozīmītei piegādes adresi. Kartes datus tu ievadi tieši Stripe, mēs tos neredzam.',
    placljivoNaslov:
      'Maksas pakalpojumi: pārbaudīti spēlētāji',
    placljivoUvod:
      'Spēle ir un paliks bez maksas. Maksas ir tikai neobligātā pārbaudīta spēlētāja nozīmīte, ko var nopirkt spēlētājs, kurš apstiprinājis, ka profils ir viņa. Nozīmīte nekad neietekmē punktus, cenas, fantāzijas komandas vai spēles noteikumus. Šie noteikumi attiecas uz šo pirkumu.',
    prodajalec:
      '<b>Pārdevējs:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovēnija, reģistrēta Ļubļanas apgabaltiesas tiesu reģistrā. Reģistrācijas numurs 9850538000, PVN numurs SI42765153. Kontakti: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Ko tu pērc.</b> Zilu ķeksīti pie spēlētāja vārda un profila papildinājumus (garāks apraksts, saites, reklāmkarogs, krāsa, izcelta spēle vai statistika, ziņa līdzjutējiem). Gada abonements maksā 9,99 € un katru gadu automātiski atjaunojas. Pirkums uz visiem laikiem maksā 29 € vienreiz un ir spēkā, kamēr SLFF šo pakalpojumu piedāvā. Pirkumam uz visiem laikiem vari pievienot drukātu nozīmīti ar vārdu par 5 € un pasta izdevumiem 2 € (Slovēnija) vai 4 € (cita ES valsts). Sūtām tikai uz ES valstīm, piegāde parasti aizņem 2-3 nedēļas. Visas cenas ietver PVN.',
    placilo:
      '<b>Maksājums.</b> Maksājumu apstrādā Stripe. Kartes datus mēs neredzam un neglabājam. Pirkt vari tikai tad, ja tev ir vismaz 18 gadi. Līgums ir noslēgts, kad Stripe apstiprina maksājumu.',
    odpoved:
      '<b>Abonementa atcelšana.</b> Abonementu vari atcelt jebkurā laikā ar pogu Pārvaldīt abonementu sava konta lapā (slff.eu/account) vai spēlētāja profilā. Atcelšana stājas spēkā apmaksātā gada beigās; līdz tam nozīmīte paliek. Par jau iesāktu gadu naudu neatmaksājam, izņemot zemāk minētos gadījumus.',
    odstop:
      '<b>Atteikuma tiesības.</b> Digitālais saturs (ķeksītis un papildinājumi) tiek nodrošināts uzreiz pēc maksājuma. Pirms maksājuma tu skaidri piekrīti tūlītējai nodrošināšanai un apstiprini, ka ar to zaudē 14 dienu atteikuma tiesības (Direktīvas 2011/83/ES 16. panta m) punkts, Slovēnijas ZVPot-1). Drukātā nozīmīte tiek izgatavota pēc taviem norādījumiem (vārds uz nozīmītes), tāpēc tai atteikuma tiesību nav (16. panta c) punkts). Likumā noteiktās tiesības paliek: ja nozīmīte pienāk bojāta, nepareiza vai nepienāk vispār, raksti mums, un mēs to bez maksas nomainīsim vai atmaksāsim naudu.',
    konec:
      '<b>Kad nozīmīte beidzas.</b> Nozīmīte beidzas, ja izrādās, ka profils nav tavs un mēs atsaucam apstiprinājumu, ja spēlētāja vārdu paslēpjam pēc viņa vai federācijas lūguma vai ja tu izdzēs savu kontu. Abonements tad automātiski apstājas un vairs netiek iekasēts. Ja apstrīdi maksājumu savā bankā (chargeback), nozīmīte tiek noņemta.',
    vracila:
      '<b>Atmaksas.</b> Ļaunprātīgas izmantošanas vai nepatiesa profila apstiprinājuma gadījumā naudu neatmaksājam. Ja nozīmīte beidzas mūsu kļūdas dēļ, pēc federācijas lūguma vai tāpēc, ka pārtraucam pakalpojumu, gada abonementam atmaksājam proporcionālu daļu par neizmantotajiem mēnešiem. Pirkumam uz visiem laikiem pirmajos 12 mēnešos pēc pirkuma atmaksājam visu summu, vēlāk proporcionālu daļu no atlikušā laika līdz 5 gadiem no pirkuma. Drukāto nozīmīti un pasta izdevumus pakalpojuma pārtraukšanas gadījumā neatmaksājam (nozīmīte paliek tev), tikai defekta gadījumā.',
    pritozbe:
      '<b>Jautājumi un sūdzības.</b> Raksti uz <eposta>info@slff.eu</eposta>, atbildam 8 darba dienu laikā. Mēs neatzīstam nevienu patērētāju strīdu ārpustiesas risināšanas struktūru. Piemēro Slovēnijas tiesības; tas tev neatņem aizsardzību, ko sniedz tavas dzīvesvietas valsts tiesības.',
    scoutNaslov: 'SLFF Club un Scout modulis',
    scoutKaj:
      'No tiem pašiem publiskajiem spēļu protokoliem mēs aprēķinām pieaugušo līgu spēlētāju rādītājus: spēles minūšu daļu, vārtus, ietekmi laukumā, ielaistos vārtus, kartītes un attīstību pa sezonām, pielāgotus līgas spēkam. Tie ir rādītāji no spēļu datiem, nevis personas vērtējums. Tos redzēs klubi ar SLFF Scout abonementu, kas meklē spēlētājus; lēmumu vienmēr pieņem cilvēks klubā. Jaunatnes līgas spēlētāju meklēšanai mēs neapstrādājam. Kas kādreiz spēlējis jaunatnes līgā, ir izslēgts, līdz viņam ir spēles minūtes pieaugušo līgā un savā profilā viņš norāda dzimšanas gadu, pēc kura viņam šogad aprit vismaz 19 gadi.',
    scoutPodlaga:
      'Juridiskais pamats ir leģitīmās intereses (VDAR 6. panta 1. punkta f) apakšpunkts): palīdzēt klubiem atrast spēlētājus no publiski publicētiem rezultātiem. Rādītājus pārrēķinām katru dienu un glabājam tikai pēdējos aprēķinus. Klubu skatījumus reģistrēsim 12 mēnešus, lai novērstu ļaunprātīgu izmantošanu un lai pēc pieprasījuma varētu spēlētājam pateikt, kuri klubi viņu skatījuši.',
    scoutPrivolitev:
      'Spēlētājs ar pārņemtu profilu var pievienot, ka ir atvērts pārejai, savu dzimšanas gadu, vēlamos reģionus un atļauju sazināties. Tā ir piekrišana (VDAR 6. panta 1. punkta a) apakšpunkts): to redz tikai klubi Scout, to var jebkurā laikā atsaukt profilā, un pēc atsaukšanas mēs dzēšam datus.',
    scoutUgovor:
      'Iebildums: pārņemtajā profilā noklikšķini Paslēpt mani no Scout vai raksti uz <eposta>info@slff.eu</eposta> ar saiti uz spēlētāja lapu. 14 dienu laikā mēs paslēpjam spēlētāju no Scout visās mūsu šīs valsts līgās, arī turpmākajos importos. Fantāzijas spēlē viņš paliek.',
    klubOrodje:
      'SLFF Club: klubs ar abonementu redz savus spēlētājus, arī jauniešus: spēles no protokoliem un apmeklējumu, ko ievada pats. Apmeklējuma datu pārzinis ir klubs; mēs tos apstrādājam pēc tā norādījumiem un dzēšam 24 mēnešus pēc notikuma. Pieprasījumu par apmeklējumu sūti klubam vai mums; mēs to pārsūtīsim. Iebildums pret Scout tevi paslēpj no citiem klubiem, ne no tava paša.',
    trgovinaNaslov: 'SLFF veikals (shop.slff.eu)',
    trgovinaKaj:
      'Pirkuma laikā apstrādājam vārdu, e-pastu, piegādes adresi, nopirktos produktus un summas, bet, ja esi pieteicies, arī tavu SLFF kontu. Maksājumu apstrādā Stripe: kartes datus mēs neredzam un neglabājam. Vārdu un adresi piegādei saņem Pošta Slovenije. Lai ierobežotu ļaunprātīgu izmantošanu, nepabeigta pirkuma gadījumā īslaicīgi glabājam IP adreses jaucējvērtību (neatgriezenisku); tā tiek dzēsta pēc samaksas vai pirkuma termiņa beigām. Personalizācijas teksts (vārds, numurs) un fantasy komandas nosaukums uz preces ir pasūtījuma daļa; tekstu saņem arī tipogrāfija, kas preci izgatavo. Veikala apmeklējumus (skatītās lapas, grozam pievienotās preces, sākts un pabeigts maksājums) skaita Umami tāpat kā slff.eu: bez sīkdatnēm un bez IP adreses.',
    trgovinaPodlaga:
      'Juridiskais pamats ir līguma izpilde (VDAR 6. panta 1. punkta b) apakšpunkts) un juridiski pienākumi (grāmatvedība, nodokļi), bet IP adreses jaucējvērtībai leģitīmās intereses novērst ļaunprātīgu izmantošanu (VDAR 6. panta 1. punkta f) apakšpunkts). Pārzinis ir SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'Pasūtījumu un rēķinu datus glabājam tik ilgi, cik prasa PVN likums un grāmatvedības noteikumi (10 gadus pēc rēķina izrakstīšanas gada). E-pastu pasūtījuma paziņojumiem izmantojam tikai šim pasūtījumam. Piekļuvei, labošanai vai iebildumiem raksti uz <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Kluba oficiālais konts',
    aktiven: 'Šis konts pārstāv klubu {klub}.',
    pravice: 'Kā klubs vari labot pozīcijas, pievienot spēlētājus un apstiprināt savu spēlētāju profilus.',
    vprasanje: 'Vai pārstāvi klubu?',
    pojasnilo: 'Ja piesakies ar kluba oficiālo adresi, kas mums ir, kluba kontu saņemsi automātiski. Ja tās mums nav, piesakies zemāk, un mēs to pārbaudīsim.',
    klub: 'Klubs',
    isciKlub: 'Meklēt klubu …',
    vloga: 'Tava loma klubā',
    vloge: {
      predsednik: 'prezidents',
      tajnik: 'sekretārs',
      trener: 'treneris',
      vodstvo: 'kluba vadība',
      drugo: 'cits',
    },
    dokaz: 'Saite, kur adrese ir publicēta (mājaslapa, Facebook, federācija)',
    opomba: 'Piezīme (nav obligāta)',
    naslovRacuna: 'Adrese, ko pārbaudām: {email}',
    poslji: 'Nosūtīt pieteikumu',
    caka: 'Pieteikums klubam {klub} gaida pārbaudi.',
    cakaBrezKluba: 'Tava adrese ir starp oficiālajām, bet mums tā vēl jāsasaista ar klubu. Drīz to nokārtosim.',
    cakaPolno: 'Klubam jau ir 5 konti. Pārskatīsim un paziņosim.',
    zavrnjeno: 'Pieteikums noraidīts: {razlog}',
    nepotrjen: 'Vispirms apstiprini sava konta e-pastu.',
    napake: {
      zeKlub: 'Tu jau pārstāvi klubu.',
      caka: 'Tavs pieteikums jau gaida lēmumu.',
    },
  },
}
