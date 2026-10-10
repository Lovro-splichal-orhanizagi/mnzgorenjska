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
    push: 'Tõuketeavitused (mobiilirakendus)',
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
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Kustuta konto',
    moraPrijava: 'Konto kustutamiseks pead <prijava>sisse logima</prijava>.',
    opis: 'Kustutame konto {email}: sinu profiili, kõik sinu koosseisud koos punktide ajalooga, sinu hääled ja sinu loodud miniliigad. Seda ei saa tagasi võtta.',
    gumb: 'Kustuta konto',
    potrdi: 'Jah, kustuta jäädavalt',
    preklici: 'Tühista',
    brisem: 'Kustutan …',
    napaka: 'Kontot ei õnnestunud kustutada: {napaka}',
  },
  pravno: {
    naslov: 'Privaatsus ja tingimused',
    zadnjaSprememba: 'Viimati muudetud: 9. oktoober 2026',
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
      'Me ei hoia sinu aadressi, telefoninumbrit ega makseandmeid. Me ei kasuta jälgimisküpsiseid ega reklaamitööriistu. Sinu brauser hoiab sinu sisselogimise seanssi, abivestluse vestluse tunnust, kui selle avad, ja seansimärke, mis hoiavad ära lehe kahekordse loendamise. Kui palju inimesi millist lehte avas, hoitakse ainult päeva kogusummana, ilma sinu nime, konto, seadme või IP-aadressita. Üldist külastusstatistikat (millised lehed, kust külastajad tulevad, seadme tüüp ja riik, mõned tegevused, näiteks meeskonna kokkupanek) kogub <b>Umami</b> meie oma serveris: küpsisteta, IP-aadressi hoidmata ja külastusi sinu kontoga sidumata. Kui sinu brauseris on sisse lülitatud "Do Not Track", ei salvestata midagi.',
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
      'Saad oma konto ja kõik oma andmed igal ajal ise kustutada: vali kontomenüüs <b>Kustuta konto</b> (slff.eu/account). Kuvatava nime parandamiseks või kui kustutamine ebaõnnestub, kirjuta meile aadressile <eposta>info@slff.eu</eposta>. Konto kustutamisel kaob ka sinu meeskond edetabelist.',
    pravilaNaslov: 'Mängureeglid',
    pravila:
      'Üks inimene, üks konto. Hääletus resultatiivsete söötude ja positsioonide üle on mõeldud päris parandusteks: meelega valed hääled rikuvad mängu kõigile ja võivad viia konto eemaldamiseni. Punktiarvestus ja hinnad võivad hooaja jooksul muutuda, kui midagi osutub ebaõiglaseks; sellistest muudatustest anname teada.',
    jamstvoNaslov: 'Garantiid pole',
    jamstvo:
      'Leht töötab nii, nagu töötab. Anname endast parima, et andmed oleksid õiged ja leht kättesaadav, kuid garanteerida me seda ei saa: mänguprotokollid võivad hilineda ja statistikas võib olla vigu.',
  },
}
