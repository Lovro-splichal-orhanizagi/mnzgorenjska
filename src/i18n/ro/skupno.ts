// Traducere în română: `skupno` (sursa: src/i18n/sl/skupno.ts).
// Termeni ca în fotbalul românesc: portar, fundaș, mijlocaș, atacant.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Portar',
    DEF: 'Fundaș',
    MID: 'Mijlocaș',
    FWD: 'Atacant',
  },
  pozicijaKratko: {
    GK: 'POR',
    DEF: 'FUN',
    MID: 'MIJ',
    FWD: 'ATA',
  },
  // Română: one = 1; few = 0, 2–19, 101–119 și zecimale; other = 20 și peste ("20 de puncte").
  // Numărul îl adaugă `mnozina()`, de aceea forma other începe cu "de".
  besede: {
    tocke: { one: 'punct', few: 'puncte', other: 'de puncte' },
    /** Genitiv în slovenă; în română aceeași formă ("o penalizare de 2 puncte"). */
    tockRodilnik: { one: 'punct', few: 'puncte', other: 'de puncte' },
    /** Acuzativ în slovenă; în română aceeași formă. */
    tockeTozilnik: { one: 'punct', few: 'puncte', other: 'de puncte' },
    igralci: { one: 'jucător', few: 'jucători', other: 'de jucători' },
    ekipe: { one: 'echipă', few: 'echipe', other: 'de echipe' },
    tekme: { one: 'meci', few: 'meciuri', other: 'de meciuri' },
    goli: { one: 'gol', few: 'goluri', other: 'de goluri' },
    glasovi: { one: 'vot', few: 'voturi', other: 'de voturi' },
    krogi: { one: 'etapă', few: 'etape', other: 'de etape' },
  },
  cena: '{v} M€',
  nalaganje: 'Se încarcă …',
  shrani: 'Salvează',
  preklici: 'Anulează',
  zapri: 'Închide',
  nazaj: 'Înapoi',
  napaka: 'Eroare: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Nu există nicio mini-ligă cu acest cod.',
    niTvojaEkipa: 'Nu e echipa ta.',
    imeMiniLige: 'Numele mini-ligii trebuie să aibă între 2 și 40 de caractere.',
    prijavaMiniLiga: 'Pentru o mini-ligă trebuie să te autentifici.',
    niDovoljenja: 'Nu ai permisiunea să editezi această echipă.',
    kodaNeUstvarjena: 'Codul mini-ligii nu a putut fi creat. Încearcă din nou.',
    golOdlocen: 'Despre acest gol s-a decis deja, votul s-a încheiat.',
    zePoznavalec: 'Ești deja cunoscător al acestei ligi.',
    prosnjaCaka: 'Cererea ta pentru această ligă așteaptă deja.',
    prosnjaZavrnjena: 'Cererea pentru această ligă a fost respinsă recent. Poți trimite una nouă la 14 zile după respingere.',
    klubNeIgra: 'Clubul ales nu joacă în această ligă.',
  },
}
