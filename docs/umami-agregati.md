# Umami združki za poročila (SLF-244)

Pivko in SRE dobita številke prometa brez dostopa do Umamijeve baze ali API-ja.

- **Ukaz:** `ssh slff-ops umami <od> <do> [domena]` → en JSON: obiski, obiskovalci, ogledi strani,
  top strani/viri/države (po 20), UTM kampanje in dogodki (`event_type=2`) za obdobje.
- **Varnost:** vnaprej določene poizvedbe (`scripts/hetzner/umami-stat.sh`), agent poda le dva datuma in domeno
  (preverjeni z regex). Vloga `umami_bralec` ima samo SELECT na `website`, `website_event`, `session`;
  transakcija je READ ONLY, 5 s statement_timeout, obdobje največ 366 dni. Izhod nima session_id, IP-ja,
  celotnih URL-jev ali posameznih dogodkov. Vsak klic gre v journal (`journalctl -t umami-stat`).
- **Registrirani uporabniki** niso promet: vzemi jih iz `slff-ops numbers` in jih v poročilu ločuj.

## Namestitev (potrebuje odobritev, ne deploy brez nje)

```bash
P=$(openssl rand -hex 24)
ssh slff "docker exec -i supabase-db psql -U supabase_admin -d umami" <<SQL
create role umami_bralec login password '$P' connection limit 2;
grant connect on database umami to umami_bralec;
grant usage on schema public to umami_bralec;
grant select on website, website_event, session to umami_bralec;
alter role umami_bralec set default_transaction_read_only = on;
SQL
# /etc/umami-bralec.env (root:agent 640): UMAMI_BRALEC_GESLO=$P
# scripts/hetzner/umami-stat.sh -> /usr/local/bin/ ; v ovoju slff-ops dodaj vrstico: umami) exec /usr/local/bin/umami-stat.sh "$@" ;;
```

Preverjanje: isti mesec primerjaj z nadzorno ploščo stats.slff.eu (obiski, obiskovalci, ogledi). Pričakovane razlike: časovni pas
nadzorne plošče (nastavitev uporabnika) in zaokrožanje.
