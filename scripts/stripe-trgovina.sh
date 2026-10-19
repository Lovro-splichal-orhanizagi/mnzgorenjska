#!/usr/bin/env bash
# Katalog SLFF v Stripe (enak v testnem in živem načinu): tarife dostave
# trgovine (pismo_si, paket_si, paket_eu) in preverjenih (postnina_si,
# postnina_eu), cene po lookup_key (preverjeni, značka, Scout) in portal Scouta
# (metadata app=slff-scout). Izdelek trgovine slff-shop ustvari trgovina-nakup
# sama ob prvem nakupu.
#
# Idempotentno: tarifa z istim metadata app+kljuc, cena z istim lookup_key in
# portal Scouta se ne ustvarijo znova (zneske nato spreminja lastnik v Stripe;
# tarife v Stripe se ne urejajo, nova tarifa = arhiviraj staro in poženi znova).
#
#   STRIPE_SECRET_KEY=sk_test_… scripts/stripe-trgovina.sh
#   ssh slff 'set -a; . /opt/supabase/.env; bash -s' < scripts/stripe-trgovina.sh   # živo, ključ s strežnika
#
# Potrebuje curl in jq. Ključa nikoli v git.
set -euo pipefail
: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY ni nastavljen}"
API=https://api.stripe.com/v1
# Ključ gre curl-u prek -K (ni v ps); napaka Stripe ustavi skripto z njegovim sporočilom.
s() {
  local r
  r=$(curl -sS -K <(printf 'user = "%s:"\n' "$STRIPE_SECRET_KEY") "$@")
  if jq -e '.error' <<<"$r" >/dev/null; then echo "Stripe: $(jq -r .error.message <<<"$r")" >&2; return 1; fi
  echo "$r"
}
# id iz odgovora, ki se mora začeti s predpono; sicer konec.
id() { local r; r=$(s "${@:2}") || exit 1; r=$(jq -r .id <<<"$r"); [[ $r == "$1"* ]] || { echo "brez id $1" >&2; exit 1; }; echo "$r"; }

obstojece=$(s "$API/shipping_rates?active=true&limit=100")
obstojece=$(jq -r '.data[] | "\(.metadata.app) \(.metadata.kljuc)"' <<<"$obstojece")

# app kljuc znesek(centi) najmanj najvec(delovni dnevi, 0 = brez) ime
while read -r app kljuc znesek najmanj najvec ime; do
  if grep -qx "$app $kljuc" <<<"$obstojece"; then
    echo "$kljuc: že obstaja"
    continue
  fi
  rok=()
  if [[ $najmanj != 0 ]]; then
    rok=(-d "delivery_estimate[minimum][unit]=business_day" -d "delivery_estimate[minimum][value]=$najmanj"
      -d "delivery_estimate[maximum][unit]=business_day" -d "delivery_estimate[maximum][value]=$najvec")
  fi
  nova=$(id shr_ "$API/shipping_rates" \
    -d type=fixed_amount \
    --data-urlencode "display_name=$ime" \
    -d "fixed_amount[amount]=$znesek" \
    -d "fixed_amount[currency]=eur" \
    -d tax_behavior=inclusive \
    -d tax_code=txcd_92010001 \
    ${rok[@]+"${rok[@]}"} \
    -d "metadata[app]=$app" \
    -d "metadata[kljuc]=$kljuc")
  echo "$kljuc: ustvarjena $nova"
done <<'TARIFE'
slff-shop pismo_si 150 1 3 Pismo (Slovenija)
slff-shop paket_si 390 2 4 Paket (Slovenija)
slff-shop paket_eu 990 4 10 Paket (EU)
slff postnina_si 200 0 0 Pošta (Slovenija)
slff postnina_eu 400 0 0 Pošta (EU)
TARIFE

# Cene po lookup_key. Izdelek se ustvari le, ko cena manjka, in se v istem
# zagonu ponovno uporabi (iskanje izdelkov v Stripe zaostaja za pisanjem).
cena() { # izdelek(app:ime:tax_code) lookup_key znesek tax_behavior interval|- nickname
  local obstaja
  obstaja=$(s "$API/prices?active=true&lookup_keys[]=$2") || exit 1
  if [[ -n $(jq -r '.data[0].id // empty' <<<"$obstaja") ]]; then
    echo "$2: že obstaja"
    return
  fi
  local app ime koda v obdobje=()
  IFS=: read -r app ime koda <<<"$1"
  v="izdelek_${koda}"
  if [[ -z ${!v:-} ]]; then
    obstaja=$(id prod_ "$API/products" --data-urlencode "name=$ime" -d "tax_code=$koda" -d "metadata[app]=$app") || exit 1
    printf -v "$v" %s "$obstaja"
  fi
  [[ $5 == - ]] || obdobje=(-d "recurring[interval]=$5")
  obstaja=$(id price_ "$API/prices" -d "product=${!v}" -d "lookup_key=$2" -d "unit_amount=$3" -d currency=eur \
    -d "tax_behavior=$4" ${obdobje[@]+"${obdobje[@]}"} --data-urlencode "nickname=$6") || exit 1
  echo "$2: ustvarjena $obstaja"
}

P='slff:SLFF Preverjen igralec:txcd_10000000'
cena "$P" slff_preverjen_letna 999 inclusive year Letno
cena "$P" slff_preverjen_dozivljenjska 2900 inclusive - 'Za vedno'
cena 'slff:SLFF Natisnjena značka:txcd_99999999' slff_znacka 500 inclusive - 'Natisnjena značka'
# Scout je B2B: cena brez DDV (exclusive).
S='slff-scout:SLFF Scout:txcd_10103001'
cena "$S" slff_scout_klub_mesec 3900 exclusive month 'Klub, mesečno'
cena "$S" slff_scout_klub_sezona 29000 exclusive year 'Klub, sezona'

# Portal Scouta: scout-placilo ga išče po metadata app=slff-scout.
portali=$(s "$API/billing_portal/configurations?active=true&limit=100")
if [[ -n $(jq -r '.data[] | select(.metadata.app == "slff-scout") | .id' <<<"$portali") ]]; then
  echo "portal Scouta: že obstaja"
else
  portal=$(id bpc_ "$API/billing_portal/configurations" \
    -d "business_profile[headline]=SLFF Scout" \
    -d "business_profile[privacy_policy_url]=https://slff.eu/legal" \
    -d "business_profile[terms_of_service_url]=https://scout.slff.eu/terms" \
    -d "default_return_url=https://scout.slff.eu/account" \
    -d "features[invoice_history][enabled]=true" \
    -d "features[payment_method_update][enabled]=true" \
    -d "features[customer_update][enabled]=true" \
    -d "features[customer_update][allowed_updates][]=email" \
    -d "features[customer_update][allowed_updates][]=address" \
    -d "features[customer_update][allowed_updates][]=tax_id" \
    -d "features[subscription_cancel][enabled]=true" \
    -d "features[subscription_cancel][mode]=at_period_end" \
    -d "features[subscription_cancel][proration_behavior]=none" \
    -d "metadata[app]=slff-scout")
  echo "portal Scouta: ustvarjen $portal"
fi
