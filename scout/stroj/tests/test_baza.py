"""Integracijski test proti lokalni bazi (npx supabase start); vse se razveljavi."""
import os

import psycopg
import pytest

from stroj.nalaganje import nalozi

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
