// Azərbaycan dilində tərcümə: `mojaEkipa` (izvor: src/i18n/sl/mojaEkipa.ts).
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Komandam',
  /** Oyunçunun adı bilinməyəndə. */
  igralec: 'Oyunçu',
  vprasanjeZapustitve: 'Komandada yadda saxlanmamış dəyişikliklər var. Yenə də səhifədən çıxırsan?',
  /** Formadakı sarğı nişanı. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'M',
  },

  // Heyət qaydaları (lib/pravila.ts): bazardakı səbəblər və xəta siyahısı.
  pravila: {
    pozicije: {
      GK: 'Qapıçılar',
      DEF: 'Müdafiəçilər',
      MID: 'Yarımmüdafiəçilər',
      FWD: 'Hücumçular',
    },
    kaderPoln: 'Heyətin doludur ({n} oyunçu).',
    pozicijaPolna: '{pozicija}: heyətində artıq {n} var.',
    premaloProracuna: 'Büdcə çatmır: oyunçunun qiyməti {cena}, səndə {preostalo} qalıb.',
    izKluba: 'Bu klubdan artıq {n} oyunçun var: {klub}.',
    velikostEkipe: 'Heyətdə {n} oyunçu olmalıdır (indi {trenutno}).',
    velikostPostave: 'Əsas heyətdə {n} oyunçu olmalıdır (indi {trenutno}).',
    brezPozicije: {
      one: 'Seçilmiş {n} oyunçunun hələ təsdiqlənmiş mövqeyi yoxdur. Mövqelər bölməsində kömək et.',
      other: 'Seçilmiş {n} oyunçunun hələ təsdiqlənmiş mövqeyi yoxdur. Mövqelər bölməsində kömək et.',
    },
    niVecVLigi: '{ime} artıq liqada deyil, onu əvəz et.',
    pozicijaVKadru: 'Heyətdə {pozicija}: {n}, olmalıdır {kader}.',
    pozicijaVPostavi: 'Əsas heyətdə {pozicija}: {n}, icazə verilir {min} ilə {max} arası.',
    dolociKapetana: 'Kapitan seç, o, turda {n}× xal toplayır.',
    enKapetan: 'Yalnız bir kapitanın ola bilər.',
    dolociNamestnika: 'Kapitan oynamasa, sarğını taxacaq kapitan müavini seç.',
    istiKlub: 'Eyni klubdan ən çox {n} oyunçu seçə bilərsən.',
    presegelProracun: 'Büdcəni {cena} aşmısan.',
  },

  napake: {
    zeImas: 'Bu liqada artıq komandan var, səhifəni yenilə.',
    dovoljenje: 'Bunun üçün icazən yoxdur. Yenidən daxil ol və bir daha cəhd et.',
    povezava: 'Serverlə əlaqə yoxdur. İnternetini yoxla və yenidən cəhd et.',
    shranjevanje: 'Yadda saxlamaq alınmadı. Yenidən cəhd et.',
    nalaganjePovezava: 'Serverlə əlaqə yoxdur, internetini yoxla.',
    nalaganje: 'Komandanın məlumatlarını yükləmək alınmadı.',
    nalaganjeNiCelo:
      'Komanda tam yüklənməyincə yadda saxlana bilməz, əks halda yüklənməyən oyunçular silinərdi.',
    poskusiZnova: 'Yenidən cəhd et',
    vpisiIme: 'Əvvəlcə komandanın adını yaz.',
    osvezitev:
      'Komandan yadda saxlanıb, amma yeniləmək alınmadı. Yenidən redaktə etməzdən əvvəl səhifəni yenilə.',
    najprejShrani: 'Əvvəlcə komandanı yadda saxla.',
    izberiKrog: 'Bonusun aid olacağı turu seç.',
    prihodnjiKrog: 'Son tarixi müəyyən olunmuş, bağlanmamış növbəti turu seç.',
    zeUporabil: 'Bu bonusu bu mövsüm artıq istifadə etmisən.',
    niPreklica: 'Bu tur üçün bonusu artıq ləğv etmək olmaz.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'Bu liqada hələ bazarda oyunçu yoxdur.',
    pocakaj: 'Yadda saxlanmanın bitməsini gözlə.',
    niPredloga: 'Bu liqadan hələ düzgün komanda yığmaq mümkün deyil.',
    predlogSestavljen: 'Komandan yığıldı. İstədiyini dəyiş və Yadda saxla düyməsini bas.',
    kaderDopolnjen: 'Boş yerlər dolduruldu. Yoxla və Yadda saxla düyməsini bas.',
    niDopolnitve:
      'Qalan pulla heyətini tamamlamaq olmur. Bahalı oyunçulardan birini əvəz et və yenidən cəhd et.',
    kapetanNaKlop: '{ime} ehtiyata keçdi, yeni kapitan seç.',
    namestnikNaKlop: '{ime} ehtiyata keçdi, yeni kapitan müavini seç.',
    brezPozicije: 'Bu oyunçunun hələ təsdiqlənmiş mövqeyi yoxdur, ona görə meydana çıxarıla bilməz.',
    niProstora:
      'Əsas heyətdə bu mövqedən başqa oyunçu üçün yer yoxdur. Əvvəlcə kimisə ehtiyata keçir.',
    niVecNamestnik: '{ime} artıq kapitan müavini deyil, yenisini seç.',
    niVecKapetan: '{ime} artıq kapitan deyil, yenisini seç.',
    kapetanPrevzel: 'Kapitan sarğısını indi {ime} taxır.',
    namestnikPrevzel: 'Kapitan müavini indi {ime}.',
    rokPotekel: 'Tur {krog} üçün son tarix keçib, dəyişikliklər növbəti turdan qüvvəyə minir.',
    shranjenaZaKrog: 'Komandan yadda saxlanıb və tur {krog} üçün hazırdır.',
    shranjenaVeljavna: 'Komandan yadda saxlanıb və qaydalara uyğundur.',
    osnutekShranjen:
      'Qaralama yadda saxlanıb. Komandan hələ qaydalara uyğun deyil, ona görə bu turda xal toplamazdı.',
    prodaja: 'Satışdan qazancın: +{cena}.',
    nakupi: 'Alışların dəyəri: {cena}.',
    wildcardVlozen: 'Wildcard istifadə olundu: bu turda transferlər pulsuzdur.',
    klopPlusVlozen: 'Ehtiyat+ istifadə olundu.',
    wildcardPreklican: 'Wildcard ləğv olundu, onu başqa turda istifadə edə bilərsən.',
    klopPlusPreklican: 'Ehtiyat+ ləğv olundu, onu başqa turda istifadə edə bilərsən.',
    zapriOpozorilo: 'Xəbərdarlığı bağla',
    zapriObvestilo: 'Bildirişi bağla',
    odstranjen: '{ime} çıxarıldı.',
    razveljavi: 'Geri qaytar',
    dodan: '{ime} komandandadır, Yadda saxla düyməsini bas.',
    dodanSamodejno: '{ime} komandandadır.',
    zeVEkipi: '{ime} artıq komandandadır.',
    niNaTrgu: 'Bu oyunçunu indi almaq olmur.',
  },

  brezPrijave: {
    opis: 'Komandanı hesabsız yığa bilərsən. Yadda saxlayana qədər bu brauzerdə qalır.',
    shrani: 'Yadda saxla və hesab yarat',
    pripravljena: 'Komandan hazırdır, yadda saxla.',
  },
  locenaLiga:
    '<liga>{liga}</liga> liqasındakı komandan digər liqalardakı komandalarından ayrıdır: öz büdcəsi və öz reytinqi var. Xallar tur {krog} başlayandan etibarən sayılır, çünki o vaxta qədər transferlər və yaş qrupları arasında keçidlər hələ davam edir.',

  /** Zloženi razdelek pod igriščem. */
  vec: 'Daha çox: bonuslar, tarixçə, qaydalar',

  prestopi: {
    medSezono: {
      one: 'Mövsümün ortasında qoşulursan: tur {krog} üçün son tarixə qədər komandanı cəriməsiz yığa bilərsən. Sonra hər turda {n} pulsuz transferin olur, hər əlavə transfer −{kazen} dəyərindədir.',
      other: 'Mövsümün ortasında qoşulursan: tur {krog} üçün son tarixə qədər komandanı cəriməsiz yığa bilərsən. Sonra hər turda {n} pulsuz transferin olur, hər əlavə transfer −{kazen} dəyərindədir.',
    },
    stevec: 'Transferlər: {n}/{prosti}',
    wildcard: 'wildcard, cərimə yoxdur',
    odbitek: 'Bu turda çıxılıb: {tock}',
    prosti: {
      one: 'Daha {n} pulsuz, sonra hər biri −{kazen}',
      other: 'Daha {n} pulsuz, sonra hər biri −{kazen}',
    },
  },

  // Transfer məsləhətləri (lib/namigiEkipe.ts).
  namigi: {
    naslov: 'Transfer məsləhətləri',
    zaKrog: 'Tur {krog} üçün kim yəqin ki oynamayacaq və əvəzində kimi ala bilərsən.',
    razlog: {
      neaktiven: 'artıq liqada deyil',
      poskodba: 'zədəli',
      odsotnost: 'oynaya bilmir',
      brezTekme: 'klubun oyunu yoxdur',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: 'Heyətində {ime} oyunçusunu {novi} ilə əvəz et',
    niZamenjave: 'Büdcənə və qaydalara uyğun əvəzedici yoxdur.',
    opomba: 'Klik yalnız dəyişikliyi hazırlayır, komandanı özün yadda saxlayırsan. Hər məsləhət ayrıca keçərlidir.',
    skrij: 'Növbəti tura qədər gizlət',
    zamenjano: 'Heyətində {ime} yerinə indi {novi} var. Razı olanda komandanı yadda saxla.',
  },

  // Son ziyarətdən bəri heyət oyunçularının qiymət dəyişiklikləri.
  odZadnjegaObiska: {
    naslov: 'Son ziyarətindən bəri',
    naslovTeden: 'Son həftədə',
    vrednost: 'Komandanın dəyəri <znesek>{znak}{cena}</znesek>',
    gor: 'qiymət artımı',
    dol: 'qiymət enişi',
    zapri: 'Bağla',
  },

  povzetek: {
    urediIme: 'Komandanın adını dəyiş: {ime}',
    bogastvo:
      'sərvət <vrednost>{bogastvo}</vrednost><razlika></razlika> · heyət {kader} <placano>ödənilib</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Yadda saxlanılır …',
    shranjeno: 'Yadda saxlanıldı ✓',
    shraniEkipo: 'Komandanı yadda saxla',
    neshranjeno: 'Yadda saxlanmamış dəyişikliklər',
    imeEkipe: 'Komandanın adı',
    privzetoIme: 'FC {ime}',
    primerImena: 'məs. Bazar Qəhrəmanları',
  },

  // Boş komanda üçün başlanğıc bələdçisi.
  vodic: {
    napredek: '{trenutni} / {skupaj}',
    naprej: 'Növbəti',
    razumem: 'Aydındır',
    sestaviNaslov: 'Bir kliklə komanda',
    sestaviOpis: 'Bura toxun, büdcəyə uyğun düzgün komandanı sənin üçün yığaq. Sonra istədiyini dəyiş.',
    igrisceNaslov: 'Bu sənin komandandır',
    igrisceOpis: 'Ətraflı məlumat və ya dəyişiklik üçün oyunçuya toxun. Əsas heyət xal toplayır, kimsə oynamasa, ehtiyatdan oyunçu daxil olur.',
    shraniNaslov: 'Son addım: Yadda saxla',
    shraniOpis: 'Yadda saxlayan kimi növbəti turdan xal toplayırsan. Komandanı son tarixə qədər dəyişə bilərsən.',
  },
  zacetek: {
    naslov: 'Haradan başlamalı?',
    sestaviMi: 'Mənə komanda yığ',
    opisPredloga:
      'Büdcəyə uyğun təsadüfi düzgün komanda seçirik, hər klikdə fərqli. Sonra istədiyini dəyiş və yadda saxla.',
    sam: 'Özüm yığmaq istəyirəm',
    drugPredlog: 'Başqa təklif',
    opisDrugegaPredloga:
      'Xoşuna gəlmədi? Yeni komanda çək, yadda saxlayana qədər pulsuzdur.',
    dopolni: 'Komandamı tamamla',
    opisDopolnitve:
      'Heyətdə boş yer: {n}. Sənin seçimlərin qalır, qalanını büdcə daxilində təsadüfi dolduruq.',
    korak1: 'Yuxarıda komanda adı təklif etdik, istənilən vaxt dəyişə bilərsən.',
    korak2:
      'Meydanda boş yerə <krepko>＋</krepko> klik et. Telefonda aşağı paneldə <krepko>＋ Əlavə et</krepko> düyməsi də var, kompüterdə isə sağdakı <krepko>oyunçu bazarından</krepko> seçirsən.',
    korak3:
      'Heyət {n} oyunçudan ibarətdir: {gk} QAP, {def} MÜD, {mid} YRM, {fwd} HÜC. Eyni klubdan ən çox {klub}.',
    korak4:
      'Bütün yerlər dolanda <krepko>kapitan</krepko> və <krepko>kapitan müavini</krepko> seç, sonra <krepko>Komandanı yadda saxla</krepko> düyməsini bas (telefonda aşağı paneldə <krepko>Yadda saxla</krepko>).',
  },

  trak: {
    naslov: 'Sarğı',
    kapetan: 'Kapitan (×{n})',
    namestnik: 'Kapitan müavini',
    nihce: 'heç kim',
  },

  // "Bəs əgər": hazırkı heyətin son turda neçə xal toplayacağı.
  kajCe: {
    prinesla: 'Hazırkı heyət <krog>tur {krog}</krog> ({sezona}) üçün bu qədər xal gətirərdi:',
    opis: '"Bəs əgər" görünüşü: tarixi nəticə deyil, hər dəyişikliklə dəyişir. Keçmiş turların real xalları reytinqdə və heyətin şəklindədir.',
  },

  status: {
    manjka: 'Son yadda saxlama üçün hələ bir neçə şey lazımdır:',
    vpisiIme: 'Komandanın adını yaz (yuxarıdakı xanaya).',
    osnutekZdaj: 'İndi qaralamanı da yadda saxlaya bilərsən, qaydaları sonra düzəldərsən.',
    brezTock: 'Bu vəziyyətdə <krepko>tur {krog} üçün</krepko> <krepko>XAL TOPLAMAYACAQSAN</krepko>.',
    kajPomeni:
      '<krepko>"Yadda saxla" nə edir?</krepko> Dəyişikliklərin (heyət, əsas heyət, kapitan) bazaya yazılır. Cari tur üçün son tarixdəki vəziyyət sayılır. Son tarixə qədər istədiyin qədər dəyişə və Yadda saxla düyməsini basa bilərsən, son versiya sayılır. <krepko>"Qaralamanı yadda saxla"</krepko> eyni işi görür, sadəcə komandanın hələ bütün qaydalara uyğun olmadığını qeyd edir (xal toplamaq üçün düzəlişlər lazımdır, yuxarıdakı siyahıya bax).',
    kajPomeniRok:
      '<krepko>"Yadda saxla" nə edir?</krepko> Dəyişikliklərin (heyət, əsas heyət, kapitan) bazaya yazılır. Cari tur üçün son tarixdəki vəziyyət sayılır (<krepko>tur {krog}, {rok}</krepko>). Son tarixə qədər istədiyin qədər dəyişə və Yadda saxla düyməsini basa bilərsən, son versiya sayılır. <krepko>"Qaralamanı yadda saxla"</krepko> eyni işi görür, sadəcə komandanın hələ bütün qaydalara uyğun olmadığını qeyd edir (xal toplamaq üçün düzəlişlər lazımdır, yuxarıdakı siyahıya bax).',
  },

  pripomocki: {
    klopPlusNaslov: 'Ehtiyat+ bonusu',
    klopPlusVlozenZa: 'Tur {krog} ({sezona}) üçün istifadə olunub: ehtiyat oyunçuların xalları da sayılır.',
    klopPlusVlozen: 'Ehtiyat+ artıq istifadə olunub: ehtiyat oyunçuların xalları da sayılır.',
    klopPlusOpis:
      'Mövsümdə bir dəfə: seçilmiş turda dörd ehtiyat oyunçunun hamısının xalı da əlavə olunur.',
    wildcardNaslov: 'Wildcard bonusu',
    wildcardVlozenZa: 'Tur {krog} ({sezona}) üçün istifadə olunub: həmin turda transferlər pulsuzdur.',
    wildcardVlozen: 'Wildcard artıq istifadə olunub: həmin turda transferlər pulsuzdur.',
    wildcardOpis:
      'Mövsümdə bir dəfə: bu turda istədiyin qədər oyunçu dəyişə bilərsən, xal çıxılmadan.',
    zaklenjen: 'bağlanıb',
    preklici: 'ləğv et',
    prekliciDo: 'Ləğv etməyə qalıb: <odstevanje></odstevanje>',
    izberiKrog: 'Tur seç …',
    niKroga: 'Son tarixi olan növbəti tur yoxdur',
    krogSezona: 'Tur {krog} ({sezona})',
    vlozi: 'İstifadə et',
    vloziZa: 'Tur {krog} üçün istifadə et',
    potrdiWildcard: 'Wildcard tur {krog} üçün istifadə olunsun? Mövsümdə yalnız biri var.',
  },

  zgodovina: {
    naslov: 'Heyət tarixçəsi',
    posnetkov: {
      one: 'Şəkli olan {n} tur',
      other: 'Şəkli olan {n} tur',
    },
    krog: 'Tur {krog}',
    podrobnost: 'Tur {krog} · mövsüm {sezona}',
    podrobnostSkupaj: 'Tur {krog} · mövsüm {sezona} · cəmi <krepko>{tocke}</krepko>',
    deli: 'Tur {krog} paylaş',
  },

  // Telefonda aşağı panel və bazar.
  telefon: {
    ostane: 'qalıb',
    predalPovzetek: '<krepko>{cena}</krepko> qalıb · {n}/{velikost}',
    popravi: 'düzəlt ↑',
    neshranjeno: 'yadda saxlanmayıb',
    dodaj: '＋ Əlavə et',
    osnutekNamig: 'Komandan hələ qaydalara uyğun deyil, qaralama kimi yadda saxlanacaq.',
    neIzpolnjuje: 'komanda hələ qaydalara uyğun deyil',
    zapriTrg: 'Bazarı bağla',
    zapri: '✕ Bağla',
  },

  trg: {
    naslov: 'Oyunçu bazarı',
    iskanje: 'Ada görə axtar …',
    pocistiIskanje: 'Axtarışı təmizlə',
    vsi: 'hamısı',
    vsiKlubi: 'Bütün klublar',
    niZadetkov: 'Heç nə tapılmadı.',
    pocistiFiltre: 'Filtrləri təmizlə',
    statLetos: '{goli} Q · {minute} dəq',
    statLani: 'keçən mövsüm {goli} Q',
    brezNastopov: 'oyunu yoxdur',
    niVecVLigi: 'artıq liqada deyil',
    tockeZadnjiKrog: 'Son oynanmış turdakı xallar',
    podatki: 'Ətraflı: {ime}',
    podatkiNamig: 'Statistika, qiymət tarixçəsi, növbəti oyunlar',
    profilVNovemZavihku: 'Oyunçunun profilini yeni vərəqdə aç',
    odstrani: '✕ çıxar',
    dodaj: '⊕ əlavə et',
    prvih: 'İlk {n} oyunçu göstərilir, axtarışla daralt.',
    noga: 'Eyni klubdan ən çox {n} oyunçu seçə bilərsən. Qollar və dəqiqələr cari mövsümə aiddir.',
  },

  rok: {
    krog: 'Tur {krog}',
    potekel: 'Son tarix keçib: <krepko>{rok}</krepko>',
    rok: 'Son tarix: <krepko>{rok}</krepko>',
    niDolocen: 'Son tarix hələ müəyyən olunmayıb.',
  },

  // Komanda qurucusunda meydan (components/Igrisce.tsx).
  igrisce: {
    namigZamenjave: 'Oyunçunun formasına, sonra onunla yerini dəyişmək istədiyin oyunçuya toxun.',
    zapriNamig: 'Məsləhəti bağla',
    izberiZaMenjavo: '{ime}: əvəzetmə üçün seç',
    prekliciIzbiro: '{ime}: seçimi ləğv et',
    zamenjajZ: '{ime}: {drugi} ilə yerini dəyiş',
    izbran: '{ime} seçilib. Dəyişmək üçün işıqlanan oyunçuya, ləğv etmək üçün yenə həmin oyunçuya toxun.',
    brezMenjave: '{ime} üçün düzgün dəyişiklik yoxdur. Ləğv etmək üçün ona yenidən toxun.',
    niVecVLigiNamig: 'Bu oyunçu artıq liqada deyil, onunla heyət xal toplamır.',
    niVecVLigi: 'artıq liqada deyil',
    poskodba: 'zədə',
    odsoten: 'oynaya bilmir',
    kapetan: 'Kapitan: üç qat xal',
    namestnik: 'Kapitan müavini',
    tockeKroga: 'Son turdakı xallar: {tocke}',
    tockeKrogaKapetan: 'Son turdakı xallar: {tocke} × 3 (kapitan)',
    odstraniIzKadra: 'Heyətdən çıxar',
    odstrani: 'Çıxar: {ime}',
    prej: 'Əvəzetmə sırasında irəli',
    prejIme: '{ime}: əvəzetmə sırasında irəli',
    pozneje: 'Əvəzetmə sırasında geri',
    poznejeIme: '{ime}: əvəzetmə sırasında geri',
    izberi: 'Seç: {pozicija}',
    klop: 'Ehtiyat',
    klopOpis:
      'Əsas heyətdən kimsə oynamasa, onu eyni mövqedən ilk ehtiyat oyunçu əvəz edir, soldan sağa sıra ilə.',
    brezPozicije: 'Təsdiqlənmiş mövqe yoxdur, meydana çıxarıla bilməz',
  },

  // Bir komandanın oyundakı xalları ilə meydan (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} dəq',
    goli: '{n} × qol',
    asistence: '{n} × asist',
    brezPrejetega: 'quru oyun',
    prejetih: '{n} buraxılan',
    rumeni: 'sarı vərəqə',
    rdeci: 'qırmızı vərəqə',
    skupaj: '{tocke} xal',
    brezPostave: 'Oyun protokolunda bu komandanın heyəti göstərilməyib.',
    klop: 'Ehtiyat',
    vstopilo: 'oyuna daxil olan: {n}',
  },

  // Turun komandası və başqa menecerin heyəti meydanda.
  enajsterica: {
    kapetan: 'Kapitan',
    namestnik: 'Sarğılı kapitan müavini',
  },

  // Komandalarım haqqında bildiriş zolağı (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Komandaların üçün xəbərdarlıqlar',
    naslovNapakEna: 'Komandalarından biri xal toplamayacaq',
    naslovNapak: {
      one: 'Komandalarından {n} xal toplamayacaq',
      other: 'Komandalarından {n} xal toplamayacaq',
    },
    nimasEkipe: 'Hələ komandan yoxdur<liga>({liga})</liga>. Onsuz növbəti turda xal toplamayacaqsan.',
    sestavi: 'Komanda yığ →',
    popravi: 'Düzəlt →',
    poglej: 'Bax →',
    skrij: 'Xəbərdarlığı gizlət: {besedilo}',
    skrijNamig: 'Yeni bildiriş olana qədər gizlət',
    pokaziVse: 'Hamısını göstər ({n})',
    razlog: 'Komanda qaydalara uyğun deyil.',
    brezTockKrog: 'Tur {krog} üçün xal toplamayacaq.',
    brezTockRok: 'Növbəti son tarixdə xal toplamayacaq.',
    nepopolna: 'Komanda natamamdır: bu tur yenə bağlanacaq, amma növbəti turdan xal toplamayacaq.',
    igralec: {
      kapetan: {
        poskodba: 'Kapitan {ime} zədəlidir.',
        odsotnost: 'Kapitan {ime} oynaya bilmir.',
        izstop: 'Kapitan {ime} daha oynamayacaq, klubu liqadan çıxıb.',
      },
      namestnik: {
        poskodba: 'Kapitan müavini {ime} zədəlidir.',
        odsotnost: 'Kapitan müavini {ime} oynaya bilmir.',
        izstop: 'Kapitan müavini {ime} daha oynamayacaq, klubu liqadan çıxıb.',
      },
      vPostavi: {
        poskodba: '{ime} zədəlidir və əsas heyətindədir.',
        odsotnost: '{ime} oynaya bilmir və əsas heyətindədir.',
        izstop: 'Əsas heyətindəki {ime} daha oynamayacaq, klubu liqadan çıxıb.',
      },
      naKlopi: {
        poskodba: 'Ehtiyatındakı {ime} zədəlidir.',
        odsotnost: 'Ehtiyatındakı {ime} oynaya bilmir.',
        izstop: 'Ehtiyatındakı {ime} daha oynamayacaq, klubu liqadan çıxıb.',
      },
    },
    posledica: {
      kapetan: 'Oynamasa, sarğını kapitan müavini taxır. Bəlkə başqa kapitan seçəsən.',
      namestnik: 'Nə kapitan, nə də müavini oynamasa, üç qat xal olmayacaq.',
      vPostavi: 'Oynamasa, onu eyni mövqedən ilk ehtiyat oyunçu əvəz edir.',
      naKlopi: 'Oynamasa, avtomatik əvəzetmə onu ötüb keçəcək.',
      izstop: 'Daha xal toplamayacaq, onu əvəz et. Saxlasan da komandan qaydalara uyğun qalır.',
    },
  },
}
