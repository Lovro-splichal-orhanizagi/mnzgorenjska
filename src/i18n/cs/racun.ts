// Český překlad oblasti `racun` (zdroj: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  // Stran Prijava: prijava, registracija, pozabljeno geslo.
  prijava: {
    naslovPrijava: 'Přihlášení',
    naslovRegistracija: 'Registrace',
    naslovPozabljeno: 'Zapomenuté heslo',
    googleNiNaVoljo: 'Přihlášení přes Google teď není k dispozici. Použij e-mail.',
    appleNiNaVoljo: 'Přihlášení přes Apple teď není k dispozici. Použij e-mail.',
    poslanaPonastavitev:
      'Poslali jsme ti odkaz pro obnovení hesla. Zkontroluj e-mail (i složku se spamem).',
    racunUstvarjen:
      'Účet je vytvořený. Na e-mail jsme ti poslali potvrzovací odkaz. Otevři ho a vrať se sem.',
    prijavljenKot: 'Jsi přihlášený jako {email}.',
    zGooglom: 'Pokračovat přes Google',
    zApplom: 'Pokračovat přes Apple',
    aliZEposto: 'nebo přes e-mail',
    prikaznoIme: 'Zobrazované jméno',
    eposta: 'E-mail',
    geslo: 'Heslo',
    posiljam: 'Odesílám …',
    ustvariRacun: 'Vytvořit účet',
    posljiPovezavo: 'Poslat odkaz',
    gumbPrijava: 'Přihlásit se',
    zeImasRacun: 'Už máš účet? Přihlas se',
    nimasRacuna: 'Nemáš účet? Zaregistruj se',
    pozabljenoGeslo: 'Zapomenuté heslo?',
    nazajNaPrijavo: '← Zpět na přihlášení',
  },
  // Napake Supabase Auth, prevedene v lib/prijava.
  napake: {
    napacnaPrijava: 'Nesprávná e-mailová adresa nebo heslo.',
    niPotrjen: 'E-mailová adresa ještě není potvrzená. Klikni na odkaz ve zprávě, kterou jsme ti poslali.',
    zeRegistriran: 'Tato e-mailová adresa je už zaregistrovaná. Přihlas se, nebo si obnov heslo.',
    prevecPoskusov: 'Příliš mnoho pokusů. Počkej pár minut a zkus to znovu.',
    sibkoGeslo: 'Heslo je příliš slabé. Použij aspoň 6 znaků, nejlépe kombinaci písmen a číslic.',
    istoGeslo: 'Nové heslo se musí lišit od starého.',
    neveljavenNaslov: 'E-mailová adresa není platná.',
  },
  novoGeslo: {
    naslov: 'Nové heslo',
    gesliSeNeUjemata: 'Hesla se neshodují.',
    preverjam: 'Ověřuji odkaz …',
    neveljavna:
      'Odkaz není platný nebo vypršela jeho platnost. Na stránce <prijava>přihlášení</prijava> si znovu vyžádej obnovení hesla.',
    novoGeslo: 'Nové heslo',
    ponovi: 'Zopakuj heslo',
    shranjujem: 'Ukládám …',
    shrani: 'Uložit heslo',
  },
  opomniki: {
    naslov: 'Oznámení',
    napakaNalaganja: 'Nastavení se nepodařilo načíst.',
    napakaShranjevanja: 'Uložení se nepodařilo. Zkus to znovu.',
    nalagam: 'Načítám …',
    moraPrijava: 'Pokud chceš upravovat připomínky, musíš se <prijava>přihlásit</prijava>.',
    opis: 'Před uzávěrkou kola ti pošleme krátkou zprávu na {email}, abys nezapomněl upravit svůj tým.',
    posiljaj: 'Připomínky e-mailem',
    shranjujem: 'Ukládám …',
    vklopljeni: 'Připomínky jsou zapnuté.',
    izklopljeni: 'Připomínky ti už posílat nebudeme.',
    odjavaVprasanje: 'Nechceš už dostávat e-maily od SLFF (připomínky před uzávěrkou a oznámení o týmu)?',
    odjavaGumb: 'Odhlásit mě',
    odjavaNapaka: 'Odkaz není platný. Přihlas se a vypni připomínky v nastavení.',
    push: 'Push oznámení (mobilní aplikace)',
    pushOpis: 'Den před uzávěrkou ti telefon připomene, pokud tým ještě není připravený.',
    pushVklopljena: 'Push oznámení jsou zapnutá.',
    pushIzklopljena: 'Push oznámení ti už posílat nebudeme.',
    pushZavrnjeno: 'Oznámení jsou v telefonu vypnutá. Zapni je v Nastavení → SLFF → Oznámení.',
    pushDovoli: 'Povolit oznámení',
    povezava: 'Nastavení oznámení',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Ověřuji …',
    preverjam: 'Ověřuji odkaz …',
    neveljavna: 'Odkaz už není platný nebo už byl použitý. <prijava>Přihlas se</prijava>, nebo si vyžádej nový.',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Smazání účtu',
    moraPrijava: 'Pro smazání účtu se musíš <prijava>přihlásit</prijava>.',
    opis: 'Smažeme účet {email}: profil, všechny tvoje týmy s historií bodů, hlasy a miniligy, které jsi vytvořil. Smazání nejde vrátit zpět.',
    gumb: 'Smazat účet',
    potrdi: 'Ano, smazat navždy',
    preklici: 'Zrušit',
    brisem: 'Mažu …',
    napaka: 'Účet se nepodařilo smazat: {napaka}',
  },
  // Zasebnost in pogoji. <b> je krepko, ostale oznake so povezave.
  pravno: {
    naslov: 'Soukromí a podmínky',
    zadnjaSprememba: 'Poslední změna: 2. října 2026',
    kajJeNaslov: 'Co je SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) je fanouškovská fantasy liga pro amatérské fotbalové soutěže. Provozujeme ji amatérsky a není propojená s Fotbalovou asociací České republiky (FAČR), krajskými ani okresními fotbalovými svazy, ani s kluby. Hra je zdarma, bez peněžních vkladů a bez výher.',
    podatkiNaslov: 'Jaké údaje uchováváme',
    podatkiEposta:
      '<b>E-mailová adresa a heslo.</b> Potřebujeme je k přihlášení. Heslo je uložené v zašifrované podobě a nevidíme ho.',
    podatkiIme:
      '<b>Zobrazované jméno a název týmu.</b> Jsou vidět v žebříčku. Pokud nechceš uvádět své jméno, použij přezdívku.',
    podatkiEkipa:
      '<b>Tvůj tým a hlasy.</b> Složení soupisky, kapitán, přestupy a hlasy o asistencích nebo pozicích.',
    podatkiNaprava:
      '<b>Token zařízení pro oznámení.</b> Pokud v mobilní aplikaci povolíš oznámení, uložíme token, přes který ti pošleme připomínku před uzávěrkou kola. Při odhlášení ho smažeme.',
    neHranimo:
      'Neuchováváme adresu, telefonní číslo ani platební údaje. Nepoužíváme sledovací cookies ani reklamní nástroje. V prohlížeči je uložená tvoje přihlašovací relace, identifikátor konverzace v chatu podpory (pokud ho otevřeš) a značky relace, díky kterým návštěvu stránky počítáme jen jednou. Kolik lidí otevřelo kterou stránku, uchováváme jen jako denní součet, bez tvého jména, účtu, zařízení nebo IP adresy. Obecnou statistiku návštěvnosti (které stránky, odkud návštěvníci přicházejí, typ zařízení a země, několik akcí, jako je sestavení týmu) zaznamenává <b>Umami</b> na našem serveru: bez cookies, IP adresu neukládá a návštěvu nespojuje s tvým účtem. Pokud má prohlížeč zapnutou možnost „Nesledovat“, nezaznamenává se nic.',
    dostopNaslov: 'Kdo má k údajům přístup',
    dostop:
      'Údaje jsou uložené na našem serveru u poskytovatele <b>Hetzner</b> (Německo, EU), provoz k němu jde přes <b>Cloudflare</b> (ochrana a doručování stránky). Potvrzovací e-maily a e-maily pro obnovení hesla se odesílají z našeho poštovního serveru (také Hetzner), oznámení v mobilní aplikaci přes <b>Google Firebase Cloud Messaging</b> (jen token zařízení a text oznámení). Chat podpory v pravém dolním rohu běží přes <b>HelpStack</b>: předává se tam to, co do něj napíšeš, a pokud jsi přihlášený, také tvoje zobrazované jméno, abychom věděli, komu odpovídáme. Když ti asistent v chatu pomáhá, může se podívat i na to, na které stránce a v které lize jsi a jestli je tvůj tým platný. Tvůj e-mail mu nepředáváme. Nikomu jinému údaje nepředáváme a neprodáváme je.',
    statistikaNaslov: 'Statistiky hráčů',
    statistika:
      'Údaje o fotbalistech (starty, góly, karty) jsou převzaté z veřejně zveřejněných zápisů o utkání; zdroj pro vybranou ligu je uvedený v patičce stránky. Pozice a asistence, které zápis o utkání neobsahuje, určuje komunita hlasováním, a proto můžou být nesprávné. Pokud je něco špatně, klikni na hráče a dej nám vědět.',
    grbi:
      'Znaky klubů jsou majetkem jednotlivých klubů a zobrazují se výhradně pro identifikaci týmu. Klub, který si to nepřeje, nám může napsat a znak odstraníme.',
    fotografijeNaslov: 'Fotografie',
    fotografije:
      'Fotografie na titulní stránce je dílem Abigail Keenan a je zveřejněná na <unsplash>Unsplash</unsplash> pod jejich licencí, která umožňuje volné použití. Nezobrazuje hráče našich lig.',
    praviceNaslov: 'Tvoje práva',
    pravice:
      'Účet a všechny své údaje můžeš kdykoli smazat sám: v menu účtu zvol <b>Smazání účtu</b> (slff.eu/account). Pokud chceš opravit zobrazované jméno nebo se smazání nepovede, napiš nám na <eposta>info@slff.eu</eposta>. Při smazání zmizí z žebříčku i tvůj tým.',
    pravilaNaslov: 'Pravidla hry',
    pravila:
      'Jeden člověk, jeden účet. Hlasování o asistencích a pozicích slouží ke skutečným opravám. Úmyslně nesprávné hlasování kazí hru všem a může vést ke zrušení účtu. Bodování a ceny se můžou během sezóny změnit, pokud se ukáže, že je něco nespravedlivé; takové změny zveřejníme.',
    jamstvoNaslov: 'Bez záruky',
    jamstvo:
      'Stránka funguje tak, jak funguje. Snažíme se, aby údaje byly správné a stránka dostupná, zaručit to ale nemůžeme: zápisy o utkání se můžou zpožďovat a statistiky můžou obsahovat chyby.',
  },
}
