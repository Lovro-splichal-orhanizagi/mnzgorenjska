// Polskie `domov` (źródło: src/i18n/sl/domov.ts): strona główna.
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'Nie udało się wczytać danych.',
  delNiNalozen: 'Część danych się nie wczytała: {napaka}',
  uvod: {
    // Teksty gorenjskie są reklamowe i zostają takie, jakie były.
    gorenjskaMladinci: 'Gorenjska nogometna liga — mladinci',
    gorenjskaClani: '1. Gorenjska nogometna liga',
    geslo: 'Zbuduj drużynę. Zbieraj punkty. Wygrywaj.',
    opis: 'Punkty pochodzą z oficjalnych protokołów meczowych ({zveza}) — gole, minuty, czyste konta, kartki. Wszystko oprócz asyst, o których decyduje społeczność.',
    vecLig: 'Możesz grać w kilku ligach — <krepko>ligę wybierasz u góry po lewej</krepko>, każda ma własną drużynę i ranking.',
    zacetekSezone: '<krepko>Sezon startuje {datum}</krepko> — zbuduj drużynę przed terminem.',
    zamudniki: '<krepko>Przegapiłeś start?</krepko> W <lestvica>Rankingu</lestvica> rywalizujesz od kolejki, w której dołączysz.',
    sestaviEkipo: 'Zbuduj drużynę',
    rezultati: 'Wyniki i składy',
  },
  asistence: {
    cakajo: {
      one: '{n} gol czeka na asystę',
      few: '{n} gole czekają na asystę',
      many: '{n} goli czeka na asystę',
      other: '{n} gola czeka na asystę',
    },
  },
  rok: {
    seZaklene: '{krog}. kolejka zamyka się',
  },
  krog: '{krog}. kolejka',
  brezKroga: 'Bez kolejki',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Ostatnie wyniki',
    vsi: 'Wszystkie wyniki →',
    poglejTekmo: 'Zobacz składy i punkty tego meczu',
  },
  najboljsi: {
    igralecSezone: 'Zawodnik sezonu',
    celaLestvica: 'Pełny ranking zawodników →',
    vodilni: {
      strelec: 'Najlepszy strzelec',
      podajalec: 'Najlepszy asystent',
      mreze: 'Najwięcej czystych kont',
    },
  },
  idealna: {
    naslov: 'Jedenastka kolejki',
    krogSezona: '{krog}. kolejka · sezon {sezona}',
    opis: 'Najlepsza 11 kolejki; pod koszulką są punkty. Strzałkami przeglądasz kolejki sezonu.',
    prejsnji: 'Poprzednia kolejka',
    naslednji: 'Następna kolejka',
    ni: 'W tej kolejce nie ma punktów.',
  },
  povabi: {
    naslov: 'Zaproś znajomego do ligi',
  },
  skupnost: {
    brezAsistence: '{goli} bez asysty',
    povejKdo: {
      one: 'Powiedz, kto asystował — {n} głos potwierdza',
      few: 'Powiedz, kto asystował — {n} głosy potwierdzają',
      many: 'Powiedz, kto asystował — {n} głosów potwierdza',
      other: 'Powiedz, kto asystował — {n} głosu potwierdza',
    },
    ugibanaPozicija: '{igralci} ze zgadywaną pozycją',
    pozicijaOdloca: 'Pozycja decyduje, ile wart jest gol',
    odsotnosti: 'Kontuzje i absencje',
    javi: 'Zgłoś, kto nie zagra — innym oszczędzisz kolejkę',
  },
  naslednje: {
    naslov: 'Następne mecze',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Jak grać',
    registracija: '1. Rejestracja',
    registracijaOpis: 'Załóż konto przez Google albo e-mailem i hasłem, i wymyśl nazwę drużyny.',
    kader: '2. Zbuduj skład',
    kaderOpis: 'Na boisku wybierasz 15 zawodników: 2 bramkarzy, 5 obrońców, 5 pomocników i 3 napastników — maksymalnie 3 z jednego klubu, w budżecie 100.',
    enajsterica: '3. Ustaw wyjściową jedenastkę',
    enajstericaOpis: 'Jedenastu wychodzi na boisko, czterech siada na ławce. Kapitan przynosi potrójne punkty; jeśli nie gra, opaskę przejmuje wicekapitan.',
    poKrogu: '4. Po każdej kolejce',
    poKroguOpis: 'Punkty liczymy z protokołów meczowych. Zawodnika bez minut automatycznie zastępuje rezerwowy z tej samej pozycji, a raz w sezonie możesz chipem Ławka+ zaliczyć punkty całej ławki.',
  },
  novinec: {
    kader: 'Zbuduj drużynę',
    kaderOpis: '15 zawodników, budżet 100 — albo kliknij „Złóż mi drużynę” i gotowe jednym kliknięciem.',
    kapetan: 'Wybierz kapitana',
    kapetanOpis: 'Jego punkty liczą się potrójnie.',
    tocke: 'Zbieraj punkty',
    tockeOpis: 'W każdej kolejce z oficjalnych protokołów meczowych.',
  },
  kakoSeTockuje: 'Jak liczymy punkty',
  moja: {
    tocke: 'Punkty',
    mesto: 'Miejsce',
    mestoOd: '{mesto}. z {n}',
    uredi: 'Moja drużyna →',
  },
  taTeden: 'W tym tygodniu',
  klepet: 'Czat i sugestie',
}
