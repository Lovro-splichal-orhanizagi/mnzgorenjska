import numpy as np
import pytest

from stroj.elo import elo, elo_rel


def _tekme(vrstice):
    imena = ["competition_id", "leto", "home_team_id", "away_team_id", "home_goals", "away_goals"]
    return {ime: np.array(stolpec) for ime, stolpec in zip(imena, zip(*vrstice))}


def test_zmagovalec_raste_vsota_ostane():
    r = elo(_tekme([(1, 2025, 10, 20, 2, 0), (1, 2025, 10, 30, 3, 0), (1, 2025, 20, 30, 1, 1)]))
    assert r[(1, 2025, 10)] > 1500 > r[(1, 2025, 30)]
    assert sum(r.values()) == pytest.approx(4500)


def test_vsaka_liga_sezona_zacne_pri_1500():
    r = elo(_tekme([(1, 2025, 10, 20, 5, 0), (2, 2026, 10, 20, 0, 0)]))
    assert r[(2, 2026, 10)] < 1500  # domači remi brez upoštevanja lanske zmage


def test_tekma_brez_izida_ne_premakne():
    imena = ["competition_id", "leto", "home_team_id", "away_team_id", "home_goals", "away_goals"]
    vrstice = [(1, 2025, 10, 20, 2, 0), (1, 2025, 30, 40, None, None)]
    t = {ime: np.array(stolpec, dtype=object) for ime, stolpec in zip(imena, zip(*vrstice))}
    r = elo(t)
    assert r[(1, 2025, 10)] > 1500 and (1, 2025, 30) not in r and (1, 2025, 40) not in r


def test_elo_rel():
    s = {"competition_id": np.array([1, 1]), "leto": np.array([2025, 2025]), "team_id": np.array([10, 99])}
    assert elo_rel(s, {(1, 2025, 10): 1700.0}).tolist() == [0.5, 0.0]
