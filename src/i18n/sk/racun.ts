// Slovenský preklad oblasti `racun` (zdroj: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Prihlásenie',
    naslovRegistracija: 'Registrácia',
    naslovPozabljeno: 'Zabudnuté heslo',
    googleNiNaVoljo: 'Prihlásenie cez Google momentálne nie je k dispozícii. Použi e-mail.',
    poslanaPonastavitev:
      'Poslali sme ti odkaz na obnovenie hesla. Skontroluj si e-mail (aj priečinok so spamom).',
    racunUstvarjen:
      'Účet je vytvorený. Na e-mail sme ti poslali potvrdzovací odkaz — otvor ho a vráť sa.',
    prijavljenKot: 'Si prihlásený ako {email}.',
    zGooglom: 'Pokračovať cez Google',
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
    naslov: 'Pripomienky',
    napakaNalaganja: 'Nastavenia sa nepodarilo načítať.',
    napakaShranjevanja: 'Uloženie sa nepodarilo. Skús to znova.',
    nalagam: 'Načítava sa …',
    moraPrijava: 'Ak chceš upravovať pripomienky, musíš sa <prijava>prihlásiť</prijava>.',
    opis: 'Pred uzávierkou kola ti pošleme krátku správu na {email}, aby si nezabudol upraviť svoj tím.',
    posiljaj: 'Posielať mi pripomienky e-mailom',
    shranjujem: 'Ukladá sa …',
    vklopljeni: 'Pripomienky sú zapnuté.',
    izklopljeni: 'Pripomienky ti už nebudeme posielať.',
  },
  // Súkromie a podmienky. <b> je tučné písmo, ostatné značky sú odkazy.
  pravno: {
    naslov: 'Súkromie a podmienky',
    zadnjaSprememba: 'Posledná zmena: 28. augusta 2026',
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
    neHranimo:
      'Neuchovávame adresu, telefónne číslo ani platobné údaje. Nepoužívame sledovacie cookies ani reklamné nástroje. V prehliadači je uložená tvoja prihlasovacia relácia a identifikátor konverzácie v chate podpory, ak ho otvoríš.',
    dostopNaslov: 'Kto má k údajom prístup',
    dostop:
      'Údaje spracúvajú dvaja poskytovatelia: <b>Supabase</b> (databáza a prihlásenie, servery v EÚ) a <b>Vercel</b> (hosting stránky). Potvrdzovacie e-maily a e-maily na obnovenie hesla sa odosielajú cez <b>Resend</b>. Chat podpory v pravom dolnom rohu beží cez <b>HelpStack</b>: odovzdáva sa tam to, čo doň napíšeš, a — ak si prihlásený — tvoje zobrazované meno, aby sme vedeli, komu odpovedáme. Tvoj e-mail mu neposkytujeme. Nikomu inému údaje neposkytujeme a nepredávame ich.',
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
      'Kedykoľvek môžeš požiadať o vymazanie účtu a všetkých svojich údajov alebo o opravu zobrazovaného mena. Napíš nám na <eposta>info@slff.eu</eposta> a vybavíme to. Pri vymazaní zmizne z rebríčka aj tvoj tím.',
    pravilaNaslov: 'Pravidlá hry',
    pravila:
      'Jeden človek, jeden účet. Hlasovanie o asistenciách a pozíciách slúži na skutočné opravy — úmyselne nesprávne hlasovanie kazí hru všetkým a môže viesť k odstráneniu účtu. Bodovanie a ceny sa môžu počas sezóny zmeniť, ak sa ukáže, že niečo je nespravodlivé; takéto zmeny zverejníme.',
    jamstvoNaslov: 'Bez záruky',
    jamstvo:
      'Stránka funguje tak, ako funguje. Snažíme sa, aby boli údaje správne a aby bola stránka dostupná, zaručiť to však nemôžeme — zápisy o stretnutí môžu meškať a štatistiky môžu obsahovať chyby.',
  },
}
