// Türkçe çeviri: `skupno` (izvor: src/i18n/sl/skupno.ts).
// Terimler Türk futbol basınındaki gibi: kaleci, defans, orta saha, forvet.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Kaleci',
    DEF: 'Defans',
    MID: 'Orta saha',
    FWD: 'Forvet',
  },
  pozicijaKratko: {
    GK: 'KL',
    DEF: 'DEF',
    MID: 'OS',
    FWD: 'FV',
  },
  // Türkçe: one = 1, other = geri kalan her şey. Sayıdan sonra isim tekil
  // kalır ("3 puan", "5 oyuncu"), bu yüzden iki biçim aynıdır.
  besede: {
    tocke: { one: 'puan', other: 'puan' },
    tockRodilnik: { one: 'puan', other: 'puan' },
    tockeTozilnik: { one: 'puan', other: 'puan' },
    igralci: { one: 'oyuncu', other: 'oyuncu' },
    ekipe: { one: 'takım', other: 'takım' },
    tekme: { one: 'maç', other: 'maç' },
    goli: { one: 'gol', other: 'gol' },
    glasovi: { one: 'oy', other: 'oy' },
    krogi: { one: 'hafta', other: 'hafta' },
  },
  cena: '{v} M€',
  nalaganje: 'Yükleniyor …',
  shrani: 'Kaydet',
  preklici: 'Vazgeç',
  zapri: 'Kapat',
  nazaj: 'Geri',
  napaka: 'Hata: {sporocilo}',
  // Napake iz baze (RPC), prevedene v src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'Bu koda sahip bir mini lig yok.',
    niTvojaEkipa: 'Bu senin takımın değil.',
    imeMiniLige: 'Mini lig adı 2 ile 40 karakter arasında olmalı.',
    prijavaMiniLiga: 'Mini ligleri kullanmak için giriş yap.',
    niDovoljenja: 'Bu takımı düzenleme yetkin yok.',
    kodaNeUstvarjena: 'Mini lig kodu oluşturulamadı. Tekrar dene.',
    golOdlocen: 'Bu gol için karar verildi, oylama kapandı.',
    zePoznavalec: 'Bu ligde zaten uzmansın.',
    prosnjaCaka: 'Bu lig için başvurun zaten inceleniyor.',
    prosnjaZavrnjena: 'Bu lig için başvurun kısa süre önce reddedildi. 14 gün sonra yeni bir başvuru gönderebilirsin.',
    klubNeIgra: 'Seçilen kulüp bu ligde oynamıyor.',
  },
}
