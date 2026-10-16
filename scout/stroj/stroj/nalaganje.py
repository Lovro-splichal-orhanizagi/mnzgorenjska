"""Branje iz Postgresa: vse seštevke naredi SQL, Python dobi stolpce."""
import numpy as np
import psycopg

from stroj import Tabela, izberi

# Identiteta osebe čez lige: šifra je enolična le znotraj vira (RS, ES, UA, RO
# imajo več virov z ločenimi številkami), ime in klub znotraj države
# (Slovenija, stari CMS MNZ). Pričakuje aliasa p (players) in c (competitions).
OSEBA = """case when p.reg_st is not null
  then 'r' || coalesce(c.source, '') || ':' || p.reg_st
  else 'i' || coalesce(c.country_id, 0) || ':'
       || lower(coalesce(p.full_name, p.last_name || ' ' || p.first_name)) || ':' || p.team_id end"""

# Ugovor (scout_skrit) velja za vse vrstice osebe; kdor ima vrstico v
# mladinski ligi, je izločen, dokler faza 2 ne prinese prijavljene letnice.
# Anonimizacija počisti le svojo vrstico; ista oseba v drugi ligi izpade po
# zgoščenih ključih (država + ime ali država + šifra, kot anonimiziraj_igralca).
# Ključa se izračunata enkrat na vrstico igralca, ime brez klubskega dela:
# soimenjak v drugem klubu iste države izpade z njim (varneje za zasebnost).
SQL_IZKLJUCENI = f"""
with vrstice as (
  select p.id, {OSEBA} as oseba, p.scout_skrit or public.je_mladinski_slug(c.slug) as izlocen,
         public.anonimizacijski_kljuc(c.country_id || '|' || p.full_name) as kljuc_ime,
         public.anonimizacijski_kljuc(c.country_id || '|reg|' || p.reg_st) as kljuc_reg
  from public.players p join public.competitions c on c.id = p.competition_id
  where p.anonimiziran_at is null
)
select v.oseba from vrstice v where v.izlocen
union
select v.oseba from vrstice v
cross join lateral (values (v.kljuc_ime), (v.kljuc_reg)) k(kljuc)
join public.anonimizirani_igralci a on a.kljuc = k.kljuc
"""

SQL_SEZONE = f"""
with tekme as (
  select m.id, m.home_team_id, m.away_team_id, m.home_goals, m.away_goals,
         r.season as sezona, r.competition_id,
         -- popoln zapisnik (kot točkovanje vratarjev): vsak gol ima minuto in goli
         -- po straneh (avtogol šteje nasprotniku) se seštejejo v izid
         (select coalesce(bool_and(g.minute is not null), true)
                 and count(*) filter (where (g.team_id = m.home_team_id) <> g.is_own_goal) = m.home_goals
                 and count(*) filter (where (g.team_id = m.away_team_id) <> g.is_own_goal) = m.away_goals
          from public.goals g where g.match_id = m.id) as ima_minute
  from public.matches m
  join public.rounds r on r.id = m.round_id
  join public.competitions c on c.id = r.competition_id
  where m.zapisnik_id is not null and not m.kontumacija and not public.je_mladinski_slug(c.slug)
),
goli as (
  -- goals.team_id je ekipa strelca, tudi pri avtogolu
  select g.match_id, g.minute,
         case when not g.is_own_goal then g.team_id
              when g.team_id = t.home_team_id then t.away_team_id
              else t.home_team_id end as za_ekipo
  from public.goals g join tekme t on t.id = g.match_id
  where t.ima_minute
),
ekipe as (
  select t.competition_id, t.sezona, e.team_id,
         count(*) * 90 as ekipa_minute,
         sum(e.dala) as ekipa_goli,
         sum(e.prejela) as ekipa_prejeti,
         coalesce(sum(e.dala - e.prejela) filter (where t.ima_minute), 0) as ekipa_gr,
         count(*) filter (where t.ima_minute) * 90 as ekipa_min_zmin
  from tekme t
  cross join lateral (values (t.home_team_id, t.home_goals, t.away_goals),
                             (t.away_team_id, t.away_goals, t.home_goals)) e(team_id, dala, prejela)
  group by 1, 2, 3
),
nastopi as (
  select a.id, a.match_id, a.player_id, a.team_id, a.started, a.minutes_played, a.goals,
         a.penalties_scored, a.yellow_cards, a.red_cards, a.goals_conceded, a.clean_sheet,
         a.is_goalkeeper, a.minute_on, a.minute_off, t.sezona, t.competition_id, t.ima_minute
  from public.appearances a join tekme t on t.id = a.match_id
  where a.minutes_played > 0
),
na_igriscu as (
  -- gol razlika ekipe, ko je igralec na igrišču (isto okno kot min_on spodaj)
  select n.id, sum(case when g.za_ekipo = n.team_id then 1 else -1 end) as gr
  from nastopi n join goli g on g.match_id = n.match_id
  where g.minute > n.minute_on and (g.minute <= n.minute_off or n.minute_off >= 90)
  group by n.id
),
igralci as (
  select n.player_id, n.competition_id, n.sezona,
         mode() within group (order by n.team_id) as team_id,
         count(*) as nastopi, sum(n.started::int) as zacetki, sum(n.minutes_played) as minute,
         sum((n.minutes_played >= 90)::int) as cele,
         sum(n.goals - n.penalties_scored) as goli_np, sum(n.penalties_scored) as enajstm,
         sum(n.yellow_cards) as rumeni, sum(n.red_cards) as rdeci,
         sum(n.goals_conceded) as prejeti, sum(n.clean_sheet::int) as ciste,
         bool_or(n.is_goalkeeper) as vratar,
         coalesce(sum(o.gr) filter (where n.ima_minute), 0)::int as gr_on,
         coalesce(sum(greatest(least(n.minute_off, 90) - n.minute_on, 0)) filter (where n.ima_minute), 0)::int as min_on
  from nastopi n left join na_igriscu o on o.id = n.id
  group by 1, 2, 3
)
select i.player_id, {OSEBA} as oseba, c.country_id, i.competition_id, i.sezona,
       left(i.sezona, 4)::int as leto, i.team_id,
       coalesce(p.position, case when i.vratar then 'GK' end) as skupina,
       p.reg_st is not null as ima_sifro,
       i.nastopi, i.zacetki, i.minute, i.cele, i.goli_np, i.enajstm, i.rumeni, i.rdeci,
       i.prejeti, i.ciste, i.gr_on, i.min_on,
       e.ekipa_minute, e.ekipa_goli, e.ekipa_prejeti, e.ekipa_gr, e.ekipa_min_zmin
from igralci i
join public.players p on p.id = i.player_id
join public.competitions c on c.id = i.competition_id
join ekipe e on e.competition_id = i.competition_id and e.sezona = i.sezona and e.team_id = i.team_id
where p.anonimiziran_at is null
order by i.player_id, i.sezona
"""

