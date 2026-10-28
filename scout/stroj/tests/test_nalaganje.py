"""Branje tekem za Elo: dejanski SQL nad fiksturo brez pisanja v bazo."""
import os

import psycopg

from stroj.nalaganje import SQL_TEKME


FIKSTURA_TEKME = """
with matches(id, round_id, home_team_id, away_team_id, home_goals, away_goals,
             zapisnik_id, kontumacija, played_on, statistics_status, imported_at) as (
  values
    (1, 1, 101, 201, null::int, null::int, 'unknown', false, date '2025-09-01', 'unavailable_historical', null::timestamptz),
    (2, 1, 102, 202, null, 1, 'half-home', false, date '2025-09-01', 'complete', now()),
    (3, 1, 103, 203, 1, null, 'half-away', false, date '2025-09-01', 'complete', now()),
    (4, 1, 104, 204, -1, 0, 'negative-home', false, date '2025-09-01', 'complete', now()),
    (5, 1, 105, 205, 0, -1, 'negative-away', false, date '2025-09-01', 'complete', now()),
    (6, 1, 106, 206, 0, 0, 'draw', false, date '2025-09-01', 'complete', now()),
    (7, 1, 107, 207, 2, 1, 'known', false, date '2025-09-02', 'complete', now()),
    (8, 1, 108, 208, 3, 2, 'result-only', false, date '2025-09-03', 'pending', null),
    (9, 1, 109, 209, 1, 2, 'historical', false, date '2025-09-04', 'unavailable_historical', null),
    (10, 1, 110, 210, 0, 0, 'historical-draw', false, null, 'unavailable_historical', null),
    (11, 1, 111, 211, 2, 0, null, false, date '2025-09-01', 'complete', now()),
    (12, 1, 112, 212, 3, 0, 'forfeit', true, date '2025-09-01', 'complete', now()),
    (13, 2, 113, 213, 2, 0, 'youth', false, date '2025-09-01', 'complete', now())
), rounds(id, competition_id, season) as (
  values (1, 1, '2025/26'), (2, 2, '2025/26')
), competitions(id, slug) as (
  values (1, 'test-scout'), (2, 'test-scout-mladinci')
)
"""

PRICAKOVANE_TEKME = [
    (1, 2025, 106, 206, 0, 0),
    (1, 2025, 107, 207, 2, 1),
    (1, 2025, 108, 208, 3, 2),
    (1, 2025, 109, 209, 1, 2),
    (1, 2025, 110, 210, 0, 0),
]


def test_elo_samo_znani_veljavni_izidi():
    # Zamenjamo le tabele: preizkusimo pravi filter in vrstni red SQL_TEKME.
    sql = SQL_TEKME
    for tabela in ("matches", "rounds", "competitions"):
        sql = sql.replace(f"public.{tabela}", tabela)
    url = os.environ.get("SCOUT_TEST_DB", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
    with psycopg.connect(url, connect_timeout=5) as conn:
        conn.execute("set transaction read only")
        assert conn.execute(FIKSTURA_TEKME + sql).fetchall() == PRICAKOVANE_TEKME
