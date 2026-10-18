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
- **Rezervacija**: naročilo `caka_placilo` drži zalogo 35 min
  (`rezervirano_do`), Stripe seja poteče v 31 min. Na voljo = zaloga −
  rezervirano. Največ 5 odprtih naročil na prijavljenega uporabnika ali (gost)
  na zgoščen IP (`odjemalec`, sha256 IP + `TRGOVINA_PEPPER`). Ponoven klik
  "Na plačilo" najprej zapre prejšnjo sejo (`prejsnja`). Plačilo odšteje zalogo
  enkrat (idempotentno po seji); česar ni bilo, zapiše v `manjka` (admin vidi).
- **Plačilo**: `trgovina-nakup` (Edge) ustvari Stripe Checkout:
  `metadata.app = slff-shop`, le kartica, `automatic_tax`, cene z DDV,
  država dostave izbrana v košarici (`allowed_countries`), tarife po državi
  (`pismo_si` le nalepke v SI, `paket_si`, `paket_eu`). `stripe-webhook` veja
  `slff-shop` (`stripe-webhook/trgovina.ts`): plačano → naročilo + mail +
  Discord; poteklo → sprosti.
- **Pošta**: `trgovina-posta` (Mailcow) — potrditev (z besedilom odstopa in
  obrazcem, trajni nosilec) in "poslano" s sledilno številko. Kliče jo webhook
  (servisni ključ) ali admin.
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
