// Türkçe çeviri: `racun` (izvor: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Giriş yap',
    naslovRegistracija: 'Kayıt ol',
    naslovPozabljeno: 'Şifremi unuttum',
    googleNiNaVoljo: 'Google ile giriş şu anda kullanılamıyor. E-posta ile giriş yap.',
    appleNiNaVoljo: 'Apple ile giriş şu anda kullanılamıyor. E-posta ile giriş yap.',
    poslanaPonastavitev:
      'Şifreni sıfırlaman için bir bağlantı gönderdik. E-postanı kontrol et (spam klasörü dahil).',
    racunUstvarjen:
      'Hesabın oluşturuldu. E-postana bir onay bağlantısı gönderdik. Bağlantıyı aç ve geri dön.',
    prijavljenKot: '{email} olarak giriş yaptın.',
    zGooglom: 'Google ile devam et',
    zApplom: 'Apple ile devam et',
    aliZEposto: 'ya da e-posta ile',
    prikaznoIme: 'Görünen ad',
    eposta: 'E-posta',
    geslo: 'Şifre',
    posiljam: 'Gönderiliyor …',
    ustvariRacun: 'Hesap oluştur',
    posljiPovezavo: 'Bağlantı gönder',
    gumbPrijava: 'Giriş yap',
    zeImasRacun: 'Zaten hesabın var mı? Giriş yap',
    nimasRacuna: 'Henüz hesabın yok mu? Kayıt ol',
    pozabljenoGeslo: 'Şifreni mi unuttun?',
    nazajNaPrijavo: '← Girişe dön',
    predlogEposte: 'Bunu mu demek istedin: {eposta}?',
  },
  napake: {
    napacnaPrijava: 'E-posta adresi ya da şifre yanlış.',
    niPotrjen: 'E-posta adresin henüz onaylanmadı. Sana gönderdiğimiz mesajdaki bağlantıya tıkla.',
    zeRegistriran: 'Bu e-posta adresi zaten kayıtlı. Giriş yap ya da şifreni sıfırla.',
    prevecPoskusov: 'Çok fazla deneme. Birkaç dakika bekle ve tekrar dene.',
    sibkoGeslo: 'Şifre çok zayıf. En az 6 karakter kullan, tercihen harf ve rakam karışık olsun.',
    istoGeslo: 'Yeni şifre eskisinden farklı olmalı.',
    neveljavenNaslov: 'E-posta adresi geçerli değil.',
  },
  novoGeslo: {
    naslov: 'Yeni şifre',
    gesliSeNeUjemata: 'Şifreler eşleşmiyor.',
    preverjam: 'Bağlantı kontrol ediliyor …',
    neveljavna:
      'Bağlantı geçersiz ya da süresi dolmuş. <prijava>Giriş</prijava> sayfasından yeni bir şifre sıfırlama iste.',
    novoGeslo: 'Yeni şifre',
    ponovi: 'Şifreyi tekrarla',
    shranjujem: 'Kaydediliyor …',
    shrani: 'Şifreyi kaydet',
  },
  opomniki: {
    naslov: 'Bildirimler',
    napakaNalaganja: 'Ayarlar yüklenemedi.',
    napakaShranjevanja: 'Kaydedilemedi. Tekrar dene.',
    nalagam: 'Yükleniyor …',
    moraPrijava: 'Hatırlatmaları düzenlemek için <prijava>giriş yapman</prijava> gerekiyor.',
    opis: 'Her haftanın son tarihinden önce {email} adresine kısa bir mesaj gönderiyoruz, böylece takımını güncellemeyi unutmazsın.',
    posiljaj: 'E-posta hatırlatmaları',
    shranjujem: 'Kaydediliyor …',
    vklopljeni: 'Hatırlatmalar açık.',
    izklopljeni: 'Artık sana hatırlatma göndermeyeceğiz.',
    odjavaVprasanje: 'Artık SLFF e-postaları (son tarih hatırlatmaları ve takım bildirimleri) istemiyor musun?',
    odjavaGumb: 'Aboneliğimi iptal et',
    odjavaNapaka: 'Bu bağlantı geçerli değil. Giriş yap ve hatırlatmaları ayarlardan kapat.',
    push: 'Anlık bildirimler',
    pushOpis: 'Son tarihten bir gün önce kadron hazır değilse telefonun sana haber verir.',
    pushVklopljena: 'Anlık bildirimler açık.',
    pushIzklopljena: 'Artık sana anlık bildirim göndermeyeceğiz.',
    pushZavrnjeno: 'Telefonunda bildirimler kapalı. Ayarlar → SLFF → Bildirimler bölümünden aç.',
    pushDovoli: 'Bildirimlere izin ver',
    povezava: 'Bildirim ayarları',
  },
  potrditev: {
    naslov: 'Onaylanıyor …',
    preverjam: 'Bağlantı kontrol ediliyor …',
    neveljavna: 'Bu bağlantı artık geçerli değil ya da zaten kullanılmış. <prijava>Giriş yap</prijava> ya da yeni bir bağlantı iste.',
  },
  nastavitve: {
    naslov: 'Hesap ayarları',
    moraPrijava: 'Hesabını düzenlemek için <prijava>giriş yapman</prijava> gerekiyor.',
    nalagam: 'Yükleniyor …',
    napakaNalaganja: 'Ayarlar yüklenemedi.',
    shranjujem: 'Kaydediliyor …',
    shranjeno: 'Kaydedildi.',
    napakaShranjevanja: 'Kaydedilemedi. Tekrar dene.',
    profilNaslov: 'Profil',
    mojProfil: 'Herkese açık profilini gör',
    prikaznoIme: 'Görünen ad',
    imeOpis: 'Diğerleri bunu puan durumunda görür. 3 ile 24 karakter arası olmalı ve 7 günde bir değiştirebilirsin.',
    imeNaslednjic: 'Adını tekrar değiştirebileceğin tarih: {datum}.',
    shraniIme: 'Adı kaydet',
    avatar: 'Avatar',
    avatarOpis: 'Bir renk ve baş harflerini ya da bir futbol simgesi seç.',
    barva: 'Renk',
    barvaN: 'Renk {n}',
    slika: 'Görsel',
    zacetnice: 'Baş harfler',
    ikone: {
      zoga: 'Top',
      gol: 'Kale',
      pokal: 'Kupa',
      copat: 'Krampon',
      rokavice: 'Kaleci eldiveni',
      dres: 'Forma',
      zastavica: 'Korner bayrağı',
      navijac: 'Taraftar',
    },
    klubNaslov: 'Tuttuğun kulüp',
    klubOpis: 'Profilinde görünür ve puanların taraftar tablosunda bu kulüp için sayılır.',
    klubIsci: 'Kulüp ara …',
    klubNiZadetkov: 'Kulüp bulunamadı.',
    klubBrez: 'Henüz bir kulüp seçmedin.',
    klubOdstrani: 'Kulübü kaldır',
    jezikNaslov: 'Dil ve ülke',
    jezikOpis: 'Sitenin dili ve liglerini gördüğün ülke. Seçim bu tarayıcıda geçerlidir.',
    obvestilaNaslov: 'Bildirimler',
    zasebnostNaslov: 'Gizlilik',
    javniProfil: 'Herkese açık profil',
    javniProfilOpis: 'Diğerleri profilinde takımlarını, kulübünü ve başarılarını görebilir. Kapatırsan sadece görünen adın gösterilir.',
    prijavaNaslov: 'Giriş ve şifre',
    prijavljenZ: '{email} ile giriş yaptın.',
    geslo: 'Şifreyi değiştir',
    gesloOpis: 'Yeni şifre belirlemen için sana e-posta ile bir bağlantı göndereceğiz.',
    gesloPoslano: 'Bağlantıyı {email} adresine gönderdik. E-postanı kontrol et (spam klasörü dahil).',
    gesloNapaka: 'Bağlantı gönderilemedi. Birkaç dakika sonra tekrar dene.',
    eposta: 'E-posta adresini değiştirmek için bize <eposta>info@slff.eu</eposta> adresinden yaz.',
    napake: {
      dolzina: 'Görünen adın 3 ile 24 karakter arasında olmalı.',
      znaki: 'Görünen adında izin verilmeyen karakterler var.',
      rezervirano: 'Bu ad SLFF ekibine ayrılmış. Başka bir ad seç.',
      neprimerno: 'Bu ad uygun değil. Başka bir ad seç.',
      prepogosto: 'Görünen adını 7 günde bir değiştirebilirsin.',
      zasedeno: 'Bu görünen ad zaten alınmış.',
    },
  },
  profil: {
    naslov: 'Profil',
    niProfila: 'Bu profil yok. Hesap silinmiş olabilir.',
    nazaj: 'Puan durumuna',
    zaseben: 'Bu profil gizli.',
    tvojZaseben: 'Profilin gizli: diğerleri sadece görünen adını görür.',
    uredi: 'Profili düzenle',
    clanOd: 'Üyelik tarihi: {datum}',
    navija: 'Tuttuğu kulüp',
    ekipe: 'Takımlar',
    brezEkip: 'Aktif liglerde henüz takım yok.',
    mesto: '{ekip} takım arasında {mesto}. sıra',
    miniLige: 'Ortak mini ligler',
    dosezki: 'Başarılar',
    sezone: 'Sezonlar',
    krogi: 'Oynanan haftalar',
    najboljsiKrog: 'En iyi hafta',
  },
  izbris: {
    naslov: 'Hesabı sil',
    moraPrijava: 'Hesabını silmek için <prijava>giriş yapman</prijava> gerekiyor.',
    opis: '{email} hesabını sileceğiz: profilin, puan geçmişiyle birlikte tüm kadroların, oyların ve oluşturduğun mini ligler. Bu işlem geri alınamaz. Hesabın silinmesi onaylı oyuncu rozetini de sona erdirir; abonelik ise iade yapılmadan durur.',
    gumb: 'Hesabı sil',
    potrdi: 'Evet, kalıcı olarak sil',
    preklici: 'Vazgeç',
    brisem: 'Siliniyor …',
    napaka: 'Hesap silinemedi: {napaka}',
  },
  pravno: {
    naslov: 'Gizlilik ve kullanım koşulları',
    zadnjaSprememba: 'Son güncelleme: 16 Ekim 2026',
    kajJeNaslov: 'SLFF nedir',
    kajJe:
      'SLFF (Sunday League Fantasy Football), yerel amatör futbol ligleri için taraftarlar tarafından yapılmış bir fantezi ligdir. Gönüllüler tarafından yürütülür ve bölgesel futbol federasyonları, ulusal futbol federasyonu ya da kulüplerle bağlantılı değildir. Oyun ücretsizdir; bahis ya da ödül yoktur.',
    podatkiNaslov: 'Hangi verileri saklıyoruz',
    podatkiEposta:
      '<b>E-posta adresi ve şifre.</b> Giriş için bunlara ihtiyacımız var. Şifre şifrelenmiş olarak saklanır ve biz onu göremeyiz.',
    podatkiIme:
      '<b>Görünen ad ve takım adı.</b> İkisi de puan durumunda görünür. Adını kullanmak istemiyorsan bir takma ad kullan.',
    podatkiEkipa:
      '<b>Takımın ve oyların.</b> Kadron, kaptanın, transferlerin ve asistler ya da mevkiler için verdiğin oylar.',
    podatkiNaprava:
      '<b>Bildirimler için cihaz anahtarı.</b> Mobil uygulamada bildirimlere izin verirsen, haftanın son tarihinden önce sana hatırlatma göndermek için kullandığımız bir anahtarı saklarız. Çıkış yaptığında silinir.',
    neHranimo:
      'Telefon numaranı ya da kart bilgilerini saklamayız; adresini sadece basılı rozet sipariş edersen saklarız (aşağıya bak). Takip çerezleri ya da reklam araçları kullanmayız. Tarayıcın giriş oturumunu, açarsan yardım sohbetindeki konuşmanın kimliğini ve bir sayfanın iki kez sayılmasını önleyen oturum işaretlerini saklar. Hangi sayfanın kaç kişi tarafından açıldığı sadece günlük toplam olarak tutulur; adın, hesabın, cihazın ya da IP adresin olmadan. Genel ziyaret istatistiklerini (hangi sayfalar, ziyaretçilerin nereden geldiği, cihaz türü ve ülke, takım kurmak gibi birkaç işlem) kendi sunucumuzdaki <b>Umami</b> kaydeder: çerez yok, IP adresi saklanmaz ve ziyaretler hesabına bağlanmaz. Tarayıcında "Do Not Track" açıksa hiçbir şey kaydedilmez.',
    dostopNaslov: 'Verilere kimler erişebilir',
    dostop:
      'Veriler <b>Hetzner</b> üzerindeki kendi sunucumuzda (Almanya, AB) saklanır; sunucuya giden trafik <b>Cloudflare</b> üzerinden geçer (sitenin korunması ve sunulması). Onay ve şifre sıfırlama e-postaları kendi posta sunucumuzdan (yine Hetzner’de), mobil uygulamadaki bildirimler ise <b>Google Firebase Cloud Messaging</b> üzerinden gönderilir (sadece cihaz anahtarı ve bildirim metni). Sağ alt köşedeki yardım sohbeti <b>HelpStack</b> üzerinde çalışır: oraya yazdıklarını ve giriş yaptıysan kime cevap verdiğimizi bilmemiz için görünen adını alır. Sohbetteki asistan sana yardım ederken hangi sayfada ve hangi ligde olduğunu ve takımının geçerli olup olmadığını da görebilir. E-posta adresini aktarmayız. Verilerini başka kimseyle paylaşmayız ve satmayız.',
    statistikaNaslov: 'Futbolcularla ilgili veriler',
    statistika:
      'Takip ettiğimiz liglerdeki futbolcular için adlarını, kulüplerini, forma numaralarını, maçlarını, dakikalarını, gollerini ve kartlarını gösteririz. Kaynak, sayfanın alt kısmında adı geçen futbol federasyonunun herkese açık resmi maç raporlarıdır. Maç raporlarında olmayan mevkiler ve asistler topluluk tarafından oylamayla belirlenir, bu yüzden hatalı olabilir. Bunlardan oyuncunun oyundaki puanını ve fiyatını hesaplarız. Bir yanlışlık varsa oyuncuya tıkla ve bize haber ver.',
    statistikaPodlaga:
      'Amaç, taraftarlar için ücretsiz bir fantezi oyunudur. Hukuki dayanak meşru menfaattir (GDPR md. 6(1)(f)): taraftarların kendi liglerinin yayımlanmış sonuçlarına dayanan bir oyun oynayabilmesi. Verileri, oyuncu takip ettiğimiz bir ligde oynadığı sürece gösteririz. Avusturya liglerinde, ÖFB’nin yaptığı gibi, oyuncunun adını son maçından 18 ay sonra gizleriz.',
    statistikaUgovor:
      'Bir oyuncu işlemeye itiraz edebilir ya da silinmesini isteyebilir: oyuncunun sayfasının bağlantısıyla birlikte <eposta>info@slff.eu</eposta> adresine yaz. 14 gün içinde, o ülkedeki tüm liglerimizde bulduğumuz her yerde ve sonraki aktarımlarda da adını nötr bir etiketle değiştiririz. İstatistikler adsız olarak kalır. Futbol federasyonunun talebi üzerine de aynısını yaparız.',
    grbi:
      'Kulüp armaları ilgili kulüplerin mülkiyetindedir ve sadece takımı tanıtmak için gösterilir. Bunu istemeyen bir kulüp bize yazabilir, armayı kaldırırız.',
    fotografijeNaslov: 'Fotoğraflar',
    fotografije:
      'Ana sayfadaki fotoğraf Abigail Keenan’a aittir ve <unsplash>Unsplash</unsplash> üzerinde, ücretsiz kullanıma izin veren lisansıyla yayımlanmıştır. Fotoğrafta liglerimizden oyuncular yer almaz.',
    praviceNaslov: 'Hakların',
    pravice:
      'Hesabını ve tüm verilerini istediğin zaman kendin silebilirsin: hesap menüsünde (slff.eu/account) <b>Hesabı sil</b> seçeneğini seç. Görünen adını düzeltmek için ya da silme işlemi başarısız olursa bize <eposta>info@slff.eu</eposta> adresinden yaz. Hesabın silindiğinde takımın da puan durumundan kaybolur. Onaylı oyuncu rozeti satın alma kaydı muhasebe mevzuatı gereği 10 yıl, teslimat adresi ise yukarıda açıklandığı gibi saklanır.',
    pravilaNaslov: 'Oyun kuralları',
    pravila:
      'Bir kişi, bir hesap. Asist ve mevki oylaması gerçek düzeltmeler içindir; bilerek yanlış verilen oylar oyunu herkes için bozar ve hesabının kaldırılmasına yol açabilir. Bir şeyin adil olmadığı ortaya çıkarsa puanlama ve fiyatlar sezon içinde değişebilir; bu tür değişiklikleri duyururuz.',
    jamstvoNaslov: 'Garanti yok',
    jamstvo:
      'Site olduğu gibi çalışır. Verilerin doğru ve sitenin erişilebilir olması için elimizden geleni yaparız ama bunu garanti edemeyiz: maç raporları gecikebilir ve istatistiklerde hatalar olabilir. Bu, ücretsiz oyun için geçerlidir. Ücretli hizmetler Ücretli hizmetler bölümüne ve yasal tüketici haklarına tabidir.',
    kajJePlacljivo:
      'Ücretli olan tek şey isteğe bağlı onaylı oyuncu rozetidir (aşağıdaki Ücretli hizmetler bölümüne bak).',
    podatkiPlacilo:
      '<b>Onaylı oyuncu rozeti satın alma (sadece satın alırsan).</b> Satın alma kaydını (ne, ne zaman, tutar ve Stripe müşteri kimliğin) muhasebe mevzuatı gereği 10 yıl saklarız. Basılı rozet için teslimat adresini gönderimden ya da siparişin iptalinden sonra 90 gün, en fazla da siparişten itibaren 12 ay saklarız; sonrasında sadece ülke kalır.',
    dostopStripe:
      'Onaylı oyuncu rozeti ödemeleri <b>Stripe</b> (Stripe Payments Europe, İrlanda) tarafından işlenir: adını, e-postanı, fatura adresini ve basılı rozet için teslimat adresini alır. Kart bilgilerini doğrudan Stripe’a girersin; biz onları hiçbir zaman görmeyiz.',
    placljivoNaslov:
      'Ücretli hizmetler: onaylı oyuncular',
    placljivoUvod:
      'Oyun ücretsizdir ve ücretsiz kalacak. Ücretli tek ürün, profilin kendisine ait olduğunu onaylamış bir oyuncunun satın alabileceği isteğe bağlı onaylı oyuncu rozetidir. Rozet puanları, fiyatları, fantezi takımları ya da oyun kurallarını hiçbir zaman etkilemez. Bu koşullar o satın alma için geçerlidir.',
    prodajalec:
      '<b>Satıcı:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenya; Ljubljana Bölge Mahkemesi ticaret siciline kayıtlıdır. Şirket sicil numarası 9850538000, KDV numarası SI42765153. İletişim: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Ne satın alıyorsun.</b> Oyuncunun adının yanında mavi bir onay işareti ve profil ekstraları (daha uzun açıklama, bağlantılar, kapak görseli, renk, öne çıkan bir maç ya da istatistik, taraftarlara bir mesaj). Yıllık abonelik 9,99 € tutarındadır ve her yıl otomatik olarak yenilenir. Ömür boyu seçeneği tek seferlik 29 € tutarındadır ve SLFF bu hizmeti sunduğu sürece geçerlidir. Ömür boyu seçeneğine 5 € karşılığında adının yazdığı basılı bir rozet ekleyebilirsin; kargo ücreti 2 € (Slovenya) ya da 4 € (başka bir AB ülkesi). Sadece AB ülkelerine gönderim yapıyoruz; teslimat genellikle 2 ila 3 hafta sürer. Tüm fiyatlara KDV dahildir.',
    placilo:
      '<b>Ödeme.</b> Ödeme Stripe tarafından işlenir. Kart bilgilerini görmeyiz ve saklamayız. Satın alma için en az 18 yaşında olman gerekir. Sözleşme, Stripe ödemeyi onayladığında kurulur.',
    odpoved:
      '<b>Aboneliğin iptali.</b> Hesap sayfandaki (slff.eu/account) ya da oyuncu profilindeki Aboneliği yönet düğmesiyle istediğin zaman iptal edebilirsin. İptal, ödenmiş yılın sonunda geçerli olur; o zamana kadar rozet kalır. Aşağıdaki durumlar dışında başlamış bir yılın ücretini iade etmeyiz.',
    odstop:
      '<b>Cayma hakkı.</b> Dijital içerik (onay işareti ve ekstralar) ödemeden hemen sonra sağlanır. Ödemeden önce anında sağlanmasını açıkça kabul eder ve böylece 14 günlük cayma hakkını kaybettiğini onaylarsın (2011/83/AB sayılı Direktif md. 16(m), Slovenya ZVPot-1). Basılı rozet senin isteğine göre (üzerindeki adla) yapıldığı için cayma hakkı yoktur (md. 16(c)). Yasal ayıp hakların saklıdır: rozet hasarlı, yanlış gelirse ya da hiç gelmezse bize yaz, ücretsiz olarak değiştirir ya da paranı iade ederiz.',
    konec:
      '<b>Rozet ne zaman sona erer.</b> Profilin sana ait olmadığı ortaya çıkar ve onayı iptal edersek, oyuncunun adı oyuncunun ya da futbol federasyonunun talebiyle gizlenirse ya da hesabını silersen rozet sona erer. Bu durumda abonelik otomatik olarak durur ve artık ücret alınmaz. Ödemeye bankan üzerinden itiraz edersen (ters ibraz), rozet kaldırılır.',
    vracila:
      '<b>İadeler.</b> Kötüye kullanım ya da sahte profil talebi durumunda iade yapmayız. Rozet bizim hatamız yüzünden, futbol federasyonunun talebiyle ya da hizmeti sonlandırmamız nedeniyle sona ererse, yıllık aboneliğin kullanılmayan aylarını orantılı olarak iade ederiz. Ömür boyu satın almada ilk 12 ay içinde tutarın tamamını, sonrasında ise satın almadan itibaren 5 yıldan kalan sürenin orantılı payını iade ederiz. Basılı rozet ve kargo ücreti hizmetin sonlandırılmasında iade edilmez (rozet sende kalır), sadece kusur durumunda iade edilir.',
    pritozbe:
      '<b>Sorular ve şikâyetler.</b> <eposta>info@slff.eu</eposta> adresine yaz; 8 iş günü içinde cevap veririz. Tüketici uyuşmazlıklarının mahkeme dışı çözümü için herhangi bir sağlayıcıyı tanımıyoruz. Slovenya hukuku uygulanır; bu, yaşadığın ülkenin hukukunun sana sağladığı korumayı ortadan kaldırmaz.',
    scoutNaslov: 'SLFF Scout: kulüpler için oyuncu arama',
    scoutKaj:
      'Aynı herkese açık maç raporlarından büyükler liglerindeki oyuncular için göstergeler hesaplarız: dakika payı, goller, sahadaki etki, yenilen goller, kartlar ve sezonlar boyunca gelişim; lig gücüne göre düzeltilmiş olarak. Bunlar maç verilerinden çıkan göstergelerdir, kişi hakkında bir değerlendirme değildir. SLFF Scout aboneliği olan ve oyuncu arayan kulüpler bunları görür; kararı her zaman kulüpteki bir kişi verir. Alt yaş liglerini işlemeyiz. Bir alt yaş liginde oynamış olan herkes, bir büyükler liginde dakikası olana ve kendi profiline bu yıl 19 yaşına ya da daha büyük bir yaşa girdiğini gösteren bir doğum yılı girene kadar hariç tutulur.',
    scoutPodlaga:
      'Hukuki dayanak meşru menfaattir (GDPR md. 6(1)(f)): kulüplerin herkese açık yayımlanmış sonuçlardan oyuncu bulmasına yardımcı olmak. Göstergeleri her gün yeniden hesaplar ve sadece son hesaplamaları saklarız. Kötüye kullanımı önlemek ve talep halinde oyuncuya onu hangi kulüplerin görüntülediğini söyleyebilmek için kulüp görüntülemeleri 12 ay boyunca kaydedilecektir.',
    scoutPrivolitev:
      'Profilini sahiplenmiş bir oyuncu transfere açık olduğunu, doğum yılını, tercih ettiği bölgeleri ve kendisiyle iletişime geçilmesine izin verdiğini ekleyebilir. Bu bir rızadır (GDPR md. 6(1)(a)): sadece Scout’taki kulüpler görür, profilden istediğin zaman geri alınabilir ve geri alındığında verileri sileriz. Bir kulüp oyuncuya sadece Scout üzerinden yazar ve e-posta adresini görmez.',
    scoutUgovor:
      'İtiraz: sahiplenilmiş bir profilde Beni Scout’tan gizle seçeneğine tıkla ya da oyuncu sayfasının bağlantısıyla birlikte <eposta>info@slff.eu</eposta> adresine yaz. 14 gün içinde oyuncuyu o ülkedeki tüm liglerimizde, gelecekteki aktarımlar dahil Scout’tan gizleriz. Oyuncu fantezi oyunda kalır.',
    trgovinaNaslov: 'SLFF Mağaza (shop.slff.eu)',
    trgovinaKaj:
      'Satın alırken adını, e-postanı, teslimat adresini, satın alınan ürünleri ve tutarları, giriş yaptıysan SLFF hesabını da işleriz. Ödemeyi Stripe yapar: kart bilgilerini görmeyiz ve saklamayız. Ad ve adres teslimat için Pošta Slovenije ile paylaşılır. Kötüye kullanımı sınırlamak için tamamlanmamış bir satın almada IP adresinin geri döndürülemez bir özetini (hash) geçici olarak saklarız; ödeme yapıldığında veya satın alma süresi dolduğunda silinir.',
    trgovinaPodlaga:
      'Hukuki dayanak sözleşmenin ifası (GDPR madde 6(1)(b)) ve yasal yükümlülüklerdir (muhasebe, vergiler); IP adresi özeti için kötüye kullanımı önlemeye yönelik meşru menfaatimizdir (GDPR madde 6(1)(f)). Veri sorumlusu SPACE GUARDIAN, računalniško programiranje, d.o.o. şirketidir.',
    trgovinaHramba:
      'Sipariş ve fatura verilerini KDV yasası ve muhasebe kurallarının gerektirdiği süre boyunca saklarız (faturanın düzenlendiği yıldan sonra 10 yıl). Sipariş bildirimleri için e-posta yalnızca o sipariş için kullanılır. Erişim, düzeltme veya itiraz için <eposta>info@slff.eu</eposta> adresine yaz.',
  },
  klubskiRacun: {
    naslov: 'Resmi kulüp hesabı',
    aktiven: 'Bu hesap şu kulübü temsil ediyor: {klub}.',
    pravice: 'Kulüp olarak mevkileri düzenleyebilir, oyuncu ekleyebilir ve oyuncularının profillerini onaylayabilirsin.',
    vprasanje: 'Bir kulübü temsil ediyor musun?',
    pojasnilo: 'Kayıtlarımızdaki resmi kulüp adresiyle giriş yaparsan otomatik olarak kulüp hesabı alırsın. Bu adres bizde yoksa aşağıdan talep et, biz kontrol edelim.',
    klub: 'Kulüp',
    isciKlub: 'Kulüp ara …',
    vloga: 'Kulüpteki görevin',
    vloge: {
      predsednik: 'başkan',
      tajnik: 'sekreter',
      trener: 'antrenör',
      vodstvo: 'kulüp yönetimi',
      drugo: 'diğer',
    },
    dokaz: 'Adresin yayımlandığı bağlantı (web sitesi, Facebook, federasyon)',
    opomba: 'Not (isteğe bağlı)',
    naslovRacuna: 'Kontrol ettiğimiz adres: {email}',
    poslji: 'Talebi gönder',
    caka: 'Talebin inceleme bekliyor (kulüp: {klub}).',
    cakaBrezKluba: 'Adresin resmi bir adres, ama onu henüz kulübe bağlamamız gerekiyor. Kısa süre içinde halledeceğiz.',
    cakaPolno: 'Kulübün zaten 5 hesabı var. İnceleyip sana haber vereceğiz.',
    zavrnjeno: 'Talebin reddedildi: {razlog}',
    nepotrjen: 'Önce hesabının e-postasını onayla.',
    napake: {
      zeKlub: 'Zaten bir kulübü temsil ediyorsun.',
      caka: 'Talebin zaten karar bekliyor.',
    },
  },
}
