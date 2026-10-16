import numpy as np
from pomoc import sezone

from stroj.backtest import backtest, napovedi


def _sinteticno(oseb: int = 900):
    rng = np.random.default_rng(7)
    prava = {1: 0.0, 2: 0.6, 3: 1.2}
    vrstice = []
    for i in range(oseb):
        sposobnost = rng.normal(0, 0.3)
        liga = int(rng.integers(1, 4))
        for leto in (2023, 2024, 2025):
            if rng.random() < 0.5:
                liga = int(rng.integers(1, 4))
            vrstice.append((f"r1:{i}", liga, leto, int(rng.poisson(np.exp(sposobnost - prava[liga]) * 20))))
    oseba, liga, leto, goli = (list(x) for x in zip(*vrstice))
    n = len(oseba)
    s = sezone(n, oseba=oseba, competition_id=liga, leto=leto, goli_np=goli, minute=[1800] * n,
               min_on=[1800] * n, ekipa_minute=[1800] * n, ekipa_min_zmin=[1800] * n)
    lige = {"id": np.array([1, 2, 3]), "slug": np.array(["x-1", "x-2", "x-3"], dtype=object),
            "name": np.array([None] * 3, dtype=object), "zveza": np.array([None] * 3, dtype=object),
            "country_id": np.array([1, 1, 1])}
    return s, lige


def test_premaga_naivno_in_ablacijo_pri_prestopih():
    s, lige = _sinteticno()
    rez = backtest(s, lige, {}, 2025)
    assert rez["n_prestopi"] >= 200
    assert rez["mae_model_prestopi"] < min(rez["mae_brez_moci_prestopi"], rez["mae_naivno_prestopi"])
    assert rez["stanje"] == "prestal" and rez["prestal"] is True


def test_premalo_prestopov_ni_prestal():
    s, lige = _sinteticno(300)
    rez = backtest(s, lige, {}, 2025)
    assert 0 < rez["n_prestopi"] < 200
    assert rez["stanje"] == "premalo podatkov" and rez["prestal"] is False


def test_brez_parov():
    s, lige = _sinteticno()
    assert backtest(s, lige, {}, 2030) == {"ciljno_leto": 2030, "n": 0, "n_prestopi": 0, "izboljsava_prestopi": None,
                                           "izboljsava_moci": None, "stanje": "premalo podatkov", "prestal": False}


def test_ciljna_sezona_ne_pusca_v_napoved():
    """Skrajni goli in Elo ciljne sezone ne premaknejo nobene napovedi."""
    s, lige = _sinteticno()
    elo = {(l, y, 1): 1500.0 + 30 * l for l in (1, 2, 3) for y in (2023, 2024)}
    prej = napovedi(s, lige, elo, 2025)
    cilj = s["leto"] == 2025
    s2 = {c: v.copy() for c, v in s.items()}
    s2["goli_np"][cilj] = np.where(s2["competition_id"][cilj] == 3, 500, 0)  # obrne moč lig, če bi pricurljala
    elo2 = elo | {(l, 2025, 1): 1500.0 + 900 * l for l in (1, 2, 3)}
    potem = napovedi(s2, lige, elo2, 2025)
    for ime in ("i", "j", "model", "naivno", "brez_moci"):
        np.testing.assert_array_equal(prej[ime], potem[ime])
    assert not np.array_equal(prej["dejansko"], potem["dejansko"])


def test_par_je_iz_iste_drzave():
    s, lige = _sinteticno(50)
    p = napovedi(s, lige, {}, 2025)
    assert len(p["i"]) > 0
    assert (s["country_id"][p["i"]] == s["country_id"][p["j"]]).all()
