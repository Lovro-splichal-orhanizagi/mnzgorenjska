import numpy as np

from stroj.vrzeli import vrzeli


def test_vrzeli():
    t = {
        "team_id": np.array([1] * 5), "competition_id": np.array([1] * 5), "player_id": np.array([1, 2, 3, 4, 5]),
        "skupina": np.array(["GK", "DEF", "DEF", "MID", "FWD"], dtype=object),
        "delez_minut": np.array([0.9, 0.9, 0.2, 0.6, 0.8]),
        "delez_golov": np.array([0.0, 0.0, 0.0, 0.1, 0.6]),
        "ekipa_goli": np.array([10] * 5),
        "trend_minut": np.array([np.nan, 0.0, 0.0, -0.4, 0.1]),
        "kartoni_90": np.zeros(5),
        "prejeti_ref_90": np.array([1.0, 1.2, 0.5, 0.8, 0.9]),
    }
    v = vrzeli(t)
    vrste = {(r[2], r[3], r[4]) for r in v}
    assert ("DEF", "tanka", None) in vrste and ("GK", "tanka", None) not in vrste
    assert ("FWD", "odvisnost", 5) in vrste
    assert ("MID", "padajoce_minute", 4) in vrste
    assert not any(r[3] == "disciplina" for r in v)  # nihče nima kartonov
    assert ("DEF", "prejeti", None) in vrste  # redni branilec 1,2 > MID 0,8, FWD 0,9


def test_brez_skupine_in_lanske_sezone():
    # igralec brez pozicije in brez lanske sezone: ne pade, ne šteje v rednih, ni padca minut
    t = {
        "team_id": np.array([1, 1]), "competition_id": np.array([1, 1]), "player_id": np.array([1, 2]),
        "skupina": np.array([None, "DEF"], dtype=object),
        "delez_minut": np.array([0.9, 0.9]),
        "delez_golov": np.array([0.5, 0.0]),
        "ekipa_goli": np.array([10, 10]),
        "trend_minut": np.array([np.nan, np.nan]),
        "kartoni_90": np.array([2.0, 0.0]),
        "prejeti_ref_90": np.array([3.0, 1.0]),
    }
    v = vrzeli(t)
    assert not any(np.isnan(r[5]) for r in v)
    assert not any(r[3] == "padajoce_minute" for r in v)
    assert not any(r[3] == "disciplina" for r in v)  # brez pozicije ni primerjave
    assert (None, "odvisnost", 1) in {(r[2], r[3], r[4]) for r in v}
    assert [r[5] for r in v if r[3] == "prejeti"] == [1.0]  # le redni s pozicijo
    assert [r[5] for r in v if r[3] == "tanka" and r[2] == "DEF"] == [1.0]


def _branilci(liga: int, kartoni: list[float], prvi_id: int) -> dict:
    n = len(kartoni)
    return {
        "team_id": np.array([liga * 100 + i % 3 for i in range(n)]), "competition_id": np.array([liga] * n),
        "player_id": np.arange(prvi_id, prvi_id + n),
        "skupina": np.array(["DEF"] * n, dtype=object),
        "delez_minut": np.full(n, 0.9), "delez_golov": np.zeros(n), "ekipa_goli": np.full(n, 10),
        "trend_minut": np.full(n, np.nan), "kartoni_90": np.array(kartoni, dtype=float),
        "prejeti_ref_90": np.ones(n),
    }


def _disciplina(t: dict) -> set:
    return {r[4] for r in vrzeli(t) if r[3] == "disciplina"}


def test_disciplina_po_ligi():
    prva = _branilci(1, [0.1] * 11 + [1.5], 1)  # 12 branilcev, eden grob
    assert _disciplina(prva) == {12}
    # druga liga z zelo drugačno normo ne premakne praga prve
    druga = _branilci(2, [3.0] * 10 + [5.0, 6.0], 100)
    obe = {c: np.concatenate([prva[c], druga[c]]) for c in prva}
    assert {p for p in _disciplina(obe) if p < 100} == {12}


def test_disciplina_majhna_celica():
    assert _disciplina(_branilci(1, [0.1] * 8 + [1.5], 1)) == set()  # 9 < MIN_DISCIPLINA


def test_disciplina_spodnja_meja():
    # p90 = 0: karton 0,15 ni nad mejo 0,2
    assert _disciplina(_branilci(1, [0.0] * 11 + [0.15], 1)) == set()
