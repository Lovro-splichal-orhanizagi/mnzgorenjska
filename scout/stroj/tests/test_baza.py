"""Integracijski test proti lokalni bazi (npx supabase start); vse se razveljavi."""
import os
from datetime import datetime, timezone

import psycopg
import pytest

from stroj.nalaganje import nalozi
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
                     value, value_start, scout_skrit, anonimiziran_at) overriding system value
values (-914001, -914001, -914001, 'Prvi', 'Scout', 'Scout Prvi', 'FWD', 6, 6, false, null),
       (-914002, -914002, -914001, 'Drugi', 'Scout', 'Scout Drugi', 'DEF', 6, 6, false, null),
       (-914003, -914001, -914001, 'Skriti', 'Scout', 'Scout Skriti', 'MID', 6, 6, true, null),
       (-914004, -914001, -914001, 'Anonimni', 'Scout', 'Scout Anonimni', 'MID', 6, 6, false, now()),
       (-914005, -914001, -914001, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, false, null),
       (-914006, -914001, -914002, 'Mladi', 'Scout', 'Scout Mladi', 'MID', 6, 6, false, null);
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


def test_nalozi(conn):
    sezone, tekme, lige = nalozi(conn)
    vrsta = {p: i for i, p in enumerate(sezone["player_id"].tolist()) if -914006 <= p <= -914001}
    assert set(vrsta) == {-914001, -914002}  # skriti, anonimni in mladi (ima mladinsko vrstico) izpadejo
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
                     value, value_start, scout_skrit) overriding system value
values (-914030, -914001, -914001, 'Ugovor', 'Scout', 'Scout Ugovor', 'MID', 6, 6, true),
       (-914031, -914002, -914001, 'Ugovor', 'Scout', 'Scout Ugovor', 'MID', 6, 6, false);
insert into appearances (match_id, player_id, team_id, started, minute_on, minute_off, minutes_played, goals, penalties_scored)
values (-914001, -914031, -914002, true, 0, 90, 90, 0, 0);
"""


def test_ugovor_v_drugem_klubu(conn):
    """Ugovor (scout_skrit) velja za vse vrstice osebe v državi: isto ime brez
    šifre v drugem klubu je druga `oseba`, a izpade po ključu imena."""
    conn.execute("reset role")
    conn.execute(UGOVOR)
    conn.execute("set role scout_stroj")
    sezone, _, _ = nalozi(conn)
    igralci = set(sezone["player_id"].tolist())
    assert -914002 in igralci  # soigralec z drugim imenom ostane
    assert not igralci & {-914030, -914031}


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
