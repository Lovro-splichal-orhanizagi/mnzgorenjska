"""Integracijski test proti lokalni bazi (npx supabase start); vse se razveljavi."""
import os
from datetime import datetime, timezone

import numpy as np
import psycopg
import pytest

from stroj import nalaganje
from stroj.nalaganje import SQL_IZKLJUCENI, nalozi, v_stolpce
from stroj.pisanje import zapisi

URL = os.environ.get("SCOUT_TEST_DB", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")

FIKSTURA = """
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
select v.id, v.slug, v.slug, 'T', false, (select id from countries where code = 'SI'), 'mnzg'
from (values (-914001, 'test-scout'), (-914002, 'test-scout-mladinci')) v(id, slug);
insert into teams (id, name, short_name, country_id) overriding system value
select -914000 - n, 'Test Scout ' || n, 'TS' || n, (select id from countries where code = 'SI')
from generate_series(1, 2) n;
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start, anonimiziran_at) overriding system value
values (-914001, -914001, -914001, 'Prvi', 'Scout', 'Scout Prvi', 'FWD', 6, 6, null),
       (-914002, -914002, -914001, 'Drugi', 'Scout', 'Scout Drugi', 'DEF', 6, 6, null),
       (-914003, -914001, -914001, 'Skriti', 'Scout', 'Scout Skriti', 'MID', 6, 6, null),
       (-914004, -914001, -914001, 'Anonimni', 'Scout', 'Scout Anonimni', 'MID', 6, 6, now()),
       (-914005, -914001, -914001, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, null),
       (-914006, -914001, -914002, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, null);
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-914003]::bigint[]);
insert into rounds (id, season, number, deadline_at, competition_id) overriding system value
values (-914001, '2098/99', 1, now() + interval '1 day', -914001);
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, zapisnik_id, played_on)
overriding system value
values (-914001, -914001, -914001, -914002, 2, 1, 'test-scout-1', '2098-09-01');
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914001, -914001, -914001, true, 0, 90, 90, 2, 1),
       (-914001, -914002, -914002, true, 0, 60, 60, 0, 0),
       (-914001, -914003, -914001, true, 0, 90, 90, 0, 0),
       (-914001, -914004, -914001, true, 0, 90, 90, 0, 0),
       (-914001, -914005, -914001, true, 0, 90, 90, 0, 0);
insert into goals (match_id, scorer_id, team_id, minute, is_penalty)
values (-914001, -914001, -914001, 10, true),
       (-914001, -914002, -914002, 50, false),
       (-914001, -914001, -914001, 70, false);
"""


@pytest.fixture
def conn():
    c = psycopg.connect(URL, connect_timeout=5)
    c.execute(FIKSTURA)
    c.execute("set role scout_stroj")  # preveri prav pravice delavca
    yield c
    c.rollback()
    c.close()


def test_v_stolpce_po_kosih(conn, monkeypatch):
    # NULL ali besedilo v poznejšem kosu naredi object ves stolpec, int in float v kosih da float
    monkeypatch.setattr(nalaganje, "KOS", 2)
    t = v_stolpce(conn, "select * from (values (1, 1, 'a'), (2, 2, 'b'), (3, null, 'c'), (4, 4.5::float8, 'd'), (5, 5, 'e')) v(i, n, s)")
    assert t["i"].dtype == np.int64 and t["i"].tolist() == [1, 2, 3, 4, 5]
    assert t["n"].dtype == object and t["n"].tolist()[:3] == [1, 2, None] and float(t["n"][3]) == 4.5
    assert all(type(x) is not np.int64 for x in t["n"].tolist())  # object ostane Pythonov int, kot prej
    assert t["s"].dtype == object
    assert v_stolpce(conn, "select 1 as i where false")["i"].tolist() == []
    t = v_stolpce(conn, "select * from (values (1, 1), (2, 2.5::float8), (3, 3)) v(i, f)")
    assert t["f"].dtype == np.float64


def test_nalozi(conn):
    sezone, tekme, lige = nalozi(conn)
    vrsta = {p: i for i, p in enumerate(sezone["player_id"].tolist()) if -914006 <= p <= -914001}
    assert set(vrsta) == {-914001, -914002}  # skriti (scout.ugovori), anonimni in mladi (mladinska vrstica brez letnice) izpadejo
    i, j = vrsta[-914001], vrsta[-914002]
    assert [sezone[c][i] for c in ("goli_np", "enajstm", "gr_on", "ekipa_gr", "ekipa_goli", "ekipa_prejeti", "leto")] == [1, 1, 1, 1, 2, 1, 2098]
    assert [sezone[c][j] for c in ("min_on", "gr_on", "ekipa_gr", "ekipa_min_zmin")] == [60, 0, -1, 90]
    assert sezone["skupina"][j] == "DEF" and sezone["oseba"][i].startswith("i")
    assert -914002 not in lige["id"].tolist()
    assert (-914001, 2098) in set(zip(tekme["competition_id"].tolist(), tekme["leto"].tolist()))


NEPOPOLNA = """
insert into rounds (id, season, number, deadline_at, competition_id) overriding system value
values (-914002, '2098/99', 2, now() + interval '2 day', -914001);
insert into matches (id, round_id, home_team_id, away_team_id, home_goals, away_goals, zapisnik_id, played_on)
overriding system value
values (-914002, -914002, -914001, -914002, 2, 0, 'test-scout-2', '2098-09-08');
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914002, -914001, -914001, true, 0, 90, 90, 2, 0);
insert into goals (match_id, scorer_id, team_id, minute, is_penalty)
values (-914002, -914001, -914001, 20, false);
"""


def test_nepopoln_zapisnik(conn):
    """Tekma z manj goli v zapisniku kot po izidu (2:0, en gol) ne šteje v on/off,
    v minute in gole pa."""
    conn.execute("reset role")
    conn.execute(NEPOPOLNA)
    conn.execute("set role scout_stroj")
    sezone, _, _ = nalozi(conn)
    i = sezone["player_id"].tolist().index(-914001)
    stolpci = ("nastopi", "minute", "goli_np", "ekipa_minute", "ekipa_goli", "gr_on", "min_on", "ekipa_gr", "ekipa_min_zmin")
    assert [sezone[c][i] for c in stolpci] == [2, 180, 3, 180, 4, 1, 90, 1, 90]


ANONIMIZIRANI = """
insert into competitions (id, slug, name, short_name, active, country_id, source) overriding system value
values (-914003, 'test-scout-b', 'test-scout-b', 'T', false, (select id from countries where code = 'SI'), 'mnzg');
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start, reg_st) overriding system value
values (-914020, -914002, -914001, 'Ime', 'Scout', 'Scout Ime', 'MID', 6, 6, null),
       (-914021, -914002, -914001, 'Reg', 'Scout', 'Scout Reg', 'MID', 6, 6, 99101),
       (-914022, -914001, -914003, 'Ime', 'Scout', 'Scout Ime', 'MID', 6, 6, null),
       (-914023, -914001, -914003, 'Ime', 'Drugo', 'Drugo Ime', 'MID', 6, 6, 99101);
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914001, -914020, -914002, true, 0, 90, 90, 0, 0),
       (-914001, -914021, -914002, true, 0, 90, 90, 0, 0);
select public.anonimiziraj_igralca(-914022), public.anonimiziraj_igralca(-914023);
"""


def test_anonimiziran_v_drugi_ligi(conn):
    """Anonimizacija velja za vrstico; ista oseba v drugi ligi (isto ime v državi
    ali ista šifra) izpade po ključih v anonimizirani_igralci."""
    conn.execute("reset role")
    conn.execute(ANONIMIZIRANI)
    conn.execute("set role scout_stroj")
    sezone, _, _ = nalozi(conn)
    igralci = set(sezone["player_id"].tolist())
    assert -914002 in igralci  # soigralec ostane
    assert not igralci & {-914020, -914021, -914022, -914023}


UGOVOR = """
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start) overriding system value
values (-914030, -914001, -914001, 'Ugovor', 'Scout', 'Scout Ugovor', 'MID', 6, 6),
       (-914031, -914002, -914001, 'Ugovor', 'Scout', 'Scout Ugovor', 'MID', 6, 6);
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914001, -914031, -914002, true, 0, 90, 90, 0, 0);
insert into scout.ugovori (player_id, kljuc) select * from scout.kljuci_vrstic(array[-914030]::bigint[]);
"""


def test_ugovor_v_drugem_klubu(conn):
    """Ugovor (scout.ugovori) velja za vse vrstice osebe v državi: isto ime brez
    šifre v drugem klubu je druga `oseba`, a izpade po ključu imena."""
    conn.execute("reset role")
    conn.execute(UGOVOR)
    conn.execute("set role scout_stroj")
    sezone, _, _ = nalozi(conn)
    igralci = set(sezone["player_id"].tolist())
    assert -914002 in igralci  # soigralec z drugim imenom ostane
    assert not igralci & {-914030, -914031}


MLADINEC = """
insert into auth.users (id, email, raw_user_meta_data, created_at)
values ('e5c00000-0000-4000-8000-000000000914', 'scout-mladi@example.invalid', '{"display_name":"ScoutMladi"}', now());
insert into zahtevki_igralca (player_id, user_id, status, potrdil, decided_at)
values (-914005, 'e5c00000-0000-4000-8000-000000000914', 'potrjen', 'admin', now());
"""


def test_mladinec_s_polnoletno_letnico(conn):
    """Oseba z mladinsko vrstico (-914006) vstopi, ko na potrjenem profilu
    prijavi letnico, s katero je polnoletna vse leto (<= letos - 19); letnica
    letos - 18 je ne odpre."""
    conn.execute("reset role")
    conn.execute(MLADINEC)
    conn.execute("insert into scout.privolitve (player_id, letnik) "
                 "values (-914005, extract(year from current_date)::int - 18)")
    conn.execute("set role scout_stroj")
    assert -914005 not in set(nalozi(conn)[0]["player_id"].tolist())
    conn.execute("reset role")
    conn.execute("update scout.privolitve set letnik = 2000 where player_id = -914005")
    conn.execute("set role scout_stroj")
    assert -914005 in set(nalozi(conn)[0]["player_id"].tolist())


# Mladinec brez šifre v klubu X (-914001) in isto ime v članski ekipi kluba Y
# (-914002): dve `oseba`, a ista oseba. Soimenjak v tretjem klubu (-914003).
DVOJNI = """
insert into teams (id, name, short_name, country_id) overriding system value
values (-914003, 'Test Scout 3', 'TS3', (select id from countries where code = 'SI'));
insert into players (id, team_id, competition_id, first_name, last_name, full_name, position,
                     value, value_start) overriding system value
values (-914040, -914001, -914002, 'Dvojni', 'Scout', 'Scout Dvojni', 'MID', 6, 6),
       (-914041, -914002, -914001, 'Dvojni', 'Scout', 'Scout Dvojni', 'MID', 6, 6),
       (-914042, -914003, -914001, 'Dvojni', 'Scout', 'Scout Dvojni', 'MID', 6, 6);
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914001, -914041, -914002, true, 0, 90, 90, 0, 0);
"""


def prijavi_letnico(conn, player_id, n):
    """Potrjen profil z letnico 2000 na vrstici player_id (kot admin, nato nazaj v scout_stroj)."""
    uid = f"e5c00000-0000-4000-8000-00000091404{n}"
    conn.execute("reset role")
    conn.execute("insert into auth.users (id, email, raw_user_meta_data, created_at) "
                 "values (%s, %s, '{}', now())", (uid, f"scout-dvojni{n}@example.invalid"))
    conn.execute("insert into zahtevki_igralca (player_id, user_id, status, potrdil, decided_at) "
                 "values (%s, %s, 'potrjen', 'admin', now())", (player_id, uid))
    conn.execute("insert into scout.privolitve (player_id, letnik) values (%s, 2000)", (player_id,))
    conn.execute("set role scout_stroj")


def igralci(conn):
    return set(nalozi(conn)[0]["player_id"].tolist())


def test_mladinec_v_drugem_klubu(conn):
    """Mladinska vrstica v klubu X izloči tudi člansko vrstico istega imena v klubu Y."""
    conn.execute("reset role")
    conn.execute(DVOJNI)
    conn.execute("set role scout_stroj")
    assert -914041 not in igralci(conn)


def test_mladinec_v_drugem_klubu_z_letnico(conn):
    """Prijava letnice na članski vrstici odpre njeno osebo."""
    conn.execute("reset role")
    conn.execute(DVOJNI)
    prijavi_letnico(conn, -914041, 1)
    assert -914041 in igralci(conn)


def test_soimenjakova_letnica_ne_odpre(conn):
    """Prijava soimenjaka v klubu Z (-914042) odpre le njegovo osebo, ne članske
    vrstice mladinca v klubu Y."""
    conn.execute("reset role")
    conn.execute(DVOJNI)
    prijavi_letnico(conn, -914042, 2)
    assert -914041 not in igralci(conn)
    izlocene = {r[0] for r in conn.execute(SQL_IZKLJUCENI).fetchall()}
    si = conn.execute("select id from countries where code = 'SI'").fetchone()[0]
    assert f"i{si}:scout dvojni:-914003" not in izlocene  # soimenjak sam vstopi
    assert f"i{si}:scout dvojni:-914002" in izlocene


def test_zapisi_in_obrezi(conn):
    """Piše kot scout_stroj (fikstura), torej skozi politike RLS `stroj`."""
    assert conn.execute("select current_user").fetchone()[0] == "scout_stroj"
    vrstice = {
        "lige_moc": [(-914001, 0.1, "model", 25, datetime.now(timezone.utc))],
        "ekipe_elo": [(-914001, -914001, 2098, 1510.0)],
        "kazalniki": [(-914001, -914001, "2098/99", 2098, -914001, "FWD", 90, 1.0, 1.0, 1.0, 0.5, 0.5, 1,
                       0.1, 1.0, 0.0, 0.0, 0.0, 1.0, float("nan"), float("nan"), 0.05)],
        "indeks": [(-914001, "FWD", 0.7, 100.0, 0.05)],
        "vektorji": [(-914001, "FWD", [0.1, 0.2], [-914002], [0.9])],
        "vrzeli": [(-914001, -914001, "DEF", "tanka", None, 1.0)],
    }
    # n == 0: brez ključev mae_*; NaN v backtestu postane JSON null
    model = {"leto": 2098, "backtest": {"n": 0, "prestal": False, "izboljsava": float("nan")},
             "parametri": {"elo_koef": 0.2}, "objavljen": False}
    prvi = zapisi(conn, model, vrstice)
    assert conn.execute("select count(*) from scout.kazalniki where model_id = %s and trend_minut is null "
                        "and prehod_ravni is null", (prvi,)).fetchone()[0] == 1
    assert conn.execute("select backtest from scout.modeli where id = %s", (prvi,)).fetchone()[0] == \
        {"n": 0, "prestal": False, "izboljsava": None}
    for _ in range(3):
        zadnji = zapisi(conn, model | {"objavljen": True}, vrstice)
    ostali = [r[0] for r in conn.execute("select id from scout.modeli where id >= %s order by id", (prvi,))]
    assert prvi not in ostali and zadnji in ostali and len(ostali) == 3
    assert conn.execute("select count(*) from scout.vrzeli where model_id = %s", (prvi,)).fetchone()[0] == 0
