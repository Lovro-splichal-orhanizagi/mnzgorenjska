// Македонски превод: `skupno` (izvor: src/i18n/sl/skupno.ts).
// Изрази како во македонските спортски медиуми: голман, одбранбен, среден ред, напаѓач.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  anonimenIgralec: 'Играч {n}',
  naZeljoKluba: 'На барање на клубот, играчите не се прикажани со име.',
  pozicija: {
    GK: 'Голман',
    DEF: 'Одбранбен',
    MID: 'Среден ред',
    FWD: 'Напаѓач',
  },
  pozicijaKratko: {
    GK: 'ГОЛ',
    DEF: 'ОДБ',
    MID: 'СРЕ',
    FWD: 'НАП',
  },
  // Македонски: one = 1, 21, 31 … (без 11); other = сè останато, со бројна форма ("2 поени").
  besede: {
    tocke: { one: 'поен', other: 'поени' },
    tockRodilnik: { one: 'поен', other: 'поени' },
    tockeTozilnik: { one: 'поен', other: 'поени' },
    igralci: { one: 'играч', other: 'играчи' },
    ekipe: { one: 'тим', other: 'тима' },
    tekme: { one: 'натпревар', other: 'натпревари' },
    goli: { one: 'гол', other: 'гола' },
    glasovi: { one: 'глас', other: 'гласа' },
    krogi: { one: 'коло', other: 'кола' },
  },
  cena: '{v} M€',
  nalaganje: 'Се вчитува …',
  shrani: 'Зачувај',
  preklici: 'Откажи',
  zapri: 'Затвори',
  nazaj: 'Назад',
  napaka: 'Грешка: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Мини лига со тој код не постои.',
    niTvojaEkipa: 'Тоа не е твојот тим.',
    imeMiniLige: 'Името на мини лигата мора да има меѓу 2 и 40 знаци.',
    prijavaMiniLiga: 'За мини лига мора да се најавиш.',
    niDovoljenja: 'Немаш дозвола да го уредуваш овој тим.',
    kodaNeUstvarjena: 'Кодот на мини лигата не можеше да се создаде. Обиди се повторно.',
    golOdlocen: 'За овој гол веќе е одлучено, гласањето е завршено.',
    zePoznavalec: 'Веќе си познавач на оваа лига.',
    prosnjaCaka: 'Твоето барање за оваа лига веќе чека.',
    prosnjaZavrnjena: 'Барањето за оваа лига неодамна беше одбиено. Ново можеш да испратиш 14 дена по одбивањето.',
    klubNeIgra: 'Избраниот клуб не игра во оваа лига.',
  },
}
