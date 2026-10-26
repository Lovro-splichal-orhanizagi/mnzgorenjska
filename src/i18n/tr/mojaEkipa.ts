// Türkçe çeviri: `mojaEkipa` (izvor: src/i18n/sl/mojaEkipa.ts).
// Terimler Türk futbol basınındaki gibi: kadro, ilk 11, yedek kulübesi, kaptan, yardımcı kaptan; krog = hafta.
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Takımım',
  /** Oyuncunun adı bilinmediğinde. */
  igralec: 'Oyuncu',
  vprasanjeZapustitve: 'Takımında kaydedilmemiş değişiklikler var. Yine de sayfadan çıkılsın mı?',
  /** Formadaki pazubant etiketi. */
  oznaka: {
    kapetan: 'K',
    namestnik: 'Y',
  },

  // Kadro kuralları (lib/pravila.ts): pazardaki ve hata listesindeki gerekçeler.
  pravila: {
    pozicije: {
      GK: 'Kaleciler',
      DEF: 'Defanslar',
      MID: 'Orta sahalar',
      FWD: 'Forvetler',
    },
    kaderPoln: 'Kadron dolu ({n} oyuncu).',
    pozicijaPolna: '{pozicija}: kadronda zaten {n} tane var.',
    premaloProracuna: 'Bütçe yetersiz: oyuncunun fiyatı {cena}, sende {preostalo} kaldı.',
    izKluba: '{klub} kulübünden zaten {n} oyuncun var.',
    velikostEkipe: 'Kadronda {n} oyuncu olmalı (şu an {trenutno}).',
    velikostPostave: 'İlk 11’inde {n} oyuncu olmalı (şu an {trenutno}).',
    brezPozicije: {
      one: 'Seçtiğin {n} oyuncunun mevkisi henüz onaylanmadı. Mevkiler bölümünde yardım edebilirsin.',
      other: 'Seçtiğin {n} oyuncunun mevkisi henüz onaylanmadı. Mevkiler bölümünde yardım edebilirsin.',
    },
    niVecVLigi: '{ime} artık ligde değil, yerine başkasını al.',
    pozicijaVKadru: 'Kadroda {pozicija}: {n}, {kader} olmalı.',
    pozicijaVPostavi: 'İlk 11’de {pozicija}: {n}, izin verilen {min} ile {max} arası.',
    dolociKapetana: 'Bir kaptan seç: o hafta {n} kat puan alır.',
    enKapetan: 'Sadece bir kaptanın olabilir.',
    dolociNamestnika: 'Kaptan oynamazsa pazubandı alacak bir yardımcı kaptan seç.',
    istiKlub: 'Aynı kulüpten en fazla {n} oyuncu seçebilirsin.',
    presegelProracun: 'Bütçeyi {cena} aştın.',
  },

  napake: {
    zeImas: 'Bu ligde zaten bir takımın var. Sayfayı yenile.',
    dovoljenje: 'Bunun için yetkin yok. Tekrar giriş yap ve bir daha dene.',
    povezava: 'Sunucuyla bağlantı yok. İnternetini kontrol et ve tekrar dene.',
    shranjevanje: 'Kaydetme başarısız oldu. Lütfen tekrar dene.',
    nalaganjePovezava: 'Sunucuyla bağlantı yok, internetini kontrol et.',
    nalaganje: 'Takım bilgilerin yüklenemedi.',
    nalaganjeNiCelo:
      'Takımın tamamen yüklenmeden kaydedilemez. Aksi halde kaydetmek, yüklenmeyen oyuncuları silerdi.',
    poskusiZnova: 'Tekrar dene',
    vpisiIme: 'Önce bir takım adı yaz.',
    osvezitev:
      'Takımın kaydedildi ama yenileme başarısız oldu. Tekrar düzenlemeden önce sayfayı yenile.',
    najprejShrani: 'Önce takımını kaydet.',
    izberiKrog: 'Kartın geçerli olacağı haftayı seç.',
    prihodnjiKrog: 'Son tarihi belli olan, kilitlenmemiş, gelecek bir hafta seç.',
    zeUporabil: 'Bu kartı bu sezon zaten kullandın.',
    niPreklica: 'Bu haftanın kartı artık iptal edilemez.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'Bu ligde pazarda henüz oyuncu yok.',
    pocakaj: 'Kaydetme işleminin bitmesini bekle.',
    niPredloga: 'Bu ligden henüz geçerli bir takım kurulamıyor.',
    predlogSestavljen: 'Takımın hazır. İstediğin oyuncuyu değiştir ve Kaydet’e bas.',
    kaderDopolnjen: 'Boş yerler dolduruldu. Kontrol et ve Kaydet’e bas.',
    niDopolnitve:
      'Kalan parayla kadron tamamlanamıyor. Pahalı oyunculardan birini değiştir ve tekrar dene.',
    kapetanNaKlop: '{ime} yedek kulübesine geçti, yeni bir kaptan seç.',
    namestnikNaKlop: '{ime} yedek kulübesine geçti, yeni bir yardımcı kaptan seç.',
    brezPozicije: 'Bu oyuncunun mevkisi henüz onaylanmadı, bu yüzden sahaya konamaz.',
    niProstora:
      'İlk 11’de bu mevkide başka bir oyuncuya yer yok. Önce birini yedeğe al.',
    niVecNamestnik: '{ime} artık yardımcı kaptan değil, yenisini seç.',
    niVecKapetan: '{ime} artık kaptan değil, yenisini seç.',
    kapetanPrevzel: 'Kaptanlık pazubandı artık {ime} oyuncusunda.',
    namestnikPrevzel: 'Yardımcı kaptan artık {ime}.',
    rokPotekel: '{krog}. haftanın son tarihi geçti, değişiklikler bir sonraki haftadan itibaren geçerli.',
    shranjenaZaKrog: 'Takımın kaydedildi ve {krog}. hafta için hazır.',
    shranjenaVeljavna: 'Takımın kaydedildi ve kurallara uygun.',
    osnutekShranjen:
      'Taslak kaydedildi. Takımın henüz kurallara uymuyor, bu yüzden bu hafta puan almaz.',
    prodaja: 'Satıştan +{cena} kazandın.',
    nakupi: 'Alımların maliyeti: {cena}.',
    wildcardVlozen: 'Joker kullanıldı: bu hafta transferler ücretsiz.',
    klopPlusVlozen: 'Yedek+ kullanıldı.',
    wildcardPreklican: 'Joker iptal edildi, başka bir haftada kullanabilirsin.',
    klopPlusPreklican: 'Yedek+ iptal edildi, başka bir haftada kullanabilirsin.',
    zapriOpozorilo: 'Uyarıyı kapat',
    zapriObvestilo: 'Bildirimi kapat',
    odstranjen: '{ime} çıkarıldı.',
    razveljavi: 'Geri al',
    dodan: '{ime} takımında. Kaydet’e dokun.',
    dodanSamodejno: '{ime} takımında.',
    zeVEkipi: '{ime} zaten takımında.',
    niNaTrgu: 'Bu oyuncu şu an satın alınamaz.',
  },

  brezPrijave: {
    opis: 'Takımını hesap açmadan kurabilirsin. Kaydedene kadar bu tarayıcıda kalır.',
    shrani: 'Kaydet ve hesap oluştur',
    pripravljena: 'Takımın hazır, şimdi kaydet.',
  },
  locenaLiga:
    'Lig: <liga>{liga}</liga>. Bu ligdeki takımın diğer liglerdeki takımlarından ayrıdır: kendi bütçesi ve kendi puan durumu var. Puanlar {krog}. haftadan itibaren sayılır, çünkü o zamana kadar transferler ve yaş grupları arası geçişler devam ediyor.',

  /** Sahanın altındaki katlanır bölüm. */
  vec: 'Daha fazla: kartlar, geçmiş, kurallar',

  prestopi: {
    medSezono: {
      one: 'Sezonun ortasında katılıyorsun: {krog}. haftanın son tarihine kadar takımını cezasız kurabilirsin. Sonrasında her hafta {n} ücretsiz transfer hakkın var; her ek transfer −{kazen}.',
      other: 'Sezonun ortasında katılıyorsun: {krog}. haftanın son tarihine kadar takımını cezasız kurabilirsin. Sonrasında her hafta {n} ücretsiz transfer hakkın var; her ek transfer −{kazen}.',
    },
    stevec: 'Transferler: {n}/{prosti}',
    wildcard: 'joker, ceza yok',
    odbitek: 'bu hafta {tock} kesinti',
    prosti: {
      one: '{n} ücretsiz daha, sonra her biri −{kazen}',
      other: '{n} ücretsiz daha, sonra her biri −{kazen}',
    },
  },

  // Transfer önerileri (lib/namigiEkipe.ts): gelecek hafta kim oynamayacak ve
  // yerine kimi alabilirsin.
  namigi: {
    naslov: 'Transfer önerileri',
    zaKrog: '{krog}. haftada muhtemelen kim oynamayacak ve yerine kimi alabilirsin.',
    razlog: {
      neaktiven: 'artık ligde değil',
      poskodba: 'sakat',
      odsotnost: 'forma giyemiyor',
      brezTekme: 'kulübün maçı yok',
    },
    kandidat: '{cena} · form {forma}',
    zamenjajNamig: 'Kadronda {ime} yerine {novi} al',
    niZamenjave: 'Bütçene ve kurallara uyan bir yedek yok.',
    opomba: 'Tıklamak sadece değişikliği hazırlar, takımı sen kaydedersin. Her öneri kendi başına geçerlidir.',
    skrij: 'Gelecek haftaya kadar gizle',
    zamenjano: 'Kadronda {ime} yerine artık {novi} var. Memnun olduğunda takımını kaydet.',
  },

  // Son ziyaretten beri kadrodaki oyuncuların fiyat değişimleri.
  odZadnjegaObiska: {
    naslov: 'Son ziyaretinden beri',
    naslovTeden: 'Son bir haftada',
    vrednost: 'Takım değeri <znesek>{znak}{cena}</znesek>',
    gor: 'fiyat artışı',
    dol: 'fiyat düşüşü',
    zapri: 'Kapat',
  },

  povzetek: {
    urediIme: 'Takım adını düzenle: {ime}',
    bogastvo:
      'servet <vrednost>{bogastvo}</vrednost><razlika></razlika> · kadro {kader} <placano>ödendi</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Kaydediliyor …',
    shranjeno: 'Kaydedildi ✓',
    shraniEkipo: 'Takımı kaydet',
    neshranjeno: 'Kaydedilmemiş değişiklikler',
    imeEkipe: 'Takım adı',
    privzetoIme: '{ime} FK',
    primerImena: 'örn. Pazar Kahramanları',
  },

  // Boş takım için başlangıç ipucu.
  vodic: {
    napredek: '{trenutni} / {skupaj}',
    naprej: 'İleri',
    razumem: 'Anladım',
    sestaviNaslov: 'Tek tıkla takım',
    sestaviOpis: 'Buraya dokun, sana bütçeye uygun geçerli bir takım kuralım. Sonra istediğini değiştir.',
    igrisceNaslov: 'İşte takımın',
    igrisceOpis: 'Ayrıntıları görmek ya da değiştirmek için bir oyuncuya dokun. İlk 11’in puan toplar, biri oynamazsa yedekten bir oyuncu girer.',
    shraniNaslov: 'Son adım: Kaydet',
    shraniOpis: 'Kaydettiğinde bir sonraki haftadan itibaren puan toplarsın. Takımını son tarihe kadar değiştirebilirsin.',
  },
  zacetek: {
    naslov: 'Nereden başlamalı?',
    sestaviMi: 'Benim için takım kur',
    opisPredloga:
      'Bütçeye uygun, rastgele geçerli bir takım seçiyoruz; her tıklamada farklı. Sonra istediğini değiştir ve kaydet.',
    sam: 'Kendim kurmak istiyorum',
    drugPredlog: 'Başka bir öneri',
    opisDrugegaPredloga:
      'Beğenmedin mi? Yeni bir takım çek, kaydedene kadar ücretsiz.',
    dopolni: 'Takımımı tamamla',
    opisDopolnitve:
      'Kadrodaki boş yerler: {n}. Seçtiklerin kalır, gerisini bütçeye uygun şekilde rastgele dolduruyoruz.',
    korak1: 'Yukarıda bir takım adı önerdik, istediğin zaman değiştirebilirsin.',
    korak2:
      'Sahadaki boş bir yerde <krepko>＋</krepko> işaretine tıkla. Telefonda alt çubukta bir de <krepko>＋ Ekle</krepko> düğmesi var; bilgisayarda sağdaki <krepko>oyuncu pazarından</krepko> seçersin.',
    korak3:
      'Kadro {n} oyuncudan oluşur: {gk} KL, {def} DEF, {mid} OS, {fwd} FV. Aynı kulüpten en fazla {klub}.',
    korak4:
      'Tüm yerler dolunca bir <krepko>kaptan</krepko> ve bir <krepko>yardımcı kaptan</krepko> seç, sonra <krepko>Takımı kaydet</krepko> düğmesine bas (telefonda alt çubuktaki <krepko>Kaydet</krepko>).',
  },

  trak: {
    naslov: 'Pazubant',
    kapetan: 'Kaptan (×{n})',
    namestnik: 'Yardımcı kaptan',
    nihce: 'kimse',
  },

  // "Ya olsaydı": mevcut ilk 11 son haftada kaç puan alırdı.
  kajCe: {
    prinesla: 'Mevcut ilk 11’inin <krog>{krog}. hafta</krog> ({sezona}) puanı',
    opis: 'Bir "ya olsaydı" görünümü, gerçek bir sonuç değil; her değişiklikte güncellenir. Geçmiş haftaların gerçek puanları puan durumunda ve kadro geçmişinde.',
  },

  status: {
    manjka: 'Kesin kayıt için birkaç şey eksik:',
    vpisiIme: 'Bir takım adı yaz (yukarıdaki alana).',
    osnutekZdaj: 'Şimdi bir taslak da kaydedebilirsin, kuralları sonra hallet.',
    brezTock: 'Bu haliyle <krepko>{krog}. hafta için</krepko> <krepko>PUAN ALAMAZSIN</krepko>.',
    kajPomeni:
      '<krepko>"Kaydet" ne işe yarar?</krepko> Değişikliklerin (kadro, ilk 11, kaptan) veritabanına yazılır. Mevcut hafta için son tarihteki durum geçerlidir. Son tarihe kadar istediğin kadar değiştirip Kaydet’e basabilirsin, son hali geçerli olur. <krepko>"Taslağı kaydet"</krepko> de aynısını yapar, sadece takımın henüz tüm kurallara uymadığını not eder (puan alman için düzeltmeler gerekiyor, yukarıdaki listeye bak).',
    kajPomeniRok:
      '<krepko>"Kaydet" ne işe yarar?</krepko> Değişikliklerin (kadro, ilk 11, kaptan) veritabanına yazılır. Mevcut hafta için son tarihteki durum geçerlidir (<krepko>{krog}. hafta: {rok}</krepko>). Son tarihe kadar istediğin kadar değiştirip Kaydet’e basabilirsin, son hali geçerli olur. <krepko>"Taslağı kaydet"</krepko> de aynısını yapar, sadece takımın henüz tüm kurallara uymadığını not eder (puan alman için düzeltmeler gerekiyor, yukarıdaki listeye bak).',
  },

  pripomocki: {
    klopPlusNaslov: 'Yedek+ kartı',
    klopPlusVlozenZa: '{krog}. hafta ({sezona}) için kullanıldı: yedeklerin puanları da sayılır.',
    klopPlusVlozen: 'Yedek+ zaten kullanıldı: yedeklerin puanları da sayılır.',
    klopPlusOpis:
      'Sezonda bir kez: seçtiğin haftada dört yedeğin de puanları eklenir.',
    wildcardNaslov: 'Joker kartı',
    wildcardVlozenZa: '{krog}. hafta ({sezona}) için kullanıldı: o haftaki transferler ücretsiz.',
    wildcardVlozen: 'Joker zaten kullanıldı: o haftaki transferler ücretsiz.',
    wildcardOpis:
      'Sezonda bir kez: bu hafta puan kesintisi olmadan istediğin kadar oyuncu değiştirebilirsin.',
    zaklenjen: 'kilitli',
    preklici: 'iptal et',
    prekliciDo: 'İptal için kalan süre: <odstevanje></odstevanje>',
    izberiKrog: 'Bir hafta seç …',
    niKroga: 'Son tarihi belli gelecek hafta yok',
    krogSezona: '{krog}. hafta ({sezona})',
    vlozi: 'Kullan',
    vloziZa: '{krog}. hafta için kullan',
    potrdiWildcard: 'Joker’i {krog}. hafta için kullanmak istiyor musun? Sezonda sadece bir tane var.',
  },

  zgodovina: {
    naslov: 'Kadro geçmişi',
    posnetkov: {
      one: 'Kaydı olan {n} hafta',
      other: 'Kaydı olan {n} hafta',
    },
    krog: '{krog}. hafta',
    podrobnost: '{krog}. hafta · {sezona} sezonu',
    podrobnostSkupaj: '{krog}. hafta · {sezona} sezonu · toplam <krepko>{tocke}</krepko>',
    deli: '{krog}. haftayı paylaş',
  },

  // Telefonda alt çubuk ve pazar çekmecesi.
  telefon: {
    ostane: 'kaldı',
    predalPovzetek: '<krepko>{cena}</krepko> kaldı · {n}/{velikost}',
    popravi: 'düzelt ↑',
    neshranjeno: 'kaydedilmedi',
    dodaj: '＋ Ekle',
    osnutekNamig: 'Takımın henüz kurallara uymuyor, taslak olarak kaydedilecek.',
    neIzpolnjuje: 'takım henüz kurallara uymuyor',
    zapriTrg: 'Pazarı kapat',
    zapri: '✕ Kapat',
  },

  trg: {
    naslov: 'Oyuncu pazarı',
    iskanje: 'İsimle ara …',
    pocistiIskanje: 'Aramayı temizle',
    vsi: 'tümü',
    vsiKlubi: 'Tüm kulüpler',
    niZadetkov: 'Sonuç yok.',
    pocistiFiltre: 'Filtreleri temizle',
    statLetos: '{goli} G · {minute} dk',
    statLani: 'geçen sezon {goli} G',
    brezNastopov: 'maça çıkmadı',
    niVecVLigi: 'artık ligde değil',
    tockeZadnjiKrog: 'Oynanan son haftadaki puanlar',
    podatki: 'Ayrıntılar: {ime}',
    podatkiNamig: 'İstatistikler, fiyat geçmişi, sıradaki maçlar',
    profilVNovemZavihku: 'Oyuncu profilini yeni sekmede aç',
    odstrani: '✕ çıkar',
    dodaj: '⊕ ekle',
    prvih: 'İlk {n} oyuncu gösteriliyor, aramayla daralt.',
    noga: 'Aynı kulüpten en fazla {n} oyuncu seçebilirsin. Goller ve dakikalar bu sezona ait.',
  },

  rok: {
    krog: '{krog}. hafta',
    potekel: 'Son tarih geçti: <krepko>{rok}</krepko>',
    rok: 'Son tarih: <krepko>{rok}</krepko>',
    niDolocen: 'Son tarih henüz belli değil.',
  },

  // Takım kurucusundaki saha (components/Igrisce.tsx).
  igrisce: {
    namigZamenjave: 'Bir oyuncunun formasına, sonra onunla değiştirmek istediğin oyuncuya dokun.',
    zapriNamig: 'İpucunu kapat',
    izberiZaMenjavo: '{ime}: oyuncu değişikliği için seç',
    prekliciIzbiro: '{ime}: seçimi iptal et',
    zamenjajZ: '{ime}: {drugi} ile değiştir',
    izbran: '{ime} seçildi. Değiştirmek için vurgulanan bir oyuncuya, iptal için aynı oyuncuya tekrar dokun.',
    brezMenjave: '{ime} için geçerli bir değişiklik yok. İptal için tekrar dokun.',
    niVecVLigiNamig: 'Bu oyuncu artık ligde değil. Onun olduğu kadro puan almaz.',
    niVecVLigi: 'artık ligde değil',
    poskodba: 'sakatlık',
    odsoten: 'forma giyemiyor',
    kapetan: 'Kaptan: üç kat puan',
    namestnik: 'Yardımcı kaptan',
    tockeKroga: 'Son haftadaki puan: {tocke}',
    tockeKrogaKapetan: 'Son haftadaki puan: {tocke} × 3 (kaptan)',
    odstraniIzKadra: 'Kadrodan çıkar',
    odstrani: 'Çıkar: {ime}',
    prej: 'Değişiklik sırasında öne al',
    prejIme: '{ime}: değişiklik sırasında öne al',
    pozneje: 'Değişiklik sırasında geriye al',
    poznejeIme: '{ime}: değişiklik sırasında geriye al',
    izberi: 'Seç: {pozicija}',
    klop: 'Yedek kulübesi',
    klopOpis:
      'İlk 11’den biri oynamazsa yerine aynı mevkideki ilk yedek girer, soldan sağa sırayla.',
    brezPozicije: 'Onaylanmış mevki yok, sahaya konamaz',
  },

  // Bir maçta bir takımın puanlarını gösteren saha (components/IgrisceTocke.tsx).
  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} dk',
    goli: '{n} × gol',
    asistence: '{n} × asist',
    brezPrejetega: 'gol yemedi',
    prejetih: '{n} gol yedi',
    rumeni: 'sarı kart',
    rdeci: 'kırmızı kart',
    skupaj: '{tocke} puan',
    brezPostave: 'Maç raporunda bu takımın kadrosu yok.',
    klop: 'Yedek kulübesi',
    vstopilo: '{n} oyuncu oyuna girdi',
  },

  // Haftanın takımı ve başka bir menajerin sahadaki ilk 11’i.
  enajsterica: {
    kapetan: 'Kaptan',
    namestnik: 'Pazubantlı yardımcı kaptan',
  },

  // Takımlarımla ilgili bildirim şeridi (components/OpozoriloEkipe.tsx, lib/stanjeEkip.ts).
  opozorila: {
    naslov: 'Takımların için uyarılar',
    naslovNapakEna: 'Takımlarından biri puan almayacak',
    naslovNapak: {
      one: 'Takımlarından {n} tanesi puan almayacak',
      other: 'Takımlarından {n} tanesi puan almayacak',
    },
    nimasEkipe: 'Henüz takımın yok<liga>({liga})</liga>. Takımın olmazsa gelecek hafta puan alamazsın.',
    sestavi: 'Takım kur →',
    popravi: 'Düzelt →',
    poglej: 'Gör →',
    skrij: 'Uyarıyı gizle: {besedilo}',
    skrijNamig: 'Yeni bir rapor gelene kadar gizle',
    pokaziVse: 'Tümünü göster ({n})',
    razlog: 'Takım kurallara uymuyor.',
    brezTockKrog: '{krog}. haftada puan almayacak.',
    brezTockRok: 'Bir sonraki son tarihte puan almayacak.',
    nepopolna: 'Takım eksik. Bu hafta yine de kilitlenecek, ama bir sonrakinden itibaren puan almayacak.',
    igralec: {
      kapetan: {
        poskodba: 'Kaptan {ime} sakat.',
        odsotnost: 'Kaptan {ime} forma giyemiyor.',
        izstop: 'Kaptan {ime} artık oynamayacak: kulübü ligden çekildi.',
      },
      namestnik: {
        poskodba: 'Yardımcı kaptan {ime} sakat.',
        odsotnost: 'Yardımcı kaptan {ime} forma giyemiyor.',
        izstop: 'Yardımcı kaptan {ime} artık oynamayacak: kulübü ligden çekildi.',
      },
      vPostavi: {
        poskodba: 'İlk 11’indeki {ime} sakat.',
        odsotnost: 'İlk 11’indeki {ime} forma giyemiyor.',
        izstop: 'İlk 11’indeki {ime} artık oynamayacak: kulübü ligden çekildi.',
      },
      naKlopi: {
        poskodba: 'Yedek kulübendeki {ime} sakat.',
        odsotnost: 'Yedek kulübendeki {ime} forma giyemiyor.',
        izstop: 'Yedek kulübendeki {ime} artık oynamayacak: kulübü ligden çekildi.',
      },
    },
    posledica: {
      kapetan: 'Oynamazsa pazubandı yardımcı kaptan alır. Belki başka bir kaptan seçmelisin.',
      namestnik: 'Ne kaptan ne de yardımcı kaptan oynarsa üç kat puan olmaz.',
      vPostavi: 'Oynamazsa yerine aynı mevkideki ilk yedek girer.',
      naKlopi: 'Oynamazsa otomatik değişiklik onu atlar.',
      izstop: 'Artık puan almayacak, yerine başkasını al. Onu tutarsan takımın yine de geçerli kalır.',
    },
  },
}
