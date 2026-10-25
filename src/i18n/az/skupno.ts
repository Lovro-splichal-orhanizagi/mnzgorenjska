// Azərbaycan dilində tərcümə: `skupno` (izvor: src/i18n/sl/skupno.ts).
// Terminlər PFL və idman mediasındakı kimi: qapıçı, müdafiəçi, yarımmüdafiəçi, hücumçu.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  anonimenIgralec: 'Oyunçu {n}',
  naZeljoKluba: 'Klubun xahişi ilə oyunçuların adları göstərilmir.',
  pozicija: {
    GK: 'Qapıçı',
    DEF: 'Müdafiəçi',
    MID: 'Yarımmüdafiəçi',
    FWD: 'Hücumçu',
  },
  pozicijaKratko: {
    GK: 'QAP',
    DEF: 'MÜD',
    MID: 'YRM',
    FWD: 'HÜC',
  },
  // Azərbaycan dili: one = 1, other = qalan hər şey. Saydan sonra isim tək qalır ("1 xal, 2 xal, 21 xal").
  besede: {
    tocke: { one: 'xal', other: 'xal' },
    tockRodilnik: { one: 'xal', other: 'xal' },
    tockeTozilnik: { one: 'xal', other: 'xal' },
    igralci: { one: 'oyunçu', other: 'oyunçu' },
    ekipe: { one: 'komanda', other: 'komanda' },
    tekme: { one: 'oyun', other: 'oyun' },
    goli: { one: 'qol', other: 'qol' },
    glasovi: { one: 'səs', other: 'səs' },
    krogi: { one: 'tur', other: 'tur' },
  },
  cena: '{v} mln €',
  nalaganje: 'Yüklənir …',
  shrani: 'Yadda saxla',
  preklici: 'Ləğv et',
  zapri: 'Bağla',
  nazaj: 'Geri',
  napaka: 'Xəta: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Bu kodla mini-liqa yoxdur.',
    niTvojaEkipa: 'Bu sənin komandan deyil.',
    imeMiniLige: 'Mini-liqanın adı 2 ilə 40 simvol arasında olmalıdır.',
    prijavaMiniLiga: 'Mini-liqalar üçün daxil olmalısan.',
    niDovoljenja: 'Bu komandanı redaktə etmək hüququn yoxdur.',
    kodaNeUstvarjena: 'Mini-liqa kodu yaradıla bilmədi. Yenidən cəhd et.',
    golOdlocen: 'Bu qol artıq həll olunub, səsvermə bağlanıb.',
    zePoznavalec: 'Sən artıq bu liqanın bilicisisən.',
    prosnjaCaka: 'Bu liqa üçün müraciətin artıq gözləmədədir.',
    prosnjaZavrnjena: 'Bu liqa üçün müraciətin bu yaxınlarda rədd edilib. Yeni müraciəti rədd edilmədən 14 gün sonra göndərə bilərsən.',
    klubNeIgra: 'Seçilmiş klub bu liqada oynamır.',
    omejen: 'Hesabın bu tarixədək məhdudlaşdırılıb: {do}. O vaxta qədər səs verə, söhbətə yaza və bildiriş göndərə bilməzsən.',
  },
}
