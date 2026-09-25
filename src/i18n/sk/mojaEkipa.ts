// Slovenský preklad oblasti `mojaEkipa` (zdroj: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Môj tím',
  igralec: 'Hráč',
  vprasanjeZapustitve: 'Máš neuložené zmeny v tíme. Naozaj chceš odísť zo stránky?',
  oznaka: {
    kapetan: 'K',
    namestnik: 'Z',
  },

  pravila: {
    pozicije: {
      GK: 'Brankári',
      DEF: 'Obrancovia',
      MID: 'Záložníci',
      FWD: 'Útočníci',
    },
    kaderPoln: 'Káder je plný ({n} hráčov).',
    pozicijaPolna: '{pozicija}: v kádri ich už máš {n}.',
    premaloProracuna: 'Málo peňazí v rozpočte — hráč stojí {cena}, k dispozícii máš {preostalo}.',
    izKluba: 'Z klubu {klub} už máš {n} hráčov.',
    velikostEkipe: 'Tím musí mať {n} hráčov (teraz {trenutno}).',
    velikostPostave: 'V základnej zostave musí byť {n} hráčov (teraz {trenutno}).',
    brezPozicije: {
      one: '{n} vybraný hráč ešte nemá potvrdenú pozíciu — pomôž v sekcii Pozície.',
      few: '{n} vybraní hráči ešte nemajú potvrdenú pozíciu — pomôž v sekcii Pozície.',
      many: '{n} vybraného hráča ešte nemá potvrdenú pozíciu — pomôž v sekcii Pozície.',
      other: '{n} vybraných hráčov ešte nemá potvrdenú pozíciu — pomôž v sekcii Pozície.',
    },
    niVecVLigi: '{ime} už nie je v lige — vymeň ho.',
    pozicijaVKadru: '{pozicija} v kádri: {n} — musí ich byť {kader}.',
    pozicijaVPostavi: '{pozicija} v základnej zostave: {n} — povolené {min}–{max}.',
    dolociKapetana: 'Vyber kapitána — v kole prinesie {n}-násobok bodov.',
    enKapetan: 'Kapitán môže byť len jeden.',
    dolociNamestnika: 'Vyber zástupcu kapitána, ktorý prevezme pásku, ak kapitán nehrá.',
    istiKlub: 'Z jedného klubu môžeš mať najviac {n} hráčov.',
    presegelProracun: 'Prekročil si rozpočet o {cena}.',
  },

  napake: {
    zeImas: 'V tejto lige už tím máš — načítaj stránku znova.',
    dovoljenje: 'Na toto nemáš oprávnenie. Prihlás sa znova a skús to ešte raz.',
    povezava: 'Nie je spojenie so serverom. Skontroluj internet a skús to znova.',
    shranjevanje: 'Uloženie sa nepodarilo. Skús to znova.',
    nalaganjePovezava: 'Nie je spojenie so serverom — skontroluj internet.',
    nalaganje: 'Údaje o tíme sa nepodarilo načítať.',
    nalaganjeNiCelo:
      'Kým sa tím nenačíta celý, nedá sa uložiť — inak by uloženie vymazalo hráčov, ktorí sa nenačítali.',
    poskusiZnova: 'Skúsiť znova',
    vpisiIme: 'Najprv zadaj názov tímu.',
    osvezitev:
      'Tím je uložený, ale obnovenie sa nepodarilo — načítaj stránku znova, než ho začneš znova upravovať.',
    najprejShrani: 'Najprv ulož tím.',
    izberiKrog: 'Vyber kolo, v ktorom má bonus platiť.',
    prihodnjiKrog: 'Vyber budúce, ešte neuzamknuté kolo so stanovenou uzávierkou.',
    zeUporabil: 'Tento bonus si už v tejto sezóne použil.',
    niPreklica: 'Bonus pre toto kolo sa už nedá zrušiť.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'V tejto lige ešte nie sú na trhu žiadni hráči.',
    pocakaj: 'Počkaj, kým sa uloženie dokončí.',
    niPredloga: 'Z tejto ligy sa zatiaľ nedá zostaviť platný tím.',
    predlogSestavljen: 'Tím je zostavený — vymeň, koho chceš, a stlač Uložiť.',
    kaderDopolnjen: 'Chýbajúce miesta sú doplnené — skontroluj a stlač Uložiť.',
    niDopolnitve:
      'Káder sa nedá doplniť z peňazí, ktoré ti zostali. Vymeň niektorého z drahých hráčov a skús to znova.',
    kapetanNaKlop: '{ime} išiel na lavičku — vyber nového kapitána.',
    namestnikNaKlop: '{ime} išiel na lavičku — vyber nového zástupcu kapitána.',
    brezPozicije: 'Hráč ešte nemá potvrdenú pozíciu, preto ho nemôžeš postaviť na ihrisko.',
    niProstora:
      'V zostave nie je miesto pre ďalšieho hráča na tejto pozícii — najprv niekoho pošli na lavičku.',
    niVecNamestnik: '{ime} už nie je zástupca kapitána — vyber nového.',
    niVecKapetan: '{ime} už nie je kapitán — vyber nového.',
    rokPotekel: 'Uzávierka {krog}. kola už uplynula, zmeny preto platia od nasledujúceho kola.',
    shranjenaZaKrog: 'Tím je uložený a pripravený na {krog}. kolo.',
    shranjenaVeljavna: 'Tím je uložený a spĺňa pravidlá.',
    osnutekShranjen:
      'Koncept uložený — tím ešte nespĺňa pravidlá, takže by v tomto kole nezískal body.',
    prodaja: 'Predaj ti priniesol +{cena}.',
    nakupi: 'Nákupy stáli {cena}.',
    wildcardVlozen: 'Wildcard je aktivovaný — prestupy v tomto kole sú zadarmo.',
    klopPlusVlozen: 'Lavička+ je aktivovaná.',
    wildcardPreklican: 'Wildcard je zrušený — môžeš ho použiť v inom kole.',
    klopPlusPreklican: 'Lavička+ je zrušená — môžeš ju použiť v inom kole.',
    zapriOpozorilo: 'Zavrieť upozornenie',
    zapriObvestilo: 'Zavrieť oznámenie',
    odstranjen: '{ime} je odstránený.',
    razveljavi: 'Vrátiť späť',
  },

  prijavaPotrebna: 'Ak si chceš zostaviť tím, musíš sa prihlásiť.',
  prijava: 'Prihlásenie',
  locenaLiga:
    'Tím v lige <liga>{liga}</liga> je oddelený od tímov v iných ligách — má vlastný rozpočet a vlastnú tabuľku. Body sa počítajú od {krog}. kola, lebo dovtedy ešte prebiehajú prestupy a presuny medzi kategóriami.',

  prestopi: {
    stevec: 'Prestupy: {n}/{prosti}',
    wildcard: 'wildcard — bez trestu',
    odbitek: 'mínus {tock} v tomto kole',
    prosti: {
      one: 'ešte {n} bezplatný, potom −{kazen} za každý ďalší',
      few: 'ešte {n} bezplatné, potom −{kazen} za každý ďalší',
      many: 'ešte {n} bezplatného, potom −{kazen} za každý ďalší',
      other: 'ešte {n} bezplatných, potom −{kazen} za každý ďalší',
    },
  },

  neustreza: {
    naslov: 'Tvoj tím NESPĹŇA pravidlá',
    zaKrog: '<krepko>Za {krog}. kolo</krepko> v tomto stave <krepko>NEZÍSKAŠ body</krepko>.',
    zaKrogRok:
      '<krepko>Za {krog}. kolo</krepko> (uzávierka: {rok}) v tomto stave <krepko>NEZÍSKAŠ body</krepko>.',
    konkretne: 'Konkrétne chyby:',
    pogosto:
      'Často sa to stane, keď hlasovanie o pozícii presunie hráča (napr. z útočníka na záložníka) a rozhodí ti káder. Oprav to teraz, kým neuplynie uzávierka.',
  },

  povzetek: {
    naVoljo: 'K dispozícii ešte',
    bogastvo:
      'hodnota <vrednost>{bogastvo}</vrednost><razlika></razlika> · káder {kader} <placano>zaplatené</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Ukladám …',
    shraniEkipo: 'Uložiť tím',
    neshranjeno: 'Neuložené zmeny',
    stevec: '{n}/{igralcev} · zostava {prvi}/{prvih}',
    imeEkipe: 'Názov tímu',
    fiksnoNamig: 'Názov tímu sa po prvom uložení už nedá meniť — je to jednotné označenie v tabuľke aj v histórii.',
    fiksno: '🔒 nemenné',
    primerImena: 'napr. Nedeľní hrdinovia',
    imeNamig: 'Názov sa po prvom uložení už nedá zmeniť.',
  },

  zacetek: {
    naslov: 'Kde začať?',
    sestaviMi: '🎲 Zostav mi tím',
    opisPredloga:
      'Náhodne vyberieme platný tím v rámci rozpočtu — pri každom kliknutí iný. Potom vymeň, koho chceš, a ulož.',
    drugPredlog: '🎲 Iný návrh',
    opisDrugegaPredloga:
      'Nepáči sa ti? Vyžrebuj nový tím — kým ho neuložíš, je to zadarmo.',
    dopolni: '🎲 Doplniť tím',
    opisDopolnitve:
      'Voľné miesta v kádri: {n}. Tvoje voľby zostanú, zvyšné miesta náhodne doplníme v rámci rozpočtu.',
    korak1: 'Zadaj hore názov tímu — bez neho sa uložiť nedá.',
    korak2:
      'Klikni na <krepko>＋</krepko> na prázdnom mieste ihriska. Na mobile je v spodnom paneli ešte tlačidlo <krepko>＋ Pridať</krepko>, na počítači vyberáš z <krepko>trhu hráčov</krepko> vpravo.',
    korak3:
      'Káder má {n} hráčov: {gk} BRA, {def} OBR, {mid} ZÁL, {fwd} ÚTO. Z jedného klubu najviac {klub}.',
    korak4:
      'Keď sú miesta obsadené, vyber <krepko>kapitána</krepko> a <krepko>zástupcu kapitána</krepko>, potom stlač <krepko>Uložiť tím</krepko> (na mobile <krepko>Uložiť</krepko> v spodnom paneli).',
  },

  trak: {
    naslov: 'Kapitánska páska',
    kapetan: 'Kapitán (×{n})',
    namestnik: 'Zástupca kapitána',
    opis: 'Kapitán prináša trojnásobok bodov. Ak nehrá, pásku preberá zástupca kapitána.',
    nihce: '— nikto —',
  },

  kajCe: {
    prinesla: 'Súčasná zostava by v <krog>{krog}. kole</krog> ({sezona}) priniesla',
    opis: 'Prehľad „čo by bolo, keby" — nie je to skutočný výsledok, mení sa pri každej výmene. Skutočné body za odohrané kolá nájdeš v tabuľke a v zázname zostavy.',
  },

  status: {
    pripravljena: 'Tím je pripravený na uloženie.',
    manjka: 'Na finálne uloženie ešte niečo chýba:',
    vpisiIme: 'Zadaj názov tímu (v poli hore).',
    osnutekZdaj: 'Koncept môžeš uložiť aj teraz — pravidlá splníš neskôr.',
    shraniOsnutek: 'Uložiť koncept',
    imeObvezno: 'Názov tímu je povinný — kliknutím sa vrátiš na pole hore.',
    kajPomeni:
      '<krepko>Čo znamená „Uložiť"?</krepko> Tvoje zmeny (káder, zostava, kapitán) sa zapíšu do databázy. Pre aktuálne kolo platí stav v čase uzávierky. Do uzávierky môžeš ľubovoľne meniť a znova stláčať Uložiť — platí posledná verzia. <krepko>„Uložiť koncept"</krepko> znamená to isté, len s poznámkou, že tím ešte nespĺňa všetky pravidlá (aby si získal body, treba to opraviť — pozri zoznam hore).',
    kajPomeniRok:
      '<krepko>Čo znamená „Uložiť"?</krepko> Tvoje zmeny (káder, zostava, kapitán) sa zapíšu do databázy. Pre aktuálne kolo platí stav v čase uzávierky (<krepko>{krog}. kolo — {rok}</krepko>). Do uzávierky môžeš ľubovoľne meniť a znova stláčať Uložiť — platí posledná verzia. <krepko>„Uložiť koncept"</krepko> znamená to isté, len s poznámkou, že tím ešte nespĺňa všetky pravidlá (aby si získal body, treba to opraviť — pozri zoznam hore).',
  },

  pripomocki: {
    klopPlusNaslov: 'Bonus Lavička+',
    klopPlusVlozenZa: 'Aktivovaný na {krog}. kolo ({sezona}) — v ňom sa počítajú aj body z lavičky.',
    klopPlusVlozen: 'Lavička+ je už aktivovaná — v tomto kole sa počítajú aj body z lavičky.',
    klopPlusOpis:
      'Raz za sezónu: vo vybranom kole sa pripočítajú aj body všetkých štyroch náhradníkov.',
    wildcardNaslov: 'Bonus Wildcard',
    wildcardVlozenZa: 'Aktivovaný na {krog}. kolo ({sezona}) — prestupy v ňom sú zadarmo.',
    wildcardVlozen: 'Wildcard je už aktivovaný — prestupy v tomto kole sú zadarmo.',
    wildcardOpis:
      'Raz za sezónu: v tomto kole môžeš vymeniť koľkokoľvek hráčov bez odpočtu bodov.',
    zaklenjen: '🔒 uzamknuté',
    preklici: 'zrušiť',
    prekliciDo: 'Zrušiť môžeš ešte <odstevanje></odstevanje>',
    izberiKrog: 'Vyber kolo …',
    niKroga: 'Žiadne budúce kolo s uzávierkou',
    krogSezona: '{krog}. kolo ({sezona})',
    vlozi: 'Aktivovať',
    vloziZa: 'Aktivovať na {krog}. kolo',
  },

  zgodovina: {
    naslov: 'História zostáv',
    posnetkov: {
      one: '{n} kolo so záznamom',
      few: '{n} kolá so záznamami',
      many: '{n} kola so záznamami',
      other: '{n} kôl so záznamami',
    },
    krog: '{krog}. kolo',
    podrobnost: '{krog}. kolo · sezóna {sezona}',
    podrobnostSkupaj: '{krog}. kolo · sezóna {sezona} · spolu <krepko>{tocke}</krepko>',
    deli: 'Zdieľať {krog}. kolo',
  },

  telefon: {
    ostane: 'zostáva',
    predalPovzetek: 'zostáva <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'opraviť ↑',
    neshranjeno: 'neuložené',
    dodaj: '＋ Pridať',
    osnutekNamig: 'Tím ešte nespĺňa pravidlá — uloží sa ako koncept.',
    neIzpolnjuje: 'tím ešte nespĺňa pravidlá',
    zapriTrg: 'Zavrieť trh',
    zapri: '✕ Zavrieť',
  },

  trg: {
    naslov: 'Trh hráčov',
    iskanje: 'Hľadať podľa mena …',
    pocistiIskanje: 'Vymazať hľadanie',
    vsi: 'všetci',
    vsiKlubi: 'Všetky kluby',
    niZadetkov: 'Nič sa nenašlo.',
    pocistiFiltre: 'Zrušiť filtre',
    statLetos: '{goli} G · {minute} min',
    statLani: 'vlani {goli} G',
    brezNastopov: 'bez štartov',
    niVecVLigi: 'už nie je v lige',
    tockeZadnjiKrog: 'Body v poslednom odohranom kole',
    podatki: 'Údaje o hráčovi {ime}',
    podatkiNamig: 'Štatistiky, vývoj ceny, najbližšie zápasy',
    profilVNovemZavihku: 'Otvoriť profil hráča na novej karte',
    odstrani: '✕ odobrať',
    dodaj: '⊕ pridať',
    prvih: 'Zobrazených prvých {n} — zúž výber hľadaním.',
    noga: 'Z jedného klubu môžeš mať najviac {n} hráčov. Góly a minúty sú z aktuálnej sezóny.',
  },

  rok: {
    krog: '{krog}. kolo',
    potekel: 'Uzávierka uplynula — <krepko>{rok}</krepko>',
    rok: 'Uzávierka: <krepko>{rok}</krepko>',
    niDolocen: 'Uzávierka ešte nie je stanovená.',
    naslednji: 'Zmeny teraz platia pre nasledujúce kolo.',
    obRoku: 'V čase uzávierky sa zostava uloží natrvalo — dovtedy ju môžeš voľne meniť.',
  },

  igrisce: {
    naKlop: 'Presunúť na lavičku',
    vPostavo: 'Zaradiť do základnej zostavy',
    niVecVLigiNamig: 'Hráč už nie je v lige — káder s ním nezíska body.',
    niVecVLigi: 'už nie je v lige',
    poskodba: 'zranenie',
    odsoten: 'chýba',
    kapetan: 'Kapitán — trojnásobok bodov',
    namestnik: 'Zástupca kapitána',
    tockeKroga: 'Body v poslednom kole: {tocke}',
    tockeKrogaKapetan: 'Body v poslednom kole: {tocke} × 3 (kapitán)',
    odstraniIzKadra: 'Odobrať z kádra',
    odstrani: 'Odobrať {ime}',
    prej: 'Skôr na rade pri striedaní',
    prejIme: '{ime}: skôr na rade pri striedaní',
    pozneje: 'Neskôr na rade pri striedaní',
    poznejeIme: '{ime}: neskôr na rade pri striedaní',
    izberi: 'Vybrať: {pozicija}',
    klop: 'Lavička',
    klopOpis:
      'Keď niekto zo zostavy nehrá, nahradí ho prvý z lavičky na rovnakej pozícii — v poradí zľava doprava.',
    brezPozicije: 'Bez potvrdenej pozície — nedajú sa postaviť na ihrisko',
  },

  igrisceTocke: {
    opis: '{ime} — {deli}',
    minut: '{n} min',
    goli: '{n} × gól',
    asistence: '{n} × asistencia',
    brezPrejetega: 'bez inkasovaného gólu',
    prejetih: 'inkasované {n}',
    rumeni: 'žltá karta',
    rdeci: 'červená karta',
    skupaj: 'Body: {tocke}',
    brezPostave: 'Zápis o stretnutí pre tento tím neuvádza zostavu.',
    klop: 'Lavička',
    vstopilo: '— {n} nastúpilo do hry',
  },

  enajsterica: {
    kapetan: 'Kapitán',
    namestnik: 'Zástupca s páskou',
  },

  opozorila: {
    naslov: 'Upozornenia v tvojich tímoch',
    naslovNapakEna: 'Jeden z tvojich tímov nezíska body',
    naslovNapak: {
      one: '{n} tvoj tím nezíska body',
      few: '{n} tvoje tímy nezískajú body',
      many: '{n} tvojho tímu nezíska body',
      other: '{n} tvojich tímov nezíska body',
    },
    nimasEkipe: 'Ešte nemáš tím<liga>({liga})</liga> — bez neho v nasledujúcom kole nezískaš body.',
    sestavi: 'Zostaviť tím →',
    popravi: 'Opraviť →',
    poglej: 'Pozrieť →',
    skrij: 'Skryť upozornenie: {besedilo}',
    skrijNamig: 'Skryť, kým nepríde nová správa',
    pokaziVse: 'Zobraziť všetky ({n})',
    razlog: 'Tím nespĺňa pravidlá.',
    brezTockKrog: 'V {krog}. kole nezíska body.',
    brezTockRok: 'Pri najbližšej uzávierke nezíska body.',
    nepopolna: 'Tím nie je kompletný — toto kolo sa ešte uzamkne, ale od nasledujúceho nezíska body.',
    igralec: {
      kapetan: {
        poskodba: 'Kapitán {ime} je zranený.',
        odsotnost: 'Kapitán {ime} bude chýbať.',
      },
      namestnik: {
        poskodba: 'Zástupca kapitána {ime} je zranený.',
        odsotnost: 'Zástupca kapitána {ime} bude chýbať.',
      },
      vPostavi: {
        poskodba: '{ime} je zranený a je v základnej zostave.',
        odsotnost: '{ime} bude chýbať a je v základnej zostave.',
      },
      naKlopi: {
        poskodba: '{ime} na lavičke je zranený.',
        odsotnost: '{ime} na lavičke bude chýbať.',
      },
    },
    posledica: {
      kapetan: 'Ak nehrá, pásku preberá zástupca kapitána — možno radšej vyber iného kapitána.',
      namestnik: 'Ak nehrá ani kapitán, ani jeho zástupca, trojnásobok bodov nebude.',
      vPostavi: 'Ak nehrá, nahradí ho prvý hráč z lavičky na rovnakej pozícii.',
      naKlopi: 'Pri automatickom striedaní ho systém preskočí, ak nehrá.',
    },
  },
}
