// Polskie `mojaEkipa` (źródło: src/i18n/sl/mojaEkipa.ts).
// Terminy: drużyna, kadra, wyjściowy skład, ławka, kapitan, wicekapitan, transfery, kolejka.
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Moja drużyna',
  igralec: 'Zawodnik',
  vprasanjeZapustitve: 'Masz niezapisane zmiany w drużynie. Na pewno chcesz opuścić stronę?',
  oznaka: {
    kapetan: 'K',
    namestnik: 'W',
  },

  pravila: {
    pozicije: {
      GK: 'Bramkarze',
      DEF: 'Obrońcy',
      MID: 'Pomocnicy',
      FWD: 'Napastnicy',
    },
    kaderPoln: 'Kadra jest pełna ({n} zawodników).',
    pozicijaPolna: '{pozicija}: masz ich już w kadrze {n}.',
    premaloProracuna: 'Za mały budżet — zawodnik kosztuje {cena}, masz do dyspozycji {preostalo}.',
    izKluba: 'Z klubu {klub} masz już {n} zawodników.',
    velikostEkipe: 'Drużyna musi liczyć {n} zawodników (obecnie {trenutno}).',
    velikostPostave: 'W wyjściowym składzie musi być {n} zawodników (obecnie {trenutno}).',
    brezPozicije: {
      one: '{n} wybrany zawodnik nie ma jeszcze potwierdzonej pozycji — pomóż w sekcji Pozycje.',
      few: '{n} wybrani zawodnicy nie mają jeszcze potwierdzonej pozycji — pomóż w sekcji Pozycje.',
      many: '{n} wybranych zawodników nie ma jeszcze potwierdzonej pozycji — pomóż w sekcji Pozycje.',
      other: '{n} wybranego zawodnika nie ma jeszcze potwierdzonej pozycji — pomóż w sekcji Pozycje.',
    },
    niVecVLigi: '{ime} nie gra już w lidze — wymień go.',
    pozicijaVKadru: '{pozicija} w kadrze: {n} — musi ich być {kader}.',
    pozicijaVPostavi: '{pozicija} w wyjściowym składzie: {n} — dozwolone {min}–{max}.',
    dolociKapetana: 'Wybierz kapitana — w kolejce zdobywa {n} razy więcej punktów.',
    enKapetan: 'Kapitan może być tylko jeden.',
    dolociNamestnika: 'Wybierz wicekapitana, który przejmie opaskę, jeśli kapitan nie zagra.',
    istiKlub: 'Z jednego klubu możesz wybrać najwyżej {n} zawodników.',
    presegelProracun: 'Przekroczyłeś budżet o {cena}.',
  },

  napake: {
    zeImas: 'Masz już drużynę w tej lidze — odśwież stronę.',
    dovoljenje: 'Nie masz do tego uprawnień. Zaloguj się ponownie i spróbuj jeszcze raz.',
    povezava: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
    shranjevanje: 'Zapisywanie nie powiodło się. Spróbuj ponownie.',
    nalaganjePovezava: 'Brak połączenia z serwerem — sprawdź internet.',
    nalaganje: 'Nie udało się wczytać danych drużyny.',
    nalaganjeNiCelo:
      'Dopóki drużyna nie wczyta się w całości, nie można jej zapisać — inaczej zapis usunąłby zawodników, którzy się nie wczytali.',
    poskusiZnova: 'Spróbuj ponownie',
    vpisiIme: 'Najpierw wpisz nazwę drużyny.',
    osvezitev:
      'Drużyna jest zapisana, ale odświeżenie się nie powiodło — odśwież stronę, zanim znów zaczniesz ją edytować.',
    najprejShrani: 'Najpierw zapisz drużynę.',
    izberiKrog: 'Wybierz kolejkę, w której ma działać chip.',
    prihodnjiKrog: 'Wybierz przyszłą, niezablokowaną kolejkę z ustalonym terminem.',
    zeUporabil: 'Ten chip został już przez ciebie użyty w tym sezonie.',
    niPreklica: 'Chipa dla tej kolejki nie można już anulować.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'W tej lidze nie ma jeszcze zawodników na rynku.',
    pocakaj: 'Poczekaj, aż zapisywanie się zakończy.',
    niPredloga: 'Z tej ligi nie da się na razie złożyć prawidłowej drużyny.',
    predlogSestavljen: 'Drużyna jest złożona — wymień, kogo chcesz, i naciśnij Zapisz.',
    kaderDopolnjen: 'Brakujące miejsca są uzupełnione — sprawdź i naciśnij Zapisz.',
    niDopolnitve:
      'Nie da się uzupełnić kadry za pieniądze, które ci zostały. Wymień któregoś z drogich zawodników i spróbuj ponownie.',
    kapetanNaKlop: '{ime} poszedł na ławkę — wybierz nowego kapitana.',
    namestnikNaKlop: '{ime} poszedł na ławkę — wybierz nowego wicekapitana.',
    brezPozicije: 'Zawodnik nie ma jeszcze potwierdzonej pozycji, więc nie można go wystawić na boisko.',
    niProstora:
      'W składzie nie ma miejsca na kolejnego zawodnika na tej pozycji — najpierw przesuń kogoś na ławkę.',
    niVecNamestnik: '{ime} nie jest już wicekapitanem — wybierz nowego.',
    niVecKapetan: '{ime} nie jest już kapitanem — wybierz nowego.',
    kapetanPrevzel: 'Opaskę kapitana przejął {ime}.',
    namestnikPrevzel: 'Wicekapitanem jest teraz {ime}.',
    rokPotekel: 'Termin {krog}. kolejki już minął, więc zmiany obowiązują od następnej kolejki.',
    shranjenaZaKrog: 'Drużyna jest zapisana i gotowa na {krog}. kolejkę.',
    shranjenaVeljavna: 'Drużyna jest zapisana i spełnia zasady.',
    osnutekShranjen:
      'Szkic zapisany — drużyna nie spełnia jeszcze zasad, więc w tej kolejce nie zdobyłaby punktów.',
    prodaja: 'Sprzedaż przyniosła ci +{cena}.',
    nakupi: 'Zakupy kosztowały {cena}.',
    wildcardVlozen: 'Wildcard aktywowany — transfery w tej kolejce są darmowe.',
    klopPlusVlozen: 'Ławka+ aktywowana.',
    wildcardPreklican: 'Wildcard anulowany — możesz go użyć w innej kolejce.',
    klopPlusPreklican: 'Ławka+ anulowana — możesz jej użyć w innej kolejce.',
    zapriOpozorilo: 'Zamknij ostrzeżenie',
    zapriObvestilo: 'Zamknij powiadomienie',
    odstranjen: '{ime} został usunięty.',
    razveljavi: 'Cofnij',
    dodan: '{ime} jest w twojej drużynie — naciśnij Zapisz.',
    dodanSamodejno: '{ime} jest w twojej drużynie.',
    zeVEkipi: '{ime} jest już w twojej drużynie.',
    niNaTrgu: 'Tego zawodnika nie można teraz kupić.',
  },

  brezPrijave: {
    opis: 'Drużynę złożysz bez konta. Zostanie w tej przeglądarce, dopóki jej nie zapiszesz.',
    shrani: 'Zapisz i załóż konto',
    pripravljena: 'Twoja drużyna jest gotowa — zapisz ją.',
  },
  locenaLiga:
    'Drużyna w lidze <liga>{liga}</liga> jest oddzielna od drużyn w innych ligach — z własnym budżetem i własnym rankingiem. Punkty liczą się od {krog}. kolejki, bo do tego czasu wciąż trwają transfery i przejścia między kategoriami wiekowymi.',

  vec: 'Więcej: chipy, historia, zasady',

  prestopi: {
    medSezono: {
      one: 'Dołączasz w trakcie sezonu: do terminu {krog}. kolejki składasz drużynę bez kary. Potem masz w każdej kolejce {n} darmowy transfer, każdy kolejny kosztuje −{kazen}.',
      few: 'Dołączasz w trakcie sezonu: do terminu {krog}. kolejki składasz drużynę bez kary. Potem masz w każdej kolejce {n} darmowe transfery, każdy kolejny kosztuje −{kazen}.',
      many: 'Dołączasz w trakcie sezonu: do terminu {krog}. kolejki składasz drużynę bez kary. Potem masz w każdej kolejce {n} darmowych transferów, każdy kolejny kosztuje −{kazen}.',
      other: 'Dołączasz w trakcie sezonu: do terminu {krog}. kolejki składasz drużynę bez kary. Potem masz w każdej kolejce {n} darmowego transferu, każdy kolejny kosztuje −{kazen}.',
    },
    stevec: 'Transfery: {n}/{prosti}',
    wildcard: 'wildcard — bez kary',
    odbitek: 'odjęcie {tock} w tej kolejce',
    prosti: {
      one: 'jeszcze {n} darmowy, potem −{kazen} za każdy',
      few: 'jeszcze {n} darmowe, potem −{kazen} za każdy',
      many: 'jeszcze {n} darmowych, potem −{kazen} za każdy',
      other: 'jeszcze {n} darmowego, potem −{kazen} za każdy',
    },
  },

  namigi: {
    naslov: 'Podpowiedzi transferowe',
    zaKrog: 'Kto w {krog}. kolejce prawdopodobnie nie zagra i na kogo możesz go wymienić.',
    razlog: {
      neaktiven: 'nie gra już w lidze',
      poskodba: 'kontuzjowany',
      odsotnost: 'nieobecny',
      brezTekme: 'klub nie gra',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: 'Zamiast {ime} wstaw do kadry {novi}',
    niZamenjave: 'Nie ma zmiany, na którą pozwalałyby budżet i zasady.',
    opomba: 'Kliknięcie tylko przygotowuje zmianę — drużynę zapisujesz sam. Każda podpowiedź działa osobno.',
    skrij: 'Ukryj do następnej kolejki',
    zamenjano: '{novi} jest w kadrze zamiast {ime}. Gdy będziesz zadowolony, zapisz drużynę.',
  },

  odZadnjegaObiska: {
    naslov: 'Od ostatniej wizyty',
    naslovTeden: 'W ostatnim tygodniu',
    vrednost: 'Wartość drużyny <znesek>{znak}{cena}</znesek>',
    gor: 'wzrost ceny',
    dol: 'spadek ceny',
    zapri: 'Zamknij',
  },

  povzetek: {
    urediIme: 'Edytuj nazwę drużyny {ime}',
    bogastvo:
      'majątek <vrednost>{bogastvo}</vrednost><razlika></razlika> · kadra {kader} <placano>zapłacone</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Zapisuję…',
    shranjeno: 'Zapisano ✓',
    shraniEkipo: 'Zapisz drużynę',
    neshranjeno: 'Niezapisane zmiany',
    imeEkipe: 'Nazwa drużyny',
    privzetoIme: 'FC {ime}',
    primerImena: 'np. Niedzielni Bohaterowie',
  },

  vodic: {
    napredek: '{trenutni} / {skupaj}',
    naprej: 'Dalej',
    razumem: 'Rozumiem',
    sestaviNaslov: 'Drużyna jednym kliknięciem',
    sestaviOpis: 'Kliknij tutaj, a złożymy ci poprawną drużynę w ramach budżetu. Potem wymień, kogo chcesz.',
    igrisceNaslov: 'To twoja drużyna',
    igrisceOpis: 'Kliknij zawodnika, aby zobaczyć szczegóły lub go wymienić. Punkty zdobywa wyjściowa jedenastka, zawodnik z ławki wchodzi, gdy ktoś nie gra.',
    shraniNaslov: 'Ostatni krok: Zapisz',
    shraniOpis: 'Po zapisaniu zbierasz punkty już w następnej kolejce. Drużynę możesz zmieniać do terminu.',
  },
  zacetek: {
    naslov: 'Od czego zacząć?',
    sestaviMi: 'Złóż mi drużynę',
    opisPredloga:
      'Losowo wybieramy prawidłową drużynę w ramach budżetu — każde kliknięcie daje inną. Potem wymień, kogo chcesz, i zapisz.',
    sam: 'Wolę złożyć sam',
    drugPredlog: 'Inna propozycja',
    opisDrugegaPredloga:
      'Nie podoba ci się? Wylosuj nową drużynę — dopóki jej nie zapiszesz, nic to nie kosztuje.',
    dopolni: 'Uzupełnij drużynę',
    opisDopolnitve:
      'Wolnych miejsc w kadrze: {n}. Twoje wybory zostają, pozostałe miejsca wypełnimy losowo w ramach budżetu.',
    korak1: 'Nazwę drużyny zaproponowaliśmy powyżej — możesz ją zmienić w każdej chwili.',
    korak2:
      'Kliknij <krepko>＋</krepko> na pustym miejscu boiska. Na telefonie w dolnym pasku jest też przycisk <krepko>＋ Dodaj</krepko>, a na komputerze wybierasz z <krepko>rynku zawodników</krepko> po prawej.',
    korak3:
      'Kadra to {n} zawodników: {gk} BR, {def} OBR, {mid} POM, {fwd} NAP. Z jednego klubu najwyżej {klub}.',
    korak4:
      'Gdy miejsca są zapełnione, wybierz <krepko>kapitana</krepko> i <krepko>wicekapitana</krepko>, potem naciśnij <krepko>Zapisz drużynę</krepko> (na telefonie <krepko>Zapisz</krepko> w dolnym pasku).',
  },

  trak: {
    naslov: 'Opaska',
    kapetan: 'Kapitan (×{n})',
    namestnik: 'Wicekapitan',
    nihce: '— nikt —',
  },

  kajCe: {
    prinesla: 'Obecny skład w <krog>{krog}. kolejce</krog> ({sezona}) zdobyłby',
    opis: 'Podgląd "co by było, gdyby" — to nie jest historyczny wynik, zmienia się przy każdej wymianie. Rzeczywiste punkty za minione kolejki znajdziesz w rankingu i w zapisie składu.',
  },

  status: {
    manjka: 'Do ostatecznego zapisu brakuje jeszcze kilku rzeczy:',
    vpisiIme: 'Wpisz nazwę drużyny (w polu powyżej).',
    osnutekZdaj: 'Szkic możesz zapisać już teraz — zasady uzupełnisz później.',
    brezTock: '<krepko>W {krog}. kolejce</krepko> w tym stanie <krepko>NIE zdobędziesz punktów</krepko>.',
    kajPomeni:
      '<krepko>Co oznacza "Zapisz"?</krepko> Twoje zmiany (kadra, skład, kapitan) zostają zapisane w bazie. W bieżącej kolejce liczy się stan w chwili terminu. Do terminu możesz dowolnie zmieniać i ponownie naciskać Zapisz — liczy się ostatnia wersja. <krepko>"Zapisz szkic"</krepko> oznacza to samo, tylko z uwagą, że drużyna nie spełnia jeszcze wszystkich zasad (aby zdobywać punkty, potrzebne są poprawki — patrz lista powyżej).',
    kajPomeniRok:
      '<krepko>Co oznacza "Zapisz"?</krepko> Twoje zmiany (kadra, skład, kapitan) zostają zapisane w bazie. W bieżącej kolejce liczy się stan w chwili terminu (<krepko>{krog}. kolejka — {rok}</krepko>). Do terminu możesz dowolnie zmieniać i ponownie naciskać Zapisz — liczy się ostatnia wersja. <krepko>"Zapisz szkic"</krepko> oznacza to samo, tylko z uwagą, że drużyna nie spełnia jeszcze wszystkich zasad (aby zdobywać punkty, potrzebne są poprawki — patrz lista powyżej).',
  },

  pripomocki: {
    klopPlusNaslov: 'Chip Ławka+',
    klopPlusVlozenZa: 'Aktywowany na {krog}. kolejkę ({sezona}) — liczą się w niej też punkty ławki.',
    klopPlusVlozen: 'Ławka+ jest już aktywowana — w tej kolejce liczą się też punkty ławki.',
    klopPlusOpis:
      'Raz na sezon: w wybranej kolejce doliczane są też punkty wszystkich czterech rezerwowych.',
    wildcardNaslov: 'Chip Wildcard',
    wildcardVlozenZa: 'Aktywowany na {krog}. kolejkę ({sezona}) — transfery w niej są darmowe.',
    wildcardVlozen: 'Wildcard jest już aktywowany — transfery w tej kolejce są darmowe.',
    wildcardOpis:
      'Raz na sezon: w tej kolejce możesz wymienić dowolną liczbę zawodników, bez odjęcia punktów.',
    zaklenjen: 'zablokowany',
    preklici: 'anuluj',
    prekliciDo: 'Na anulowanie masz <odstevanje></odstevanje>',
    izberiKrog: 'Wybierz kolejkę…',
    niKroga: 'Brak przyszłej kolejki z terminem',
    krogSezona: '{krog}. kolejka ({sezona})',
    vlozi: 'Aktywuj',
    vloziZa: 'Aktywuj na {krog}. kolejkę',
    potrdiWildcard: 'Aktywować Wildcard na {krog}. kolejkę? Masz go tylko raz na sezon.',
  },

  zgodovina: {
    naslov: 'Historia składów',
    posnetkov: {
      one: '{n} kolejka z zapisem składu',
      few: '{n} kolejki z zapisami składu',
      many: '{n} kolejek z zapisami składu',
      other: '{n} kolejki z zapisami składu',
    },
    krog: '{krog}. kolejka',
    podrobnost: '{krog}. kolejka · sezon {sezona}',
    podrobnostSkupaj: '{krog}. kolejka · sezon {sezona} · razem <krepko>{tocke}</krepko>',
    deli: 'Udostępnij {krog}. kolejkę',
  },

  telefon: {
    ostane: 'zostaje',
    predalPovzetek: 'zostaje <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'popraw ↑',
    neshranjeno: 'niezapisane',
    dodaj: '＋ Dodaj',
    osnutekNamig: 'Drużyna nie spełnia jeszcze zasad — zapisze się jako szkic.',
    neIzpolnjuje: 'drużyna nie spełnia jeszcze zasad',
    zapriTrg: 'Zamknij rynek',
    zapri: '✕ Zamknij',
  },

  trg: {
    naslov: 'Rynek zawodników',
    iskanje: 'Szukaj po nazwisku…',
    pocistiIskanje: 'Wyczyść wyszukiwanie',
    vsi: 'wszyscy',
    vsiKlubi: 'Wszystkie kluby',
    niZadetkov: 'Brak wyników.',
    pocistiFiltre: 'Wyczyść filtry',
    statLetos: '{goli} G · {minute} min',
    statLani: 'rok temu {goli} G',
    brezNastopov: 'bez występów',
    niVecVLigi: 'nie gra już w lidze',
    tockeZadnjiKrog: 'Punkty w ostatniej rozegranej kolejce',
    podatki: 'Dane zawodnika {ime}',
    podatkiNamig: 'Statystyki, zmiany ceny, następne mecze',
    profilVNovemZavihku: 'Otwórz profil zawodnika w nowej karcie',
    odstrani: '✕ usuń',
    dodaj: '⊕ dodaj',
    prvih: 'Pokazano pierwszych {n} — zawęź wybór wyszukiwaniem.',
    noga: 'Z jednego klubu możesz wybrać najwyżej {n} zawodników. Gole i minuty są z bieżącego sezonu.',
  },

  rok: {
    krog: '{krog}. kolejka',
    potekel: 'Termin minął — <krepko>{rok}</krepko>',
    rok: 'Termin: <krepko>{rok}</krepko>',
    niDolocen: 'Termin nie jest jeszcze ustalony.',
  },

  igrisce: {
    namigZamenjave: 'Dotknij koszulki zawodnika, a potem tego, z którym go zamieniasz.',
    zapriNamig: 'Zamknij wskazówkę',
    izberiZaMenjavo: '{ime}: wybierz do zmiany',
    prekliciIzbiro: '{ime}: anuluj wybór',
    zamenjajZ: '{ime}: zamień z zawodnikiem {drugi}',
    izbran: 'Wybrany: {ime}. Dotknij zaznaczonego zawodnika, aby zamienić, albo ponownie wybranego, aby anulować.',
    brezMenjave: 'Dla zawodnika {ime} nie ma prawidłowej zmiany. Dotknij go ponownie, aby anulować.',
    niVecVLigiNamig: 'Zawodnik nie gra już w lidze — kadra z nim nie zdobywa punktów.',
    niVecVLigi: 'nie gra już w lidze',
    poskodba: 'kontuzja',
    odsoten: 'nieobecny',
    kapetan: 'Kapitan — potrójne punkty',
    namestnik: 'Wicekapitan',
    tockeKroga: 'Punkty w ostatniej kolejce: {tocke}',
    tockeKrogaKapetan: 'Punkty w ostatniej kolejce: {tocke} × 3 (kapitan)',
    odstraniIzKadra: 'Usuń z kadry',
    odstrani: 'Usuń {ime}',
    prej: 'Wcześniej w kolejności zmian',
    prejIme: '{ime}: wcześniej w kolejności zmian',
    pozneje: 'Później w kolejności zmian',
    poznejeIme: '{ime}: później w kolejności zmian',
    izberi: 'Wybierz: {pozicija}',
    klop: 'Ławka',
    klopOpis:
      'Kto ze składu nie zagra, tego zastępuje pierwszy z tej samej pozycji z ławki — po kolei od lewej do prawej.',
    brezPozicije: 'Bez potwierdzonej pozycji — nie można ich wystawić na boisko',
  },

  igrisceTocke: {
    opis: '{ime} — {deli}',
    minut: '{n} min',
    goli: '{n} × gol',
    asistence: '{n} × asysta',
    brezPrejetega: 'czyste konto',
    prejetih: 'straconych {n}',
    rumeni: 'żółta kartka',
    rdeci: 'czerwona kartka',
    skupaj: '{tocke} pkt',
    brezPostave: 'Protokół meczowy nie podaje składu tej drużyny.',
    klop: 'Ławka',
    vstopilo: '— {n} weszło do gry',
  },

  enajsterica: {
    kapetan: 'Kapitan',
    namestnik: 'Wicekapitan z opaską',
  },

  opozorila: {
    naslov: 'Ostrzeżenia w twoich drużynach',
    naslovNapakEna: 'Jedna z twoich drużyn nie zdobędzie punktów',
    naslovNapak: {
      one: '{n} twoja drużyna nie zdobędzie punktów',
      few: '{n} twoje drużyny nie zdobędą punktów',
      many: '{n} twoich drużyn nie zdobędzie punktów',
      other: '{n} twojej drużyny nie zdobędzie punktów',
    },
    nimasEkipe: 'Nie masz jeszcze drużyny<liga>({liga})</liga> — bez niej w następnej kolejce nie zdobędziesz punktów.',
    sestavi: 'Złóż drużynę →',
    popravi: 'Popraw →',
    poglej: 'Zobacz →',
    skrij: 'Ukryj ostrzeżenie: {besedilo}',
    skrijNamig: 'Ukryj do nowego raportu',
    pokaziVse: 'Pokaż wszystkie ({n})',
    razlog: 'Drużyna nie spełnia zasad.',
    brezTockKrog: 'W {krog}. kolejce nie zdobędzie punktów.',
    brezTockRok: 'W najbliższym terminie nie zdobędzie punktów.',
    nepopolna: 'Drużyna jest niekompletna — ta kolejka jeszcze się zablokuje, ale od następnej nie zdobędzie punktów.',
    igralec: {
      kapetan: {
        poskodba: 'Kapitan {ime} jest kontuzjowany.',
        odsotnost: 'Kapitan {ime} jest nieobecny.',
        izstop: 'Kapitan {ime} już nie zagra — jego klub wycofał się z ligi.',
      },
      namestnik: {
        poskodba: 'Wicekapitan {ime} jest kontuzjowany.',
        odsotnost: 'Wicekapitan {ime} jest nieobecny.',
        izstop: 'Wicekapitan {ime} już nie zagra — jego klub wycofał się z ligi.',
      },
      vPostavi: {
        poskodba: '{ime} jest kontuzjowany i jest w wyjściowym składzie.',
        odsotnost: '{ime} jest nieobecny i jest w wyjściowym składzie.',
        izstop: '{ime} z wyjściowego składu już nie zagra — jego klub wycofał się z ligi.',
      },
      naKlopi: {
        poskodba: '{ime} na ławce jest kontuzjowany.',
        odsotnost: '{ime} na ławce jest nieobecny.',
        izstop: '{ime} na ławce już nie zagra — jego klub wycofał się z ligi.',
      },
    },
    posledica: {
      kapetan: 'Jeśli nie zagra, opaskę przejmie wicekapitan — może lepiej wybierz innego kapitana.',
      namestnik: 'Jeśli nie zagra ani kapitan, ani wicekapitan, nie będzie potrójnych punktów.',
      vPostavi: 'Jeśli nie zagra, zastąpi go pierwszy zawodnik z tej samej pozycji z ławki.',
      naKlopi: 'Przy automatycznej zmianie system go pominie, jeśli nie zagra.',
      izstop: 'Nie zdobędziesz już za niego punktów — wymień go. Drużyna z nim pozostaje prawidłowa.',
    },
  },
}
