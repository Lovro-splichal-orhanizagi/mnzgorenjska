// Danski prevod: `skupno` (izvor: src/i18n/sl/skupno.ts).
// Udtryk som i dansk fodbold (DBU): målmand, forsvarsspiller, midtbanespiller, angriber.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Målmand',
    DEF: 'Forsvarsspiller',
    MID: 'Midtbanespiller',
    FWD: 'Angriber',
  },
  pozicijaKratko: {
    GK: 'MM',
    DEF: 'FOR',
    MID: 'MID',
    FWD: 'ANG',
  },
  // Dansk: one = 1 (og decimaltal under 2, fx "1,5 point"), other = alt andet ("2 point").
  besede: {
    tocke: { one: 'point', other: 'point' },
    tockRodilnik: { one: 'point', other: 'point' },
    tockeTozilnik: { one: 'point', other: 'point' },
    igralci: { one: 'spiller', other: 'spillere' },
    ekipe: { one: 'hold', other: 'hold' },
    tekme: { one: 'kamp', other: 'kampe' },
    goli: { one: 'mål', other: 'mål' },
    glasovi: { one: 'stemme', other: 'stemmer' },
    krogi: { one: 'runde', other: 'runder' },
  },
  cena: '{v} mio. €',
  nalaganje: 'Indlæser …',
  shrani: 'Gem',
  preklici: 'Annuller',
  zapri: 'Luk',
  nazaj: 'Tilbage',
  napaka: 'Fejl: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Der findes ingen miniliga med denne kode.',
    niTvojaEkipa: 'Det er ikke dit hold.',
    imeMiniLige: 'Miniligaens navn skal være på 2 til 40 tegn.',
    prijavaMiniLiga: 'Log ind for at bruge miniligaer.',
    niDovoljenja: 'Du kan ikke redigere dette hold.',
    kodaNeUstvarjena: 'Vi kunne ikke oprette en kode til miniligaen. Prøv igen.',
    golOdlocen: 'Dette mål er allerede afgjort, afstemningen er lukket.',
    zePoznavalec: 'Du er allerede insider i denne liga.',
    prosnjaCaka: 'Din anmodning for denne liga venter allerede på svar.',
    prosnjaZavrnjena: 'Din anmodning for denne liga blev for nylig afvist. Du kan sende en ny om 14 dage.',
    klubNeIgra: 'Den valgte klub spiller ikke i denne liga.',
  },
}
