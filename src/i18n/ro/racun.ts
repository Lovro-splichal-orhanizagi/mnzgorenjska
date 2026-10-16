// Traducere în română: `racun` (sursa: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Autentificare',
    naslovRegistracija: 'Înregistrare',
    naslovPozabljeno: 'Parolă uitată',
    googleNiNaVoljo: 'Autentificarea cu Google nu este disponibilă momentan. Folosește e-mailul.',
    appleNiNaVoljo: 'Autentificarea cu Apple nu este disponibilă momentan. Folosește e-mailul.',
    poslanaPonastavitev:
      'Ți-am trimis un link pentru resetarea parolei. Verifică-ți e-mailul (și folderul spam).',
    racunUstvarjen:
      'Contul a fost creat. Ți-am trimis pe e-mail un link de confirmare: deschide-l și revino aici.',
    prijavljenKot: 'Ești autentificat ca {email}.',
    zGooglom: 'Continuă cu Google',
    zApplom: 'Continuă cu Apple',
    aliZEposto: 'sau cu e-mail',
    prikaznoIme: 'Nume afișat',
    eposta: 'E-mail',
    geslo: 'Parolă',
    posiljam: 'Se trimite …',
    ustvariRacun: 'Creează cont',
    posljiPovezavo: 'Trimite linkul',
    gumbPrijava: 'Autentificare',
    zeImasRacun: 'Ai deja cont? Autentifică-te',
    nimasRacuna: 'Nu ai cont? Înregistrează-te',
    pozabljenoGeslo: 'Ți-ai uitat parola?',
    nazajNaPrijavo: '← Înapoi la autentificare',
  },
  napake: {
    napacnaPrijava: 'E-mail sau parolă greșită.',
    niPotrjen: 'Adresa de e-mail nu este încă confirmată. Apasă linkul din mesajul pe care ți l-am trimis.',
    zeRegistriran: 'Această adresă de e-mail este deja înregistrată. Autentifică-te sau resetează parola.',
    prevecPoskusov: 'Prea multe încercări. Așteaptă câteva minute și încearcă din nou.',
    sibkoGeslo: 'Parola e prea slabă. Folosește cel puțin 6 caractere, ideal un amestec de litere și cifre.',
    istoGeslo: 'Parola nouă trebuie să fie diferită de cea veche.',
    neveljavenNaslov: 'Adresa de e-mail nu este validă.',
  },
  novoGeslo: {
    naslov: 'Parolă nouă',
    gesliSeNeUjemata: 'Parolele nu se potrivesc.',
    preverjam: 'Se verifică linkul …',
    neveljavna:
      'Linkul nu este valid sau a expirat. Cere din nou resetarea parolei pe pagina de <prijava>autentificare</prijava>.',
    novoGeslo: 'Parolă nouă',
    ponovi: 'Repetă parola',
    shranjujem: 'Se salvează …',
    shrani: 'Salvează parola',
  },
  opomniki: {
    naslov: 'Notificări',
    napakaNalaganja: 'Setările nu au putut fi încărcate.',
    napakaShranjevanja: 'Salvarea nu a reușit. Încearcă din nou.',
    nalagam: 'Se încarcă …',
    moraPrijava: 'Ca să îți gestionezi mementourile, trebuie să te <prijava>autentifici</prijava>.',
    opis: 'Înainte de termenul etapei îți trimitem un mesaj scurt la {email}, ca să nu uiți să-ți aranjezi echipa.',
    posiljaj: 'Mementouri pe e-mail',
    shranjujem: 'Se salvează …',
    vklopljeni: 'Mementourile sunt activate.',
    izklopljeni: 'Nu-ți mai trimitem mementouri.',
    odjavaVprasanje: 'Nu mai vrei să primești e-mailuri SLFF (mementouri înainte de termen și notificări despre echipă)?',
    odjavaGumb: 'Dezabonează-mă',
    odjavaNapaka: 'Linkul nu este valid. Autentifică-te și dezactivează mementourile din setări.',
    push: 'Notificări push',
    pushOpis: 'Cu o zi înainte de termen, telefonul îți spune dacă echipa nu e încă pregătită.',
    pushVklopljena: 'Notificările push sunt activate.',
    pushIzklopljena: 'Nu-ți mai trimitem notificări push.',
    pushZavrnjeno: 'Notificările sunt dezactivate pe telefon. Activează-le în Setări → SLFF → Notificări.',
    pushDovoli: 'Permite notificările',
    povezava: 'Setări notificări',
  },
  potrditev: {
    naslov: 'Se confirmă …',
    preverjam: 'Se verifică linkul …',
    neveljavna: 'Linkul nu mai este valid sau a fost deja folosit. <prijava>Autentifică-te</prijava> sau cere unul nou.',
  },
  nastavitve: {
    naslov: 'Setările contului',
    moraPrijava: 'Ca să îți modifici contul, trebuie să te <prijava>autentifici</prijava>.',
    nalagam: 'Se încarcă …',
    napakaNalaganja: 'Setările nu au putut fi încărcate.',
    shranjujem: 'Se salvează …',
    shranjeno: 'Salvat.',
    napakaShranjevanja: 'Salvarea nu a reușit. Încearcă din nou.',
    profilNaslov: 'Profil',
    mojProfil: 'Vezi profilul tău public',
    prikaznoIme: 'Nume afișat',
    imeOpis: 'Îl văd ceilalți în clasamente. Între 3 și 24 de caractere, îl poți schimba o dată la 7 zile.',
    imeNaslednjic: 'Îți poți schimba din nou numele pe {datum}.',
    shraniIme: 'Salvează numele',
    avatar: 'Avatar',
    avatarOpis: 'Alege o culoare și inițialele sau o pictogramă de fotbal.',
    barva: 'Culoare',
    barvaN: 'Culoarea {n}',
    slika: 'Imagine',
    zacetnice: 'Inițiale',
    ikone: {
      zoga: 'Minge',
      gol: 'Poartă',
      pokal: 'Cupă',
      copat: 'Gheată de fotbal',
      rokavice: 'Mănuși de portar',
      dres: 'Tricou',
      zastavica: 'Steag de colț',
      navijac: 'Suporter',
    },
    klubNaslov: 'Clubul pe care îl susții',
    klubOpis: 'Apare pe profilul tău, iar punctele tale contează în clasamentul suporterilor clubului.',
    klubIsci: 'Caută un club …',
    klubNiZadetkov: 'Nu am găsit niciun club.',
    klubBrez: 'Încă nu ai ales un club.',
    klubOdstrani: 'Elimină clubul',
    jezikNaslov: 'Limbă și țară',
    jezikOpis: 'Limba paginii și țara ale cărei ligi le vezi. Alegerea se aplică în acest browser.',
    obvestilaNaslov: 'Notificări',
    zasebnostNaslov: 'Confidențialitate',
    javniProfil: 'Profil public',
    javniProfilOpis: 'Ceilalți văd pe profilul tău echipele, clubul și realizările tale. Un profil dezactivat arată doar numele afișat.',
    prijavaNaslov: 'Autentificare și parolă',
    prijavljenZ: 'Ești autentificat cu adresa {email}.',
    geslo: 'Schimbă parola',
    gesloOpis: 'Îți trimitem pe e-mail un link cu care îți setezi o parolă nouă.',
    gesloPoslano: 'Am trimis linkul la {email}. Verifică e-mailul (și folderul spam).',
    gesloNapaka: 'Linkul nu a putut fi trimis. Încearcă din nou peste câteva minute.',
    eposta: 'Pentru a schimba adresa de e-mail, scrie-ne la <eposta>info@slff.eu</eposta>.',
    napake: {
      dolzina: 'Numele afișat trebuie să aibă între 3 și 24 de caractere.',
      znaki: 'Numele afișat conține caractere nepermise.',
      rezervirano: 'Acest nume este rezervat echipei SLFF. Alege altul.',
      neprimerno: 'Acest nume nu este potrivit. Alege altul.',
      prepogosto: 'Numele afișat îl poți schimba o dată la 7 zile.',
      zasedeno: 'Acest nume afișat este deja folosit.',
    },
  },
  profil: {
    naslov: 'Profil',
    niProfila: 'Acest profil nu există. Poate contul a fost șters.',
    nazaj: 'La clasament',
    zaseben: 'Acest profil este privat.',
    tvojZaseben: 'Profilul tău este privat: ceilalți văd doar numele afișat.',
    uredi: 'Editează profilul',
    clanOd: 'Membru din {datum}',
    navija: 'Susține',
    ekipe: 'Echipe',
    brezEkip: 'Nu are încă nicio echipă în ligile active.',
    mesto: 'Locul {mesto} din {ekip}',
    miniLige: 'Mini-ligi comune',
    dosezki: 'Realizări',
    sezone: 'Sezoane',
    krogi: 'Etape jucate',
    najboljsiKrog: 'Cea mai bună etapă',
  },
  izbris: {
    naslov: 'Ștergerea contului',
    moraPrijava: 'Ca să îți ștergi contul, trebuie să te <prijava>autentifici</prijava>.',
    opis: 'Vom șterge contul {email}: profilul, toate echipele tale cu istoricul punctelor, voturile și mini-ligile pe care le-ai creat. Ștergerea nu poate fi anulată. Odată cu ștergerea încetează și insigna de jucător verificat, iar abonamentul se oprește fără rambursare.',
    gumb: 'Șterge contul',
    potrdi: 'Da, șterge definitiv',
    preklici: 'Anulează',
    brisem: 'Se șterge …',
    napaka: 'Contul nu a putut fi șters: {napaka}',
  },
  pravno: {
    naslov: 'Confidențialitate și termeni',
    zadnjaSprememba: 'Ultima modificare: 16 octombrie 2026',
    kajJeNaslov: 'Ce este SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) este o ligă fantasy a suporterilor pentru ligile de fotbal amator. O facem din pasiune și nu are legătură cu Federația Română de Fotbal (FRF), asociațiile județene de fotbal sau cu cluburile. Jocul este gratuit, fără mize în bani și fără premii.',
    podatkiNaslov: 'Ce date se păstrează',
    podatkiEposta:
      '<b>Adresa de e-mail și parola.</b> Ne trebuie pentru autentificare. Parola este stocată criptat și nu o vedem.',
    podatkiIme:
      '<b>Numele afișat și numele echipei.</b> Sunt vizibile în clasament. Dacă nu vrei să-ți folosești numele, folosește o poreclă.',
    podatkiEkipa:
      '<b>Echipa ta și voturile tale.</b> Componența lotului, căpitanul, transferurile și voturile despre pase decisive sau poziții.',
    podatkiNaprava:
      '<b>Tokenul dispozitivului pentru notificări.</b> Dacă permiți notificările în aplicația mobilă, păstrăm un token prin care îți trimitem un memento înainte de termenul etapei. La deconectare îl ștergem.',
    neHranimo:
      'Nu păstrăm numărul de telefon sau datele cardului, iar adresa doar dacă comanzi o insignă tipărită (vezi mai jos). Nu folosim cookie-uri de urmărire sau instrumente de publicitate. În browser sunt salvate sesiunea ta de autentificare, identificatorul conversației din chatul de ajutor, dacă îl deschizi, și identificatori de sesiune cu care numărăm o singură dată vizita unei pagini. Câți oameni au deschis o anumită pagină numărăm doar ca total zilnic, fără numele, contul, dispozitivul sau adresa ta IP. Statisticile generale de vizitare (ce pagini, de unde vin vizitatorii, tipul dispozitivului și țara, câteva acțiuni precum alcătuirea echipei) le înregistrează <b>Umami</b> pe serverul nostru: fără cookie-uri, nu salvează adresa IP și nu leagă vizita de contul tău. Dacă browserul are activată opțiunea „Nu urmări”, nu se înregistrează nimic.',
    dostopNaslov: 'Cine are acces la date',
    dostop:
      'Datele sunt pe serverul nostru la furnizorul <b>Hetzner</b> (Germania, UE), iar traficul către el trece prin <b>Cloudflare</b> (protecție și livrarea paginilor). E-mailurile de confirmare și de resetare trec prin serverul nostru de e-mail (tot la Hetzner), notificările din aplicația mobilă prin <b>Google Firebase Cloud Messaging</b> (doar tokenul dispozitivului și textul notificării). Chatul de ajutor din colțul din dreapta jos funcționează prin <b>HelpStack</b>: acolo ajunge ce scrii în el și, dacă ești autentificat, numele tău afișat, ca să știm cui răspundem. Când asistentul din chat te ajută, poate vedea și pe ce pagină și în ce ligă ești și dacă echipa ta e validă. Adresa de e-mail nu i-o transmitem. Nu transmitem datele nimănui altcuiva și nu le vindem.',
    statistikaNaslov: 'Date despre fotbaliști',
    statistika:
      'Pentru fotbaliștii din ligile pe care le acoperim afișăm numele, clubul, numărul de pe tricou, meciurile jucate, minutele, golurile și cartonașele. Sursa sunt foile de joc oficiale publicate public de federația menționată în subsolul paginii. Pozițiile și pasele decisive, care nu apar în foaia de joc, le stabilește comunitatea prin vot, așa că pot fi greșite. Din acestea calculăm punctele și prețul jucătorului în joc. Dacă ceva e greșit, apasă pe jucător și anunță-ne.',
    statistikaPodlaga:
      'Scopul este un joc fantasy gratuit pentru suporteri. Temeiul legal este interesul legitim (articolul 6 alineatul (1) litera (f) din GDPR): să le oferim suporterilor un joc cu rezultatele publicate public ale ligii lor. Afișăm datele cât timp jucătorul evoluează într-o ligă pe care o acoperim. În ligile austriece, la fel ca ÖFB, ascundem numele jucătorului la 18 luni după ultimul său meci.',
    statistikaUgovor:
      'Jucătorul se poate opune prelucrării sau poate cere ștergerea: scrie la <eposta>info@slff.eu</eposta> și adaugă linkul către pagina jucătorului. În 14 zile îi înlocuim numele cu o etichetă neutră în toate ligile noastre din acea țară în care îl găsim, și la importurile ulterioare. Statisticile rămân fără nume. Facem la fel la cererea federației.',
    grbi:
      'Emblemele cluburilor aparțin cluburilor respective și sunt afișate doar pentru recunoașterea echipei. Clubul care nu dorește acest lucru să ne scrie și vom elimina emblema.',
    fotografijeNaslov: 'Fotografii',
    fotografije:
      'Fotografia de pe pagina principală este realizată de Abigail Keenan și publicată pe <unsplash>Unsplash</unsplash> sub licența lor, care permite utilizarea liberă. Nu înfățișează jucători din ligile noastre.',
    praviceNaslov: 'Drepturile tale',
    pravice:
      'Îți poți șterge oricând singur contul și toate datele: în meniul contului alege <b>Ștergerea contului</b> (slff.eu/account). Pentru corectarea numelui afișat sau dacă ștergerea nu reușește, scrie-ne la <eposta>info@slff.eu</eposta>. La ștergere dispare și echipa ta din clasament. Înregistrarea cumpărării insignei de jucător verificat rămâne 10 ani, cum cere legislația contabilă, iar adresa de livrare după regula de mai sus.',
    pravilaNaslov: 'Regulile jocului',
    pravila:
      'Un om, un cont. Votul pentru pase decisive și poziții este pentru corecturi reale: votul greșit intenționat strică jocul pentru toți și poate duce la eliminarea contului. Punctajul și prețurile se pot schimba în timpul sezonului dacă se dovedește că ceva e nedrept; astfel de schimbări le vom anunța.',
    jamstvoNaslov: 'Fără garanție',
    jamstvo:
      'Site-ul merge așa cum merge. Ne străduim ca datele să fie corecte și site-ul să fie disponibil, dar nu putem garanta asta: foile de joc pot întârzia, iar statisticile pot conține greșeli. Asta se aplică jocului gratuit. Pentru serviciile cu plată se aplică condițiile din secțiunea Servicii cu plată și drepturile tale legale de consumator.',
    kajJePlacljivo:
      'Singurul lucru cu plată este insigna opțională de jucător verificat (vezi Servicii cu plată mai jos).',
    podatkiPlacilo:
      '<b>Cumpărarea insignei de jucător verificat (doar dacă o cumperi).</b> Înregistrarea cumpărării (ce, când, suma și identificatorul tău de client la Stripe) o păstrăm 10 ani, cum cere legislația contabilă. Adresa de livrare a insignei tipărite o păstrăm 90 de zile după expediere sau anularea comenzii și cel mult 12 luni de la comandă, apoi rămâne doar țara.',
    dostopStripe:
      'Plățile pentru insigna de jucător verificat sunt procesate de <b>Stripe</b> (Stripe Payments Europe, Irlanda): primește numele, e-mailul, adresa de facturare și, pentru insigna tipărită, adresa de livrare. Datele cardului le introduci direct la Stripe, noi nu le vedem.',
    placljivoNaslov:
      'Servicii cu plată: jucători verificați',
    placljivoUvod:
      'Jocul este și rămâne gratuit. Cu plată este doar insigna opțională de jucător verificat, pe care o poate cumpăra un jucător care a confirmat că profilul este al lui. Insigna nu influențează niciodată punctele, prețurile, echipele fantasy sau regulile jocului. Acești termeni se aplică acestei cumpărări.',
    prodajalec:
      '<b>Vânzător:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenia, înscrisă în registrul judiciar la Tribunalul Districtual din Ljubljana. Număr de înregistrare 9850538000, cod de TVA SI42765153. Contact: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Ce cumperi.</b> O bifă albastră lângă numele jucătorului și extra pe profil (descriere mai lungă, linkuri, banner, culoare, un meci sau o statistică evidențiată, un mesaj pentru fani). Abonamentul anual costă 9,99 € și se reînnoiește automat în fiecare an. Varianta pentru totdeauna costă 29 € o singură dată și este valabilă cât timp SLFF oferă acest serviciu. La varianta pentru totdeauna poți adăuga o insignă tipărită cu numele pentru 5 € plus poștă de 2 € (Slovenia) sau 4 € (altă țară din UE). Expediem doar în țări din UE, livrarea durează de obicei 2-3 săptămâni. Toate prețurile includ TVA.',
    placilo:
      '<b>Plata.</b> Plata este procesată de Stripe. Nu vedem și nu păstrăm datele cardului. Poți cumpăra doar dacă ai cel puțin 18 ani. Contractul se încheie când Stripe confirmă plata.',
    odpoved:
      '<b>Anularea abonamentului.</b> Poți anula oricând abonamentul cu butonul Gestionează abonamentul de pe pagina contului (slff.eu/account) sau de pe profilul jucătorului. Anularea are efect la sfârșitul anului plătit; până atunci insigna rămâne. Pentru un an deja început nu returnăm bani, cu excepția cazurilor de mai jos.',
    odstop:
      '<b>Dreptul de retragere.</b> Conținutul digital (bifa și extra) este furnizat imediat după plată. Înainte de plată îți dai acordul expres pentru furnizarea imediată și confirmi că astfel îți pierzi dreptul de retragere de 14 zile (art. 16 lit. (m) din Directiva 2011/83/UE, ZVPot-1 din Slovenia). Insigna tipărită este realizată după indicațiile tale (numele de pe insignă), deci pentru ea nu există drept de retragere (art. 16 lit. (c)). Garanția legală rămâne: dacă insigna sosește deteriorată, greșită sau nu sosește deloc, scrie-ne și o înlocuim gratuit sau îți returnăm banii.',
    konec:
      '<b>Când încetează insigna.</b> Insigna încetează dacă se dovedește că profilul nu este al tău și anulăm confirmarea, dacă numele jucătorului este ascuns la cererea lui sau a federației ori dacă îți ștergi contul. Abonamentul se oprește atunci automat și nu se mai facturează. Dacă contești plata la bancă (chargeback), insigna este retrasă.',
    vracila:
      '<b>Rambursări.</b> În caz de abuz sau confirmare falsă a profilului nu returnăm bani. Dacă insigna încetează din greșeala noastră, la cererea federației sau pentru că închidem serviciul, la abonamentul anual returnăm proporțional lunile nefolosite. La varianta pentru totdeauna returnăm întreaga sumă în primele 12 luni de la cumpărare, iar după aceea partea proporțională din ce a rămas din cei 5 ani de la cumpărare. Insigna tipărită și poșta nu le returnăm la închiderea serviciului (insigna rămâne a ta), doar în caz de defect.',
    pritozbe:
      '<b>Întrebări și reclamații.</b> Scrie la <eposta>info@slff.eu</eposta>, răspundem în 8 zile lucrătoare. Nu recunoaștem nicio entitate de soluționare extrajudiciară a litigiilor cu consumatorii. Se aplică legea slovenă; asta nu îți ia protecția pe care ți-o oferă legea țării în care locuiești.',
    scoutNaslov: 'SLFF Scout: căutare de jucători pentru cluburi',
    scoutKaj:
      'Din aceleași rapoarte publice de joc calculăm indicatori pentru jucătorii din ligile de seniori: ponderea minutelor, goluri, impact pe teren, goluri primite, cartonașe și evoluția de la un sezon la altul, ajustate după puterea ligii. Sunt indicatori din datele meciurilor, nu o evaluare a persoanei. Îi vor vedea cluburile cu abonament SLFF Scout care caută jucători; decizia o ia întotdeauna un om din club. Nu prelucrăm ligile de juniori. Cine a jucat vreodată într-o ligă de juniori este exclus până când are minute într-o ligă de seniori și își introduce pe profil un an al nașterii din care reiese că împlinește anul acesta cel puțin 19 ani.',
    scoutPodlaga:
      'Temeiul juridic este interesul legitim (articolul 6 alineatul (1) litera (f) din GDPR): să ajutăm cluburile să găsească jucători din rezultate publicate public. Recalculăm indicatorii în fiecare zi și păstrăm doar ultimele calcule. Vom înregistra vizualizările cluburilor timp de 12 luni, pentru a preveni abuzurile și pentru a-i putea spune unui jucător, la cerere, ce cluburi l-au văzut.',
    scoutPrivolitev:
      'Un jucător cu profil revendicat poate adăuga că este deschis pentru un transfer, anul nașterii, regiunile dorite și permisiunea de a fi contactat. Este un consimțământ (articolul 6 alineatul (1) litera (a) din GDPR): îl văd doar cluburile din Scout, poate fi retras oricând pe profil, iar la retragere ștergem datele. Un club îi scrie jucătorului doar prin Scout și nu îi vede adresa de e-mail.',
    scoutUgovor:
      'Opoziție: pe profilul revendicat apasă Ascunde-mă din Scout sau scrie la <eposta>info@slff.eu</eposta> cu un link către pagina jucătorului. În 14 zile ascundem jucătorul din Scout în toate ligile noastre din acea țară, inclusiv la importurile ulterioare. În jocul fantasy rămâne.',
  },
  klubskiRacun: {
    naslov: 'Cont oficial de club',
    aktiven: 'Acest cont reprezintă clubul {klub}.',
    pravice: 'Ca club poți edita pozițiile, adăuga jucători și aproba profilurile jucătorilor tăi.',
    vprasanje: 'Reprezinți un club?',
    pojasnilo: 'Dacă te autentifici cu adresa oficială a clubului pe care o avem, primești automat un cont de club. Dacă nu o avem, cere-o mai jos și o verificăm.',
    klub: 'Club',
    isciKlub: 'Caută clubul …',
    vloga: 'Rolul tău în club',
    vloge: {
      predsednik: 'președinte',
      tajnik: 'secretar',
      trener: 'antrenor',
      vodstvo: 'conducerea clubului',
      drugo: 'altul',
    },
    dokaz: 'Link unde este publicată adresa (site, Facebook, asociație)',
    opomba: 'Notă (opțional)',
    naslovRacuna: 'Adresa pe care o verificăm: {email}',
    poslji: 'Trimite cererea',
    caka: 'Cererea pentru {klub} așteaptă verificarea.',
    cakaBrezKluba: 'Adresa ta este una oficială, dar trebuie să o legăm de club. Rezolvăm în curând.',
    cakaPolno: 'Clubul are deja 5 conturi. Verificăm și îți spunem.',
    zavrnjeno: 'Cererea a fost respinsă: {razlog}',
    nepotrjen: 'Confirmă mai întâi e-mailul contului tău.',
    napake: {
      zeKlub: 'Reprezinți deja un club.',
      caka: 'Cererea ta așteaptă deja o decizie.',
    },
  },
}
