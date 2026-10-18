# SLFF Trgovina (shop.slff.eu) — del 1: osnovna trgovina

Datum: 18. 10. 2026. Status: odobren dizajn.

## Namen

Spletna trgovina z izdelki SLFF na `shop.slff.eu`: lastna zaloga, pakiramo
sami, pošiljamo s Pošto Slovenije po EU-27. Prodajalec je SPACE GUARDIAN,
računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000
Ljubljana (matična 9850538000, ID za DDV SI42765153); vračila na ta naslov.

## Odločitve (lastnik, 18. 10. 2026)

| tema | odločitev |
|---|---|
| izpolnjevanje | lastna zaloga, pakira ekipa, Pošta Slovenije |
| države | EU-27 |
| ponudba (vse, po delih) | SLFF izdelki (del 1), bonusi in darilni boni (del 2), personalizirani izdelki (del 3), izdelki klubov z dovoljenjem in delitvijo prihodka (del 4) |
| prvi katalog | majica, pulover s kapuco, šal, kapa, skodelica, pivski kozarec, nalepke/našitki |
| pristop | lastna aplikacija v repozitoriju (kot Scout), ista baza in računi |
| plačila | Stripe Checkout + Stripe Tax; pripravljeno za živi način. Živi ključ na strežnik postavi lastnik; pred prvo pravo prodajo računovodja potrdi izdajo računov (ZDavPR, davčno potrjevanje pri plačilu s kartico) |

## Kupec

- **Katalog** (`/`), **izdelek** (`/p/:slug`) z izbiro različice (velikost,
  barva), **košarica** (`/cart`, v `localStorage`), **uspeh** (`/thanks`),
  **moja naročila** (`/orders`, le prijavljen), **pogoji** (`/terms`),
  **odstop od pogodbe** (`/withdrawal`, obrazec), **zasebnost** → slff.eu/legal.
- Nakup kot gost (Stripe zbere e-pošto in naslov) ali prijavljen z računom
  SLFF (naročilo se veže na `user_id`). Prijava kot v Scoutu (lastna seja,
  `storageKey` `slff-shop-seja`, Google in geslo).
- Cene **z DDV** (B2C, `tax_behavior=inclusive`), Stripe Tax izračuna DDV
  po državi kupca (OSS). Jezika sl in en (`shop/src/besede.ts`), videz
  slff.eu (tema iz korenskega `tailwind.config.js`). Stran je javna za
  iskalnike (brez `noindex`, razen `/cart`, `/thanks`, `/orders`, `/admin`).

## Zaloga in rezervacija

- `trgovina.izdelki` (slug, ime sl/en, opis sl/en, kategorija, slike,
  `aktiven`), `trgovina.razlicice` (izdelek, oznaka npr. "Črna / M", sku,
  cena v centih z DDV, `zaloga`, teža v gramih, `aktivna`).
- Ob začetku plačila funkcija **rezervira** količine (`trgovina.rezervacije`,
  vezane na Stripe sejo, poteče v 30 min). Na voljo = zaloga − aktivne
  rezervacije. Nakup, ki presega razpoložljivo, se zavrne pred Stripe.
- Plačano (`checkout.session.completed`, `payment_status=paid`): v eni
  transakciji zaloga −= količina, rezervacija se porabi, naročilo `placano`.
  Potekla seja (`checkout.session.expired`): rezervacija se sprosti.
  Idempotentno po `stripe_checkout_id` (ponovljen dogodek ne odšteje dvakrat).

## Dostava

Tri tarife (Stripe shipping rates, metadata `kljuc`), urejajo se v Stripe:
`pismo_si` (le nalepke/našitki, SI), `paket_si`, `paket_eu`. Funkcija ponudi
tarife glede na košarico (pismo le, če so vse postavke "pismo"). Privzeti
zneski (lastnik jih spremeni): pismo SI 1,50 €, paket SI 3,90 €, paket EU
9,90 €. Države: EU-27 (`shipping_address_collection.allowed_countries`).

## Naročila in administracija

- `trgovina.narocila` (stanje `caka_placilo` → `placano` → `poslano`, ali
  `preklicano`/`vrnjeno`), e-pošta, naslov, zneski (postavke, dostava, DDV,
  skupaj), Stripe seja in payment intent, `user_id` (nullable), sledilna
  številka. `trgovina.postavke` (naročilo, različica, ime ob nakupu, cena,
  količina).
- `/admin` (le `is_admin()`): naročila za pakiranje (placano), tisk nalepke z
  naslovom in dobavnice (CSS za tisk), vnos sledilne številke → `poslano` in
  mail kupcu; urejanje izdelkov, različic, cen, zaloge in slik (Supabase
  Storage, javno vedro `trgovina`).
- Pošta (Mailcow, `noreply@slff.eu`, kot `posli-opomnik`): potrditev
  naročila, odposlano s sledilno številko. Discord: novo plačano naročilo.

## Pravno

`/terms`: prodajalec, cene z DDV, dostava in roki, plačilo, **odstop v 14
dneh** brez razloga (kupec krije vračilo, vračilo denarja v 14 dneh po
prejemu), obrazec za odstop (`/withdrawal`, pošlje mail na info@slff.eu),
stvarna napaka in garancija po ZVPot-1, reševanje sporov (Ljubljana, spletna
platforma EU za reševanje sporov), varstvo podatkov (slff.eu/legal, nov
razdelek "Trgovina"). Personalizirani izdelki (del 3) odstopa nimajo.

## Tehnično

- Aplikacija `shop/` (Vite + React + TS + Tailwind, kot `scout/`), ukazi
  `dev:shop` (5175), `build:shop` → `dist-shop/`, `smoke:shop`.
- Shema `trgovina` (ni v API); branje kataloga prek RPC `trgovina_katalog()`
  in `trgovina_izdelek(slug)` (anon), zaloga kot "na voljo"/"malo"/"ni".
  Pisanje le prek RPC/servisa; admin RPC preverijo `is_admin()`.
- Funkcija `trgovina-nakup` (Edge): preveri košarico, rezervira, ustvari
  Stripe Checkout (`metadata.app = slff-shop`, `automatic_tax`, tarife,
  države, `customer_creation=if_required`, jezik), vrne URL. `stripe-webhook`
  dobi vejo `slff-shop` (`stripe-webhook/trgovina.ts`). Funkcija
  `trgovina-posta` pošlje maile (sproži webhook in admin ob odpošiljanju).
- Objava kot Scout: DNS `shop` (Cloudflare), Caddy blok, `/srv/slff-shop`,
  CI posel ob `SHOP_OBJAVA=1`; funkcije ročno (`objavi-funkcije.sh`).
- Testi: `supabase/tests/varnost.sql` (anon le bere katalog, ne vidi zaloge
  v številkah, ne piše; rezervacija ne preseže zaloge; dvojni dogodek ne
  odšteje dvakrat; admin RPC le admin), `smoke:shop` (izris strani, besede
  sl/en, košarica), `test:socasnost`-slog preizkus dveh hkratnih rezervacij.

## Zunaj obsega (deli 2–4)

Darilni boni in boni za Scout/preverjene igralce, personalizirani izdelki
(ime ekipe, prvak mini lige, značka preverjenega igralca), izdelki klubov.
Davčno potrjevanje računov (če ga računovodja zahteva) je ločena naloga
pred živo prodajo.
