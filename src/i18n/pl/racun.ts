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
    posljiPotrditevZnova: 'Wyślij ponownie e-mail z potwierdzeniem',
    potrditevPoslanaZnova:
      'Wysłaliśmy nowy e-mail z potwierdzeniem. Sprawdź też folder spam.',
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
    predlogEposte: 'Czy chodziło o {eposta}?',
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
    posiljaj: 'Przypomnienia e-mailem',
    shranjujem: 'Zapisuję…',
    vklopljeni: 'Przypomnienia są włączone.',
    izklopljeni: 'Nie będziemy już wysyłać ci przypomnień.',
    odjavaVprasanje: 'Nie chcesz już dostawać e-maili od SLFF (przypomnień przed terminem i powiadomień o drużynie)?',
    odjavaGumb: 'Wypisz mnie',
    odjavaNapaka: 'Link jest nieprawidłowy. Zaloguj się i wyłącz przypomnienia w ustawieniach.',
    push: 'Powiadomienia push',
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
  nastavitve: {
    naslov: 'Ustawienia konta',
    moraPrijava: 'Aby edytować konto, musisz się <prijava>zalogować</prijava>.',
    nalagam: 'Wczytuję…',
    napakaNalaganja: 'Nie udało się wczytać ustawień.',
    shranjujem: 'Zapisuję…',
    shranjeno: 'Zapisano.',
    napakaShranjevanja: 'Zapisywanie się nie powiodło. Spróbuj ponownie.',
    profilNaslov: 'Profil',
    mojProfil: 'Zobacz swój publiczny profil',
    prikaznoIme: 'Nazwa wyświetlana',
    imeOpis: 'Widzą ją inni w rankingach. Od 3 do 24 znaków, możesz ją zmienić raz na 7 dni.',
    imeNaslednjic: 'Nazwę możesz ponownie zmienić od {datum}.',
    shraniIme: 'Zapisz nazwę',
    avatar: 'Awatar',
    avatarOpis: 'Wybierz kolor oraz inicjały albo ikonę piłkarską.',
    barva: 'Kolor',
    barvaN: 'Kolor {n}',
    slika: 'Obrazek',
    zacetnice: 'Inicjały',
    ikone: {
      zoga: 'Piłka',
      gol: 'Bramka',
      pokal: 'Puchar',
      copat: 'But piłkarski',
      rokavice: 'Rękawice bramkarskie',
      dres: 'Koszulka',
      zastavica: 'Chorągiewka rożna',
      navijac: 'Kibic',
    },
    klubNaslov: 'Klub, któremu kibicujesz',
    klubOpis: 'Pokazuje się na twoim profilu, a twoje punkty liczą się dla klubu w tabeli kibiców.',
    klubIsci: 'Szukaj klubu…',
    klubNiZadetkov: 'Nie znaleziono żadnego klubu.',
    klubBrez: 'Nie wybrałeś jeszcze klubu.',
    klubOdstrani: 'Usuń klub',
    jezikNaslov: 'Język i kraj',
    jezikOpis: 'Język strony i kraj, którego ligi widzisz. Wybór obowiązuje w tej przeglądarce.',
    obvestilaNaslov: 'Powiadomienia',
    zasebnostNaslov: 'Prywatność',
    javniProfil: 'Profil publiczny',
    javniProfilOpis: 'Inni widzą na twoim profilu twoje drużyny, klub i osiągnięcia. Gdy profil jest wyłączony, widać tylko wyświetlaną nazwę.',
    prijavaNaslov: 'Logowanie i hasło',
    prijavljenZ: 'Jesteś zalogowany adresem {email}.',
    geslo: 'Zmień hasło',
    gesloOpis: 'Wyślemy ci e-mailem link, za pomocą którego ustawisz nowe hasło.',
    gesloPoslano: 'Wysłaliśmy link na {email}. Sprawdź pocztę (także spam).',
    gesloNapaka: 'Nie udało się wysłać linku. Spróbuj ponownie za kilka minut.',
    eposta: 'Aby zmienić adres e-mail, napisz do nas na <eposta>info@slff.eu</eposta>.',
    napake: {
      dolzina: 'Wyświetlana nazwa musi mieć od 3 do 24 znaków.',
      znaki: 'Wyświetlana nazwa zawiera niedozwolone znaki.',
      rezervirano: 'Ta nazwa jest zarezerwowana dla zespołu SLFF. Wybierz inną.',
      neprimerno: 'Ta nazwa jest nieodpowiednia. Wybierz inną.',
      prepogosto: 'Wyświetlaną nazwę możesz zmienić raz na 7 dni.',
      zasedeno: 'Ta wyświetlana nazwa jest już zajęta.',
    },
  },
  profil: {
    naslov: 'Profil',
    niProfila: 'Ten profil nie istnieje. Konto mogło zostać usunięte.',
    nazaj: 'Do rankingu',
    zaseben: 'Ten profil jest prywatny.',
    tvojZaseben: 'Twój profil jest prywatny: inni widzą tylko wyświetlaną nazwę.',
    uredi: 'Edytuj profil',
    clanOd: 'Członek od {datum}',
    navija: 'Kibicuje',
    ekipe: 'Drużyny',
    brezEkip: 'Nie ma jeszcze drużyny w aktywnych ligach.',
    mesto: 'Miejsce {mesto} z {ekip}',
    miniLige: 'Wspólne miniligi',
    dosezki: 'Osiągnięcia',
    sezone: 'Sezony',
    krogi: 'Rozegrane kolejki',
    najboljsiKrog: 'Najlepsza kolejka',
  },
  izbris: {
    naslov: 'Usuwanie konta',
    moraPrijava: 'Aby usunąć konto, musisz się <prijava>zalogować</prijava>.',
    opis: 'Usuniemy konto {email}: profil, wszystkie twoje drużyny z historią punktów, głosy i miniligi, które utworzyłeś. Usunięcia nie można cofnąć. Usunięcie konta kończy też odznakę zweryfikowanego zawodnika, a subskrypcja zatrzymuje się bez zwrotu pieniędzy.',
    gumb: 'Usuń konto',
    potrdi: 'Tak, usuń na zawsze',
    preklici: 'Anuluj',
    brisem: 'Usuwam…',
    napaka: 'Nie udało się usunąć konta: {napaka}',
  },
  pravno: {
    naslov: 'Prywatność i regulamin',
    zadnjaSprememba: 'Ostatnia zmiana: 16 października 2026',
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
      'Nie przechowujemy numeru telefonu ani danych karty płatniczej, a adres tylko wtedy, gdy zamówisz drukowaną odznakę (zob. niżej). Nie używamy plików cookie do śledzenia ani narzędzi reklamowych. W przeglądarce zapisane są twoja sesja logowania, identyfikator rozmowy na czacie pomocy, jeśli go otworzysz, oraz znaczniki sesji, dzięki którym wizytę na stronie liczymy tylko raz. Ile osób otworzyło którą stronę, liczymy wyłącznie jako dzienną sumę — bez twojego imienia, konta, urządzenia czy adresu IP. Ogólne statystyki odwiedzin (które strony, skąd przychodzą odwiedzający, rodzaj urządzenia i kraj, kilka działań, takich jak zbudowanie drużyny) zapisuje <b>Umami</b> na naszym serwerze: bez plików cookie, nie zapisuje adresu IP i nie łączy wizyty z twoim kontem. Jeśli przeglądarka ma włączoną opcję „Do Not Track”, nic nie jest zapisywane.',
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
      'Konto i wszystkie swoje dane możesz w każdej chwili usunąć sam: w menu konta wybierz <b>Usuń konto</b> (slff.eu/account). W sprawie poprawienia nazwy wyświetlanej lub jeśli usunięcie się nie powiedzie, napisz na <eposta>info@slff.eu</eposta>. Po usunięciu znika też twoja drużyna z rankingu. Zapis zakupu odznaki zweryfikowanego zawodnika zostaje przez 10 lat, jak wymagają przepisy o rachunkowości, a adres dostawy zgodnie z zasadą powyżej.',
    pravilaNaslov: 'Zasady gry',
    pravila:
      'Jeden człowiek, jedno konto. Głosowanie o asystach i pozycjach służy prawdziwym poprawkom — celowo błędne głosowanie psuje grę wszystkim i może skończyć się usunięciem konta. Punktacja i ceny mogą się w trakcie sezonu zmienić, jeśli okaże się, że coś jest niesprawiedliwe; takie zmiany ogłosimy.',
    jamstvoNaslov: 'Bez gwarancji',
    jamstvo:
      'Strona działa tak, jak działa. Staramy się, by dane były poprawne, a strona dostępna, ale nie możemy tego zagwarantować — protokoły bywają opóźnione, a statystyki mogą zawierać błędy. Dotyczy to darmowej gry. Usługi płatne podlegają warunkom z sekcji Usługi płatne i twoim ustawowym prawom konsumenta.',
    kajJePlacljivo:
      'Jedyną płatną rzeczą jest nieobowiązkowa odznaka zweryfikowanego zawodnika (zob. niżej Usługi płatne).',
    podatkiPlacilo:
      '<b>Zakup odznaki zweryfikowanego zawodnika (tylko jeśli kupisz).</b> Zapis zakupu (co, kiedy, kwota i twój identyfikator klienta w Stripe) przechowujemy przez 10 lat, jak wymagają przepisy o rachunkowości. Adres dostawy drukowanej odznaki przechowujemy przez 90 dni od wysyłki lub anulowania zamówienia i najdłużej 12 miesięcy od zamówienia, potem zostaje tylko kraj.',
    dostopStripe:
      'Płatności za odznakę zweryfikowanego zawodnika obsługuje <b>Stripe</b> (Stripe Payments Europe, Irlandia): otrzymuje twoje imię i nazwisko, e-mail, adres rozliczeniowy, a przy drukowanej odznace adres dostawy. Dane karty wpisujesz bezpośrednio w Stripe, my ich nie widzimy.',
    placljivoNaslov:
      'Usługi płatne: zweryfikowani zawodnicy',
    placljivoUvod:
      'Gra jest i pozostanie darmowa. Płatna jest tylko nieobowiązkowa odznaka zweryfikowanego zawodnika, którą może kupić zawodnik, który potwierdził, że profil jest jego. Odznaka nigdy nie wpływa na punkty, ceny, drużyny fantasy ani zasady gry. Te warunki dotyczą tego zakupu.',
    prodajalec:
      '<b>Sprzedawca:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Słowenia, wpisana do rejestru sądowego prowadzonego przez Sąd Okręgowy w Lublanie. Numer rejestrowy 9850538000, NIP UE SI42765153. Kontakt: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Co kupujesz.</b> Niebieski znaczek przy nazwisku zawodnika i dodatki profilu (dłuższy opis, linki, baner, kolor, wyróżniony mecz lub statystyka, wiadomość do kibiców). Subskrypcja roczna kosztuje 9,99 € i odnawia się automatycznie co roku. Zakup na zawsze kosztuje jednorazowo 29 € i obowiązuje, dopóki SLFF oferuje tę usługę. Do zakupu na zawsze możesz dodać drukowaną odznakę z imieniem za 5 € plus wysyłka 2 € (Słowenia) lub 4 € (inny kraj UE). Wysyłamy tylko do krajów UE, dostawa trwa zwykle 2-3 tygodnie. Wszystkie ceny zawierają VAT.',
    placilo:
      '<b>Płatność.</b> Płatność obsługuje Stripe. Nie widzimy i nie przechowujemy danych karty. Kupić możesz tylko, jeśli masz co najmniej 18 lat. Umowa zostaje zawarta, gdy Stripe potwierdzi płatność.',
    odpoved:
      '<b>Rezygnacja z subskrypcji.</b> Subskrypcję możesz anulować w każdej chwili przyciskiem Zarządzaj subskrypcją na stronie konta (slff.eu/account) lub na profilu zawodnika. Rezygnacja działa z końcem opłaconego roku; do tego czasu odznaka zostaje. Za rozpoczęty już rok nie zwracamy pieniędzy, z wyjątkiem przypadków poniżej.',
    odstop:
      '<b>Prawo odstąpienia.</b> Treść cyfrowa (znaczek i dodatki) jest dostarczana od razu po płatności. Przed płatnością wyraźnie zgadzasz się na natychmiastowe dostarczenie i potwierdzasz, że tracisz przez to 14-dniowe prawo odstąpienia od umowy (art. 16 lit. m dyrektywy 2011/83/UE, słoweńska ustawa ZVPot-1). Drukowana odznaka jest wykonywana według twoich wskazówek (imię na odznace), więc prawo odstąpienia jej nie dotyczy (art. 16 lit. c). Ustawowe uprawnienia z tytułu niezgodności towaru z umową pozostają: jeśli odznaka dotrze uszkodzona, błędna lub wcale, napisz do nas, a bezpłatnie ją wymienimy lub zwrócimy pieniądze.',
    konec:
      '<b>Kiedy odznaka wygasa.</b> Odznaka wygasa, jeśli okaże się, że profil nie jest twój i cofniemy potwierdzenie, jeśli nazwisko zawodnika ukryjemy na jego prośbę lub prośbę związku albo jeśli usuniesz konto. Subskrypcja zatrzymuje się wtedy automatycznie i nie jest już pobierana. Jeśli zakwestionujesz płatność w banku (chargeback), odznaka zostaje odebrana.',
    vracila:
      '<b>Zwroty.</b> W razie nadużycia lub fałszywego potwierdzenia profilu nie zwracamy pieniędzy. Jeśli odznaka wygaśnie z naszej winy, na prośbę związku lub dlatego, że wycofamy usługę, przy subskrypcji rocznej zwracamy proporcjonalną część za niewykorzystane miesiące. Przy zakupie na zawsze zwracamy całą kwotę w ciągu pierwszych 12 miesięcy od zakupu, a później proporcjonalną część za okres pozostały do 5 lat od zakupu. Drukowanej odznaki i kosztów wysyłki przy wycofaniu usługi nie zwracamy (odznaka zostaje twoja), tylko w razie wady.',
    pritozbe:
      '<b>Pytania i reklamacje.</b> Napisz na <eposta>info@slff.eu</eposta>, odpowiemy w ciągu 8 dni roboczych. Nie uznajemy żadnego podmiotu pozasądowego rozwiązywania sporów konsumenckich. Obowiązuje prawo słoweńskie; nie pozbawia cię to ochrony, którą daje ci prawo kraju, w którym mieszkasz.',
    scoutNaslov: 'SLFF Club i moduł Scout',
    scoutKaj:
      'Z tych samych publicznych protokołów meczowych obliczamy wskaźniki zawodników lig seniorskich: udział minut, gole, wpływ na boisku, stracone gole, kartki i rozwój na przestrzeni sezonów, dostosowane do siły ligi. To wskaźniki z danych meczowych, a nie ocena osoby. Zobaczą je kluby z subskrypcją SLFF Scout, które szukają zawodników; decyzję zawsze podejmuje człowiek w klubie. Nie przetwarzamy lig młodzieżowych na potrzeby wyszukiwania zawodników. Kto kiedykolwiek grał w lidze młodzieżowej, jest wykluczony, dopóki nie ma minut w lidze seniorskiej i nie poda na swoim profilu roku urodzenia, według którego w tym roku kończy co najmniej 19 lat.',
    scoutPodlaga:
      'Podstawą prawną jest prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO): pomoc klubom w znalezieniu zawodników na podstawie publicznie opublikowanych wyników. Wskaźniki obliczamy codziennie od nowa i przechowujemy tylko ostatnie obliczenia. Wyświetlenia profili przez kluby będziemy rejestrować przez 12 miesięcy, aby zapobiegać nadużyciom i aby na prośbę zawodnika powiedzieć mu, które kluby go oglądały.',
    scoutPrivolitev:
      'Zawodnik z przejętym profilem może dodać, że jest otwarty na transfer, rok urodzenia, preferowane regiony i zgodę na kontakt. To zgoda (art. 6 ust. 1 lit. a RODO): widzą ją tylko kluby w Scout, można ją w każdej chwili wycofać na profilu, a po wycofaniu usuwamy dane.',
    scoutUgovor:
      'Sprzeciw: na przejętym profilu kliknij Ukryj mnie w Scout albo napisz na <eposta>info@slff.eu</eposta> z linkiem do strony zawodnika. W ciągu 14 dni ukryjemy zawodnika w Scout we wszystkich naszych ligach danego kraju, także przy późniejszych importach. W grze fantasy zostaje.',
    klubOrodje:
      'SLFF Club: klub z subskrypcją widzi swoich zawodników, także młodzieżowych: mecze z protokołów i obecność, którą wprowadza sam. Administratorem danych o obecności jest klub; my przetwarzamy je na jego polecenie i usuwamy 24 miesiące po wydarzeniu. Żądania dotyczące obecności wyślij do klubu lub do nas; przekażemy je dalej. Sprzeciw wobec Scout ukrywa cię przed innymi klubami, nie przed twoim własnym.',
    trgovinaNaslov: 'Sklep SLFF (shop.slff.eu)',
    trgovinaKaj:
      'Przy zakupie przetwarzamy imię i nazwisko, e-mail, adres dostawy, kupione produkty i kwoty, a jeśli jesteś zalogowany, także twoje konto SLFF. Płatność obsługuje Stripe: danych karty nie widzimy i nie przechowujemy. Imię i nazwisko oraz adres otrzymuje Pošta Slovenije w celu doręczenia. Aby ograniczyć nadużycia, przy niedokończonym zakupie tymczasowo przechowujemy skrót (nieodwracalny) adresu IP; jest usuwany po zapłacie lub wygaśnięciu zakupu. Tekst personalizacji (imię, numer) i nazwa drużyny fantasy na produkcie są częścią zamówienia; tekst otrzymuje też drukarnia, która wykonuje produkt. Wizyty w sklepie (wyświetlone strony, dodanie do koszyka, rozpoczęta i zakończona płatność) liczy Umami tak jak na slff.eu: bez plików cookie i bez adresu IP.',
    trgovinaPodlaga:
      'Podstawą prawną jest wykonanie umowy (art. 6 ust. 1 lit. b RODO) i obowiązki prawne (księgowość, podatki), a dla skrótu adresu IP prawnie uzasadniony interes w zapobieganiu nadużyciom (art. 6 ust. 1 lit. f RODO). Administratorem jest SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'Dane o zamówieniach i fakturach przechowujemy tak długo, jak wymagają tego ustawa o VAT i przepisy rachunkowe (10 lat po roku wystawienia faktury). E-mail do powiadomień o zamówieniu wykorzystujemy tylko dla tego zamówienia. W sprawie dostępu, sprostowania lub sprzeciwu napisz na <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Oficjalne konto klubu',
    aktiven: 'To konto reprezentuje klub {klub}.',
    pravice: 'Jako klub możesz edytować pozycje, dodawać zawodników i zatwierdzać profile swoich zawodników.',
    vprasanje: 'Reprezentujesz klub?',
    pojasnilo: 'Jeśli zalogujesz się oficjalnym adresem klubu, który mamy, automatycznie dostaniesz konto klubowe. Jeśli go nie mamy, poproś o to poniżej, a my go sprawdzimy.',
    klub: 'Klub',
    isciKlub: 'Szukaj klubu …',
    vloga: 'Twoja rola w klubie',
    vloge: {
      predsednik: 'prezes',
      tajnik: 'sekretarz',
      trener: 'trener',
      vodstvo: 'zarząd klubu',
      drugo: 'inna',
    },
    dokaz: 'Link, pod którym adres jest opublikowany (strona, Facebook, związek)',
    opomba: 'Uwaga (opcjonalnie)',
    naslovRacuna: 'Adres, który weryfikujemy: {email}',
    poslji: 'Wyślij prośbę',
    caka: 'Prośba dla {klub} czeka na sprawdzenie.',
    cakaBrezKluba: 'Twój adres jest wśród oficjalnych, ale musimy go jeszcze połączyć z klubem. Załatwimy to wkrótce.',
    cakaPolno: 'Klub ma już 5 kont. Sprawdzimy to i damy ci znać.',
    zavrnjeno: 'Prośba została odrzucona: {razlog}',
    nepotrjen: 'Najpierw potwierdź e-mail swojego konta.',
    napake: {
      zeKlub: 'Już reprezentujesz klub.',
      caka: 'Twoja prośba już czeka na decyzję.',
    },
  },
}
