// Azərbaycan dilində tərcümə: `racun` (izvor: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Daxil ol',
    naslovRegistracija: 'Qeydiyyat',
    naslovPozabljeno: 'Unudulmuş şifrə',
    googleNiNaVoljo: 'Google ilə giriş hazırda mümkün deyil. E-poçtdan istifadə et.',
    appleNiNaVoljo: 'Apple ilə giriş hazırda mümkün deyil. E-poçtdan istifadə et.',
    poslanaPonastavitev:
      'Şifrəni yeniləmək üçün sənə keçid göndərdik. E-poçtunu yoxla (spam qovluğunu da).',
    racunUstvarjen:
      'Hesabın yaradıldı. E-poçtuna təsdiq keçidi göndərdik: onu aç və geri qayıt.',
    prijavljenKot: '{email} kimi daxil olmusan.',
    zGooglom: 'Google ilə davam et',
    zApplom: 'Apple ilə davam et',
    aliZEposto: 'və ya e-poçt ilə',
    prikaznoIme: 'Görünən ad',
    eposta: 'E-poçt',
    geslo: 'Şifrə',
    posiljam: 'Göndərilir …',
    ustvariRacun: 'Hesab yarat',
    posljiPovezavo: 'Keçid göndər',
    gumbPrijava: 'Daxil ol',
    zeImasRacun: 'Artıq hesabın var? Daxil ol',
    nimasRacuna: 'Hələ hesabın yoxdur? Qeydiyyatdan keç',
    pozabljenoGeslo: 'Şifrəni unutmusan?',
    nazajNaPrijavo: '← Girişə qayıt',
    predlogEposte: 'Bunu nəzərdə tuturdun: {eposta}?',
  },
  napake: {
    napacnaPrijava: 'E-poçt ünvanı və ya şifrə səhvdir.',
    niPotrjen: 'E-poçt ünvanın hələ təsdiqlənməyib. Sənə göndərdiyimiz məktubdakı keçidə klik et.',
    zeRegistriran: 'Bu e-poçt ünvanı artıq qeydiyyatdadır. Daxil ol və ya şifrəni yenilə.',
    prevecPoskusov: 'Həddən çox cəhd. Bir neçə dəqiqə gözlə və yenidən cəhd et.',
    sibkoGeslo: 'Şifrə çox zəifdir. Ən azı 6 simvol istifadə et, yaxşı olar ki, hərf və rəqəm qarışığı.',
    istoGeslo: 'Yeni şifrə köhnədən fərqli olmalıdır.',
    neveljavenNaslov: 'E-poçt ünvanı düzgün deyil.',
  },
  novoGeslo: {
    naslov: 'Yeni şifrə',
    gesliSeNeUjemata: 'Şifrələr uyğun gəlmir.',
    preverjam: 'Keçid yoxlanılır …',
    neveljavna:
      'Keçid etibarsızdır və ya vaxtı bitib. <prijava>Giriş</prijava> səhifəsində şifrənin yenilənməsini yenidən istə.',
    novoGeslo: 'Yeni şifrə',
    ponovi: 'Şifrəni təkrarla',
    shranjujem: 'Yadda saxlanılır …',
    shrani: 'Şifrəni yadda saxla',
  },
  opomniki: {
    naslov: 'Bildirişlər',
    napakaNalaganja: 'Ayarları yükləmək alınmadı.',
    napakaShranjevanja: 'Yadda saxlamaq alınmadı. Yenidən cəhd et.',
    nalagam: 'Yüklənir …',
    moraPrijava: 'Xatırlatmaları redaktə etmək üçün <prijava>daxil olmalısan</prijava>.',
    opis: 'Hər turun son tarixindən əvvəl {email} ünvanına qısa məktub göndəririk ki, komandanı yeniləməyi unutmayasan.',
    posiljaj: 'E-poçt xatırlatmaları',
    shranjujem: 'Yadda saxlanılır …',
    vklopljeni: 'Xatırlatmalar aktivdir.',
    izklopljeni: 'Artıq sənə xatırlatma göndərməyəcəyik.',
    odjavaVprasanje: 'SLFF-dən daha məktub (son tarix xatırlatmaları və komanda bildirişləri) almaq istəmirsən?',
    odjavaGumb: 'Abunəlikdən çıxar',
    odjavaNapaka: 'Bu keçid etibarlı deyil. Daxil ol və xatırlatmaları ayarlarda söndür.',
    push: 'Push bildirişləri',
    pushOpis: 'Son tarixdən bir gün əvvəl heyətin hazır deyilsə, telefonun sənə xəbər verir.',
    pushVklopljena: 'Push bildirişləri aktivdir.',
    pushIzklopljena: 'Artıq sənə push bildirişləri göndərməyəcəyik.',
    pushZavrnjeno: 'Telefonunda bildirişlər söndürülüb. Onları Ayarlar → SLFF → Bildirişlər bölməsində aktiv et.',
    pushDovoli: 'Bildirişlərə icazə ver',
    povezava: 'Bildiriş ayarları',
  },
  // Povezava iz e-pošte (slff.eu/auth/confirm).
  potrditev: {
    naslov: 'Təsdiqlənir …',
    preverjam: 'Keçid yoxlanılır …',
    neveljavna: 'Bu keçid artıq etibarlı deyil və ya istifadə olunub. <prijava>Daxil ol</prijava> və ya yenisini istə.',
  },
  // Nastavitve računa (slff.eu/account): profil, klub, jezik, obvestila,
  // zasebnost, geslo. Izbris je spodaj (`izbris`).
  nastavitve: {
    naslov: 'Hesab ayarları',
    moraPrijava: 'Hesabını redaktə etmək üçün <prijava>daxil olmalısan</prijava>.',
    nalagam: 'Yüklənir …',
    napakaNalaganja: 'Ayarları yükləmək alınmadı.',
    shranjujem: 'Yadda saxlanılır …',
    shranjeno: 'Yadda saxlandı.',
    napakaShranjevanja: 'Yadda saxlamaq alınmadı. Yenidən cəhd et.',
    profilNaslov: 'Profil',
    mojProfil: 'İctimai profilinə bax',
    prikaznoIme: 'Görünən ad',
    imeOpis: 'Digərləri onu reytinqdə görür. 3 ilə 24 simvol arasında, 7 gündə bir dəfə dəyişə bilərsən.',
    imeNaslednjic: 'Adını yenidən dəyişə biləcəyin tarix: {datum}.',
    shraniIme: 'Adı yadda saxla',
    avatar: 'Avatar',
    avatarOpis: 'Rəng və baş hərflərini və ya futbol ikonunu seç.',
    barva: 'Rəng',
    barvaN: 'Rəng {n}',
    slika: 'Şəkil',
    zacetnice: 'Baş hərflər',
    ikone: {
      zoga: 'Top',
      gol: 'Qapı',
      pokal: 'Kubok',
      copat: 'Butsa',
      rokavice: 'Qapıçı əlcəkləri',
      dres: 'Forma',
      zastavica: 'Künc bayrağı',
      navijac: 'Azarkeş',
    },
    klubNaslov: 'Azarkeşi olduğun klub',
    klubOpis: 'Profilində görünür, xalların isə azarkeşlər cədvəlində klub üçün sayılır.',
    klubIsci: 'Klub axtar …',
    klubNiZadetkov: 'Klub tapılmadı.',
    klubBrez: 'Hələ klub seçməmisən.',
    klubOdstrani: 'Klubu sil',
    jezikNaslov: 'Dil və ölkə',
    jezikOpis: 'Saytın dili və liqalarını gördüyün ölkə. Seçim bu brauzerdə keçərlidir.',
    obvestilaNaslov: 'Bildirişlər',
    zasebnostNaslov: 'Məxfilik',
    javniProfil: 'İctimai profil',
    javniProfilOpis: 'Digərləri profilində komandalarını, klubunu və nailiyyətlərini görə bilər. Söndürsən, yalnız görünən adın göstərilir.',
    prijavaNaslov: 'Giriş və şifrə',
    prijavljenZ: '{email} ilə daxil olmusan.',
    geslo: 'Şifrəni dəyiş',
    gesloOpis: 'Yeni şifrə təyin etmək üçün sənə e-poçtla keçid göndərəcəyik.',
    gesloPoslano: 'Keçidi {email} ünvanına göndərdik. E-poçtunu yoxla (spam qovluğunu da).',
    gesloNapaka: 'Keçidi göndərmək alınmadı. Bir neçə dəqiqədən sonra yenidən cəhd et.',
    eposta: 'E-poçt ünvanını dəyişmək üçün bizə <eposta>info@slff.eu</eposta> ünvanına yaz.',
    // Napake prikaznega imena (koda iz baze, `hint`).
    napake: {
      dolzina: 'Görünən ad 3 ilə 24 simvol arasında olmalıdır.',
      znaki: 'Görünən adda icazə verilməyən simvollar var.',
      rezervirano: 'Bu ad SLFF komandası üçün ayrılıb. Başqasını seç.',
      neprimerno: 'Bu ad uyğun deyil. Başqasını seç.',
      prepogosto: 'Görünən adı 7 gündə bir dəfə dəyişə bilərsən.',
      zasedeno: 'Bu görünən ad artıq tutulub.',
    },
  },
  // Javna stran profila (slff.eu/u/<id>).
  profil: {
    naslov: 'Profil',
    niProfila: 'Bu profil mövcud deyil. Hesab silinmiş ola bilər.',
    nazaj: 'Reytinqə',
    zaseben: 'Bu profil gizlidir.',
    tvojZaseben: 'Profilin gizlidir: digərləri yalnız görünən adını görür.',
    uredi: 'Profili redaktə et',
    clanOd: 'Üzv olduğu tarix: {datum}',
    navija: 'Azarkeşidir',
    ekipe: 'Komandalar',
    brezEkip: 'Aktiv liqalarda hələ komanda yoxdur.',
    mesto: 'Yer {mesto} / {ekip}',
    miniLige: 'Ortaq mini-liqalar',
    dosezki: 'Nailiyyətlər',
    sezone: 'Mövsümlər',
    krogi: 'Oynanmış turlar',
    najboljsiKrog: 'Ən yaxşı tur',
  },
  // Izbris računa (slff.eu/account).
  izbris: {
    naslov: 'Hesabı sil',
    moraPrijava: 'Hesabını silmək üçün <prijava>daxil olmalısan</prijava>.',
    opis: '{email} hesabını siləcəyik: profilini, xal tarixçəsi ilə birlikdə bütün heyətlərini, səslərini və yaratdığın mini-liqaları. Bunu geri qaytarmaq olmaz. Hesabın silinməsi təsdiqlənmiş oyunçu nişanını da bitirir, abunə isə pul qaytarılmadan dayanır.',
    gumb: 'Hesabı sil',
    potrdi: 'Bəli, həmişəlik sil',
    preklici: 'Ləğv et',
    brisem: 'Silinir …',
    napaka: 'Hesabı silmək alınmadı: {napaka}',
  },
  pravno: {
    naslov: 'Məxfilik və şərtlər',
    zadnjaSprememba: 'Son yenilənmə: 16 oktyabr 2026',
    kajJeNaslov: 'SLFF nədir',
    kajJe:
      'SLFF (Sunday League Fantasy Football) yerli həvəskar futbol liqaları üçün azarkeşlərin yaratdığı fantasy liqadır. Onu könüllülər idarə edir və regional futbol assosiasiyaları, milli futbol federasiyası və ya klublarla əlaqəli deyil. Oyun pulsuzdur, mərc və mükafat yoxdur.',
    podatkiNaslov: 'Hansı məlumatları saxlayırıq',
    podatkiEposta:
      '<b>E-poçt ünvanı və şifrə.</b> Onlar giriş üçün lazımdır. Şifrə şifrələnmiş saxlanılır və biz onu görə bilmirik.',
    podatkiIme:
      '<b>Görünən ad və komanda adı.</b> Hər ikisi reytinqdə görünür. Adından istifadə etmək istəmirsənsə, ləqəb götür.',
    podatkiEkipa:
      '<b>Komandan və səsləri.</b> Heyətin, kapitanın, transferlərin və asistlərə və ya mövqelərə verdiyin səslər.',
    podatkiNaprava:
      '<b>Bildirişlər üçün cihaz tokeni.</b> Mobil tətbiqdə bildirişlərə icazə versən, turun son tarixindən əvvəl xatırlatma göndərmək üçün token saxlayırıq. Çıxış edəndə silinir.',
    neHranimo:
      'Telefon nömrəni və kart məlumatlarını saxlamırıq, ünvanını isə yalnız çap nişanı sifariş etsən saxlayırıq (aşağıya bax). İzləmə kukilərindən və reklam alətlərindən istifadə etmirik. Brauzerin giriş sessiyanı, kömək söhbətini açsan həmin söhbətin identifikatorunu və səhifənin iki dəfə sayılmasının qarşısını alan sessiya işarələrini saxlayır. Hansı səhifəni neçə nəfərin açdığı yalnız gündəlik cəmi kimi saxlanılır: adın, hesabın, cihazın və ya IP ünvanın olmadan. Ümumi ziyarət statistikasını (hansı səhifələr, ziyarətçilər haradan gəlir, cihaz növü və ölkə, komanda yığmaq kimi bir neçə hərəkət) öz serverimizdə <b>Umami</b> qeyd edir: kuki yoxdur, IP ünvanı saxlanmır və ziyarətlər hesabınla əlaqələndirilmir. Brauzerində "Do Not Track" aktivdirsə, heç nə qeyd olunmur.',
    dostopNaslov: 'Məlumatlara kim çıxış əldə edə bilər',
    dostop:
      'Məlumatlar <b>Hetzner</b> şirkətindəki öz serverimizdə (Almaniya, AB) saxlanılır; ona gedən trafik <b>Cloudflare</b> vasitəsilə keçir (saytın qorunması və çatdırılması). Təsdiq və şifrə yeniləmə məktubları öz poçt serverimizdən (o da Hetzner-dədir), mobil tətbiqdəki bildirişlər isə <b>Google Firebase Cloud Messaging</b> vasitəsilə göndərilir (yalnız cihaz tokeni və bildirişin mətni). Sağ aşağı küncdəki kömək söhbəti <b>HelpStack</b> üzərində işləyir: oraya yazdıqlarını və daxil olmusansa, kimə cavab verdiyimizi bilmək üçün görünən adını alır. Söhbətdəki köməkçi sənə kömək edəndə hansı səhifədə və liqada olduğunu və komandanın qaydalara uyğun olub-olmadığını da görə bilər. E-poçt ünvanını ötürmürük. Məlumatlarını başqa heç kimlə paylaşmırıq və satmırıq.',
    statistikaNaslov: 'Futbolçular haqqında məlumatlar',
    statistika:
      'Əhatə etdiyimiz liqalardakı futbolçular üçün ad, klub, forma nömrəsi, oyunlar, dəqiqələr, qollar və kartları göstəririk. Mənbə səhifənin altında adı göstərilən futbol assosiasiyasının ictimai rəsmi oyun protokollarıdır. Oyun protokollarında olmayan mövqeləri və asistləri icma səsvermə ilə həll edir, ona görə səhv ola bilər. Bunlardan oyunda oyunçunun xallarını və qiymətini hesablayırıq. Nəsə səhvdirsə, oyunçuya klik et və bizə bildir.',
    statistikaPodlaga:
      'Məqsəd azarkeşlər üçün pulsuz fantasy oyunudur. Hüquqi əsas qanuni maraqdır (GDPR, maddə 6(1)(f)): azarkeşlərə öz liqalarının dərc olunmuş nəticələrinə əsaslanan oyun oynamaq imkanı vermək. Oyunçu əhatə etdiyimiz liqada oynadığı müddətdə məlumatları göstəririk. Avstriya liqalarında, ÖFB-nin etdiyi kimi, oyunçunun adını son oyunundan 18 ay sonra gizlədirik.',
    statistikaUgovor:
      'Oyunçu emala etiraz edə və ya silinməni istəyə bilər: oyunçunun səhifəsinin keçidi ilə <eposta>info@slff.eu</eposta> ünvanına yaz. 14 gün ərzində onun adını həmin ölkədə tapdığımız bütün liqalarımızda, sonrakı idxallarda da, neytral işarə ilə əvəz edirik. Statistika adsız qalır. Futbol assosiasiyasının tələbi ilə də eyni şeyi edirik.',
    grbi:
      'Klub emblemləri ayrı-ayrı klubların mülkiyyətidir və yalnız komandanı tanıtmaq üçün göstərilir. Bunu istəməyən klub bizə yaza bilər, emblemi silərik.',
    fotografijeNaslov: 'Şəkillər',
    fotografije:
      'Ana səhifədəki şəklin müəllifi Abigail Keenan-dır və o, pulsuz istifadəyə icazə verən lisenziya ilə <unsplash>Unsplash</unsplash> saytında dərc olunub. Şəkildə liqalarımızın oyunçuları yoxdur.',
    praviceNaslov: 'Hüquqların',
    pravice:
      'Hesabını və bütün məlumatlarını istənilən vaxt özün silə bilərsən: hesab menyusunda <b>Hesabı sil</b> seç (slff.eu/account). Görünən adını düzəltmək üçün və ya silmə alınmasa, bizə <eposta>info@slff.eu</eposta> ünvanına yaz. Hesabın silinəndə komandan da reytinqdən yox olur. Mühasibat qanununun tələbinə görə təsdiqlənmiş oyunçu nişanı alışının qeydi 10 il, çatdırılma ünvanı isə yuxarıda təsvir olunduğu kimi saxlanılır.',
    pravilaNaslov: 'Oyun qaydaları',
    pravila:
      'Bir nəfər, bir hesab. Asistlərə və mövqelərə səsvermə real düzəlişlər üçündür: qəsdən səhv səslər oyunu hamı üçün korlayır və hesabının silinməsinə səbəb ola bilər. Mövsüm ərzində nəsə ədalətsiz çıxsa, xal sistemi və qiymətlər dəyişə bilər; belə dəyişiklikləri elan edəcəyik.',
    jamstvoNaslov: 'Zəmanət yoxdur',
    jamstvo:
      'Sayt necə işləyirsə, elə işləyir. Məlumatların düzgün və saytın əlçatan olması üçün əlimizdən gələni edirik, amma zəmanət verə bilmərik: oyun protokolları gecikə, statistika səhvlər ehtiva edə bilər. Bu, pulsuz oyuna aiddir. Ödənişli xidmətlər Ödənişli xidmətlər bölməsi və istehlakçı kimi qanuni hüquqlarınla tənzimlənir.',
    kajJePlacljivo:
      'Yeganə ödənişli şey istəyə bağlı təsdiqlənmiş oyunçu nişanıdır (aşağıda Ödənişli xidmətlərə bax).',
    podatkiPlacilo:
      '<b>Təsdiqlənmiş oyunçu nişanının alışı (yalnız alsan).</b> Mühasibat qanununun tələbinə görə alış qeydini (nə, nə vaxt, məbləğ və Stripe müştəri identifikatorun) 10 il saxlayırıq. Çap nişanı üçün çatdırılma ünvanını göndərmədən və ya sifarişin ləğvindən sonra 90 gün, sifarişdən ən çox 12 ay saxlayırıq; ondan sonra yalnız ölkə qalır.',
    dostopStripe:
      'Təsdiqlənmiş oyunçu nişanı üçün ödənişləri <b>Stripe</b> (Stripe Payments Europe, İrlandiya) emal edir: o, adını, e-poçtunu, hesab ünvanını və çap nişanı üçün çatdırılma ünvanını alır. Kart məlumatlarını birbaşa Stripe-a daxil edirsən, biz onları heç vaxt görmürük.',
    placljivoNaslov:
      'Ödənişli xidmətlər: təsdiqlənmiş oyunçular',
    placljivoUvod:
      'Oyun pulsuzdur və pulsuz qalacaq. Yeganə ödənişli şey profilin ona aid olduğunu təsdiqləmiş oyunçunun ala biləcəyi istəyə bağlı təsdiqlənmiş oyunçu nişanıdır. Nişan heç vaxt xallara, qiymətlərə, fantasy komandalara və ya oyun qaydalarına təsir etmir. Bu şərtlər həmin alışa aiddir.',
    prodajalec:
      '<b>Satıcı:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Lyublyana, Sloveniya, Lyublyana Dairə Məhkəməsinin məhkəmə reyestrində qeydiyyatdadır. Qeydiyyat nömrəsi 9850538000, ƏDV identifikatoru SI42765153. Əlaqə: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Nə alırsan.</b> Oyunçunun adının yanında mavi işarə və profil əlavələri (daha uzun təsvir, keçidlər, banner, rəng, önə çıxan oyun və ya statistika, azarkeşlərə mesaj). İllik abunə 9,99 € dəyərindədir və hər il avtomatik yenilənir. Həmişəlik seçim bir dəfə 29 € dəyərindədir və SLFF bu xidməti təklif etdiyi müddətcə qüvvədədir. Həmişəlik seçimlə adın yazılmış çap nişanını 5 € və poçt xərci 2 € (Sloveniya) və ya 4 € (başqa AB ölkəsi) ilə əlavə edə bilərsən. Yalnız AB ölkələrinə göndəririk; çatdırılma adətən 2-3 həftə çəkir. Bütün qiymətlərə ƏDV daxildir.',
    placilo:
      '<b>Ödəniş.</b> Ödənişi Stripe emal edir. Kart məlumatlarını görmürük və saxlamırıq. Yalnız ən azı 18 yaşın varsa ala bilərsən. Müqavilə Stripe ödənişi təsdiqləyəndə bağlanır.',
    odpoved:
      '<b>Abunənin ləğvi.</b> İstənilən vaxt hesab səhifəndəki (slff.eu/account) və ya oyunçu profilindəki Abunəni idarə et düyməsi ilə ləğv edə bilərsən. Ləğv ödənilmiş ilin sonunda qüvvəyə minir; o vaxta qədər nişan qalır. Artıq başlamış ili, aşağıdakı hallar istisna olmaqla, qaytarmırıq.',
    odstop:
      '<b>İmtina hüququ.</b> Rəqəmsal məzmun (işarə və əlavələr) ödənişdən dərhal sonra təqdim olunur. Ödənişdən əvvəl dərhal təqdim olunmaya açıq razılıq verirsən və bununla 14 günlük imtina hüququnu itirdiyini qəbul edirsən (2011/83/EU Direktivinin 16(m) maddəsi, Sloveniyanın ZVPot-1 qanunu). Çap nişanı sənin göstərişinə görə hazırlanır (üzərindəki ad), ona görə onun üçün imtina hüququ yoxdur (16(c) maddəsi). Qanuni zəmanət hüquqların qalır: nişan zədələnmiş, səhv gəlsə və ya heç gəlməsə, bizə yaz, pulsuz əvəz edərik və ya pulunu qaytararıq.',
    konec:
      '<b>Nişan nə vaxt bitir.</b> Profilin sənə aid olmadığı məlum olsa və təsdiqi ləğv etsək, oyunçunun adı oyunçunun və ya futbol assosiasiyasının tələbi ilə gizlədilsə, ya da hesabını silsən, nişan bitir. Abunə o zaman avtomatik dayanır və artıq ödəniş tutulmur. Ödənişə bankında etiraz etsən (chargeback), nişan silinir.',
    vracila:
      '<b>Pulun qaytarılması.</b> Sui-istifadə və ya saxta profil iddiası halında pulu qaytarmırıq. Nişan bizim səhvimiz ucbatından, futbol assosiasiyasının tələbi ilə və ya xidməti dayandırdığımız üçün bitərsə, illik abunənin istifadə olunmamış aylarını mütənasib qaytarırıq. Həmişəlik alış üçün alışdan sonrakı ilk 12 ayda tam məbləği, sonra isə alışdan 5 ilin qalan hissəsinə mütənasib payı qaytarırıq. Çap nişanı və poçt xərci xidmət dayandırılanda qaytarılmır (nişan səndə qalır), yalnız qüsur olduqda.',
    pritozbe:
      '<b>Suallar və şikayətlər.</b> <eposta>info@slff.eu</eposta> ünvanına yaz; 8 iş günü ərzində cavab veririk. İstehlakçı mübahisələrinin məhkəmədənkənar həlli üzrə heç bir təchizatçını tanımırıq. Sloveniya qanunu tətbiq olunur; bu, yaşadığın ölkənin qanununun sənə verdiyi müdafiəni əlindən almır.',
    scoutNaslov: 'SLFF Scout: klublar üçün oyunçu axtarışı',
    scoutKaj:
      'Eyni ictimai oyun protokollarından böyüklər liqalarındakı oyunçular üçün göstəricilər hesablayırıq: dəqiqələrin payı, qollar, meydana təsir, buraxılan qollar, kartlar və mövsümlər üzrə inkişaf, liqanın gücünə görə düzəldilmiş. Bunlar şəxsin qiymətləndirilməsi deyil, oyun məlumatlarından göstəricilərdir. Oyunçu axtaran, SLFF Scout abunəsi olan klublar onları görəcək; qərarı həmişə klubdakı insan verir. Gənclər liqalarını emal etmirik. Nə vaxtsa gənclər liqasında oynamış hər kəs böyüklər liqasında dəqiqələri olana və öz profilində bu il 19 yaşı və ya daha çox tamam olduğunu göstərən doğum ilini daxil edənə qədər kənarda qalır.',
    scoutPodlaga:
      'Hüquqi əsas qanuni maraqdır (GDPR, maddə 6(1)(f)): klublara ictimai dərc olunmuş nəticələrdən oyunçu tapmaqda kömək etmək. Göstəriciləri hər gün yenidən hesablayırıq və yalnız son hesablamaları saxlayırıq. Sui-istifadənin qarşısını almaq və oyunçuya, istəsə, ona hansı klubların baxdığını deyə bilmək üçün klub baxışları 12 ay qeydə alınacaq.',
    scoutPrivolitev:
      'Profili götürülmüş oyunçu transferə açıq olduğunu, doğum ilini, üstünlük verdiyi regionları və onunla əlaqə saxlamağa icazəni əlavə edə bilər. Bu, razılıqdır (GDPR, maddə 6(1)(a)): onu yalnız Scout-dakı klublar görür, profildə istənilən vaxt geri götürmək olar və geri götürüləndə məlumatları silirik. Klub oyunçuya yalnız Scout vasitəsilə yazır və onun e-poçt ünvanını görmür.',
    scoutUgovor:
      'Etiraz: götürülmüş profildə Məni Scout-dan gizlət düyməsinə klik et və ya oyunçu səhifəsinin keçidi ilə <eposta>info@slff.eu</eposta> ünvanına yaz. 14 gün ərzində oyunçunu həmin ölkədəki bütün liqalarımızda, gələcək idxallar daxil olmaqla, Scout-dan gizlədirik. Oyunçu fantasy oyununda qalır.',
    trgovinaNaslov: 'SLFF Mağaza (shop.slff.eu)',
    trgovinaKaj:
      'Alış zamanı adını, e-poçtunu, çatdırılma ünvanını, alınan məhsulları və məbləğləri, daxil olmusansa SLFF hesabını da emal edirik. Ödənişi Stripe həyata keçirir: kart məlumatlarını görmürük və saxlamırıq. Ad və ünvan çatdırılma üçün Pošta Slovenije-yə verilir. Sui-istifadəni məhdudlaşdırmaq üçün tamamlanmamış alışda IP ünvanının geri qaytarılmaz heşini müvəqqəti saxlayırıq; ödəniş edildikdə və ya alışın müddəti bitdikdə silinir.',
    trgovinaPodlaga:
      'Hüquqi əsas müqavilənin icrası (GDPR maddə 6(1)(b)) və qanuni öhdəliklərdir (mühasibat, vergilər), IP ünvanının heşi üçün isə sui-istifadənin qarşısını almaqda qanuni maraqdır (GDPR maddə 6(1)(f)). Nəzarətçi SPACE GUARDIAN, računalniško programiranje, d.o.o. şirkətidir.',
    trgovinaHramba:
      'Sifariş və hesab-faktura məlumatlarını ƏDV qanunu və mühasibat qaydalarının tələb etdiyi müddətdə saxlayırıq (hesab-fakturanın verildiyi ildən sonra 10 il). Sifariş bildirişləri üçün e-poçt yalnız həmin sifariş üçün istifadə olunur. Giriş, düzəliş və ya etiraz üçün <eposta>info@slff.eu</eposta> ünvanına yaz.',
  },
  klubskiRacun: {
    naslov: 'Rəsmi klub hesabı',
    aktiven: 'Bu hesab {klub} klubunu təmsil edir.',
    pravice: 'Klub kimi mövqeləri redaktə edə, oyunçu əlavə edə və oyunçularının profillərini təsdiqləyə bilərsən.',
    vprasanje: 'Klubu təmsil edirsən?',
    pojasnilo: 'Bizdə qeydə alınmış rəsmi klub ünvanı ilə daxil olsan, avtomatik klub hesabı alırsan. Əgər bizdə yoxdursa, aşağıda istə, yoxlayarıq.',
    klub: 'Klub',
    isciKlub: 'Klub axtar …',
    vloga: 'Klubdakı rolun',
    vloge: {
      predsednik: 'prezident',
      tajnik: 'katib',
      trener: 'məşqçi',
      vodstvo: 'klub rəhbərliyi',
      drugo: 'digər',
    },
    dokaz: 'Ünvanın dərc olunduğu keçid (sayt, Facebook, federasiya)',
    opomba: 'Qeyd (istəyə görə)',
    naslovRacuna: 'Yoxladığımız ünvan: {email}',
    poslji: 'Müraciəti göndər',
    caka: '{klub} üçün müraciətin baxılmağı gözləyir.',
    cakaBrezKluba: 'Ünvanın rəsmidir, amma onu hələ kluba bağlamalıyıq. Tezliklə həll edəcəyik.',
    cakaPolno: 'Klubun artıq 5 hesabı var. Baxıb sənə xəbər verəcəyik.',
    zavrnjeno: 'Müraciətin rədd edildi: {razlog}',
    nepotrjen: 'Əvvəlcə hesabının e-poçtunu təsdiqlə.',
    napake: {
      zeKlub: 'Artıq bir klubu təmsil edirsən.',
      caka: 'Müraciətin artıq qərar gözləyir.',
    },
  },
}
