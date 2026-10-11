// Polskie `racun` (źródło: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Logowanie',
    naslovRegistracija: 'Rejestracja',
    naslovPozabljeno: 'Nie pamiętasz hasła',
    googleNiNaVoljo: 'Logowanie przez Google jest teraz niedostępne. Użyj e-maila.',
    appleNiNaVoljo: 'Logowanie przez Apple jest teraz niedostępne. Użyj e-maila.',
    poslanaPonastavitev:
      'Wysłaliśmy ci link do zresetowania hasła. Sprawdź skrzynkę (także spam).',
    racunUstvarjen:
      'Konto zostało utworzone. Na twój e-mail wysłaliśmy link potwierdzający — otwórz go i wróć tutaj.',
    prijavljenKot: 'Jesteś zalogowany jako {email}.',
    zGooglom: 'Kontynuuj z Google',
    zApplom: 'Kontynuuj z Apple',
    aliZEposto: 'lub e-mailem',
    prikaznoIme: 'Nazwa wyświetlana',
    eposta: 'E-mail',
    geslo: 'Hasło',
    posiljam: 'Wysyłam…',
    ustvariRacun: 'Załóż konto',
    posljiPovezavo: 'Wyślij link',
    gumbPrijava: 'Zaloguj się',
    zeImasRacun: 'Masz już konto? Zaloguj się',
    nimasRacuna: 'Nie masz konta? Zarejestruj się',
    pozabljenoGeslo: 'Nie pamiętasz hasła?',
    nazajNaPrijavo: '← Wróć do logowania',
  },
  napake: {
    napacnaPrijava: 'Nieprawidłowy e-mail lub hasło.',
    niPotrjen: 'Adres e-mail nie jest jeszcze potwierdzony. Kliknij link w wiadomości, którą ci wysłaliśmy.',
    zeRegistriran: 'Ten adres e-mail jest już zarejestrowany. Zaloguj się lub zresetuj hasło.',
    prevecPoskusov: 'Zbyt wiele prób. Odczekaj kilka minut i spróbuj ponownie.',
    sibkoGeslo: 'Hasło jest za słabe. Użyj co najmniej 6 znaków, najlepiej liter i cyfr.',
    istoGeslo: 'Nowe hasło musi się różnić od starego.',
    neveljavenNaslov: 'Adres e-mail jest nieprawidłowy.',
  },
  novoGeslo: {
    naslov: 'Nowe hasło',
    gesliSeNeUjemata: 'Hasła się nie zgadzają.',
    preverjam: 'Sprawdzam link…',
    neveljavna:
      'Link jest nieprawidłowy lub wygasł. Na stronie <prijava>logowania</prijava> poproś ponownie o reset hasła.',
    novoGeslo: 'Nowe hasło',
    ponovi: 'Powtórz hasło',
    shranjujem: 'Zapisuję…',
    shrani: 'Zapisz hasło',
  },
  opomniki: {
    naslov: 'Powiadomienia',
    napakaNalaganja: 'Nie udało się wczytać ustawień.',
    napakaShranjevanja: 'Zapisywanie się nie powiodło. Spróbuj ponownie.',
    nalagam: 'Wczytuję…',
    moraPrijava: 'Aby zarządzać przypomnieniami, musisz się <prijava>zalogować</prijava>.',
    opis: 'Przed terminem kolejki wyślemy ci krótką wiadomość na {email}, żebyś nie zapomniał ustawić drużyny.',
    posiljaj: 'Przypomnienia e-mail',
    shranjujem: 'Zapisuję…',
    vklopljeni: 'Przypomnienia są włączone.',
    izklopljeni: 'Nie będziemy już wysyłać ci przypomnień.',
    odjavaVprasanje: 'Nie chcesz już dostawać e-maili od SLFF (przypomnień przed terminem i powiadomień o drużynie)?',
    odjavaGumb: 'Wypisz mnie',
    odjavaNapaka: 'Link jest nieprawidłowy. Zaloguj się i wyłącz przypomnienia w ustawieniach.',
    push: 'Powiadomienia push (aplikacja mobilna)',
    pushOpis: 'Dzień przed terminem telefon powie ci, jeśli drużyna nie jest jeszcze gotowa.',
    pushVklopljena: 'Powiadomienia push są włączone.',
    pushIzklopljena: 'Nie będziemy już wysyłać ci powiadomień push.',
    pushZavrnjeno: 'Powiadomienia są wyłączone w telefonie. Włącz je w Ustawienia → SLFF → Powiadomienia.',
    pushDovoli: 'Zezwól na powiadomienia',
    povezava: 'Ustawienia powiadomień',
  },
  potrditev: {
    naslov: 'Potwierdzam…',
    preverjam: 'Sprawdzam link…',
    neveljavna: 'Link jest już nieważny lub został użyty. <prijava>Zaloguj się</prijava> albo poproś o nowy.',
  },
  izbris: {
    naslov: 'Usuwanie konta',
    moraPrijava: 'Aby usunąć konto, musisz się <prijava>zalogować</prijava>.',
    opis: 'Usuniemy konto {email}: profil, wszystkie twoje drużyny z historią punktów, głosy i miniligi, które utworzyłeś. Usunięcia nie można cofnąć.',
    gumb: 'Usuń konto',
    potrdi: 'Tak, usuń na zawsze',
    preklici: 'Anuluj',
    brisem: 'Usuwam…',
    napaka: 'Nie udało się usunąć konta: {napaka}',
  },
  pravno: {
    naslov: 'Prywatność i regulamin',
    zadnjaSprememba: 'Ostatnia zmiana: 9 października 2026',
    kajJeNaslov: 'Czym jest SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) to kibicowska liga fantasy dla lokalnych lig amatorskich. Prowadzimy ją hobbystycznie i nie jest powiązana z Polskim Związkiem Piłki Nożnej (PZPN), wojewódzkimi związkami piłki nożnej ani z klubami. Gra jest darmowa, bez wpłat pieniężnych i bez nagród.',
    podatkiNaslov: 'Jakie dane przechowujemy',
    podatkiEposta:
      '<b>Adres e-mail i hasło.</b> Potrzebujemy ich do logowania. Hasło jest przechowywane w postaci zaszyfrowanej i go nie widzimy.',
    podatkiIme:
      '<b>Nazwa wyświetlana i nazwa drużyny.</b> Są widoczne w rankingu. Jeśli nie chcesz podawać swojego imienia, użyj pseudonimu.',
    podatkiEkipa:
      '<b>Twoja drużyna i głosy.</b> Skład, kapitan, transfery oraz głosy dotyczące asyst i pozycji.',
    podatkiNaprava:
      '<b>Token urządzenia do powiadomień.</b> Jeśli w aplikacji mobilnej zezwolisz na powiadomienia, zapisujemy token, przez który wysyłamy ci przypomnienie przed terminem kolejki. Przy wylogowaniu go usuwamy.',
    neHranimo:
      'Nie przechowujemy adresu zamieszkania, numeru telefonu ani danych płatniczych. Nie używamy plików cookie do śledzenia ani narzędzi reklamowych. W przeglądarce zapisane są twoja sesja logowania, identyfikator rozmowy na czacie pomocy, jeśli go otworzysz, oraz znaczniki sesji, dzięki którym wizytę na stronie liczymy tylko raz. Ile osób otworzyło którą stronę, liczymy wyłącznie jako dzienną sumę — bez twojego imienia, konta, urządzenia czy adresu IP. Ogólne statystyki odwiedzin (które strony, skąd przychodzą odwiedzający, rodzaj urządzenia i kraj, kilka działań, takich jak zbudowanie drużyny) zapisuje <b>Umami</b> na naszym serwerze: bez plików cookie, nie zapisuje adresu IP i nie łączy wizyty z twoim kontem. Jeśli przeglądarka ma włączoną opcję „Do Not Track”, nic nie jest zapisywane.',
    dostopNaslov: 'Kto ma dostęp do danych',
    dostop:
      'Dane są na naszym serwerze u dostawcy <b>Hetzner</b> (Niemcy, UE), ruch do niego idzie przez <b>Cloudflare</b> (ochrona i dostarczanie strony). E-maile z potwierdzeniem i resetem hasła wysyła nasz serwer pocztowy (również Hetzner), powiadomienia w aplikacji mobilnej idą przez <b>Google Firebase Cloud Messaging</b> (tylko token urządzenia i treść powiadomienia). Czat pomocy w prawym dolnym rogu działa przez <b>HelpStack</b>: trafia tam to, co w nim napiszesz, oraz — jeśli jesteś zalogowany — twoja nazwa wyświetlana, żebyśmy wiedzieli, komu odpowiadamy. Gdy asystent na czacie ci pomaga, może też sprawdzić, na której stronie i w której lidze jesteś oraz czy twoja drużyna jest prawidłowa. Adresu e-mail mu nie przekazujemy. Nikomu innemu danych nie przekazujemy i ich nie sprzedajemy.',
    statistikaNaslov: 'Dane o piłkarzach',
    statistika:
      'Dla piłkarzy lig, które obsługujemy, pokazujemy imię i nazwisko, klub, numer na koszulce, występy, minuty, gole i kartki. Źródłem są publicznie opublikowane oficjalne protokoły meczowe związku podanego w stopce strony. Pozycje i asysty, których protokół nie zawiera, ustala społeczność w głosowaniu, więc mogą być błędne. Na tej podstawie liczymy punkty i cenę zawodnika w grze. Jeśli coś się nie zgadza, kliknij zawodnika i daj nam znać.',
    statistikaPodlaga:
      'Celem jest darmowa kibicowska gra fantasy. Podstawą prawną jest prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO): umożliwienie kibicom gry z publicznie opublikowanymi wynikami ich ligi. Dane pokazujemy, dopóki zawodnik występuje w lidze, którą obsługujemy. W ligach austriackich, tak jak ÖFB, ukrywamy nazwisko zawodnika 18 miesięcy po jego ostatnim występie.',
    statistikaUgovor:
      'Zawodnik może sprzeciwić się przetwarzaniu lub zażądać usunięcia: napisz na <eposta>info@slff.eu</eposta> i dodaj link do strony zawodnika. W ciągu 14 dni zastąpimy jego nazwisko neutralnym oznaczeniem we wszystkich naszych ligach tego kraju, w których go znajdziemy, także przy późniejszych importach. Statystyki zostają bez nazwiska. Tak samo postąpimy na wniosek związku.',
    grbi:
      'Herby klubów są własnością poszczególnych klubów i są pokazywane wyłącznie w celu rozpoznania drużyny. Klub, który sobie tego nie życzy, może do nas napisać, a herb usuniemy.',
    fotografijeNaslov: 'Zdjęcia',
    fotografije:
      'Zdjęcie na stronie głównej jest autorstwa Abigail Keenan i zostało opublikowane na <unsplash>Unsplash</unsplash> na ich licencji, która pozwala na swobodne użycie. Nie przedstawia zawodników naszych lig.',
    praviceNaslov: 'Twoje prawa',
    pravice:
      'Konto i wszystkie swoje dane możesz w każdej chwili usunąć sam: w menu konta wybierz <b>Usuń konto</b> (slff.eu/account). W sprawie poprawienia nazwy wyświetlanej lub jeśli usunięcie się nie powiedzie, napisz na <eposta>info@slff.eu</eposta>. Po usunięciu znika też twoja drużyna z rankingu.',
    pravilaNaslov: 'Zasady gry',
    pravila:
      'Jeden człowiek, jedno konto. Głosowanie o asystach i pozycjach służy prawdziwym poprawkom — celowo błędne głosowanie psuje grę wszystkim i może skończyć się usunięciem konta. Punktacja i ceny mogą się w trakcie sezonu zmienić, jeśli okaże się, że coś jest niesprawiedliwe; takie zmiany ogłosimy.',
    jamstvoNaslov: 'Bez gwarancji',
    jamstvo:
      'Strona działa tak, jak działa. Staramy się, by dane były poprawne, a strona dostępna, ale nie możemy tego zagwarantować — protokoły bywają opóźnione, a statystyki mogą zawierać błędy.',
  },
}
