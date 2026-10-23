// Polskie `skupno` (źródło: src/i18n/sl/skupno.ts).
// Terminy jak w polskich grach fantasy: bramkarz, obrońca, pomocnik, napastnik.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  anonimenIgralec: 'Zawodnik {n}',
  naZeljoKluba: 'Na prośbę klubu zawodnicy nie są pokazywani z nazwiska.',
  pozicija: {
    GK: 'Bramkarz',
    DEF: 'Obrońca',
    MID: 'Pomocnik',
    FWD: 'Napastnik',
  },
  pozicijaKratko: {
    GK: 'BR',
    DEF: 'OBR',
    MID: 'POM',
    FWD: 'NAP',
  },
  // Polski: one = 1, few = 2-4 (22-24 …), many = 0, 5-21 (25 …), other = ułamki ("1,5 punktu").
  besede: {
    tocke: { one: 'punkt', few: 'punkty', many: 'punktów', other: 'punktu' },
    /** Dopełniacz ("odjęcie 1 punktu, 2 punktów"). */
    tockRodilnik: { one: 'punktu', few: 'punktów', many: 'punktów', other: 'punktu' },
    /** Biernik ("przyniosła 1 punkt, 2 punkty"). */
    tockeTozilnik: { one: 'punkt', few: 'punkty', many: 'punktów', other: 'punktu' },
    igralci: { one: 'zawodnik', few: 'zawodnicy', many: 'zawodników', other: 'zawodnika' },
    ekipe: { one: 'drużyna', few: 'drużyny', many: 'drużyn', other: 'drużyny' },
    tekme: { one: 'mecz', few: 'mecze', many: 'meczów', other: 'meczu' },
    goli: { one: 'gol', few: 'gole', many: 'goli', other: 'gola' },
    glasovi: { one: 'głos', few: 'głosy', many: 'głosów', other: 'głosu' },
    krogi: { one: 'kolejka', few: 'kolejki', many: 'kolejek', other: 'kolejki' },
  },
  cena: '{v} mln €',
  nalaganje: 'Ładowanie…',
  shrani: 'Zapisz',
  preklici: 'Anuluj',
  zapri: 'Zamknij',
  nazaj: 'Wstecz',
  napaka: 'Błąd: {sporocilo}',
  napakeRpc: {
    miniLigaNi: 'Nie ma miniligi z tym kodem.',
    niTvojaEkipa: 'To nie jest twoja drużyna.',
    imeMiniLige: 'Nazwa miniligi musi mieć od 2 do 40 znaków.',
    prijavaMiniLiga: 'Aby dołączyć do miniligi, musisz się zalogować.',
    niDovoljenja: 'Brak uprawnień do edycji tej drużyny.',
    kodaNeUstvarjena: 'Nie udało się utworzyć kodu miniligi. Spróbuj ponownie.',
    golOdlocen: 'O tym golu już zdecydowano, głosowanie jest zamknięte.',
    zePoznavalec: 'Już jesteś znawcą tej ligi.',
    prosnjaCaka: 'Twoja prośba dotycząca tej ligi już czeka na rozpatrzenie.',
    prosnjaZavrnjena: 'Twoja prośba dotycząca tej ligi została niedawno odrzucona. Nową możesz złożyć 14 dni po odrzuceniu.',
    klubNeIgra: 'Wybrany klub nie gra w tej lidze.',
  },
}
