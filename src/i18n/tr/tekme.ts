// Türkçe çeviri: `tekme` (kaynak: src/i18n/sl/tekme.ts).
// Tur (krog) her zaman "hafta": "5. hafta".
import type { Prevod } from '../jedro.ts'

export const tekme: NonNullable<Prevod['tekme']> = {
  statistika: {
    brezStrelcev: "Doğrulanmış golcü yok.",
    nedosegljivo: "Bu geçmiş maç için oyuncu istatistikleri mevcut değil. Resmî sonuç korunur.",
    kratko: "İstatistikler mevcut değil",
    postaveTocke: "Kadrolar ve puanlar",
    kartoni: "Kartlar",
    delno: "{sezona} sezonu için kısmi istatistikler: oynanan {odigranih} lig maçının {popolnih} tanesi için tam veri var. {nedosegljivih} geçmiş maç için oyuncu istatistikleri mevcut değil. Toplamlar ve ortalamalar yalnızca doğrulanmış forma giyme verilerini içerir.",
    brezOpazovanj: "Doğrulanmış forma giyme verisi yok",
  },

  krog: '{n}. hafta',
  moraPrijava: 'Oy vermek için <prijava>giriş yapman</prijava> gerekiyor.',

  // Puan dökümü kalemleri ve kurallar (lib/tockovanje).
  tockovanje: {
    postavke: {
      nastopOd60: '60 dakika veya daha fazla oynadı',
      nastopDo60: '60 dakikaya kadar oynadı',
      gol: 'Gol',
      goli: 'Gol ({n})',
      asistenca: 'Asist',
      asistence: 'Asist ({n})',
      brezPrejetega: 'Gol yemeden',
      zmaga: 'Takım galibiyeti',
      prejetiGoli: 'Yenilen gol ({n})',
      obranjena: 'Kurtarılan penaltı ({n})',
      zgresena: 'Kaçırılan penaltı ({n})',
      avtogol: 'Kendi kalesine gol ({n})',
      rumeni: 'Sarı kart ({n})',
      rdeci: 'Kırmızı kart',
    },
    pravila: {
      igralniCas: 'Süre',
      nastopDo60: '60 dakikaya kadar oynadı',
      nastopOd60: '60 dakika veya daha fazla oynadı',
      goliInAsistence: 'Goller ve asistler',
      golVratarja: 'Kaleci golü',
      golBranilca: 'Defans golü',
      golVezista: 'Orta saha golü',
      golNapadalca: 'Forvet golü',
      asistenca: 'Asist',
      obramba: 'Savunma',
      csVratar: 'Gol yemeden: kaleci',
      csBranilec: 'Gol yemeden: defans',
      csVezist: 'Gol yemeden: orta saha',
      zmaga: 'Takım galibiyeti: kaleci, defans',
      prejeta2: 'Yenilen her 2 gol: kaleci, defans',
      // Ana sayfadaki kurallar tablosunun altında.
      opomba:
        'Gol yemeden biten maç en az 60 dakika oynandığında sayılır; sadece oyuncu sahadayken yenilen goller sayılır.',
      obranjena:
        'Kurtarılan penaltı: kaleci (maç raporunda rakibin kaçırdığı penaltı olarak geçer)',
      kazni: 'Kesintiler',
      zgresena: 'Kaçırılan penaltı',
      avtogol: 'Kendi kalesine gol',
      rumeni: 'Sarı kart',
      rdeci: 'Kırmızı kart',
    },
  },

  rezultati: {
    naslov: 'Sonuçlar',
    uvod:
      'Oynanan maçlar, {zveza} maç raporlarından. Sahadaki iki kadroyu görmek için bir maça tıkla: her formanın üzerinde oyuncunun kazandığı puan yazar.',
    niZacetka: 'Sezon henüz başlamadı.',
    prazenKrog: 'Bu haftada henüz maç oynanmadı.',
    prejsnji: 'Önceki hafta',
    naslednji: 'Sonraki hafta',
  },

  // Lig puan durumu sayfası (/table): sonuçlardan gerçek puan durumu ve gol krallığı.
  tabela: {
    naslov: 'Puan durumu',
    zavihek: '{liga} · puan durumu',
    uvod: '{sezona} puan durumu, {zveza} maç raporlarındaki sonuçlardan hesaplandı.',
    opomba: 'Yaklaşık hesap: galibiyete 3, beraberliğe 1 puan; puanları eşit takımlar önce averaja, sonra atılan gole göre ayrılır. Federasyonlar başka kurallar uygulayabilir (ikili averaj, puan silme); resmi puan durumu {zveza} sitesindedir.',
    niTekem: 'Bu ligde henüz maç oynanmadı.',
    stolpci: {
      klub: 'Kulüp',
      tekme: 'O',
      zmage: 'G',
      remiji: 'B',
      porazi: 'M',
      goli: 'Gol',
      razlika: 'Av',
      tocke: 'P',
      forma: 'Form',
    },
    stolpciOpis: {
      tekme: 'Oynanan',
      zmage: 'Galibiyet',
      remiji: 'Beraberlik',
      porazi: 'Mağlubiyet',
      goli: 'Atılan : yenilen',
      razlika: 'Averaj',
      tocke: 'Puan',
    },
    forma: { W: 'G', D: 'B', L: 'M' },
    formaOpis: { W: 'galibiyet', D: 'beraberlik', L: 'mağlubiyet' },
    strelci: 'Gol krallığı',
    niStrelcev: 'Bu sezon henüz gol atılmadı.',
    stolpciStrelcev: {
      igralec: 'Oyuncu',
      klub: 'Kulüp',
      goli: 'Gol',
      tekme: 'Maç',
      minute: 'Dk',
    },
  },

  tekma: {
    naslov: 'Maç',
    niTekme: 'Bu maç maç raporlarında yok.',
    nazaj: '← Sonuçlar',
    brezPostav:
      'Maç raporunda kadrolar yok, bu yüzden oyuncu başına puan gösterilemiyor.',
    naDresu:
      'Her formanın üzerinde oyuncunun bu maçta kaç puan kazandığı yazar. Sayfasını açmak için bir oyuncuya tıkla.',
    cakajo: {
      one: 'Bu maçta {n} gol asist bekliyor: asist belirlenene kadar pası veren +3 puanı kaçırıyor. Golü kimin hazırladığını aşağıda bize söyle.',
      other: 'Bu maçta {n} gol asist bekliyor: asistler belirlenene kadar pası verenler +3 puanı kaçırıyor. Golleri kimin hazırladığını aşağıda bize söyle.',
    },
    goliInAsistence: 'Goller ve asistler',
    prijaviSe: 'Oy vermek için giriş yap',
  },

  // Asistler sayfası (asist oylaması).
  glasovanje: {
    naslov: 'Asistler',
    kdoJePodal: 'Asisti kim yaptı?',
    uvod:
      '{zveza} maç raporları golcüleri kaydeder ama asistleri kaydetmez. Karar topluluğun: bir gol için aynı oyuncu <b>{glasov}</b> aldığında asist verilir ve <b>+3 puan</b> getirir.',
    pragGlasov: { one: '{n} oy', other: '{n} oy' },
    niTekem: 'Bu sezon henüz maç oynanmadı',
    niTekemOpis:
      'Asist oylaması ilk hafta oynanır oynanmaz açılır. Maç raporları geldiğinde tekrar uğra.',
    arhiv: 'arşiv',
    preteklaSezona:
      'Geçmiş bir sezon için oy veriyorsun. Mevcut ligdeki puanları etkilemez, sadece geçmişi düzeltir.',
    izberiKrog: '1. Bir hafta seç',
    izberiTekmo: '2. Bir maç seç',
    vsePotrjeno: 'Hepsi onaylandı',
    zaprto: 'kapalı',
    poglejTekmo: 'Bu maçın kadrolarını ve puanlarını gör →',
    niGolov: 'Bu maçta gol olmadı.',
    vsePotrjene: 'Bu maçtaki tüm asistler onaylandı. 🎉',
    zaprtoOpis: 'Bu maç için oylama kapandı: oylama sonraki haftanın son tarihine kadar açık kalır.',
    brezPotrjene: 'Onaylanmış asist yok: {goli}.',
  },

  // Oylamalı gol kartı (components/GolZaGlasovanje).
  gol: {
    neznanStrelec: 'golcü bilinmiyor',
    avtogol: 'Kendi kalesine gol: {ime}',
    enajstmetrovka: '{ime} (penaltı)',
    brezAsistenceOpomba: 'asist yok',
    potrjena: 'asist onaylandı, kilitli',
    brezAsistence: 'Asist yok',
    odlocilaSkupnost: 'topluluğun kararı',
    morasSePrijaviti: 'Oy vermek için giriş yapman gerekiyor',
    spremeniGlas: 'Oyumu değiştir',
    kdoJePodal: 'Asisti kim yaptı?',
    vodiBrez: 'Önde: "asist yok"',
    vodi: 'Önde: <b>{ime}</b>',
    igralecBrezZapisa: 'oyuncu raporda yok',
    doOdlocitve: '(karar için {n} oy daha)',
    ostali: 'Diğerleri:',
    brezGlasovi: 'yok ({n})',
    izberiPodajalca: 'Asisti yapanı seç: {ekipa}',
    nihce: 'Kimse: asistsiz gol',
  },

  // Mevkiler sayfası (mevki oylaması).
  pozicije: {
    naslov: 'Mevkiler',
    kjeKdoIgra: 'Kim nerede oynuyor?',
    uvod:
      'Maç raporları sadece kaleciyi işaretler ve kadroları forma numarasına göre sıralar, bu yüzden mevkiler onlardan okunamaz. Karar topluluğun. Gereken oy: <b>{prag}</b>; istatistiksel ön tahmin (forma numarası, goller, kartlar) bir yönü güçlü şekilde gösteriyorsa sayı düşer (en fazla {minPrag} oya kadar). <b>Kulüp uzmanlarının</b> ve <b>isabet oranı yüksek</b> kullanıcıların oyları daha çok sayılır.',
    enkratNaTeden:
      'Oylanan mevkiler <b>haftada bir, pazartesi sabahı</b>, hepsi birden geçerli olur. Böylece lig hafta içinde elinin altında değişmez: salı günü gördüğün, hafta cumartesi kilitlendiğinde de geçerlidir. Yeterli oyu almış oyuncu o zamana kadar kum saatiyle <ikona>⏳</ikona> işaretlenir.',
    klub: 'Kulüp',
    poznavalecOznaka: '  ★ uzman',
    samoIzStatistike: 'Sadece istatistikten ({n})',
    vsiPotrjeni: 'Bu kulüpteki her oyuncunun mevkisi onaylandı. 🎉',
    niIgralcev: 'Oyuncu yok.',
    status: {
      naslov: 'Oy veren durumum',
      utezOpis:
        'Her oy için ağırlık: kulübünden bir oyuncuya oy verdiğinde uzman bonusu eklenir.',
      utez: 'ağırlık {utez}×',
      tocnih: '({pravilni}/{vsi} doğru)',
      klubPoznam: 'İyi tanıdığım kulüp (uzman): bu kulübün oyuncularına verdiğim oy daha çok sayılır:',
      nisemPoznavalec: '(hiçbir kulübün uzmanı değilim)',
      opomba:
        'Uzman sadece bir kulüp seçer. Ağırlıklar zamanla oturur: oyların yanlış çıkarsa güvenin düşer. Mevki belli olduğunda güven geçmiş oylardan yeniden hesaplanır.',
    },
    igralec: {
      statistika: '{tekme} · {minute} dk · {goli} · {cs} gol yemeden maç',
      izZapisnika: 'Maç raporundan: kaleci (V) ile işaretli',
      odKluba: 'Mevkiyi kulüp belirledi',
      klub: ' · kulüp',
      izStatistike: 'İstatistikten (forma no., goller, kartlar): oylar düzeltebilir',
      potrdilaSkupnost: 'Topluluk onayladı',
      zapisnik: ' · maç raporu',
      uveljavitevOpis:
        'Mevkiler haftada bir, pazartesi sabahı geçerli olur: böylece lig hafta içinde elinin altında değişmez.',
      izglasovano: 'oylanan: {pozicija} · pazartesi',
      neIgraOpis: 'Artık oynamıyor, piyasada değil. Bir maç raporunda görünürse otomatik olarak geri döner.',
      neIgra: 'artık oynamıyor',
      vrniOpis: 'Oyuncuyu yeniden aktif yap',
      vrni: 'geri al',
      odhodOpis:
        'Oyuncu artık bu kulüpte oynamıyor: onu piyasadan kaldırır. Bir maç raporunda görünmesi onu otomatik olarak geri getirir.',
      statistikaKaze:
        'İstatistik <b>{pozicija} ({odstotek}%)</b> gösteriyor: o yöndeki oy daha düşük bir eşiğe karşı sayılır ({prag} yerine {nizji}).',
      dolocenaIzStatistike: 'Mevki istatistikten belirlendi: yanlışsa doğru olana tıkla.',
      dolocilaSkupnost: 'Mevkiyi topluluk belirledi: oylar düzeltebilir.',
      gumbUtez: 'Ağırlık {utez} / eşik {prag}',
      gumbPrior: ' · ön tahmin {odstotek}%',
      gumbPoznavalec: ' · uzman olarak oyların daha çok sayılır',
      vodi: 'Önde: {pozicija} (ağırlık {utez} / {prag})',
    },
  },
  // Puanların ve fiyatın yerinde açıklaması (components/Razlaga.tsx).
  razlaga: {
    zakaj: 'Neden {tocke}? Puan dökümü',
    zapri: 'Kapat',
    ostalo: 'Diğer',
    brezPozicije: 'Mevki henüz belirlenmedi, bu yüzden goller henüz puan getirmiyor. Topluluk mevkiyi onayladığında puanlar yeniden hesaplanır.',
    pravila1: 'Bu hafta eski kurallar geçerli: kaleci için gol yemeden +4, galibiyet bonusu yok.',
    asistence: 'Asistler topluluk oylamasıyla onaylanır: onaylanmamış asist henüz puan getirmez.',
    zadnjiKrog: 'Son maç: {krog}. hafta',
    cena: {
      zakaj: 'Neden bu fiyat?',
      zdaj: 'Güncel fiyat',
      izhodisce: 'Başlangıç fiyatı',
      izhodisceOpis: 'Başlangıç fiyatı, geçen sezonun dakikaları ve puanlarının ligdeki diğer oyuncularla karşılaştırılmasından gelir.',
      privzeta: 'Geçen sezon {minut} dakikadan az oynayan oyuncular {cena} ile başlar; daha üst bir ligde oynadılarsa fiyat oradan gelir.',
      borza: 'Her haftadan sonra fiyat değişir: 2 puanın üzerindeki her iki puan için +{korak} (hafta başına en fazla +{najvec}), kötü bir hafta veya kötü formdan sonra −{korak}, kulübü oynarken oyuncu üst üste ikinci haftayı kaçırırsa −{korak}.',
      razpon: 'Fiyat her zaman {od} ile {do} arasında kalır.',
    },
  },
}