SQL_TEKME = """
select r.competition_id, left(r.season, 4)::int as leto,
       m.home_team_id, m.away_team_id, m.home_goals, m.away_goals
from public.matches m
join public.rounds r on r.id = m.round_id
join public.competitions c on c.id = r.competition_id
where m.zapisnik_id is not null and not m.kontumacija and not public.je_mladinski_slug(c.slug)
order by m.played_on nulls last, m.id
"""

SQL_LIGE = """
select c.id, c.slug, c.name, f.code as zveza, c.country_id, c.active,
       coalesce(d.stanje, 'zaprto') as stanje
from public.competitions c
left join public.federations f on f.id = c.federation_id
left join scout.drzave d on d.country_id = c.country_id
where not public.je_mladinski_slug(c.slug)
order by c.id
"""

KOS = 50_000  # vrstic na branje strežniškega kazalca


def v_stolpce(conn: psycopg.Connection, sql: str) -> Tabela:
    """Rezultat poizvedbe kot stolpci, brano v kosih (strežniški kazalec);
    besedilo in NULL ostaneta object."""
    with conn.transaction(), conn.cursor(name="stroj") as cur:
        # beremo vse vrstice: privzeti 0.1 da kazalcu načrt za prve vrstice (na
        # produkciji gnezdena zanka players × sezone, > 10 min namesto 25 s)
        conn.execute("set local cursor_tuple_fraction = 1")
        cur.itersize = KOS
        cur.execute(sql)
        imena = [d.name for d in cur.description]
        stolpci: list[list] = [[] for _ in imena]
        for vrstica in cur:
            for stolpec, x in zip(stolpci, vrstica):
                stolpec.append(x)
    izid: Tabela = {}
    for ime, stolpec in zip(imena, stolpci):
        stevilsko = all(isinstance(x, (int, float)) for x in stolpec)
        izid[ime] = np.array(stolpec) if stevilsko else np.array(stolpec, dtype=object)
    return izid


def nalozi(conn: psycopg.Connection) -> tuple[Tabela, Tabela, Tabela]:
    """Sezone igralcev (brez izločenih oseb), tekme za Elo, članske lige."""
    izkljuceni = {r[0] for r in conn.execute(SQL_IZKLJUCENI)}
    sezone = v_stolpce(conn, SQL_SEZONE)
    ostanejo = np.array([o not in izkljuceni for o in sezone["oseba"].tolist()], dtype=bool)
    return izberi(sezone, ostanejo), v_stolpce(conn, SQL_TEKME), v_stolpce(conn, SQL_LIGE)
