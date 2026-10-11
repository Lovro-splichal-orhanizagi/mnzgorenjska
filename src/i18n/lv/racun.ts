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
    push: 'Push paziņojumi (mobilā lietotne)',
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
  izbris: {
    naslov: 'Konta dzēšana',
    moraPrijava: 'Lai dzēstu kontu, tev <prijava>jāpiesakās</prijava>.',
    opis: 'Mēs izdzēsīsim kontu {email}: profilu, visas tavas komandas ar punktu vēsturi, balsis un minilīgas, ko esi izveidojis. Dzēšanu nevar atsaukt.',
    gumb: 'Dzēst kontu',
    potrdi: 'Jā, dzēst uz visiem laikiem',
    preklici: 'Atcelt',
    brisem: 'Dzēšu …',
    napaka: 'Kontu neizdevās izdzēst: {napaka}',
  },
  pravno: {
    naslov: 'Privātums un noteikumi',
    zadnjaSprememba: 'Pēdējās izmaiņas: 2026. gada 9. oktobris',
    kajJeNaslov: 'Kas ir SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) ir līdzjutēju veidota fantāzijas līga vietējām amatieru futbola līgām. To vada brīvprātīgie, un tā nav saistīta ar reģionālajām futbola federācijām, nacionālo futbola federāciju vai klubiem. Spēle ir bez maksas, bez naudas likmēm un balvām.',
    podatkiNaslov: 'Kādi dati tiek glabāti',
    podatkiEposta:
      '<b>E-pasta adrese un parole.</b> Tās vajadzīgas pieteikšanās brīdim. Parole tiek glabāta šifrēta, un mēs to neredzam.',
    podatkiIme:
      '<b>Redzamais vārds un komandas nosaukums.</b> Tie ir redzami kopvērtējumā. Ja nevēlies rādīt savu vārdu, izmanto segvārdu.',
    podatkiEkipa:
      '<b>Tava komanda un balsis.</b> Sastāvs, kapteinis, transfēri un balsis par rezultatīvajām piespēlēm vai pozīcijām.',
    podatkiNaprava:
      '<b>Ierīces žetons paziņojumiem.</b> Ja mobilajā lietotnē atļauj paziņojumus, mēs saglabājam žetonu, ar kuru tev nosūtām atgādinājumu pirms kārtas termiņa. Izrakstoties mēs to izdzēšam.',
    neHranimo:
      'Mēs neglabājam adresi, tālruņa numuru vai maksājumu datus. Mēs neizmantojam izsekošanas sīkdatnes un reklāmas rīkus. Pārlūkā tiek saglabāta tava pieteikšanās sesija, palīdzības tērzēšanas sarunas atzīme, ja to atver, un sesijas atzīmes, ar kurām lapas apmeklējumu saskaitām tikai vienreiz. Cik cilvēku atvēruši kuru lapu, mēs skaitām tikai kā dienas kopsummu, bez tava vārda, konta, ierīces vai IP adreses. Vispārējo apmeklējumu statistiku (kuras lapas, no kurienes apmeklētāji nāk, ierīces veids un valsts, dažas darbības, piemēram, komandas sastādīšana) reģistrē <b>Umami</b> mūsu serverī: bez sīkdatnēm, IP adresi tas nesaglabā un apmeklējumu nesasaista ar tavu kontu. Ja pārlūkā ir ieslēgta opcija «Neizsekot», netiek reģistrēts nekas.',
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
      'Kontu un visus savus datus vari jebkurā brīdī izdzēst pats: konta izvēlnē izvēlies <b>Konta dzēšana</b> (slff.eu/account). Lai labotu redzamo vārdu vai ja dzēšana neizdodas, raksti mums uz <eposta>info@slff.eu</eposta>. Pēc dzēšanas no kopvērtējuma pazūd arī tava komanda.',
    pravilaNaslov: 'Spēles noteikumi',
    pravila:
      'Viens cilvēks, viens konts. Balsošana par rezultatīvajām piespēlēm un pozīcijām ir paredzēta īstiem labojumiem; apzināti nepareiza balsošana sabojā spēli visiem un var novest pie konta dzēšanas. Punktu skaitīšana un cenas sezonas laikā var mainīties, ja izrādās, ka kaut kas ir netaisnīgi; par šādām izmaiņām paziņosim.',
    jamstvoNaslov: 'Bez garantijas',
    jamstvo:
      'Lapa darbojas, kā darbojas. Mēs cenšamies, lai dati būtu pareizi un lapa pieejama, bet garantēt to nevaram: protokoli mēdz kavēties, un statistikā var būt kļūdas.',
  },
}
