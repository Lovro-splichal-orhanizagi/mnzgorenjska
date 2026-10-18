# SLFF Trgovina (shop.slff.eu)

Spletna trgovina z izdelki SLFF: lastna zaloga, pakira ekipa, Pošta Slovenije,
EU-27. Prodajalec SPACE GUARDIAN d.o.o. Spec:
`docs/superpowers/specs/2026-10-18-trgovina-design.md`, načrt:
`docs/superpowers/plans/2026-10-18-trgovina.md`.

## Kako deluje

- **Aplikacija** `shop/` (Vite + React + TS, videz slff.eu): `npm run dev:shop`
  (5175), `build:shop` → `dist-shop/`, `smoke:shop`. Nizi v
  `shop/src/besede.ts` (sl, en; `TELEFON`, `POGOJI_VERZIJA`). Poti: `/`,
  `/p/:slug`, `/cart`, `/thanks`, `/orders`, `/terms`, `/withdrawal`,
  `/login`, `/admin`.
- **Baza**: zaprta shema `trgovina` (migracija `20261018170000_trgovina.sql`):
  `izdelki`, `razlicice` (cena v centih z DDV, `zaloga`), `narocila`,
  `postavke`. Brskalnik bere le `trgovina_katalog()`, `trgovina_izdelek(slug)`
  (zaloga le kot da/malo/ne) in `trgovina_moja_narocila()`. Servisne
  `trgovina_rezerviraj`, `_vezi_sejo`, `_iz_placila`, `_potekla`, `_sprosti`,
  `_narocilo_seje` kliče le `service_role` (funkcije). Admin RPC
  `trgovina_admin_*` preverijo `is_admin()`.
- **Personalizacija, tisk, boni** (migracija `20261018190000_trgovina_personalizacija.sql`,
  spec `docs/superpowers/specs/2026-10-18-trgovina-personalizacija-design.md`):
  `izdelki.po_narocilu` / `digitalni` (brez zaloge), `personalizacije`
  (možnosti in doplačila), `postavke.personalizacija` / `doplacilo` /
  `stanje_tiska`, `serije`, `boni` (koda le sha256 + zadnji 4 znaki).
  `rezerviraj` preveri personalizacijo (ime ekipe, poljubno ime s filtrom
  `prepovedano_besedilo`, številka 0–99, prvak `trgovina.prvaki_uporabnika`,
  značka `trgovina.znacka_uporabnika`); plačilo značke vpiše `narocila_znack`.
  Kupec: `trgovina_moji_prvaki()`, `trgovina_moja_znacka()`; servis:
  `trgovina_zabelezi_bon`, `trgovina_bon_porabljen`; admin: `_za_tisk`,
  `_nova_serija`, `_serija`, `_serije`, `_serija_stanje`, `_boni`,
  `_shrani_personalizacijo`.
- **Rezervacija**: naročilo `caka_placilo` drži zalogo 35 min
  (`rezervirano_do`), Stripe seja poteče v 31 min. Na voljo = zaloga −
  rezervirano. Največ 5 odprtih naročil na prijavljenega uporabnika ali (gost)
  na zgoščen IP (`odjemalec`, sha256 IP + `TRGOVINA_PEPPER`). Ponoven klik
  "Na plačilo" najprej zapre prejšnjo sejo (`prejsnja`). Plačilo odšteje zalogo
  enkrat (idempotentno po seji); česar ni bilo, zapiše v `manjka` (admin vidi).
- **Plačilo**: `trgovina-nakup` (Edge) ustvari Stripe Checkout:
  `metadata.app = slff-shop`, `automatic_tax`, cene z DDV,
  načini plačila iz Stripe Dashboarda
  (API ne sprejme več `payment_method_types`; pustimo le kartico in denarnice,
  ker webhook zapiše le takojšnje plačilo), država dostave izbrana v košarici (`allowed_countries`), tarife po državi
  (`pismo_si` le nalepke v SI, `paket_si`, `paket_eu`). `stripe-webhook` veja
  `slff-shop` (`stripe-webhook/trgovina.ts`): plačano → naročilo + mail +
  Discord; poteklo → sprosti.
- **Pošta**: `trgovina-posta` (Mailcow) — potrditev (z besedilom odstopa in
  obrazcem, trajni nosilec) in "poslano" s sledilno številko. Kliče jo webhook
  (servisni ključ) ali admin. Potrditev navede personalizacijo in rok izdelave (1–2 tedna);
  vrsta `bon` (le servis) pošlje kode darilnih bonov.
