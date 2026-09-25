// Slovenský preklad spoločných reťazcov (zdroj: src/i18n/sl/skupno.ts).
// Pojmy ako na futbalnet.sk: brankár, obranca, záložník, útočník.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Brankár',
    DEF: 'Obranca',
    MID: 'Záložník',
    FWD: 'Útočník',
  },
  pozicijaKratko: {
    GK: 'BRA',
    DEF: 'OBR',
    MID: 'ZÁL',
    FWD: 'ÚTO',
  },
  // Slovenčina: one = 1, few = 2–4, many = desatinné čísla, other = 0 a 5+.
  besede: {
    tocke: { one: 'bod', few: 'body', many: 'bodu', other: 'bodov' },
    tockRodilnik: { one: 'bodu', few: 'bodov', many: 'bodu', other: 'bodov' },
    tockeTozilnik: { one: 'bod', few: 'body', many: 'bodu', other: 'bodov' },
    igralci: { one: 'hráč', few: 'hráči', many: 'hráča', other: 'hráčov' },
    ekipe: { one: 'tím', few: 'tímy', many: 'tímu', other: 'tímov' },
    tekme: { one: 'zápas', few: 'zápasy', many: 'zápasu', other: 'zápasov' },
    goli: { one: 'gól', few: 'góly', many: 'gólu', other: 'gólov' },
    glasovi: { one: 'hlas', few: 'hlasy', many: 'hlasu', other: 'hlasov' },
    krogi: { one: 'kolo', few: 'kolá', many: 'kola', other: 'kôl' },
  },
  cena: '{v} M€',
  nalaganje: 'Načítava sa …',
  shrani: 'Uložiť',
  preklici: 'Zrušiť',
  zapri: 'Zavrieť',
  nazaj: 'Späť',
  napaka: 'Chyba: {sporocilo}',
}
