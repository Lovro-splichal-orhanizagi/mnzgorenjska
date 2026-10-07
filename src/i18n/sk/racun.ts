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
    push: 'Push upozornenia (mobilná aplikácia)',
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
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Zrušenie účtu',
    moraPrijava: 'Na zrušenie účtu sa musíš <prijava>prihlásiť</prijava>.',
    opis: 'Zrušíme účet {email}: profil, všetky tvoje tímy s históriou bodov, hlasy a minilgy, ktoré si vytvoril. Zrušenie sa nedá vrátiť.',
    gumb: 'Zrušiť účet',
    potrdi: 'Áno, zrušiť navždy',
    preklici: 'Zrušiť',
    brisem: 'Ruším …',
    napaka: 'Účet sa nepodarilo zrušiť: {napaka}',
  },
  // Súkromie a podmienky. <b> je tučné písmo, ostatné značky sú odkazy.
  pravno: {
    naslov: 'Súkromie a podmienky',
    zadnjaSprememba: 'Posledná zmena: 2. októbra 2026',
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
      'Neuchovávame adresu, telefónne číslo ani platobné údaje. Nepoužívame sledovacie cookies ani reklamné nástroje. V prehliadači je uložená tvoja prihlasovacia relácia, identifikátor konverzácie v chate podpory, ak ho otvoríš, a značky relácie, vďaka ktorým návštevu stránky počítame len raz. Koľko ľudí otvorilo ktorú stránku uchovávame len ako denný súčet — bez tvojho mena, účtu, zariadenia či IP adresy. Všeobecnú štatistiku návštev (ktoré stránky, odkiaľ návštevníci prichádzajú, typ zariadenia a krajina, niekoľko akcií ako zostavenie tímu) zaznamenáva <b>Umami</b> na našom serveri: bez cookies, IP adresu neukladá a návštevu nespája s tvojím účtom. Ak má prehliadač zapnutú možnosť „Nesledovať“, nezaznamenáva sa nič.',
    dostopNaslov: 'Kto má k údajom prístup',
    dostop:
      'Údaje sú uložené na našom serveri u poskytovateľa <b>Hetzner</b> (Nemecko, EÚ), prevádzka k nemu ide cez <b>Cloudflare</b> (ochrana a doručovanie stránky). Potvrdzovacie e-maily a e-maily na obnovenie hesla sa odosielajú z nášho poštového servera (tiež Hetzner), upozornenia v mobilnej aplikácii cez <b>Google Firebase Cloud Messaging</b> (iba token zariadenia a text upozornenia). Chat podpory v pravom dolnom rohu beží cez <b>HelpStack</b>: odovzdáva sa tam to, čo doň napíšeš, a — ak si prihlásený — tvoje zobrazované meno, aby sme vedeli, komu odpovedáme. Keď ti asistent v chate pomáha, môže si pozrieť aj to, na ktorej stránke a v ktorej lige si a či je tvoj tím platný. Tvoj e-mail mu neposkytujeme. Nikomu inému údaje neposkytujeme a nepredávame ich.',
    statistikaNaslov: 'Štatistiky hráčov',
    statistika:
      'Údaje o futbalistoch (zostavy, pozície, nástupy, góly, karty) sú prevzaté z verejne zverejnených zápisov o stretnutí na futbalnet.sk; zdroj pre vybranú ligu je uvedený v päte stránky. Asistencie, ktoré zápis o stretnutí neobsahuje, určuje komunita hlasovaním — preto môžu byť nesprávne. Ak je niečo zle, klikni na hráča a daj nám vedieť.',
    grbi:
      'Erby klubov sú vlastníctvom jednotlivých klubov a zobrazujú sa výlučne na identifikáciu tímu. Klub, ktorý si to neželá, nám môže napísať a erb odstránime.',
    fotografijeNaslov: 'Fotografie',
    fotografije:
      'Fotografia na titulnej stránke je dielom Abigail Keenan a je zverejnená na <unsplash>Unsplash</unsplash> pod ich licenciou, ktorá umožňuje voľné použitie. Nezobrazuje hráčov našich líg.',
    praviceNaslov: 'Tvoje práva',
    pravice:
      'Účet a všetky svoje údaje môžeš kedykoľvek zrušiť sám: v menu účtu zvoľ <b>Zrušenie účtu</b> (slff.eu/account). Ak chceš opraviť zobrazované meno alebo zrušenie nevyjde, napíš nám na <eposta>info@slff.eu</eposta>. Pri vymazaní zmizne z rebríčka aj tvoj tím.',
    pravilaNaslov: 'Pravidlá hry',
    pravila:
      'Jeden človek, jeden účet. Hlasovanie o asistenciách a pozíciách slúži na skutočné opravy — úmyselne nesprávne hlasovanie kazí hru všetkým a môže viesť k odstráneniu účtu. Bodovanie a ceny sa môžu počas sezóny zmeniť, ak sa ukáže, že niečo je nespravodlivé; takéto zmeny zverejníme.',
    jamstvoNaslov: 'Bez záruky',
    jamstvo:
      'Stránka funguje tak, ako funguje. Snažíme sa, aby boli údaje správne a aby bola stránka dostupná, zaručiť to však nemôžeme — zápisy o stretnutí môžu meškať a štatistiky môžu obsahovať chyby.',
  },
}
