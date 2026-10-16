// Slovenský preklad oblasti `racun` (zdroj: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Prihlásenie',
    naslovRegistracija: 'Registrácia',
    naslovPozabljeno: 'Zabudnuté heslo',
    googleNiNaVoljo: 'Prihlásenie cez Google momentálne nie je k dispozícii. Použi e-mail.',
    appleNiNaVoljo: 'Prihlásenie cez Apple momentálne nie je k dispozícii. Použi e-mail.',
    poslanaPonastavitev:
      'Poslali sme ti odkaz na obnovenie hesla. Skontroluj si e-mail (aj priečinok so spamom).',
    racunUstvarjen:
      'Účet je vytvorený. Na e-mail sme ti poslali potvrdzovací odkaz — otvor ho a vráť sa.',
    prijavljenKot: 'Si prihlásený ako {email}.',
    zGooglom: 'Pokračovať cez Google',
    zApplom: 'Pokračovať cez Apple',
    aliZEposto: 'alebo cez e-mail',
    prikaznoIme: 'Zobrazované meno',
    eposta: 'E-mail',
    geslo: 'Heslo',
    posiljam: 'Odosiela sa …',
    ustvariRacun: 'Vytvoriť účet',
    posljiPovezavo: 'Poslať odkaz',
    gumbPrijava: 'Prihlásiť sa',
    zeImasRacun: 'Už máš účet? Prihlás sa',
    nimasRacuna: 'Nemáš účet? Zaregistruj sa',
    pozabljenoGeslo: 'Zabudnuté heslo?',
    nazajNaPrijavo: '← Späť na prihlásenie',
  },
  napake: {
    napacnaPrijava: 'Nesprávna e-mailová adresa alebo heslo.',
    niPotrjen: 'E-mailová adresa ešte nie je potvrdená. Klikni na odkaz v správe, ktorú sme ti poslali.',
    zeRegistriran: 'Táto e-mailová adresa je už zaregistrovaná. Prihlás sa alebo si obnov heslo.',
    prevecPoskusov: 'Príliš veľa pokusov. Počkaj niekoľko minút a skús to znova.',
    sibkoGeslo: 'Heslo je príliš slabé. Použi aspoň 6 znakov, najlepšie kombináciu písmen a číslic.',
    istoGeslo: 'Nové heslo sa musí líšiť od starého.',
    neveljavenNaslov: 'E-mailová adresa nie je platná.',
  },
  novoGeslo: {
    naslov: 'Nové heslo',
    gesliSeNeUjemata: 'Heslá sa nezhodujú.',
    preverjam: 'Overuje sa odkaz …',
    neveljavna:
      'Odkaz nie je platný alebo jeho platnosť vypršala. Na stránke <prijava>prihlásenia</prijava> si znova vyžiadaj obnovenie hesla.',
    novoGeslo: 'Nové heslo',
    ponovi: 'Zopakuj heslo',
    shranjujem: 'Ukladá sa …',
    shrani: 'Uložiť heslo',
  },
  opomniki: {
    naslov: 'Upozornenia',
    napakaNalaganja: 'Nastavenia sa nepodarilo načítať.',
    napakaShranjevanja: 'Uloženie sa nepodarilo. Skús to znova.',
    nalagam: 'Načítava sa …',
    moraPrijava: 'Ak chceš upravovať pripomienky, musíš sa <prijava>prihlásiť</prijava>.',
    opis: 'Pred uzávierkou kola ti pošleme krátku správu na {email}, aby si nezabudol upraviť svoj tím.',
    posiljaj: 'Pripomienky e-mailom',
    shranjujem: 'Ukladá sa …',
    vklopljeni: 'Pripomienky sú zapnuté.',
    izklopljeni: 'Pripomienky ti už nebudeme posielať.',
    odjavaVprasanje: 'Nechceš už dostávať e-maily SLFF (pripomienky pred termínom a upozornenia o tíme)?',
    odjavaGumb: 'Odhlásiť ma',
    odjavaNapaka: 'Odkaz nie je platný. Prihlás sa a vypni pripomienky v nastaveniach.',
    push: 'Push upozornenia',
    pushOpis: 'Deň pred uzávierkou ti telefón pripomenie, ak tím ešte nie je pripravený.',
    pushVklopljena: 'Push upozornenia sú zapnuté.',
    pushIzklopljena: 'Push upozornenia ti už nebudeme posielať.',
    pushZavrnjeno: 'Upozornenia sú v telefóne vypnuté. Zapni ich v Nastavenia → SLFF → Upozornenia.',
    pushDovoli: 'Povoliť upozornenia',
    povezava: 'Nastavenia upozornení',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Overujem …',
    preverjam: 'Overujem odkaz …',
    neveljavna: 'Odkaz už nie je platný alebo bol použitý. <prijava>Prihlás sa</prijava> alebo si vyžiadaj nový.',
  },
  nastavitve: {
    naslov: 'Nastavenia účtu',
    moraPrijava: 'Ak chceš upravovať účet, musíš sa <prijava>prihlásiť</prijava>.',
    nalagam: 'Načítava sa …',
    napakaNalaganja: 'Nastavenia sa nepodarilo načítať.',
    shranjujem: 'Ukladá sa …',
    shranjeno: 'Uložené.',
    napakaShranjevanja: 'Uloženie sa nepodarilo. Skús to znova.',
    profilNaslov: 'Profil',
    mojProfil: 'Pozri si svoj verejný profil',
    prikaznoIme: 'Zobrazované meno',
    imeOpis: 'Vidia ho ostatní v rebríčkoch. Od 3 do 24 znakov, zmeniť ho môžeš raz za 7 dní.',
    imeNaslednjic: 'Meno môžeš znova zmeniť {datum}.',
    shraniIme: 'Uložiť meno',
    avatar: 'Avatar',
    avatarOpis: 'Vyber si farbu a iniciály alebo futbalovú ikonu.',
    barva: 'Farba',
    barvaN: 'Farba {n}',
    slika: 'Obrázok',
    zacetnice: 'Iniciály',
    ikone: {
      zoga: 'Lopta',
      gol: 'Bránka',
      pokal: 'Pohár',
      copat: 'Kopačka',
      rokavice: 'Brankárske rukavice',
      dres: 'Dres',
      zastavica: 'Rohová zástavka',
      navijac: 'Fanúšik',
    },
    klubNaslov: 'Klub, ktorému fandíš',
    klubOpis: 'Zobrazí sa na tvojom profile a tvoje body sa započítajú medzi fanúšikov klubu.',
    klubIsci: 'Vyhľadaj klub …',
    klubNiZadetkov: 'Nenašiel sa žiadny klub.',
    klubBrez: 'Klub si ešte nevybral.',
    klubOdstrani: 'Odstrániť klub',
    jezikNaslov: 'Jazyk a krajina',
    jezikOpis: 'Jazyk stránky a krajina, ktorej ligy vidíš. Výber platí v tomto prehliadači.',
    obvestilaNaslov: 'Upozornenia',
    zasebnostNaslov: 'Súkromie',
    javniProfil: 'Verejný profil',
    javniProfilOpis: 'Ostatní na tvojom profile vidia tvoje tímy, klub a úspechy. Vypnutý profil ukáže len zobrazované meno.',
    prijavaNaslov: 'Prihlásenie a heslo',
    prijavljenZ: 'Si prihlásený e-mailovou adresou {email}.',
    geslo: 'Zmeniť heslo',
    gesloOpis: 'Na e-mail ti pošleme odkaz, cez ktorý si nastavíš nové heslo.',
    gesloPoslano: 'Odkaz sme poslali na {email}. Skontroluj si e-mail (aj priečinok so spamom).',
    gesloNapaka: 'Odkaz sa nepodarilo odoslať. Skús to znova o pár minút.',
    eposta: 'Ak chceš zmeniť e-mailovú adresu, napíš nám na <eposta>info@slff.eu</eposta>.',
    // Chyby zobrazovaného mena (kód z databázy, `hint`).
    napake: {
      dolzina: 'Zobrazované meno musí mať od 3 do 24 znakov.',
      znaki: 'Zobrazované meno obsahuje nepovolené znaky.',
      rezervirano: 'Toto meno je vyhradené pre tím SLFF. Vyber si iné.',
      neprimerno: 'Toto meno nie je vhodné. Vyber si iné.',
      prepogosto: 'Zobrazované meno môžeš zmeniť raz za 7 dní.',
      zasedeno: 'Toto zobrazované meno je už obsadené.',
    },
  },
  // Verejný profil (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Tento profil neexistuje. Účet bol možno zrušený.',
    nazaj: 'Na rebríček',
    zaseben: 'Tento profil je súkromný.',
    tvojZaseben: 'Tvoj profil je súkromný: ostatní vidia len zobrazované meno.',
    uredi: 'Upraviť profil',
    clanOd: 'Členom od {datum}',
    navija: 'Fandí',
    ekipe: 'Tímy',
    brezEkip: 'V aktívnych ligách zatiaľ nemá tím.',
    mesto: '{mesto}. miesto z {ekip}',
    miniLige: 'Spoločné miniligy',
    dosezki: 'Úspechy',
    sezone: 'Sezóny',
    krogi: 'Odohrané kolá',
    najboljsiKrog: 'Najlepšie kolo',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Zrušenie účtu',
    moraPrijava: 'Na zrušenie účtu sa musíš <prijava>prihlásiť</prijava>.',
    opis: 'Zrušíme účet {email}: profil, všetky tvoje tímy s históriou bodov, hlasy a miniligy, ktoré si vytvoril. Zrušenie sa nedá vrátiť. Zmazaním účtu skončí aj odznak overeného hráča a predplatné sa zastaví bez vrátenia peňazí.',
    gumb: 'Zrušiť účet',
    potrdi: 'Áno, zrušiť navždy',
    preklici: 'Zrušiť',
    brisem: 'Ruším …',
    napaka: 'Účet sa nepodarilo zrušiť: {napaka}',
  },
  // Súkromie a podmienky. <b> je tučné písmo, ostatné značky sú odkazy.
  pravno: {
    naslov: 'Súkromie a podmienky',
    zadnjaSprememba: 'Posledná zmena: 16. októbra 2026',
    kajJeNaslov: 'Čo je SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) je fanúšikovská fantasy liga pre amatérske futbalové súťaže. Prevádzkujeme ju amatérsky a nie je prepojená so Slovenským futbalovým zväzom (SFZ), regionálnymi ani oblastnými futbalovými zväzmi, ani s klubmi. Hra je bezplatná, bez peňažných vkladov a bez výhier.',
    podatkiNaslov: 'Aké údaje uchovávame',
    podatkiEposta:
      '<b>E-mailová adresa a heslo.</b> Potrebujeme ich na prihlásenie. Heslo je uložené v šifrovanej podobe a nevidíme ho.',
    podatkiIme:
      '<b>Zobrazované meno a názov tímu.</b> Sú viditeľné v rebríčku. Ak nechceš uvádzať svoje meno, použi prezývku.',
    podatkiEkipa:
      '<b>Tvoj tím a hlasy.</b> Zloženie kádra, kapitán, prestupy a hlasy o asistenciách alebo pozíciách.',
    podatkiNaprava:
      '<b>Token zariadenia pre upozornenia.</b> Ak v mobilnej aplikácii povolíš upozornenia, uložíme token, cez ktorý ti pošleme pripomienku pred uzávierkou kola. Pri odhlásení ho vymažeme.',
    neHranimo:
      'Neuchovávame telefónne číslo ani údaje platobnej karty; adresu len vtedy, ak si objednáš vytlačený odznak (pozri nižšie). Nepoužívame sledovacie cookies ani reklamné nástroje. V prehliadači je uložená tvoja prihlasovacia relácia, identifikátor konverzácie v chate podpory, ak ho otvoríš, a značky relácie, vďaka ktorým návštevu stránky počítame len raz. Koľko ľudí otvorilo ktorú stránku uchovávame len ako denný súčet — bez tvojho mena, účtu, zariadenia či IP adresy. Všeobecnú štatistiku návštev (ktoré stránky, odkiaľ návštevníci prichádzajú, typ zariadenia a krajina, niekoľko akcií ako zostavenie tímu) zaznamenáva <b>Umami</b> na našom serveri: bez cookies, IP adresu neukladá a návštevu nespája s tvojím účtom. Ak má prehliadač zapnutú možnosť „Nesledovať“, nezaznamenáva sa nič.',
    dostopNaslov: 'Kto má k údajom prístup',
    dostop:
      'Údaje sú uložené na našom serveri u poskytovateľa <b>Hetzner</b> (Nemecko, EÚ), prevádzka k nemu ide cez <b>Cloudflare</b> (ochrana a doručovanie stránky). Potvrdzovacie e-maily a e-maily na obnovenie hesla sa odosielajú z nášho poštového servera (tiež Hetzner), upozornenia v mobilnej aplikácii cez <b>Google Firebase Cloud Messaging</b> (iba token zariadenia a text upozornenia). Chat podpory v pravom dolnom rohu beží cez <b>HelpStack</b>: odovzdáva sa tam to, čo doň napíšeš, a — ak si prihlásený — tvoje zobrazované meno, aby sme vedeli, komu odpovedáme. Keď ti asistent v chate pomáha, môže si pozrieť aj to, na ktorej stránke a v ktorej lige si a či je tvoj tím platný. Tvoj e-mail mu neposkytujeme. Nikomu inému údaje neposkytujeme a nepredávame ich.',
    statistikaNaslov: 'Údaje o futbalistoch',
    statistika:
      'O futbalistoch líg, ktoré pokrývame, zobrazujeme meno, klub, číslo dresu, pozíciu, nástupy, minúty, góly a karty. Zdrojom sú verejne zverejnené oficiálne zápisy o stretnutí zväzu uvedeného v päte stránky. Asistencie, ktoré zápis neobsahuje, určuje komunita hlasovaním, preto môžu byť nesprávne. Z toho vypočítame body a cenu hráča v hre. Ak je niečo zle, klikni na hráča a daj nám vedieť.',
    statistikaPodlaga:
      'Účelom je bezplatná fantasy hra pre fanúšikov. Právnym základom je oprávnený záujem (čl. 6 ods. 1 písm. f GDPR): umožniť fanúšikom hru so zverejnenými výsledkami ich ligy. Údaje zobrazujeme, kým hráč nastupuje v lige, ktorú pokrývame. V rakúskych ligách, rovnako ako ÖFB, meno hráča skryjeme 18 mesiacov po jeho poslednom nástupe.',
    statistikaUgovor:
      'Hráč môže proti spracúvaniu namietať alebo žiadať výmaz: napíš na <eposta>info@slff.eu</eposta> a pridaj odkaz na stránku hráča. Do 14 dní jeho meno nahradíme neutrálnym označením vo všetkých našich ligách danej krajiny, v ktorých ho nájdeme, aj pri neskorších importoch. Štatistiky zostanú bez mena. To isté urobíme na žiadosť zväzu.',
    grbi:
      'Erby klubov sú vlastníctvom jednotlivých klubov a zobrazujú sa výlučne na identifikáciu tímu. Klub, ktorý si to neželá, nám môže napísať a erb odstránime.',
    fotografijeNaslov: 'Fotografie',
    fotografije:
      'Fotografia na titulnej stránke je dielom Abigail Keenan a je zverejnená na <unsplash>Unsplash</unsplash> pod ich licenciou, ktorá umožňuje voľné použitie. Nezobrazuje hráčov našich líg.',
    praviceNaslov: 'Tvoje práva',
    pravice:
      'Účet a všetky svoje údaje môžeš kedykoľvek zrušiť sám: v menu účtu zvoľ <b>Zrušenie účtu</b> (slff.eu/account). Ak chceš opraviť zobrazované meno alebo zrušenie nevyjde, napíš nám na <eposta>info@slff.eu</eposta>. Pri vymazaní zmizne z rebríčka aj tvoj tím. Záznam o kúpe odznaku overeného hráča zostáva 10 rokov, ako to vyžadujú účtovné predpisy, a adresa na doručenie podľa pravidla vyššie.',
    pravilaNaslov: 'Pravidlá hry',
    pravila:
      'Jeden človek, jeden účet. Hlasovanie o asistenciách a pozíciách slúži na skutočné opravy — úmyselne nesprávne hlasovanie kazí hru všetkým a môže viesť k odstráneniu účtu. Bodovanie a ceny sa môžu počas sezóny zmeniť, ak sa ukáže, že niečo je nespravodlivé; takéto zmeny zverejníme.',
    jamstvoNaslov: 'Bez záruky',
    jamstvo:
      'Stránka funguje tak, ako funguje. Snažíme sa, aby boli údaje správne a aby bola stránka dostupná, zaručiť to však nemôžeme — zápisy o stretnutí môžu meškať a štatistiky môžu obsahovať chyby. To platí pre bezplatnú hru. Pre platené služby platia podmienky v časti Platené služby a tvoje zákonné práva spotrebiteľa.',
    kajJePlacljivo:
      'Jediná platená vec je nepovinný odznak overeného hráča (pozri Platené služby nižšie).',
    podatkiPlacilo:
      '<b>Kúpa odznaku overeného hráča (len ak ho kúpiš).</b> Záznam o kúpe (čo, kedy, suma a označenie zákazníka v Stripe) uchovávame 10 rokov, ako to vyžadujú účtovné predpisy. Adresu na doručenie vytlačeného odznaku uchovávame 90 dní po odoslaní alebo zrušení objednávky a najdlhšie 12 mesiacov od objednávky, potom zostane len krajina.',
    dostopStripe:
      'Platby za odznak overeného hráča spracúva <b>Stripe</b> (Stripe Payments Europe, Írsko): dostane tvoje meno, e-mail, fakturačnú adresu a pri vytlačenom odznaku adresu na doručenie. Údaje karty zadávaš priamo v Stripe, my ich nevidíme.',
    placljivoNaslov:
      'Platené služby: overení hráči',
    placljivoUvod:
      'Hra je a zostane zadarmo. Platený je len nepovinný odznak overeného hráča, ktorý si môže kúpiť hráč, ktorý potvrdil, že profil je jeho. Odznak nikdy neovplyvňuje body, ceny, fantasy tímy ani pravidlá hry. Tieto podmienky platia pre túto kúpu.',
    prodajalec:
      '<b>Predávajúci:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovinsko, zapísaná v obchodnom registri Okresného súdu v Ľubľane. Identifikačné číslo 9850538000, IČ DPH SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Čo kupuješ.</b> Modrú fajku pri mene hráča a doplnky profilu (dlhší popis, odkazy, banner, farba, zvýraznený zápas alebo štatistika, odkaz fanúšikom). Ročné predplatné stojí 9,99 € a každý rok sa automaticky obnoví. Kúpa navždy stojí 29 € jednorazovo a platí, kým SLFF túto službu ponúka. Ku kúpe navždy môžeš pridať vytlačený odznak s menom za 5 € a poštovné 2 € (Slovinsko) alebo 4 € (iná krajina EÚ). Posielame len do krajín EÚ, doručenie zvyčajne trvá 2 až 3 týždne. Všetky ceny sú vrátane DPH.',
    placilo:
      '<b>Platba.</b> Platbu spracúva Stripe. Údaje karty nevidíme a neuchovávame. Kúpiť môžeš, len ak máš aspoň 18 rokov. Zmluva je uzavretá, keď Stripe platbu potvrdí.',
    odpoved:
      '<b>Zrušenie predplatného.</b> Predplatné môžeš kedykoľvek zrušiť tlačidlom Spravovať predplatné na stránke účtu (slff.eu/account) alebo na profile hráča. Zrušenie platí na konci zaplateného roka; dovtedy odznak zostane. Za už začatý rok peniaze nevraciame, okrem prípadov nižšie.',
    odstop:
      '<b>Právo na odstúpenie.</b> Digitálny obsah (fajka a doplnky) sa poskytne hneď po zaplatení. Pred platbou výslovne súhlasíš s okamžitým poskytnutím a potvrdzuješ, že tým strácaš právo odstúpiť od zmluvy do 14 dní (čl. 16 písm. m) smernice 2011/83/EÚ, slovinský ZVPot-1). Vytlačený odznak sa vyrába podľa tvojich pokynov (meno na odznaku), preto pri ňom právo na odstúpenie nie je (čl. 16 písm. c)). Zákonná zodpovednosť za vady zostáva: ak odznak príde poškodený, nesprávny alebo nepríde vôbec, napíš nám a bezplatne ho vymeníme alebo ti vrátime peniaze.',
    konec:
      '<b>Kedy odznak končí.</b> Odznak končí, ak sa ukáže, že profil nie je tvoj a potvrdenie zrušíme, ak meno hráča na jeho žiadosť alebo žiadosť zväzu skryjeme, alebo ak zmažeš účet. Predplatné sa vtedy automaticky zastaví a už sa neúčtuje. Ak platbu napadneš v banke (chargeback), odznak sa odoberie.',
    vracila:
      '<b>Vrátenie peňazí.</b> Pri zneužití alebo nepravdivom potvrdení profilu peniaze nevraciame. Ak odznak skončí našou chybou, na žiadosť zväzu alebo preto, že službu zrušíme, pri ročnom predplatnom vrátime pomernú časť za nevyužité mesiace. Pri kúpe navždy vrátime celú sumu v prvých 12 mesiacoch od kúpy, neskôr pomernú časť zostatku do 5 rokov od kúpy. Vytlačený odznak a poštovné pri zrušení služby nevraciame (odznak zostane tvoj), len pri vade.',
    pritozbe:
      '<b>Otázky a reklamácie.</b> Napíš na <eposta>info@slff.eu</eposta>, odpovieme do 8 pracovných dní. Neuznávame žiadny subjekt alternatívneho riešenia spotrebiteľských sporov. Platí slovinské právo; tým neprichádzaš o ochranu, ktorú ti dáva právo krajiny, v ktorej žiješ.',
    scoutNaslov: 'SLFF Scout: hľadanie hráčov pre kluby',
    scoutKaj:
      'Z tých istých verejných zápisov o stretnutí vypočítavame ukazovatele hráčov seniorských súťaží: podiel minút, góly, vplyv na ihrisku, inkasované góly, karty a vývoj naprieč sezónami, upravené podľa sily súťaže. Sú to ukazovatele z údajov o zápasoch, nie hodnotenie osoby. Uvidia ich kluby s predplatným SLFF Scout, ktoré hľadajú hráčov; rozhoduje vždy človek v klube. Mládežnícke súťaže nespracúvame. Kto niekedy hral v mládežníckej súťaži, je vylúčený, kým nemá minúty v seniorskej súťaži a na svojom profile nezadá rok narodenia, podľa ktorého tento rok dovŕši aspoň 19 rokov.',
    scoutPodlaga:
      'Právnym základom je oprávnený záujem (článok 6 ods. 1 písm. f) GDPR): pomôcť klubom nájsť hráčov z verejne zverejnených výsledkov. Ukazovatele vypočítavame každý deň nanovo a uchovávame len posledné výpočty. Zobrazenia klubov budeme zaznamenávať 12 mesiacov, aby sme zabránili zneužitiu a aby sme hráčovi na požiadanie povedali, ktoré kluby si ho pozreli.',
    scoutPrivolitev:
      'Hráč s prevzatým profilom môže pridať, že je otvorený prestupu, rok narodenia, želané regióny a povolenie na kontakt. Ide o súhlas (článok 6 ods. 1 písm. a) GDPR): vidia ho iba kluby v Scoute, dá sa kedykoľvek odvolať na profile a po odvolaní údaje vymažeme. Klub píše hráčovi iba cez Scout a jeho e-mailovú adresu nevidí.',
    scoutUgovor:
      'Námietka: na prevzatom profile klikni Skry ma zo Scoutu alebo napíš na <eposta>info@slff.eu</eposta> s odkazom na stránku hráča. Do 14 dní hráča skryjeme zo Scoutu vo všetkých našich súťažiach danej krajiny, aj pri neskorších importoch. Vo fantasy hre zostáva.',
  },
  klubskiRacun: {
    naslov: 'Oficiálny účet klubu',
    aktiven: 'Tento účet zastupuje klub {klub}.',
    pravice: 'Ako klub môžeš upravovať pozície, pridávať hráčov a potvrdzovať profily svojich hráčov.',
    vprasanje: 'Zastupuješ klub?',
    pojasnilo: 'Ak sa prihlásiš oficiálnou adresou klubu, ktorú máme, dostaneš klubový účet automaticky. Ak ju nemáme, požiadaj nižšie a overíme ju.',
    klub: 'Klub',
    isciKlub: 'Hľadať klub …',
    vloga: 'Tvoja úloha v klube',
    vloge: {
      predsednik: 'predseda',
      tajnik: 'tajomník',
      trener: 'tréner',
      vodstvo: 'vedenie klubu',
      drugo: 'iné',
    },
    dokaz: 'Odkaz, kde je adresa zverejnená (web, Facebook, zväz)',
    opomba: 'Poznámka (nepovinné)',
    naslovRacuna: 'Adresa, ktorú overujeme: {email}',
    poslji: 'Odoslať žiadosť',
    caka: 'Žiadosť za {klub} čaká na posúdenie.',
    cakaBrezKluba: 'Tvoja adresa je medzi oficiálnymi, ale ešte ju musíme prepojiť s klubom. Vybavíme to čoskoro.',
    cakaPolno: 'Klub už má 5 účtov. Pozrieme sa na to a dáme ti vedieť.',
    zavrnjeno: 'Žiadosť bola zamietnutá: {razlog}',
    nepotrjen: 'Najprv potvrď e-mail svojho účtu.',
    napake: {
      zeKlub: 'Už zastupuješ klub.',
      caka: 'Tvoja žiadosť už čaká na rozhodnutie.',
    },
  },
}
