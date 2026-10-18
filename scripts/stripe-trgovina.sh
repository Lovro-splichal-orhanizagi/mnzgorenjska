#!/usr/bin/env bash
# Tarife dostave trgovine (shop.slff.eu) v Stripe: pismo_si, paket_si, paket_eu.
# Idempotentno: tarifa z metadata app=slff-shop in istim kljuc se ne ustvari
# znova (zneske nato spreminja lastnik v Stripe; tarife v Stripe se ne urejajo,
# nova tarifa = arhiviraj staro in poženi znova).
#
#   STRIPE_SECRET_KEY=sk_test_… scripts/stripe-trgovina.sh
#
# Potrebuje curl in jq. Ključa nikoli v git.
set -euo pipefail
: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY ni nastavljen}"
API=https://api.stripe.com/v1

obstojece=$(curl -sfS -u "$STRIPE_SECRET_KEY:" "$API/shipping_rates?active=true&limit=100" |
  jq -r '.data[] | select(.metadata.app == "slff-shop") | .metadata.kljuc')

# kljuc znesek(centi) najmanj najvec(delovni dnevi) ime
while read -r kljuc znesek najmanj najvec ime; do
  if grep -qx "$kljuc" <<<"$obstojece"; then
    echo "$kljuc: že obstaja"
    continue
  fi
  id=$(curl -sfS -u "$STRIPE_SECRET_KEY:" "$API/shipping_rates" \
    -d type=fixed_amount \
    --data-urlencode "display_name=$ime" \
    -d "fixed_amount[amount]=$znesek" \
    -d "fixed_amount[currency]=eur" \
    -d tax_behavior=inclusive \
    -d tax_code=txcd_92010001 \
    -d "delivery_estimate[minimum][unit]=business_day" \
    -d "delivery_estimate[minimum][value]=$najmanj" \
    -d "delivery_estimate[maximum][unit]=business_day" \
    -d "delivery_estimate[maximum][value]=$najvec" \
    -d "metadata[app]=slff-shop" \
    -d "metadata[kljuc]=$kljuc" | jq -r .id)
  echo "$kljuc: ustvarjena $id"
done <<'TARIFE'
pismo_si 150 1 3 Pismo (Slovenija)
paket_si 390 2 4 Paket (Slovenija)
paket_eu 990 4 10 Paket (EU)
TARIFE
