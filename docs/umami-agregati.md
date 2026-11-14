# Umami združki za poročila (SLF-244)

Pivko in SRE dobita številke prometa brez dostopa do Umamijeve baze ali API-ja.

- **Ukaz:** `ssh slff-ops umami <od> <do> [domena]` → en JSON: obiski, obiskovalci, ogledi strani,
  top strani/viri/države (po 20), UTM kampanje in dogodki (`event_type=2`) za obdobje.
- **Varnost:** vnaprej določene poizvedbe (`scripts/hetzner/umami-stat.sh`), agent poda le dva datuma in domeno
  (preverjeni z regex). Vloga `umami_bralec` ima samo SELECT na `website`, `website_event`, `session`;
  transakcija je READ ONLY, 5 s statement_timeout, obdobje največ 366 dni (daljše ali obrnjeno vrne napako, exit 2).
  Geslo vloge bere le uporabnik `umami-stat`, pod katerim teče skripta (sudo iz ovoja); agent ga ne vidi. Izhod nima session_id, IP-ja,
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
# Ločen sistemski uporabnik brez docker skupine; agent gesla ne more prebrati.
ssh slff 'useradd --system --no-create-home --shell /usr/sbin/nologin umami-stat'
# /etc/umami-bralec.env (root:umami-stat 640, NE skupina agent): UMAMI_BRALEC_GESLO=$P
# scripts/hetzner/umami-stat.sh -> /usr/local/bin/ (root:root 755)
# /etc/sudoers.d/umami-stat: agent ALL=(umami-stat) NOPASSWD: /usr/local/bin/umami-stat.sh
# v ovoju slff-ops: umami) exec sudo -n -u umami-stat /usr/local/bin/umami-stat.sh "$@" ;;
```

Preverjanje: isti mesec primerjaj z nadzorno ploščo stats.slff.eu (obiski, obiskovalci, ogledi). Pričakovane razlike: časovni pas
nadzorne plošče (nastavitev uporabnika) in zaokrožanje.
