// Український переклад: `skupno` (izvor: src/i18n/sl/skupno.ts).
// Терміни як в українських спортивних медіа: воротар, захисник, півзахисник, нападник.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Воротар',
    DEF: 'Захисник',
    MID: 'Півзахисник',
    FWD: 'Нападник',
  },
  pozicijaKratko: {
    GK: 'ВР',
    DEF: 'ЗХ',
    MID: 'ПЗ',
    FWD: 'НП',
  },
  // Українська: one = 1, 21, 31 … (крім 11), few = 2-4, 22-24 … (крім 12-14),
  // many = 0, 5-20, 25 …, other = дробові ("1,5 очка").
  besede: {
    tocke: { one: 'очко', few: 'очки', many: 'очок', other: 'очка' },
    /** Родовий відмінок ("мінус 1 очка", "без 5 очок"). */
    tockRodilnik: { one: 'очка', few: 'очок', many: 'очок', other: 'очка' },
    /** Знахідний відмінок ("приніс 1 очко, 2 очки"). */
    tockeTozilnik: { one: 'очко', few: 'очки', many: 'очок', other: 'очка' },
    igralci: { one: 'гравець', few: 'гравці', many: 'гравців', other: 'гравця' },
    ekipe: { one: 'команда', few: 'команди', many: 'команд', other: 'команди' },
    tekme: { one: 'матч', few: 'матчі', many: 'матчів', other: 'матчу' },
    goli: { one: 'гол', few: 'голи', many: 'голів', other: 'гола' },
    glasovi: { one: 'голос', few: 'голоси', many: 'голосів', other: 'голосу' },
    krogi: { one: 'тур', few: 'тури', many: 'турів', other: 'туру' },
  },
  cena: '{v} млн €',
  nalaganje: 'Завантаження …',
  shrani: 'Зберегти',
  preklici: 'Скасувати',
  zapri: 'Закрити',
  nazaj: 'Назад',
  napaka: 'Помилка: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Міні-ліги з таким кодом немає.',
    niTvojaEkipa: 'Це не твоя команда.',
    imeMiniLige: 'Назва міні-ліги має містити від 2 до 40 символів.',
    prijavaMiniLiga: 'Щоб грати в міні-лігах, потрібно увійти.',
    niDovoljenja: 'Ти не можеш редагувати цю команду.',
    kodaNeUstvarjena: 'Не вдалося створити код міні-ліги. Спробуй ще раз.',
    golOdlocen: 'Щодо цього гола вже вирішено, голосування закрите.',
    zePoznavalec: 'Ти вже знавець цієї ліги.',
    prosnjaCaka: 'Твоя заявка для цієї ліги вже очікує розгляду.',
    prosnjaZavrnjena: 'Твою заявку для цієї ліги нещодавно відхилено. Нову можна надіслати через 14 днів.',
    klubNeIgra: 'Обраний клуб не грає в цій лізі.',
  },
}
