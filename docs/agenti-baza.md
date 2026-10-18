# Bralni dostop agentov do baze

Agenti (Pivko, SRE in ostali v Paperclipu) na vprašanja v Discordu
odgovarjajo **iz podatkov**, ne iz ugibanja (SLF-24: "koliko mailov smo
danes poslali"). Za to imajo omejen bralni dostop do produkcijske baze.

## Kaj smejo

- Vloga `agent_bralec` (migracija `20261019090000_agent_bralec.sql`):
  le `SELECT`, `default_transaction_read_only`, 15 s na poizvedbo,
  `bypassrls` (sicer tabele z RLS tiho vrnejo 0 vrstic).
- Bere vse tabele in poglede v `public` in `trgovina` **razen** zaprtih
  (`agent.zaprte_tabele`: ključi odjav in stikov, žetoni push, Stripe
  dogodki, ključi anonimizacije) in stolpcev z e-pošto ali naslovi
  uporabnikov in kupcev (`agent.zaprti_stolpci`).
- Sheme `auth` in `scout` niso dostopne. Registracije po dneh:
  `select * from agent.registracije order by dan desc`.
- Nova tabela dobi pravice ob naslednji objavi (CI pokliče
  `agent.uskladi_pravice()`). Tabela ali stolpec s skrivnostjo ali osebnimi
  podatki gre **v isti migraciji** v `agent.zaprte_tabele` /
  `agent.zaprti_stolpci`.

## Kako (za agenta)

En sam ukaz SSH, ki požene eno poizvedbo:

```bash
ssh -i <ključ> agent@2.31.6.53 "select (poslano_at at time zone 'Europe/Ljubljana')::date dan, poslal, count(*) from klub_stik_posta where vrsta in ('prvi','opomnik') and poslano_at > now() - interval '7 days' group by 1,2 order by 1,2"
```

Pogoste poizvedbe:

| vprašanje | SQL |
|---|---|
| poslani maili klubom danes | `select poslal, count(*) from klub_stik_posta where vrsta in ('prvi','opomnik') and (poslano_at at time zone 'Europe/Ljubljana')::date = current_date group by 1` |
| odgovori klubov | `select stanje, count(*) from klub_stik group by 1` |
| registracije po dneh | `select * from agent.registracije order by dan desc limit 14` |
| nove ekipe po dneh | `select created_at::date, count(*) from fantasy_teams where not hisna group by 1 order by 1 desc limit 14` |
| naročila v trgovini | `select stanje, count(*), sum(znesek_skupaj)/100.0 from trgovina.narocila group by 1` |

Pravila za agenta: v Discord ne prepisuj naslovov klubov ali vsebine mailov,
le števila in imena klubov; če poizvedba pade, to povej in ne ugibaj.

## Namestitev na VM (ročno, enkrat)

CI tega ne naredi. Kot root na `slff`:

```bash
useradd -m -s /bin/bash agent
install -m 755 scripts/hetzner/agent-sql.sh /usr/local/bin/agent-sql   # iz repozitorija
# geslo vloge (nikoli v git):
G=$(openssl rand -base64 24 | tr -d '/+=')
docker exec supabase-db psql -U supabase_admin -d postgres -c "alter role agent_bralec login password '$G' bypassrls"
printf 'AGENT_GESLO=%s\n' "$G" > /etc/agent-sql.env && chown root:agent /etc/agent-sql.env && chmod 640 /etc/agent-sql.env
# javni ključ agenta (zasebni gre v hrambo skrivnosti Paperclipa, nikoli v klepet):
install -d -m 700 -o agent -g agent ~agent/.ssh
echo 'restrict,command="/usr/local/bin/agent-sql" ssh-ed25519 AAAA… paperclip-agent' > ~agent/.ssh/authorized_keys
chown agent:agent ~agent/.ssh/authorized_keys && chmod 600 ~agent/.ssh/authorized_keys
```

Poizvedbe: `journalctl -t agent-sql`. Ukinitev: odstrani vrstico iz
`authorized_keys` ali `alter role agent_bralec nologin`.
