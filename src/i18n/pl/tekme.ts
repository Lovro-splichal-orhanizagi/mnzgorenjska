// Polskie `tekme` (źródło: src/i18n/sl/tekme.ts).
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  statistika: {
    brezStrelcev: "Brak zweryfikowanych strzelców.",
    nedosegljivo: "Statystyki zawodników dla tego historycznego meczu są niedostępne. Oficjalny wynik zostaje zachowany.",
    kratko: "Statystyki niedostępne",
    postaveTocke: "Składy i punkty",
    kartoni: "Kartki",
    delno: "Częściowe statystyki sezonu {sezona}: pełne dane dla {popolnih} z {odigranih} rozegranych meczów ligowych. Historyczne mecze bez statystyk zawodników: {nedosegljivih}. Sumy i średnie obejmują tylko zweryfikowane występy.",
    brezOpazovanj: "Brak zweryfikowanych występów",
  },

  krog: '{n}. kolejka',
  moraPrijava: 'Aby głosować, musisz się <prijava>zalogować</prijava>.',

  tockovanje: {
    postavke: {
      nastopOd60: 'Rozegrane 60 minut lub więcej',
      nastopDo60: 'Występ do 60 minut',
      gol: 'Gol',
      goli: 'Gole ({n})',
      asistenca: 'Asysta',
      asistence: 'Asysty ({n})',
      brezPrejetega: 'Czyste konto',
      zmaga: 'Zwycięstwo drużyny',
      prejetiGoli: 'Stracone gole ({n})',
      obranjena: 'Obroniony rzut karny ({n})',
      zgresena: 'Niewykorzystany rzut karny ({n})',
      avtogol: 'Samobój ({n})',
      rumeni: 'Żółta kartka ({n})',
      rdeci: 'Czerwona kartka',
    },
    pravila: {
      igralniCas: 'Czas gry',
      nastopDo60: 'Występ do 60 minut',
      nastopOd60: 'Rozegrane 60 minut lub więcej',
      goliInAsistence: 'Gole i asysty',
      golVratarja: 'Gol bramkarza',
      golBranilca: 'Gol obrońcy',
      golVezista: 'Gol pomocnika',
      golNapadalca: 'Gol napastnika',
      asistenca: 'Asysta',
      obramba: 'Obrona',
      csVratar: 'Czyste konto — bramkarz',
      csBranilec: 'Czyste konto — obrońca',
      csVezist: 'Czyste konto — pomocnik',
      zmaga: 'Zwycięstwo drużyny — bramkarz, obrońca',
      prejeta2: 'Każde 2 stracone gole — bramkarz, obrońca',
      opomba:
        'Czyste konto liczy się przy co najmniej 60 minutach, a stracone gole tylko te, które padną, gdy zawodnik jest na boisku.',
      obranjena:
        'Obroniony rzut karny — bramkarz (protokół zapisuje go jako niewykorzystany rzut karny rywala)',
      kazni: 'Kary',
      zgresena: 'Niewykorzystany rzut karny',
      avtogol: 'Samobój',
      rumeni: 'Żółta kartka',
      rdeci: 'Czerwona kartka',
    },
  },

  rezultati: {
    naslov: 'Wyniki',
    uvod:
      'Rozegrane mecze z protokołów {zveza}. Kliknij mecz, a zobaczysz oba składy na boisku — na każdej koszulce punkty, które zawodnik zdobył.',
    niZacetka: 'Sezon jeszcze się nie zaczął.',
    prazenKrog: 'W tej kolejce nie rozegrano meczów.',
    prejsnji: 'Poprzednia kolejka',
    naslednji: 'Następna kolejka',
  },

  tabela: {
    naslov: 'Tabela',
    zavihek: '{liga} · tabela',
    uvod: 'Tabela sezonu {sezona}, obliczona z wyników meczów w protokołach {zveza}.',
    opomba: 'Przybliżenie: zwycięstwo 3 punkty, remis 1; przy równej liczbie punktów decyduje różnica bramek, potem bramki zdobyte. Związki mogą mieć inne zasady (mecze bezpośrednie, odjęte punkty), oficjalna tabela jest u {zveza}.',
    niTekem: 'Ta liga nie ma jeszcze rozegranych meczów.',
    stolpci: {
      klub: 'Klub',
      tekme: 'M',
      zmage: 'Z',
      remiji: 'R',
      porazi: 'P',
      goli: 'Bramki',
      razlika: 'RB',
      tocke: 'Punkty',
      forma: 'Forma',
    },
    stolpciOpis: {
      tekme: 'Rozegrane mecze',
      zmage: 'Zwycięstwa',
      remiji: 'Remisy',
      porazi: 'Porażki',
      goli: 'Bramki zdobyte : stracone',
      razlika: 'Różnica bramek',
      tocke: 'Punkty',
    },
    forma: { W: 'Z', D: 'R', L: 'P' },
    formaOpis: { W: 'zwycięstwo', D: 'remis', L: 'porażka' },
    strelci: 'Strzelcy',
    niStrelcev: 'W tym sezonie nie ma jeszcze strzelców.',
    stolpciStrelcev: {
      igralec: 'Zawodnik',
      klub: 'Klub',
      goli: 'Gole',
      tekme: 'Mecze',
      minute: 'Min',
    },
  },

  tekma: {
    naslov: 'Mecz',
    niTekme: 'Tego meczu nie ma w protokołach.',
    nazaj: '← Wyniki',
    brezPostav:
      'Protokół tego meczu nie podaje składów, więc nie można pokazać punktów zawodników.',
    naDresu:
      'Na koszulce jest napisane, ile punktów zawodnik zdobył w tym meczu. Kliknięcie zawodnika otwiera jego stronę.',
    cakajo: {
      one: '{n} gol w tym meczu czeka na asystę — dopóki jej nie ma, asystujący nie dostaje +3 punktów. Napisz poniżej, kto podał.',
      few: '{n} gole w tym meczu czekają na asystę — dopóki jej nie ma, asystujący nie dostaje +3 punktów. Napisz poniżej, kto podał.',
      many: '{n} goli w tym meczu czeka na asystę — dopóki jej nie ma, asystujący nie dostaje +3 punktów. Napisz poniżej, kto podał.',
      other: '{n} gola w tym meczu czeka na asystę — dopóki jej nie ma, asystujący nie dostaje +3 punktów. Napisz poniżej, kto podał.',
    },
    goliInAsistence: 'Gole i asysty',
    prijaviSe: 'Zaloguj się, aby głosować',
  },

  glasovanje: {
    naslov: 'Asysty',
    kdoJePodal: 'Kto podał?',
    uvod:
      'Protokoły {zveza} zapisują strzelców, ale nie asysty. Ustala je społeczność: gdy ten sam zawodnik przy golu zbierze <b>{glasov}</b>, asysta zostaje mu przyznana i daje <b>+3 punkty</b>.',
    // Biernik: "zbierze 3 głosy".
    pragGlasov: { one: '{n} głos', few: '{n} głosy', many: '{n} głosów', other: '{n} głosu' },
    niTekem: 'W bieżącym sezonie nie rozegrano jeszcze meczów',
    niTekemOpis:
      'Głosowanie na asysty otworzy się, gdy tylko zostanie rozegrana pierwsza kolejka. Wróć, gdy dotrą protokoły.',
    arhiv: 'archiwum',
    preteklaSezona:
      'Głosujesz w sprawie poprzedniego sezonu. Nie wpływa to na punkty bieżącej ligi — poprawia tylko historię.',
    izberiKrog: '1. Wybierz kolejkę',
    izberiTekmo: '2. Wybierz mecz',
    vsePotrjeno: 'Wszystko zatwierdzone',
    zaprto: 'zamknięte',
    poglejTekmo: 'Zobacz składy i punkty tego meczu →',
    niGolov: 'W tym meczu nie padły gole.',
    vsePotrjene: 'Wszystkie asysty w tym meczu są zatwierdzone. 🎉',
    zaprtoOpis: 'Głosowanie w sprawie tego meczu jest zamknięte — jest otwarte do terminu następnej kolejki.',
    brezPotrjene: 'Bez zatwierdzonej asysty: {goli}.',
  },

  gol: {
    neznanStrelec: 'nieznany strzelec',
    avtogol: 'Samobój — {ime}',
    enajstmetrovka: '{ime} — rzut karny',
    brezAsistenceOpomba: 'bez asysty',
    potrjena: 'asysta zatwierdzona — zablokowane',
    brezAsistence: 'Bez asysty',
    odlocilaSkupnost: 'tak zdecydowała społeczność',
    morasSePrijaviti: 'Aby głosować, musisz się zalogować',
    spremeniGlas: 'Zmień głos',
    kdoJePodal: 'Kto podał?',
    vodiBrez: 'Prowadzi „bez asysty”',
    vodi: 'Prowadzi <b>{ime}</b>',
    igralecBrezZapisa: 'zawodnik spoza protokołu',
    doOdlocitve: '— jeszcze {n} do rozstrzygnięcia',
    ostali: 'Pozostali:',
    brezGlasovi: 'bez ({n})',
    izberiPodajalca: 'Wybierz asystującego — {ekipa}',
    nihce: 'Nikt — gol bez asysty',
  },

  pozicije: {
    naslov: 'Pozycje',
    kjeKdoIgra: 'Kto gdzie gra?',
    uvod:
      'Protokoły oznaczają tylko bramkarza, a składy wymieniają według numerów na koszulkach — pozycji nie da się więc odczytać. Ustala je społeczność. Potrzebne głosy: <b>{prag}</b> — liczba spada (do {minPrag}), jeśli statystyczny prior (numer na koszulce, gole, kartki) mocno wskazuje w tym kierunku. Głosy <b>znawców klubu</b> i użytkowników o <b>wysokiej trafności</b> liczą się bardziej.',
    enkratNaTeden:
      'Przegłosowane pozycje wchodzą w życie <b>raz w tygodniu, w poniedziałek rano</b>, wszystkie naraz. Dzięki temu liga nie zmienia się w trakcie tygodnia: co widzisz we wtorek, obowiązuje też w sobotę, gdy kolejka się zablokuje. Zawodnik, który zebrał już wystarczająco głosów, jest do tego czasu oznaczony klepsydrą <ikona>⏳</ikona>.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ znawca',
    samoIzStatistike: 'Tylko ze statystyk ({n})',
    vsiPotrjeni: 'Wszyscy zawodnicy tego klubu mają zatwierdzoną pozycję. 🎉',
    niIgralcev: 'Brak zawodników.',
    status: {
      naslov: 'Mój status głosującego',
      utezOpis:
        'Waga pojedynczego głosu — sumuje się z bonusem insidera, jeśli głosujesz na zawodnika swojego klubu.',
      utez: 'waga {utez}×',
      tocnih: '({pravilni}/{vsi} trafnych)',
      klubPoznam: 'Klub, który dobrze znam (znawca) — mój głos na zawodników tego klubu liczy się bardziej:',
      nisemPoznavalec: '— nie jestem znawcą żadnego klubu —',
      opomba:
        'Znawca oznacza tylko jeden klub. Wagi z czasem się stabilizują — jeśli twoje głosy okazują się błędne, zaufanie spada. Zaufanie jest przeliczane z wcześniejszych głosów, gdy pozycja jest znana.',
    },
    igralec: {
      statistika: '{tekme} · {minute} min · {goli} · {cs} czystych kont',
      izZapisnika: 'Z protokołu — bramkarz jest oznaczony (V)',
      odKluba: 'Pozycję ustawił klub',
      klub: ' · klub',
      izStatistike: 'Ze statystyk (nr koszulki, gole, kartki) — głosy mogą ją poprawić',
      potrdilaSkupnost: 'Zatwierdzona przez społeczność',
      zapisnik: ' · protokół',
      uveljavitevOpis:
        'Pozycje wchodzą w życie raz w tygodniu, w poniedziałek rano — dzięki temu liga nie zmienia się w trakcie tygodnia.',
      izglasovano: 'przegłosowano: {pozicija} · w poniedziałek',
      neIgraOpis: 'Już nie gra — nie ma go na rynku. Jeśli pojawi się w protokole, wróci sam.',
      neIgra: 'już nie gra',
      vrniOpis: 'Przywróć zawodnika do aktywnych',
      vrni: 'przywróć',
      odhodOpis:
        'Zawodnik nie gra już w tym klubie — zdejmuje go z rynku. Występ w protokole przywraca go automatycznie.',
      statistikaKaze:
        'Statystyki wskazują na <b>{pozicija} ({odstotek}%)</b> — głos w tym kierunku liczy się z niższym progiem ({nizji} zamiast {prag}).',
      dolocenaIzStatistike: 'Pozycja została ustalona na podstawie statystyk — jeśli jest błędna, kliknij właściwą.',
      dolocilaSkupnost: 'Pozycję ustaliła społeczność — głosami można ją poprawić.',
      gumbUtez: 'Waga {utez} / próg {prag}',
      gumbPrior: ' · prior {odstotek}%',
      gumbPoznavalec: ' · twój głos jako znawcy liczy się bardziej',
      vodi: 'Prowadzi {pozicija} — waga {utez} / {prag}',
    },
  },
  // Razlaga točk in cene na mestu (components/Razlaga.tsx).
  razlaga: {
    zakaj: 'Dlaczego {tocke}? Rozbicie punktów',
    zapri: 'Zamknij',
    ostalo: 'Inne',
    brezPozicije: 'Pozycja nie jest jeszcze ustalona, więc gol nie daje jeszcze punktów. Gdy społeczność potwierdzi pozycję, punkty zostaną przeliczone.',
    pravila1: 'Ta kolejka jest punktowana według starszych zasad: czyste konto bramkarza +4, bez punktów za zwycięstwo.',
    asistence: 'Asysty potwierdza społeczność w głosowaniu — niepotwierdzona asysta nie daje jeszcze punktów.',
    zadnjiKrog: 'Ostatni mecz: {krog}. kolejka',
    cena: {
      zakaj: 'Dlaczego taka cena?',
      zdaj: 'Obecna cena',
      izhodisce: 'Cena początkowa',
      izhodisceOpis: 'Cena początkowa wynika z minut i punktów z poprzedniego sezonu w porównaniu z innymi zawodnikami ligi.',
      privzeta: 'Kto w poprzednim sezonie rozegrał mniej niż {minut} minut, zaczyna od {cena} — chyba że grał w wyższej lidze; wtedy cena pochodzi stamtąd.',
      borza: 'Po każdej kolejce cena się zmienia: +{korak} za każde dwa punkty powyżej 2 (najwyżej +{najvec} na kolejkę), −{korak} po słabej kolejce lub słabej formie i −{korak}, jeśli zawodnik drugą kolejkę z rzędu nie gra, choć jego klub gra.',
      razpon: 'Cena zawsze mieści się między {od} a {do}.',
    },
  },
}
