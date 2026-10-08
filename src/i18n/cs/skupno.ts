// Český překlad společných řetězců (zdroj: src/i18n/sl/skupno.ts).
// Pojmy jako na fotbal.cz: brankář, obránce, záložník, útočník.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Brankář',
    DEF: 'Obránce',
    MID: 'Záložník',
    FWD: 'Útočník',
  },
  pozicijaKratko: {
    GK: 'BRA',
    DEF: 'OBR',
    MID: 'ZÁL',
    FWD: 'ÚTO',
  },
  // Čeština: one = 1, few = 2-4, many = desetinná čísla, other = 0 a 5+.
  besede: {
    tocke: { one: 'bod', few: 'body', many: 'bodu', other: 'bodů' },
    tockRodilnik: { one: 'bodu', few: 'bodů', many: 'bodu', other: 'bodů' },
    tockeTozilnik: { one: 'bod', few: 'body', many: 'bodu', other: 'bodů' },
    igralci: { one: 'hráč', few: 'hráči', many: 'hráče', other: 'hráčů' },
    ekipe: { one: 'tým', few: 'týmy', many: 'týmu', other: 'týmů' },
    tekme: { one: 'zápas', few: 'zápasy', many: 'zápasu', other: 'zápasů' },
    goli: { one: 'gól', few: 'góly', many: 'gólu', other: 'gólů' },
    glasovi: { one: 'hlas', few: 'hlasy', many: 'hlasu', other: 'hlasů' },
    krogi: { one: 'kolo', few: 'kola', many: 'kola', other: 'kol' },
  },
  cena: '{v} M€',
  nalaganje: 'Načítání …',
  shrani: 'Uložit',
  preklici: 'Zrušit',
  zapri: 'Zavřít',
  nazaj: 'Zpět',
  napaka: 'Chyba: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Miniliga s tímto kódem neexistuje.',
    niTvojaEkipa: 'Tohle není tvůj tým.',
    imeMiniLige: 'Název miniligy musí mít 2 až 40 znaků.',
    prijavaMiniLiga: 'Pro miniligu se musíš přihlásit.',
    niDovoljenja: 'Nemáš oprávnění upravovat tento tým.',
    kodaNeUstvarjena: 'Kód miniligy se nepodařilo vytvořit. Zkus to znovu.',
    golOdlocen: 'O tomto gólu už je rozhodnuto, hlasování skončilo.',
    zePoznavalec: 'Už jsi znalec této ligy.',
    prosnjaCaka: 'Tvoje žádost pro tuto ligu už čeká na vyřízení.',
    prosnjaZavrnjena: 'Žádost pro tuto ligu byla nedávno zamítnuta. Novou můžeš poslat 14 dní po zamítnutí.',
    klubNeIgra: 'Vybraný klub v této lize nehraje.',
  },
}