- **Personaliziran nakup**: `trgovina-nakup` pošlje personalizacijo v
  `rezerviraj`; cena v Stripe = cena + doplačilo. Personalizirana košarica
  zahteva `brez_odstopa: true` (sicer 400 `trgovina-odstop`); samo digitalna
  košarica (boni) nima dostave (naslov za račun da Stripe). Vsi trije
  checkouti (trgovina, Scout, preverjeni) imajo `allow_promotion_codes`.
- **Izdelki v Stripe**: postavka trgovine gre pod stalni izdelek
  `slff-shop-<slug>-<jezik>` (ime izdelka, `tax_code` izdelka), ne
  `product_data` — `price_data` ne sprejme obojega, darilni bon pa mora biti
  vezan na izdelke (`applies_to`). Funkcija izdelke za ves katalog ustvari
  sama (ob prvem nakupu na proces, ime in `tax_code` popravi); različica in
  personalizacija sta pod gumbom Checkouta (`custom_text.after_submit`) in v
  potrditvi. **Meja:** bon velja za izdelke, ki so bili v Stripe ob izdaji;
  izdelek, vklopljen pozneje, starih bonov ne sprejme.
- **Darilni boni**: webhook po plačilu za vsako enoto digitalne postavke
  ustvari kupon s stalnim id `slff-shop-bon-<oznaka>-<postavka>-<enota>`
  (amount_off = cena, enkrat, `max_redemptions` 1, rok 1 leto, `applies_to`
  izdelki trgovine brez digitalnih) in kodo `SLFF-XXXX-XXXX`; ponovitev
  dogodka najde kupon in njegovo aktivno kodo in druge ne ustvari. Zapis
  `trgovina_zabelezi_bon` (sha256 + zadnji 4), kode gredo kupcu v mailu
  `bon`. Klici bonov imajo zapisano različico API `2025-03-31.basil`.
  Plačana seja s popustom (vse tri aplikacije) → `trgovina_bon_porabljen`.
  Vračilo plačila trgovine (`charge.refunded`) je zaenkrat le Discord.
- **Admin** `/admin`: naročila za pakiranje (nalepka 100×150 mm, dobavnica),
  sledilna številka → poslano + mail; izdelki, različice, cene, zaloga kot
  sprememba (`zaloga_dodaj`), slike v Storage (vedro `trgovina`).

## Objava

Narejeno 18. 10. 2026: DNS `shop` (A 2.31.6.53, proxied), Caddy blok
(`scripts/hetzner/Caddyfile`, zasebne poti noindex), `/srv/slff-shop` +
`releases` lastnik `deploy`, GoTrue `ADDITIONAL_REDIRECT_URLS` z
`https://shop.slff.eu/**`.

Ostalo (enkrat):

1. Spremenljivka repozitorija `SHOP_OBJAVA=1` (CI posel *Objava Trgovine*).
2. Okolje funkcij (`/opt/supabase`): `TRGOVINA_PEPPER` (naključno, ≥ 32 B,
   brez njega `trgovina-nakup` vrne 503), `SHOP_URL` (neobvezno),
   `TRGOVINA_TARIFE` (neobvezno, JSON id tarif), SMTP kot `posli-opomnik`.
3. Funkcije: `scripts/hetzner/objavi-funkcije.sh trgovina-nakup`, nato
   `trgovina-posta`, nato `stripe-webhook` (ena na klic).
4. Stripe: `STRIPE_SECRET_KEY=… scripts/stripe-trgovina.sh` (tarife; po
   spremembi tarif ponovni zagon funkcij), endpoint webhooka dobi dogodka
   `checkout.session.expired` in `checkout.session.async_payment_failed`,
   obvezna potrditev pogojev le ob `STRIPE_TOS=1` (skupno s preverjenimi; zahteva
   Settings → Public details → Terms of service URL), sicer besedilo nad gumbom.
5. `select trgovina_pripravi_shrambo();` (vedro za slike).
6. V adminu: cene, zaloga, slike, nato `aktiven`.

## Pred živo prodajo

- Živi `STRIPE_SECRET_KEY` postavi lastnik (velja tudi za preverjene in Scout).
- Računovodja potrdi izdajo računov (ZDavPR, davčno potrjevanje pri plačilu s
  kartico); če je potrebno, ločena naloga (ponudnik e-računov).
- Stripe Tax: registraciji **SI** in **EU OSS** (sicer kupec iz AT plača 0 %
  DDV), naslov izvora.
- En pravi nakup (test kartica v testnem načinu, nato ena prava v živem):
  potrditveni mail, nalepka, poslano, mail s sledilno.
- Preveri `has_function_privilege('anon', 'public.trgovina_rezerviraj(...)')`
  na produkciji = false.
