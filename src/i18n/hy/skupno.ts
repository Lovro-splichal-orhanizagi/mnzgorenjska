// Հայերեն թարգմանություն՝ `skupno` (izvor: src/i18n/sl/skupno.ts).
// Տերմինները՝ ինչպես հայկական սպորտային լրատվամիջոցներում. դարպասապահ, պաշտպան, կիսապաշտպան, հարձակվող.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  anonimenIgralec: 'Խաղացող {n}',
  naZeljoKluba: 'Ակումբի խնդրանքով խաղացողների անունները չեն ցուցադրվում։',
  pozicija: {
    GK: 'Դարպասապահ',
    DEF: 'Պաշտպան',
    MID: 'Կիսապաշտպան',
    FWD: 'Հարձակվող',
  },
  pozicijaKratko: {
    GK: 'ԴԱՐ',
    DEF: 'ՊԱՇ',
    MID: 'ԿԻՍ',
    FWD: 'ՀԱՐ',
  },
  // Հայերեն: one = 0 և 1 (նաև 1,5), other = մնացածը. թվից հետո գոյականը մնում է եզակի ("2 միավոր").
  besede: {
    tocke: { one: 'միավոր', other: 'միավոր' },
    tockRodilnik: { one: 'միավոր', other: 'միավոր' },
    tockeTozilnik: { one: 'միավոր', other: 'միավոր' },
    igralci: { one: 'խաղացող', other: 'խաղացող' },
    ekipe: { one: 'թիմ', other: 'թիմ' },
    tekme: { one: 'խաղ', other: 'խաղ' },
    goli: { one: 'գոլ', other: 'գոլ' },
    glasovi: { one: 'ձայն', other: 'ձայն' },
    krogi: { one: 'տուր', other: 'տուր' },
  },
  cena: '{v} մլն €',
  nalaganje: 'Բեռնվում է …',
  shrani: 'Պահպանել',
  preklici: 'Չեղարկել',
  zapri: 'Փակել',
  nazaj: 'Հետ',
  napaka: 'Սխալ: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Այս կոդով մինի լիգա չկա։',
    niTvojaEkipa: 'Սա քո թիմը չէ։',
    imeMiniLige: 'Մինի լիգայի անունը պետք է լինի 2-ից 40 նիշ։',
    prijavaMiniLiga: 'Մինի լիգաներից օգտվելու համար մուտք գործիր։',
    niDovoljenja: 'Դու չես կարող խմբագրել այս թիմը։',
    kodaNeUstvarjena: 'Չհաջողվեց ստեղծել մինի լիգայի կոդ։ Փորձիր նորից։',
    golOdlocen: 'Այս գոլի հարցն արդեն որոշված է, քվեարկությունն ավարտված է։',
    zePoznavalec: 'Դու արդեն այս լիգայի գիտակն ես։',
    prosnjaCaka: 'Այս լիգայի համար քո հայտն արդեն սպասման մեջ է։',
    prosnjaZavrnjena: 'Այս լիգայի համար քո հայտը վերջերս մերժվել է։ Նորը կարող ես ուղարկել մերժումից 14 օր անց։',
    klubNeIgra: 'Ընտրված ակումբը չի խաղում այս լիգայում։',
    omejen: 'Քո հաշիվը սահմանափակված է մինչև {do}։ Մինչ այդ չես կարող քվեարկել, գրել զրուցարանում կամ ուղարկել հաղորդումներ։',
  },
}
