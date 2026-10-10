// Eestikeelne `skupno` (allikas: src/i18n/sl/skupno.ts).
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Väravavaht',
    DEF: 'Kaitsja',
    MID: 'Poolkaitsja',
    FWD: 'Ründaja',
  },
  pozicijaKratko: {
    GK: 'VV',
    DEF: 'KAI',
    MID: 'PK',
    FWD: 'RÜN',
  },
  // Intl.PluralRules('et'): one = 1, other = kõik muu (ka 0 ja kümnendmurrud).
  // Arvsõna järel on nimisõna ainsuse osastavas: "1 punkt", "3 punkti".
  besede: {
    tocke: { one: 'punkt', other: 'punkti' },
    tockRodilnik: { one: 'punkti', other: 'punkti' },
    tockeTozilnik: { one: 'punkti', other: 'punkti' },
    igralci: { one: 'mängija', other: 'mängijat' },
    ekipe: { one: 'meeskond', other: 'meeskonda' },
    tekme: { one: 'mäng', other: 'mängu' },
    goli: { one: 'värav', other: 'väravat' },
    glasovi: { one: 'hääl', other: 'häält' },
    krogi: { one: 'voor', other: 'vooru' },
  },
  cena: '{v} M€',
  nalaganje: 'Laadimine …',
  shrani: 'Salvesta',
  preklici: 'Tühista',
  zapri: 'Sulge',
  nazaj: 'Tagasi',
  napaka: 'Viga: {sporocilo}',
  // Andmebaasi vead (RPC), tõlgitud failis src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Selle koodiga miniliigat pole.',
    niTvojaEkipa: 'See pole sinu meeskond.',
    imeMiniLige: 'Miniliiga nimi peab olema 2 kuni 40 tähemärki.',
    prijavaMiniLiga: 'Miniliigade kasutamiseks logi sisse.',
    niDovoljenja: 'Sa ei saa seda meeskonda muuta.',
    kodaNeUstvarjena: 'Miniliiga koodi loomine ebaõnnestus. Proovi uuesti.',
    golOdlocen: 'Selle värava üle on juba otsustatud, hääletus on suletud.',
    zePoznavalec: 'Oled selle liiga asjatundja juba.',
    prosnjaCaka: 'Sinu taotlus selle liiga kohta on juba ootel.',
    prosnjaZavrnjena: 'Sinu taotlus selle liiga kohta lükati hiljuti tagasi. Uue saad saata 14 päeva pärast.',
    klubNeIgra: 'Valitud klubi selles liigas ei mängi.',
  },
}
