// Azərbaycan dilində tərcümə: `tekme` (izvor: src/i18n/sl/tekme.ts).
// "Krog" PFL-də olduğu kimi həmişə "tur"dur.
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  statistika: {
    brezStrelcev: "Təsdiqlənmiş qolçu yoxdur.",
    nedosegljivo: "Bu tarixi matç üçün oyunçu statistikası mövcud deyil. Rəsmi nəticə saxlanılır.",
    kratko: "Statistika mövcud deyil",
    postaveTocke: "Heyətlər və xallar",
    kartoni: "Vərəqələr",
    delno: "{sezona} mövsümü üçün qismən statistika: oynanılmış {odigranih} liqa matçından {popolnih} matç üçün tam məlumat var. {nedosegljivih} tarixi matç üçün oyunçu statistikası mövcud deyil. Cəmlər və ortalamalar yalnız təsdiqlənmiş çıxışları əhatə edir.",
    brezOpazovanj: "Təsdiqlənmiş çıxış yoxdur",
  },

  krog: 'Tur {n}',
  moraPrijava: 'Səs vermək üçün <prijava>daxil olmalısan</prijava>.',

  // Xal bölgüsü və qaydalar (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: '60 dəqiqə və ya daha çox oynayıb',
      nastopDo60: '60 dəqiqəyə qədər oynayıb',
      gol: 'Qol',
      goli: 'Qollar ({n})',
      asistenca: 'Asist',
      asistence: 'Asistlər ({n})',
      brezPrejetega: 'Quru oyun',
      zmaga: 'Komandanın qələbəsi',
      prejetiGoli: 'Buraxılan qollar ({n})',
      obranjena: 'Dəf edilən penalti ({n})',
      zgresena: 'Vurulmayan penalti ({n})',
      avtogol: 'Öz qapısına qol ({n})',
      rumeni: 'Sarı vərəqə ({n})',
      rdeci: 'Qırmızı vərəqə',
    },
    pravila: {
      igralniCas: 'Oyun vaxtı',
      nastopDo60: '60 dəqiqəyə qədər oynayıb',
      nastopOd60: '60 dəqiqə və ya daha çox oynayıb',
      goliInAsistence: 'Qollar və asistlər',
      golVratarja: 'Qapıçının qolu',
      golBranilca: 'Müdafiəçinin qolu',
      golVezista: 'Yarımmüdafiəçinin qolu',
      golNapadalca: 'Hücumçunun qolu',
      asistenca: 'Asist',
      obramba: 'Müdafiə',
      csVratar: 'Quru oyun: qapıçı',
      csBranilec: 'Quru oyun: müdafiəçi',
      csVezist: 'Quru oyun: yarımmüdafiəçi',
      zmaga: 'Komandanın qələbəsi: qapıçı, müdafiəçi',
      prejeta2: 'Hər 2 buraxılan qol: qapıçı, müdafiəçi',
      // Ana səhifədə qaydalar cədvəlinin altında.
      opomba:
        'Quru oyun ən azı 60 dəqiqə oynananda sayılır; yalnız oyunçu meydanda olarkən buraxılan qollar nəzərə alınır.',
      obranjena:
        'Dəf edilən penalti: qapıçı (oyun protokolunda rəqibin vurmadığı penalti kimi qeyd olunur)',
      kazni: 'Cərimələr',
      zgresena: 'Vurulmayan penalti',
      avtogol: 'Öz qapısına qol',
      rumeni: 'Sarı vərəqə',
      rdeci: 'Qırmızı vərəqə',
    },
  },

  rezultati: {
    naslov: 'Nəticələr',
    uvod:
      'Oynanmış oyunlar, {zveza} oyun protokollarından. Hər iki heyəti meydanda görmək üçün oyuna klik et: hər formada oyunçunun topladığı xallar göstərilir.',
    niZacetka: 'Mövsüm hələ başlamayıb.',
    prazenKrog: 'Bu turda hələ oyun oynanmayıb.',
    prejsnji: 'Əvvəlki tur',
    naslednji: 'Növbəti tur',
  },

  // Turnir cədvəli səhifəsi (/table): nəticələrdən real cədvəl və bombardirlər.
  tabela: {
    naslov: 'Turnir cədvəli',
    zavihek: '{liga} · cədvəl',
    uvod: '{sezona} cədvəli, {zveza} oyun protokollarındakı nəticələrdən hesablanıb.',
    opomba: 'Təxminidir: qələbəyə 3 xal, heç-heçəyə 1 xal; xalı bərabər olan komandalar qol fərqi, sonra vurulan qollarla ayrılır. Federasiyalar başqa qaydalardan istifadə edə bilər (şəxsi görüşlər, xal çıxılması); rəsmi cədvəl: {zveza}.',
    niTekem: 'Bu liqada hələ oyun oynanmayıb.',
    stolpci: {
      klub: 'Klub',
      tekme: 'O',
      zmage: 'Q',
      remiji: 'H',
      porazi: 'M',
      goli: 'Qollar',
      razlika: 'QF',
      tocke: 'X',
      forma: 'Forma',
    },
    stolpciOpis: {
      tekme: 'Oyunlar',
      zmage: 'Qələbələr',
      remiji: 'Heç-heçələr',
      porazi: 'Məğlubiyyətlər',
      goli: 'Vurulan : buraxılan qollar',
      razlika: 'Qol fərqi',
      tocke: 'Xallar',
    },
    forma: { W: 'Q', D: 'H', L: 'M' },
    formaOpis: { W: 'qələbə', D: 'heç-heçə', L: 'məğlubiyyət' },
    strelci: 'Bombardirlər',
    niStrelcev: 'Bu mövsüm hələ qol vurulmayıb.',
    stolpciStrelcev: {
      igralec: 'Oyunçu',
      klub: 'Klub',
      goli: 'Qollar',
      tekme: 'Oyun',
      minute: 'Dəq',
    },
  },

  tekma: {
    naslov: 'Oyun',
    niTekme: 'Bu oyun oyun protokollarında yoxdur.',
    nazaj: '← Nəticələr',
    brezPostav:
      'Oyun protokolunda heyətlər göstərilməyib, ona görə oyunçular üzrə xalları göstərmək olmur.',
    naDresu:
      'Hər formada oyunçunun bu oyunda neçə xal topladığı göstərilir. Oyunçunun səhifəsini açmaq üçün ona klik et.',
    cakajo: {
      one: 'Bu oyunda {n} qol asist gözləyir: asist təyin olunana qədər ötürmə verən +3 xal itirir. Aşağıda ötürməni kimin verdiyini bizə de.',
      other: 'Bu oyunda {n} qol asist gözləyir: asistlər təyin olunana qədər ötürmə verənlər +3 xal itirir. Aşağıda ötürmələri kimin verdiyini bizə de.',
    },
    goliInAsistence: 'Qollar və asistlər',
    prijaviSe: 'Səs vermək üçün daxil ol',
  },

  // Asistlər səhifəsi (asistlərə səsvermə).
  glasovanje: {
    naslov: 'Asistlər',
    kdoJePodal: 'Asisti kim verdi?',
    uvod:
      '{zveza} oyun protokolları qol vuranları qeyd edir, asistləri yox. İcma həll edir: eyni oyunçu bir qol üçün <b>{glasov}</b> toplayanda asist ona verilir və <b>+3 xal</b> gətirir.',
    pragGlasov: { one: '{n} səs', other: '{n} səs' },
    niTekem: 'Bu mövsüm hələ oyun oynanmayıb',
    niTekemOpis:
      'Asist səsverməsi ilk tur oynanan kimi açılır. Oyun protokolları gələndə qayıt.',
    arhiv: 'arxiv',
    preteklaSezona:
      'Keçmiş mövsüm üçün səs verirsən. Bu, cari liqadakı xallara təsir etmir, sadəcə tarixçəni düzəldir.',
    izberiKrog: '1. Tur seç',
    izberiTekmo: '2. Oyun seç',
    vsePotrjeno: 'Hamısı təsdiqlənib',
    zaprto: 'bağlıdır',
    poglejTekmo: 'Bu oyunun heyətlərinə və xallarına bax →',
    niGolov: 'Bu oyunda qol olmayıb.',
    vsePotrjene: 'Bu oyundakı bütün asistlər təsdiqlənib. 🎉',
    zaprtoOpis: 'Bu oyun üçün səsvermə bağlıdır; o, növbəti turun son tarixinə qədər açıq qalır.',
    brezPotrjene: 'Təsdiqlənmiş asist yoxdur: {goli}.',
  },

  // Səsverməli qol kartı (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'naməlum qol müəllifi',
    avtogol: 'Öz qapısına qol: {ime}',
    enajstmetrovka: '{ime}: penalti',
    brezAsistenceOpomba: 'asistsiz',
    potrjena: 'asist təsdiqlənib, bağlıdır',
    brezAsistence: 'Asist yoxdur',
    odlocilaSkupnost: 'icmanın qərarı ilə',
    morasSePrijaviti: 'Səs vermək üçün daxil olmalısan',
    spremeniGlas: 'Səsi dəyiş',
    kdoJePodal: 'Asisti kim verdi?',
    vodiBrez: 'Önə keçən: “asist yoxdur”',
    vodi: 'Önə keçən: <b>{ime}</b>',
    igralecBrezZapisa: 'oyunçu protokolda yoxdur',
    doOdlocitve: 'qərara daha {n} qalıb',
    ostali: 'Digərləri:',
    brezGlasovi: 'heç kim ({n})',
    izberiPodajalca: 'Asist verəni seç: {ekipa}',
    nihce: 'Heç kim, asistsiz qol',
  },

  // Mövqelər səhifəsi (mövqelərə səsvermə).
  pozicije: {
    naslov: 'Mövqelər',
    kjeKdoIgra: 'Kim harada oynayır?',
    uvod:
      'Oyun protokolları yalnız qapıçını qeyd edir və heyətləri forma nömrəsinə görə sıralayır, ona görə mövqeləri onlardan oxumaq olmur. İcma həll edir. Lazım olan səs: <b>{prag}</b>; statistik ilkin qiymətləndirmə (forma nömrəsi, qollar, kartlar) güclü şəkildə həmin tərəfə işarə edirsə, say azalır ({minPrag} qədər). <b>Klub bilicilərinin</b> və <b>dəqiqliyi yüksək</b> istifadəçilərin səsləri daha çox sayılır.',
    enkratNaTeden:
      'Səslənmiş mövqelər <b>həftədə bir dəfə, bazar ertəsi səhər</b>, hamısı birlikdə qüvvəyə minir. Beləliklə liqa həftə ərzində əlinin altında dəyişmir: çərşənbə axşamı gördüyün, tur bağlananda şənbə günü də keçərlidir. Artıq kifayət qədər səsi olan oyunçu o vaxta qədər qum saatı <ikona>⏳</ikona> ilə işarələnir.',
    klub: 'Klub',
    poznavalecOznaka: '  ★ bilici',
    samoIzStatistike: 'Yalnız statistika ({n})',
    vsiPotrjeni: 'Bu klubun hər oyunçusunun təsdiqlənmiş mövqeyi var. 🎉',
    niIgralcev: 'Oyunçu yoxdur.',
    status: {
      naslov: 'Səsverən statusum',
      utezOpis:
        'Hər səsin çəkisi: klubundan olan oyunçuya səs verəndə bilici bonusu əlavə olunur.',
      utez: 'çəki {utez}×',
      tocnih: '({pravilni}/{vsi} düzgün)',
      klubPoznam: 'Yaxşı tanıdığım klub (bilici): bu klubun oyunçularına səsim daha çox sayılır:',
      nisemPoznavalec: 'heç bir klubun bilicisi deyiləm',
      opomba:
        'Bilici yalnız bir klub seçir. Çəkilər zamanla sabitləşir: səslərin səhv çıxsa, etibarın azalır. Mövqe məlum olanda etibar keçmiş səslərdən yenidən hesablanır.',
    },
    igralec: {
      statistika: '{tekme} · {minute} dəq · {goli} · {cs} quru oyun',
      izZapisnika: 'Oyun protokolundan: qapıçı (V) ilə qeyd olunub',
      odKluba: 'Mövqeyi klub təyin edib',
      klub: ' · klub',
      izStatistike: 'Statistikadan (forma nömrəsi, qollar, kartlar), səslər düzəldə bilər',
      potrdilaSkupnost: 'İcma təsdiqləyib',
      zapisnik: ' · oyun protokolu',
      uveljavitevOpis:
        'Mövqelər həftədə bir dəfə, bazar ertəsi səhər qüvvəyə minir, belə ki liqa həftə ərzində əlinin altında dəyişmir.',
      izglasovano: 'səslənib: {pozicija} · bazar ertəsi',
      neIgraOpis: 'Artıq oynamır, bazarda deyil. Oyun protokolunda görünsə, avtomatik qayıdır.',
      neIgra: 'artıq oynamır',
      vrniOpis: 'Oyunçunu aktivə qaytar',
      vrni: 'bərpa et',
      odhodOpis:
        'Oyunçu artıq bu klubda oynamır, onu bazardan çıxarır. Oyun protokolunda görünməsi onu avtomatik geri qaytarır.',
      statistikaKaze:
        'Statistika <b>{pozicija} ({odstotek}%)</b> göstərir: həmin tərəfə səs daha aşağı həddə qarşı sayılır ({prag} yerinə {nizji}).',
      dolocenaIzStatistike: 'Mövqe statistikadan təyin olunub; səhvdirsə, düzgününə klik et.',
      dolocilaSkupnost: 'Mövqeyi icma təyin edib, səslər onu düzəldə bilər.',
      gumbUtez: 'Çəki {utez} / hədd {prag}',
      gumbPrior: ' · ilkin {odstotek}%',
      gumbPoznavalec: ' · bilici səsin daha çox sayılır',
      vodi: 'Önə keçən: {pozicija}, çəki {utez} / {prag}',
    },
  },
  // Xalların və qiymətin yerində izahı (components/Razlaga.tsx).
  razlaga: {
    zakaj: 'Niyə {tocke}? Xal bölgüsü',
    zapri: 'Bağla',
    ostalo: 'Digər',
    brezPozicije: 'Mövqe hələ təyin olunmayıb, ona görə qollar hələ xal gətirmir. İcma mövqeyi təsdiqləyəndə xallar yenidən hesablanır.',
    pravila1: 'Bu tur köhnə qaydalarla hesablanır: qapıçının quru oyunu +4, qələbə bonusu yoxdur.',
    asistence: 'Asistlər icma səsverməsi ilə təsdiqlənir, təsdiqlənməmiş asist hələ xal gətirmir.',
    zadnjiKrog: 'Son oyun: tur {krog}',
    cena: {
      zakaj: 'Niyə bu qiymət?',
      zdaj: 'Cari qiymət',
      izhodisce: 'Başlanğıc qiyməti',
      izhodisceOpis: 'Başlanğıc qiyməti keçən mövsümün dəqiqələrindən və xallarından, liqadakı digər oyunçularla müqayisədə gəlir.',
      privzeta: 'Keçən mövsüm {minut} dəqiqədən az oynayan oyunçular {cena} qiymətlə başlayır; daha yüksək liqada oynayıblarsa, qiymət oradan gəlir.',
      borza: 'Hər turdan sonra qiymət dəyişir: 2-dən yuxarı hər iki xal üçün +{korak} (turda ən çox +{najvec}), zəif tur və ya zəif formadan sonra −{korak}, klubu oynayarkən oyunçu ardıcıl ikinci turu buraxarsa, −{korak}.',
      razpon: 'Qiymət həmişə {od} ilə {do} arasında qalır.',
    },
  },
}
