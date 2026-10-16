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
    push: 'Push oznámení',
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
  nastavitve: {
    naslov: 'Nastavení účtu',
    moraPrijava: 'Pokud chceš upravovat účet, musíš se <prijava>přihlásit</prijava>.',
    nalagam: 'Načítám …',
    napakaNalaganja: 'Nastavení se nepodařilo načíst.',
    shranjujem: 'Ukládám …',
    shranjeno: 'Uloženo.',
    napakaShranjevanja: 'Uložení se nepodařilo. Zkus to znovu.',
    profilNaslov: 'Profil',
    mojProfil: 'Zobrazit svůj veřejný profil',
    prikaznoIme: 'Zobrazované jméno',
    imeOpis: 'Ostatní ho vidí v žebříčcích. Od 3 do 24 znaků, změnit ho můžeš jednou za 7 dní.',
    imeNaslednjic: 'Jméno můžeš znovu změnit {datum}.',
    shraniIme: 'Uložit jméno',
    avatar: 'Avatar',
    avatarOpis: 'Vyber si barvu a iniciály, nebo fotbalovou ikonu.',
    barva: 'Barva',
    barvaN: 'Barva {n}',
    slika: 'Obrázek',
    zacetnice: 'Iniciály',
    ikone: {
      zoga: 'Míč',
      gol: 'Branka',
      pokal: 'Pohár',
      copat: 'Kopačka',
      rokavice: 'Brankářské rukavice',
      dres: 'Dres',
      zastavica: 'Rohový praporek',
      navijac: 'Fanoušek',
    },
    klubNaslov: 'Klub, kterému fandíš',
    klubOpis: 'Zobrazí se na tvém profilu a tvoje body se započítají mezi fanoušky klubu.',
    klubIsci: 'Najdi klub …',
    klubNiZadetkov: 'Žádný klub jsme nenašli.',
    klubBrez: 'Klub sis ještě nevybral.',
    klubOdstrani: 'Odebrat klub',
    jezikNaslov: 'Jazyk a země',
    jezikOpis: 'Jazyk stránky a země, jejíž soutěže vidíš. Volba platí v tomto prohlížeči.',
    obvestilaNaslov: 'Oznámení',
    zasebnostNaslov: 'Soukromí',
    javniProfil: 'Veřejný profil',
    javniProfilOpis: 'Ostatní na tvém profilu vidí tvoje týmy, klub a úspěchy. Vypnutý profil ukáže jen zobrazované jméno.',
    prijavaNaslov: 'Přihlášení a heslo',
    prijavljenZ: 'Jsi přihlášený e-mailem {email}.',
    geslo: 'Změnit heslo',
    gesloOpis: 'Na e-mail ti pošleme odkaz, přes který si nastavíš nové heslo.',
    gesloPoslano: 'Odkaz jsme poslali na {email}. Zkontroluj e-mail (i složku se spamem).',
    gesloNapaka: 'Odkaz se nepodařilo odeslat. Zkus to znovu za pár minut.',
    eposta: 'Pokud chceš změnit e-mailovou adresu, napiš nám na <eposta>info@slff.eu</eposta>.',
    // Napake prikaznega imena (koda iz baze, `hint`).
    napake: {
      dolzina: 'Zobrazované jméno musí mít od 3 do 24 znaků.',
      znaki: 'Zobrazované jméno obsahuje nepovolené znaky.',
      rezervirano: 'Toto jméno je vyhrazené pro tým SLFF. Vyber jiné.',
      neprimerno: 'Toto jméno není vhodné. Vyber jiné.',
      prepogosto: 'Zobrazované jméno můžeš změnit jednou za 7 dní.',
      zasedeno: 'Toto zobrazované jméno už je obsazené.',
    },
  },
  // Javna stran profila (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Tento profil neexistuje. Účet byl možná smazán.',
    nazaj: 'Na žebříček',
    zaseben: 'Tento profil je soukromý.',
    tvojZaseben: 'Tvůj profil je soukromý: ostatní vidí jen zobrazované jméno.',
    uredi: 'Upravit profil',
    clanOd: 'Členem od {datum}',
    navija: 'Fandí',
    ekipe: 'Týmy',
    brezEkip: 'V aktivních soutěžích zatím nemá tým.',
    mesto: '{mesto}. místo z {ekip}',
    miniLige: 'Společné miniligy',
    dosezki: 'Úspěchy',
    sezone: 'Sezóny',
    krogi: 'Odehraná kola',
    najboljsiKrog: 'Nejlepší kolo',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Smazání účtu',
    moraPrijava: 'Pro smazání účtu se musíš <prijava>přihlásit</prijava>.',
    opis: 'Smažeme účet {email}: profil, všechny tvoje týmy s historií bodů, hlasy a miniligy, které jsi vytvořil. Smazání nejde vrátit zpět. Smazáním účtu skončí i odznak ověřeného hráče a předplatné se zastaví bez vrácení peněz.',
    gumb: 'Smazat účet',
    potrdi: 'Ano, smazat navždy',
    preklici: 'Zrušit',
    brisem: 'Mažu …',
    napaka: 'Účet se nepodařilo smazat: {napaka}',
  },
  // Zasebnost in pogoji. <b> je krepko, ostale oznake so povezave.
  pravno: {
    naslov: 'Soukromí a podmínky',
    zadnjaSprememba: 'Poslední změna: 12. října 2026',
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
      'Neuchováváme telefonní číslo ani údaje platební karty; adresu jen tehdy, když si objednáš tištěný odznak (viz níže). Nepoužíváme sledovací cookies ani reklamní nástroje. V prohlížeči je uložená tvoje přihlašovací relace, identifikátor konverzace v chatu podpory (pokud ho otevřeš) a značky relace, díky kterým návštěvu stránky počítáme jen jednou. Kolik lidí otevřelo kterou stránku, uchováváme jen jako denní součet, bez tvého jména, účtu, zařízení nebo IP adresy. Obecnou statistiku návštěvnosti (které stránky, odkud návštěvníci přicházejí, typ zařízení a země, několik akcí, jako je sestavení týmu) zaznamenává <b>Umami</b> na našem serveru: bez cookies, IP adresu neukládá a návštěvu nespojuje s tvým účtem. Pokud má prohlížeč zapnutou možnost „Nesledovat“, nezaznamenává se nic.',
    dostopNaslov: 'Kdo má k údajům přístup',
    dostop:
      'Údaje jsou uložené na našem serveru u poskytovatele <b>Hetzner</b> (Německo, EU), provoz k němu jde přes <b>Cloudflare</b> (ochrana a doručování stránky). Potvrzovací e-maily a e-maily pro obnovení hesla se odesílají z našeho poštovního serveru (také Hetzner), oznámení v mobilní aplikaci přes <b>Google Firebase Cloud Messaging</b> (jen token zařízení a text oznámení). Chat podpory v pravém dolním rohu běží přes <b>HelpStack</b>: předává se tam to, co do něj napíšeš, a pokud jsi přihlášený, také tvoje zobrazované jméno, abychom věděli, komu odpovídáme. Když ti asistent v chatu pomáhá, může se podívat i na to, na které stránce a v které lize jsi a jestli je tvůj tým platný. Tvůj e-mail mu nepředáváme. Nikomu jinému údaje nepředáváme a neprodáváme je.',
    statistikaNaslov: 'Údaje o fotbalistech',
    statistika:
      'U fotbalistů soutěží, které pokrýváme, zobrazujeme jméno, klub, číslo dresu, starty, minuty, góly a karty. Zdrojem jsou veřejně zveřejněné oficiální zápisy o utkání svazu uvedeného v patičce stránky. Pozice a asistence, které zápis neobsahuje, určuje komunita hlasováním, a proto můžou být nesprávné. Z toho počítáme body a cenu hráče ve hře. Pokud je něco špatně, klikni na hráče a dej nám vědět.',
    statistikaPodlaga:
      'Účelem je bezplatná fantasy hra pro fanoušky. Právním základem je oprávněný zájem (čl. 6 odst. 1 písm. f GDPR): umožnit fanouškům hru se zveřejněnými výsledky jejich soutěže. Údaje zobrazujeme, dokud hráč nastupuje v soutěži, kterou pokrýváme. V rakouských soutěžích, stejně jako ÖFB, jméno hráče skryjeme 18 měsíců po jeho posledním startu.',
    statistikaUgovor:
      'Hráč může proti zpracování vznést námitku nebo žádat výmaz: napiš na <eposta>info@slff.eu</eposta> a přidej odkaz na stránku hráče. Do 14 dnů jeho jméno nahradíme neutrálním označením ve všech našich soutěžích dané země, kde ho najdeme, i při pozdějších importech. Statistiky zůstanou bez jména. Totéž uděláme na žádost svazu.',
    grbi:
      'Znaky klubů jsou majetkem jednotlivých klubů a zobrazují se výhradně pro identifikaci týmu. Klub, který si to nepřeje, nám může napsat a znak odstraníme.',
    fotografijeNaslov: 'Fotografie',
    fotografije:
      'Fotografie na titulní stránce je dílem Abigail Keenan a je zveřejněná na <unsplash>Unsplash</unsplash> pod jejich licencí, která umožňuje volné použití. Nezobrazuje hráče našich lig.',
    praviceNaslov: 'Tvoje práva',
    pravice:
      'Účet a všechny své údaje můžeš kdykoli smazat sám: v menu účtu zvol <b>Smazání účtu</b> (slff.eu/account). Pokud chceš opravit zobrazované jméno nebo se smazání nepovede, napiš nám na <eposta>info@slff.eu</eposta>. Při smazání zmizí z žebříčku i tvůj tým. Záznam o nákupu odznaku ověřeného hráče zůstává 10 let, jak to vyžadují účetní předpisy, a doručovací adresa podle pravidla výše.',
    pravilaNaslov: 'Pravidla hry',
    pravila:
      'Jeden člověk, jeden účet. Hlasování o asistencích a pozicích slouží ke skutečným opravám. Úmyslně nesprávné hlasování kazí hru všem a může vést ke zrušení účtu. Bodování a ceny se můžou během sezóny změnit, pokud se ukáže, že je něco nespravedlivé; takové změny zveřejníme.',
    jamstvoNaslov: 'Bez záruky',
    jamstvo:
      'Stránka funguje tak, jak funguje. Snažíme se, aby údaje byly správné a stránka dostupná, zaručit to ale nemůžeme: zápisy o utkání se můžou zpožďovat a statistiky můžou obsahovat chyby. To platí pro bezplatnou hru. Pro placené služby platí podmínky v části Placené služby a tvoje zákonná práva spotřebitele.',
    kajJePlacljivo:
      'Jediná placená věc je nepovinný odznak ověřeného hráče (viz Placené služby níže).',
    podatkiPlacilo:
      '<b>Nákup odznaku ověřeného hráče (jen pokud ho koupíš).</b> Záznam o nákupu (co, kdy, částka a označení zákazníka u Stripe) uchováváme 10 let, jak to vyžadují účetní předpisy. Doručovací adresu tištěného odznaku uchováváme 90 dní po odeslání nebo zrušení objednávky a nejdéle 12 měsíců od objednávky, potom zůstane jen země.',
    dostopStripe:
      'Platby za odznak ověřeného hráče zpracovává <b>Stripe</b> (Stripe Payments Europe, Irsko): dostane tvoje jméno, e-mail, fakturační adresu a u tištěného odznaku doručovací adresu. Údaje karty zadáváš přímo u Stripe, my je nevidíme.',
    placljivoNaslov:
      'Placené služby: ověření hráči',
    placljivoUvod:
      'Hra je a zůstane zdarma. Placený je jen nepovinný odznak ověřeného hráče, který si může koupit hráč, jenž potvrdil, že profil je jeho. Odznak nikdy neovlivňuje body, ceny, fantasy týmy ani pravidla hry. Tyto podmínky platí pro tento nákup.',
    prodajalec:
      '<b>Prodávající:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovinsko, zapsaná v obchodním rejstříku u Okresního soudu v Lublani. Identifikační číslo 9850538000, DIČ SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Co kupuješ.</b> Modrou fajfku u jména hráče a doplňky profilu (delší popis, odkazy, banner, barva, zvýrazněný zápas nebo statistika, vzkaz fanouškům). Roční předplatné stojí 9,99 € a každý rok se automaticky obnoví. Nákup navždy stojí 29 € jednorázově a platí, dokud SLFF tuto službu nabízí. K nákupu navždy můžeš přidat tištěný odznak se jménem za 5 € a poštovné 2 € (Slovinsko) nebo 4 € (jiná země EU). Posíláme jen do zemí EU, doručení obvykle trvá 2 až 3 týdny. Všechny ceny jsou včetně DPH.',
    placilo:
      '<b>Platba.</b> Platbu zpracovává Stripe. Údaje karty nevidíme a neuchováváme. Koupit můžeš, jen pokud ti je aspoň 18 let. Smlouva je uzavřena, když Stripe platbu potvrdí.',
    odpoved:
      '<b>Zrušení předplatného.</b> Předplatné můžeš kdykoli zrušit tlačítkem Spravovat předplatné na stránce účtu (slff.eu/account) nebo na profilu hráče. Zrušení platí na konci zaplaceného roku; do té doby odznak zůstane. Za už započatý rok peníze nevracíme, kromě případů níže.',
    odstop:
      '<b>Právo na odstoupení.</b> Digitální obsah (fajfka a doplňky) se poskytne hned po zaplacení. Před platbou výslovně souhlasíš s okamžitým poskytnutím a potvrzuješ, že tím ztrácíš právo odstoupit od smlouvy do 14 dnů (čl. 16 písm. m) směrnice 2011/83/EU, slovinský ZVPot-1). Tištěný odznak se vyrábí podle tvých pokynů (jméno na odznaku), proto u něj právo na odstoupení není (čl. 16 písm. c)). Zákonná práva z vadného plnění zůstávají: pokud odznak přijde poškozený, špatný nebo nepřijde vůbec, napiš nám a zdarma ho vyměníme nebo ti vrátíme peníze.',
    konec:
      '<b>Kdy odznak končí.</b> Odznak končí, pokud se ukáže, že profil není tvůj a potvrzení zrušíme, pokud jméno hráče na jeho žádost nebo žádost svazu skryjeme, nebo pokud smažeš účet. Předplatné se tehdy automaticky zastaví a už se neúčtuje. Pokud platbu napadneš u banky (chargeback), odznak se odebere.',
    vracila:
      '<b>Vrácení peněz.</b> Při zneužití nebo nepravdivém potvrzení profilu peníze nevracíme. Pokud odznak skončí naší chybou, na žádost svazu nebo proto, že službu zrušíme, u ročního předplatného vrátíme poměrnou část za nevyužité měsíce. U nákupu navždy vrátíme celou částku v prvních 12 měsících od nákupu, později poměrnou část zbytku do 5 let od nákupu. Tištěný odznak a poštovné při zrušení služby nevracíme (odznak zůstane tvůj), jen při vadě.',
    pritozbe:
      '<b>Dotazy a reklamace.</b> Napiš na <eposta>info@slff.eu</eposta>, odpovíme do 8 pracovních dnů. Neuznáváme žádný subjekt mimosoudního řešení spotřebitelských sporů. Platí slovinské právo; tím nepřicházíš o ochranu, kterou ti dává právo země, kde žiješ.',
  },
  klubskiRacun: {
    naslov: 'Oficiální účet klubu',
    aktiven: 'Tento účet zastupuje klub {klub}.',
    pravice: 'Jako klub můžeš upravovat pozice, přidávat hráče a potvrzovat profily svých hráčů.',
    vprasanje: 'Zastupuješ klub?',
    pojasnilo: 'Pokud se přihlásíš oficiální adresou klubu, kterou máme, dostaneš klubový účet automaticky. Pokud ji nemáme, požádej níže a ověříme ji.',
    klub: 'Klub',
    isciKlub: 'Hledat klub …',
    vloga: 'Tvoje role v klubu',
    vloge: {
      predsednik: 'předseda',
      tajnik: 'sekretář',
      trener: 'trenér',
      vodstvo: 'vedení klubu',
      drugo: 'jiné',
    },
    dokaz: 'Odkaz, kde je adresa zveřejněna (web, Facebook, svaz)',
    opomba: 'Poznámka (nepovinné)',
    naslovRacuna: 'Adresa, kterou ověřujeme: {email}',
    poslji: 'Odeslat žádost',
    caka: 'Žádost za {klub} čeká na posouzení.',
    cakaBrezKluba: 'Tvoje adresa je mezi oficiálními, ale ještě ji musíme propojit s klubem. Vyřídíme to brzy.',
    cakaPolno: 'Klub už má 5 účtů. Podíváme se na to a dáme ti vědět.',
    zavrnjeno: 'Žádost byla zamítnuta: {razlog}',
    nepotrjen: 'Nejdřív potvrď e-mail svého účtu.',
    napake: {
      zeKlub: 'Už zastupuješ klub.',
      caka: 'Tvoje žádost už čeká na rozhodnutí.',
    },
  },
}
