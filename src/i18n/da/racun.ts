// Danski prevod: `racun` (izvor: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Log ind',
    naslovRegistracija: 'Opret dig',
    naslovPozabljeno: 'Glemt adgangskode',
    googleNiNaVoljo: 'Login med Google er ikke muligt lige nu. Brug e-mail.',
    appleNiNaVoljo: 'Login med Apple er ikke muligt lige nu. Brug e-mail.',
    poslanaPonastavitev:
      'Vi har sendt dig et link til at nulstille din adgangskode. Tjek din e-mail (også spam).',
    racunUstvarjen:
      'Din konto er oprettet. Vi har sendt et bekræftelseslink til din e-mail. Åbn det, og kom tilbage.',
    prijavljenKot: 'Du er logget ind som {email}.',
    posljiPotrditevZnova: 'Send bekræftelsesmailen igen',
    potrditevPoslanaZnova:
      'Vi har sendt en ny bekræftelsesmail. Kig også i spam-mappen.',
    zGooglom: 'Fortsæt med Google',
    zApplom: 'Fortsæt med Apple',
    aliZEposto: 'eller med e-mail',
    prikaznoIme: 'Visningsnavn',
    eposta: 'E-mail',
    geslo: 'Adgangskode',
    posiljam: 'Sender …',
    ustvariRacun: 'Opret konto',
    posljiPovezavo: 'Send link',
    gumbPrijava: 'Log ind',
    zeImasRacun: 'Har du allerede en konto? Log ind',
    nimasRacuna: 'Ingen konto endnu? Opret dig',
    pozabljenoGeslo: 'Glemt adgangskode?',
    nazajNaPrijavo: '← Tilbage til login',
    predlogEposte: 'Mente du {eposta}?',
  },
  napake: {
    napacnaPrijava: 'Forkert e-mailadresse eller adgangskode.',
    niPotrjen: 'Din e-mailadresse er ikke bekræftet endnu. Klik på linket i den mail, vi har sendt dig.',
    zeRegistriran: 'Denne e-mailadresse er allerede registreret. Log ind, eller nulstil din adgangskode.',
    prevecPoskusov: 'For mange forsøg. Vent et par minutter, og prøv igen.',
    sibkoGeslo: 'Adgangskoden er for svag. Brug mindst 6 tegn, helst en blanding af bogstaver og tal.',
    istoGeslo: 'Den nye adgangskode skal være forskellig fra den gamle.',
    neveljavenNaslov: 'E-mailadressen er ikke gyldig.',
  },
  novoGeslo: {
    naslov: 'Ny adgangskode',
    gesliSeNeUjemata: 'Adgangskoderne er ikke ens.',
    preverjam: 'Tjekker linket …',
    neveljavna:
      'Linket er ugyldigt eller udløbet. Bed om en ny nulstilling af adgangskoden på siden <prijava>Log ind</prijava>.',
    novoGeslo: 'Ny adgangskode',
    ponovi: 'Gentag adgangskode',
    shranjujem: 'Gemmer …',
    shrani: 'Gem adgangskode',
  },
  opomniki: {
    naslov: 'Notifikationer',
    napakaNalaganja: 'Indstillingerne kunne ikke indlæses.',
    napakaShranjevanja: 'Det lykkedes ikke at gemme. Prøv igen.',
    nalagam: 'Indlæser …',
    moraPrijava: 'Du skal <prijava>logge ind</prijava> for at redigere påmindelser.',
    opis: 'Før hver deadline sender vi en kort besked til {email}, så du ikke glemmer at opdatere dit hold.',
    posiljaj: 'Påmindelser på e-mail',
    shranjujem: 'Gemmer …',
    vklopljeni: 'Påmindelserne er slået til.',
    izklopljeni: 'Vi sender dig ikke flere påmindelser.',
    odjavaVprasanje: 'Vil du ikke længere have mails fra SLFF (påmindelser om deadline og beskeder om dit hold)?',
    odjavaGumb: 'Afmeld mig',
    odjavaNapaka: 'Dette link er ikke gyldigt. Log ind, og slå påmindelserne fra i indstillingerne.',
    push: 'Pushnotifikationer',
    pushOpis: 'Dagen før deadline giver din telefon besked, hvis din trup ikke er klar.',
    pushVklopljena: 'Pushnotifikationerne er slået til.',
    pushIzklopljena: 'Vi sender dig ikke flere pushnotifikationer.',
    pushZavrnjeno: 'Notifikationer er slået fra på din telefon. Slå dem til under Indstillinger → SLFF → Notifikationer.',
    pushDovoli: 'Tillad notifikationer',
    povezava: 'Indstillinger for notifikationer',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Bekræfter …',
    preverjam: 'Tjekker linket …',
    neveljavna: 'Dette link er ikke længere gyldigt eller er allerede brugt. <prijava>Log ind</prijava>, eller bed om et nyt.',
  },
  // Nastavitve računa (slff.eu/account): profil, klub, jezik, obvestila,
  // zasebnost, geslo. Izbris je spodaj (`izbris`).
  nastavitve: {
    naslov: 'Kontoindstillinger',
    moraPrijava: 'Du skal <prijava>logge ind</prijava> for at redigere din konto.',
    nalagam: 'Indlæser …',
    napakaNalaganja: 'Indstillingerne kunne ikke indlæses.',
    shranjujem: 'Gemmer …',
    shranjeno: 'Gemt.',
    napakaShranjevanja: 'Det lykkedes ikke at gemme. Prøv igen.',
    profilNaslov: 'Profil',
    mojProfil: 'Se din offentlige profil',
    prikaznoIme: 'Visningsnavn',
    imeOpis: 'Andre ser det i ranglisten. Fra 3 til 24 tegn, og du kan ændre det én gang hver 7. dag.',
    imeNaslednjic: 'Du kan ændre dit navn igen {datum}.',
    shraniIme: 'Gem navn',
    avatar: 'Avatar',
    avatarOpis: 'Vælg en farve og dine initialer eller et fodboldikon.',
    barva: 'Farve',
    barvaN: 'Farve {n}',
    slika: 'Billede',
    zacetnice: 'Initialer',
    ikone: {
      zoga: 'Bold',
      gol: 'Mål',
      pokal: 'Pokal',
      copat: 'Fodboldstøvle',
      rokavice: 'Målmandshandsker',
      dres: 'Trøje',
      zastavica: 'Hjørneflag',
      navijac: 'Fan',
    },
    klubNaslov: 'Klubben, du holder med',
    klubOpis: 'Den vises på din profil, og dine point tæller for klubben i fantabellen.',
    klubIsci: 'Søg efter en klub …',
    klubNiZadetkov: 'Ingen klub fundet.',
    klubBrez: 'Du har ikke valgt en klub endnu.',
    klubOdstrani: 'Fjern klub',
    jezikNaslov: 'Sprog og land',
    jezikOpis: 'Sidens sprog og det land, hvis ligaer du ser. Valget gælder i denne browser.',
    obvestilaNaslov: 'Notifikationer',
    zasebnostNaslov: 'Privatliv',
    javniProfil: 'Offentlig profil',
    javniProfilOpis: 'Andre kan se dine hold, din klub og dine bedrifter på din profil. Slår du den fra, vises kun dit visningsnavn.',
    prijavaNaslov: 'Login og adgangskode',
    prijavljenZ: 'Du er logget ind med {email}.',
    geslo: 'Skift adgangskode',
    gesloOpis: 'Vi mailer dig et link til at vælge en ny adgangskode.',
    gesloPoslano: 'Vi har sendt linket til {email}. Tjek din e-mail (også spam).',
    gesloNapaka: 'Linket kunne ikke sendes. Prøv igen om et par minutter.',
    eposta: 'Vil du ændre din e-mailadresse, så skriv til os på <eposta>info@slff.eu</eposta>.',
    // Napake prikaznega imena (koda iz baze, `hint`).
    napake: {
      dolzina: 'Dit visningsnavn skal være på 3 til 24 tegn.',
      znaki: 'Dit visningsnavn indeholder tegn, der ikke er tilladt.',
      rezervirano: 'Dette navn er reserveret til SLFF-teamet. Vælg et andet.',
      neprimerno: 'Dette navn er ikke passende. Vælg et andet.',
      prepogosto: 'Du kan ændre dit visningsnavn én gang hver 7. dag.',
      zasedeno: 'Dette visningsnavn er allerede taget.',
    },
  },
  // Javna stran profila (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Denne profil findes ikke. Kontoen er måske slettet.',
    nazaj: 'Til ranglisten',
    zaseben: 'Denne profil er privat.',
    tvojZaseben: 'Din profil er privat: andre ser kun dit visningsnavn.',
    uredi: 'Rediger profil',
    clanOd: 'Medlem siden {datum}',
    navija: 'Holder med',
    ekipe: 'Hold',
    brezEkip: 'Endnu intet hold i de aktive ligaer.',
    mesto: 'Nr. {mesto} af {ekip}',
    miniLige: 'Fælles miniligaer',
    dosezki: 'Bedrifter',
    sezone: 'Sæsoner',
    krogi: 'Spillede runder',
    najboljsiKrog: 'Bedste runde',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Slet konto',
    moraPrijava: 'Du skal <prijava>logge ind</prijava> for at slette din konto.',
    opis: 'Vi sletter kontoen {email}: din profil, alle dine trupper med deres pointhistorik, dine stemmer og de miniligaer, du har oprettet. Det kan ikke fortrydes. Sletning af kontoen afslutter også et badge som verificeret spiller, og et abonnement stopper uden refusion.',
    gumb: 'Slet konto',
    potrdi: 'Ja, slet for altid',
    preklici: 'Annuller',
    brisem: 'Sletter …',
    napaka: 'Kontoen kunne ikke slettes: {napaka}',
  },
  pravno: {
    naslov: 'Privatliv og vilkår',
    zadnjaSprememba: 'Senest opdateret: 30. oktober 2026',
    kajJeNaslov: 'Hvad SLFF er',
    kajJe:
      'SLFF (Sunday League Fantasy Football) er en fantasyliga lavet af fans til de lokale amatørligaer. Den drives af frivillige og har ingen tilknytning til de regionale fodboldforbund, det nationale fodboldforbund eller klubberne. Spillet er gratis, uden indsatser eller præmier.',
    podatkiNaslov: 'Hvilke data vi gemmer',
    podatkiEposta:
      '<b>E-mailadresse og adgangskode.</b> Vi skal bruge dem til login. Adgangskoden gemmes krypteret, og vi kan ikke se den.',
    podatkiIme:
      '<b>Visningsnavn og holdnavn.</b> Begge er synlige i ranglisten. Vil du ikke bruge dit navn, så brug et kaldenavn.',
    podatkiEkipa:
      '<b>Dit hold og dine stemmer.</b> Din trup, kaptajn, transfers og stemmer om assists eller positioner.',
    podatkiNaprava:
      '<b>Enhedstoken til notifikationer.</b> Tillader du notifikationer i mobilappen, gemmer vi et token, som vi bruger til at sende dig en påmindelse før rundens deadline. Det slettes, når du logger ud.',
    neHranimo:
      'Vi gemmer ikke dit telefonnummer eller dine kortoplysninger, og vi gemmer kun din adresse, hvis du bestiller et trykt badge (se nedenfor). Vi bruger ikke sporingscookies eller annonceværktøjer. Din browser gemmer din login-session, et id for samtalen i hjælpechatten, hvis du åbner den, og sessionsmærker, der forhindrer, at en side tælles to gange. Hvor mange der har åbnet hvilken side, gemmes kun som en daglig sum, uden dit navn, din konto, din enhed eller din IP-adresse. Generel besøgsstatistik (hvilke sider, hvor de besøgende kommer fra, enhedstype og land, enkelte handlinger som at sætte et hold) registreres af <b>Umami</b> på vores egen server: ingen cookies, ingen gemt IP-adresse, og besøgene kobles ikke til din konto. Har din browser "Do Not Track" slået til, registreres intet. Når du er logget ind, registrerer vi nogle få trin i spillet (fx at sætte holdet, åbne appen, valget om notifikationer, et lukket vindue) sammen med din konto, så vi kan se, hvor spillet går i stå. Vi gemmer dem i 90 dage, de slettes sammen med kontoen, og med Do Not Track registrerer vi intet.',
    dostopNaslov: 'Hvem har adgang til dataene',
    dostop:
      'Dataene ligger på vores egen server hos <b>Hetzner</b> (Tyskland, EU); trafikken dertil går gennem <b>Cloudflare</b> (beskyttelse og levering af siden). Mails med bekræftelse og nulstilling af adgangskode sendes fra vores egen mailserver (også hos Hetzner), og notifikationer i mobilappen via <b>Google Firebase Cloud Messaging</b> (kun enhedstokenet og notifikationens tekst). Hjælpechatten nederst til højre kører på <b>HelpStack</b>: den modtager det, du skriver i den, og, hvis du er logget ind, dit visningsnavn, så vi ved, hvem vi svarer. Når assistenten i chatten hjælper dig, kan den også se, hvilken side og liga du er på, og om dit hold er gyldigt. Vi videregiver ikke din e-mailadresse. Vi deler ikke dine data med andre, og vi sælger dem ikke.',
    statistikaNaslov: 'Data om fodboldspillere',
    statistika:
      'For fodboldspillere i de ligaer, vi dækker, viser vi navn, klub, trøjenummer, kampe, minutter, mål og kort. Kilden er de offentligt tilgængelige officielle kamprapporter fra det fodboldforbund, der står i sidens bund. Positioner og assists, som kamprapporterne ikke indeholder, afgøres af fællesskabet ved afstemning, så de kan være forkerte. Ud fra dette beregner vi spillerens point og pris i spillet. Er noget forkert, så klik på spilleren og giv os besked.',
    statistikaPodlaga:
      'Formålet er et gratis fantasyspil for fans. Retsgrundlaget er legitim interesse (art. 6, stk. 1, litra f, i GDPR): at lade fans spille et spil baseret på de offentliggjorte resultater i deres liga. Vi viser dataene, så længe spilleren spiller i en liga, vi dækker. I østrigske ligaer skjuler vi, ligesom ÖFB, en spillers navn 18 måneder efter hans sidste kamp.',
    statistikaUgovor:
      'En spiller kan gøre indsigelse mod behandlingen eller bede om sletning: skriv til <eposta>info@slff.eu</eposta> med et link til spillerens side. Inden for 14 dage erstatter vi navnet med en neutral betegnelse i alle vores ligaer i det land, hvor vi finder spilleren, også ved senere import. Statistikken bliver, uden navn. Det samme gør vi på anmodning fra fodboldforbundet.',
    grbi:
      'Klublogoerne tilhører de enkelte klubber og vises kun for at identificere holdet. En klub, der ikke ønsker det, kan skrive til os, så fjerner vi logoet.',
    fotografijeNaslov: 'Billeder',
    fotografije:
      'Billedet på forsiden er taget af Abigail Keenan og udgivet på <unsplash>Unsplash</unsplash> under deres licens, der tillader fri brug. Det viser ikke spillere fra vores ligaer.',
    praviceNaslov: 'Dine rettigheder',
    pravice:
      'Du kan til enhver tid selv slette din konto og alle dine data: vælg <b>Slet konto</b> i kontomenuen (slff.eu/account). Vil du rette dit visningsnavn, eller mislykkes sletningen, så skriv til os på <eposta>info@slff.eu</eposta>. Når din konto slettes, forsvinder dit hold også fra ranglisten. Registreringen af et køb af badge som verificeret spiller gemmes i 10 år, som bogføringsloven kræver, og leveringsadressen som beskrevet ovenfor.',
    pravilaNaslov: 'Spilleregler',
    pravila:
      'Én person, én konto. Afstemningen om assists og positioner er beregnet til ægte rettelser; bevidst forkerte stemmer ødelægger spillet for alle og kan føre til, at din konto fjernes. Pointsystemet og priserne kan ændres i løbet af sæsonen, hvis noget viser sig at være uretfærdigt; sådanne ændringer annoncerer vi.',
    jamstvoNaslov: 'Ingen garanti',
    jamstvo:
      'Siden kører, som den kører. Vi gør vores bedste for at holde dataene korrekte og siden tilgængelig, men vi kan ikke garantere det: kamprapporter kan komme sent, og statistik kan indeholde fejl. Det gælder det gratis spil. Betalte tjenester er omfattet af afsnittet Betalte tjenester og dine lovbestemte forbrugerrettigheder.',
    kajJePlacljivo:
      'Det eneste, der koster penge, er det valgfrie badge som verificeret spiller (se Betalte tjenester nedenfor).',
    podatkiPlacilo:
      '<b>Køb af badge som verificeret spiller (kun hvis du køber et).</b> Vi gemmer købsregistreringen (hvad, hvornår, beløb og dit kunde-id hos Stripe) i 10 år, som bogføringsloven kræver. Leveringsadressen til et trykt badge gemmer vi i 90 dage efter afsendelse eller annullering af ordren og højst 12 måneder efter bestillingen; derefter er kun landet tilbage.',
    dostopStripe:
      'Betalinger for badget som verificeret spiller behandles af <b>Stripe</b> (Stripe Payments Europe, Irland): Stripe modtager dit navn, din e-mail, din faktureringsadresse og, ved et trykt badge, leveringsadressen. Du indtaster dine kortoplysninger direkte hos Stripe; vi ser dem aldrig.',
    placljivoNaslov:
      'Betalte tjenester: verificerede spillere',
    placljivoUvod:
      'Spillet er og forbliver gratis. Det eneste, der koster penge, er det valgfrie badge som verificeret spiller, som en spiller, der har bekræftet, at profilen er hans, kan købe. Badget påvirker aldrig point, priser, fantasyhold eller spillets regler. Disse vilkår gælder for det køb.',
    prodajalec:
      '<b>Sælger:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenien, registreret i selskabsregistret ved byretten i Ljubljana. Registreringsnummer 9850538000, momsnummer SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Hvad du køber.</b> Et blåt flueben ved spillerens navn og ekstra på profilen (længere beskrivelse, links, banner, farve, en fremhævet kamp eller statistik, en besked til fansene). Årsabonnementet koster 9,99 € og fornyes automatisk hvert år. Muligheden for altid koster 29 € én gang og gælder, så længe SLFF tilbyder tjenesten. Med muligheden for altid kan du tilføje et trykt badge med dit navn for 5 € plus porto på 2 € (Slovenien) eller 4 € (et andet EU-land). Vi sender kun til EU-lande; levering tager normalt 2 til 3 uger. Alle priser er inklusive moms.',
    placilo:
      '<b>Betaling.</b> Betalingen behandles af Stripe. Vi ser og gemmer ikke dine kortoplysninger. Du kan kun købe, hvis du er fyldt 18 år. Aftalen indgås, når Stripe bekræfter betalingen.',
    odpoved:
      '<b>Opsigelse af abonnementet.</b> Du kan til enhver tid opsige med knappen Administrer abonnement på din kontoside (slff.eu/account) eller på spillerprofilen. Opsigelsen træder i kraft ved udgangen af det betalte år; indtil da bliver badget. Vi refunderer ikke et år, der allerede er begyndt, undtagen i tilfældene nedenfor.',
    odstop:
      '<b>Fortrydelsesret.</b> Det digitale indhold (fluebenet og det ekstra) leveres straks efter betalingen. Før du betaler, accepterer du udtrykkeligt den straks leverede ydelse og anerkender, at du dermed mister den 14-dages fortrydelsesret (art. 16, litra m, i direktiv 2011/83/EU, slovensk ZVPot-1). Det trykte badge fremstilles efter dine specifikationer (navnet på det), så der er ingen fortrydelsesret for det (art. 16, litra c). Dine lovbestemte reklamationsrettigheder gælder fortsat: kommer badget beskadiget, forkert eller slet ikke, så skriv til os, så erstatter vi det gratis eller refunderer beløbet.',
    konec:
      '<b>Når badget ophører.</b> Badget ophører, hvis det viser sig, at profilen ikke er din, og vi annullerer bekræftelsen, hvis spillerens navn skjules på anmodning fra spilleren eller fodboldforbundet, eller hvis du sletter din konto. Et abonnement stopper så automatisk og trækkes ikke længere. Bestrider du betalingen hos din bank (chargeback), fjernes badget.',
    vracila:
      '<b>Refusion.</b> Vi refunderer ikke ved misbrug eller et falsk krav på en profil. Ophører badget på grund af vores fejl, på anmodning fra fodboldforbundet, eller fordi vi indstiller tjenesten, refunderer vi de ubrugte måneder af et årsabonnement forholdsmæssigt. For et køb for altid refunderer vi hele beløbet inden for de første 12 måneder efter købet og derefter en forholdsmæssig andel af det, der er tilbage af 5 år fra købet. Det trykte badge og portoen refunderes ikke ved indstilling (badget er dit), kun ved fejl.',
    pritozbe:
      '<b>Spørgsmål og klager.</b> Skriv til <eposta>info@slff.eu</eposta>; vi svarer inden for 8 arbejdsdage. Vi anerkender ikke nogen udbyder af udenretslig tvistløsning for forbrugere. Slovensk ret finder anvendelse; det fratager dig ikke den beskyttelse, du har efter loven i det land, du bor i.',
    scoutNaslov: 'SLFF Club og Scout-modulet',
    scoutKaj:
      'Ud fra de samme offentlige kamprapporter beregner vi nøgletal for spillere i seniorligaer: andel af minutter, mål, indflydelse på banen, mål imod, kort og udvikling over sæsonerne, justeret for ligaens styrke. Det er nøgletal fra kampdata, ikke en vurdering af personen. Klubber med et abonnement på SLFF Scout, der leder efter spillere, kan se dem; en person i klubben træffer altid beslutningen. Vi behandler ikke ungdomsligaer til spillersøgning. Alle, der nogensinde har spillet i en ungdomsliga, er udelukket, indtil de har minutter i en seniorliga og på deres egen profil angiver et fødselsår, der viser, at de fylder 19 år eller mere i år.',
    scoutPodlaga:
      'Retsgrundlaget er legitim interesse (artikel 6, stk. 1, litra f, i GDPR): at hjælpe klubber med at finde spillere ud fra offentligt publicerede resultater. Vi genberegner nøgletallene hver dag og gemmer kun de seneste beregninger. Klubbernes visninger logges i 12 måneder for at forhindre misbrug, og så vi på anmodning kan fortælle en spiller, hvilke klubber der har set ham.',
    scoutPrivolitev:
      'En spiller med en profil, han har gjort krav på, kan tilføje, at han er åben for et klubskifte, sit fødselsår, foretrukne regioner og tilladelse til at blive kontaktet. Det er samtykke (artikel 6, stk. 1, litra a, i GDPR): kun klubber i Scout ser det, det kan til enhver tid trækkes tilbage på profilen, og ved tilbagetrækning sletter vi dataene.',
    scoutUgovor:
      'Indsigelse: klik på Skjul mig i Scout på en profil, du har gjort krav på, eller skriv til <eposta>info@slff.eu</eposta> med et link til spillersiden. Inden for 14 dage skjuler vi spilleren i Scout i alle vores ligaer i det land, også ved fremtidig import. Spilleren forbliver i fantasyspillet.',
    klubOrodje:
      'SLFF Club: en klub med abonnement ser sine egne spillere, også ungdomsspillere: kampe fra kamprapporter og fremmøde, som klubben selv registrerer. Klubben er dataansvarlig for fremmødet; vi behandler det efter klubbens instrukser og sletter det 24 måneder efter begivenheden. Send anmodninger om fremmøde til klubben eller til os; vi videresender dem. En indsigelse mod Scout skjuler dig for andre klubber, ikke for din egen.',
    trgovinaNaslov: 'SLFF Shop (shop.slff.eu)',
    trgovinaKaj:
      'Ved køb behandler vi navn, e-mail, leveringsadresse, købte produkter og beløb, og hvis du er logget ind, også din SLFF-konto. Betalingen håndteres af Stripe: vi ser og gemmer ikke kortoplysninger. Navn og adresse sendes til Pošta Slovenije til levering. For at begrænse misbrug gemmer vi ved et ufuldført køb midlertidigt en hashet (irreversibel) IP-adresse; den slettes ved betaling, eller når købet udløber. Personaliseringsteksten (navn, nummer) og fantasyholdets navn på produktet er en del af ordren; teksten går også til trykkeriet, der fremstiller produktet. Besøg i butikken (viste sider, lagt i kurven, påbegyndt og gennemført betaling) tælles af Umami som på slff.eu: uden cookies og uden IP-adresse.',
    trgovinaPodlaga:
      'Retsgrundlaget er opfyldelse af en kontrakt (artikel 6, stk. 1, litra b, GDPR) og retlige forpligtelser (bogføring, skat), og for den hashede IP-adresse vores legitime interesse i at forhindre misbrug (artikel 6, stk. 1, litra f, GDPR). Dataansvarlig er SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'Ordre- og fakturadata opbevarer vi, så længe momsloven og bogføringsreglerne kræver (10 år efter det år, fakturaen blev udstedt). E-mailen til ordrebeskeder bruges kun til den ordre. For indsigt, berigtigelse eller indsigelse, skriv til <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Klubbens officielle konto',
    aktiven: 'Denne konto repræsenterer {klub}.',
    pravice: 'Som klub kan du redigere positioner, tilføje spillere og godkende dine spilleres profiler.',
    vprasanje: 'Repræsenterer du en klub?',
    pojasnilo: 'Logger du ind med klubbens officielle adresse, som vi har registreret, får du automatisk en klubkonto. Har vi den ikke, så anmod om den nedenfor, så tjekker vi den.',
    klub: 'Klub',
    isciKlub: 'Søg efter klubber …',
    vloga: 'Din rolle i klubben',
    vloge: {
      predsednik: 'formand',
      tajnik: 'sekretær',
      trener: 'træner',
      vodstvo: 'klubledelse',
      drugo: 'andet',
    },
    dokaz: 'Link, hvor adressen er offentliggjort (hjemmeside, Facebook, forbund)',
    opomba: 'Bemærkning (valgfrit)',
    naslovRacuna: 'Adresse, vi tjekker: {email}',
    poslji: 'Send anmodning',
    caka: 'Din anmodning for {klub} venter på at blive behandlet.',
    cakaBrezKluba: 'Din adresse er officiel, men vi mangler stadig at koble den til klubben. Det ordner vi snart.',
    cakaPolno: 'Klubben har allerede 5 konti. Vi gennemgår det og giver dig besked.',
    zavrnjeno: 'Din anmodning blev afvist: {razlog}',
    nepotrjen: 'Bekræft først din kontos e-mail.',
    napake: {
      zeKlub: 'Du repræsenterer allerede en klub.',
      caka: 'Din anmodning venter allerede på en afgørelse.',
    },
  },
}
