import numpy as np
import pytest
from pomoc import sezone

from stroj.kazalniki import izracunaj

MODEL = {1: (0.0, "model", 30), 2: (0.5, "model", 30)}


def test_skrcenje_in_raven():
    s = sezone(4, minute=[900, 90, 900, 90], goli_np=[2, 2, 2, 2], competition_id=[1, 1, 2, 2], min_on=[900, 90, 900, 90])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert k["goli_ref_90"][1] < 1.0  # surovo 2,0 na 90, a le 90 minut
    assert k["goli_ref_90"][2] == pytest.approx(k["goli_ref_90"][0] * np.exp(0.5))


def test_mocna_ekipa_steje_manj():
    s = sezone(2, team_id=[1, 2], goli_np=[5, 5])
    k = izracunaj(s, MODEL, {(1, 2025, 1): 1900.0}, 0.2)
    assert k["goli_ref_90"][0] == pytest.approx(k["goli_ref_90"][1] * np.exp(-0.2))


def test_onoff():
    s = sezone(2, gr_on=[3, 0], min_on=[900, 900], ekipa_gr=[3, 3], ekipa_min_zmin=[900, 1800])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert k["onoff_ref_90"][0] == 0  # ves čas na igrišču: ni primerjave
    assert k["onoff_ref_90"][1] == pytest.approx(-0.15)  # brez njega +3, z njim 0; skrčeno na pol


def test_zaupanje():
    s = sezone(2, minute=[1800, 1800], ima_sifro=[True, False])
    assert izracunaj(s, MODEL, {}, 0.0)["zaupanje"].tolist() == pytest.approx([1.0, 0.7])
    assert izracunaj(s, {}, {}, 0.0)["zaupanje"].tolist() == pytest.approx([0.5, 0.35])


def test_pot():
    s = sezone(2, oseba=["r1:7", "r1:7"], leto=[2024, 2025], minute=[900, 400], competition_id=[1, 2], ekipa_minute=[1000, 1000])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert np.isnan(k["trend_minut"][0])
    assert k["trend_minut"][1] == pytest.approx(-0.5)
    assert k["prehod_ravni"][1] == pytest.approx(0.5)


def test_vratar_proti_ekipi():
    s = sezone(3, skupina=["GK", "GK", "DEF"], prejeti=[10, 20, 15], ekipa_prejeti=[15, 15, 15])
    k = izracunaj(s, MODEL, {}, 0.0)
    assert k["vratar_ref_90"][0] > 0 > k["vratar_ref_90"][1]  # prvi prejme manj kot ekipa
    assert k["vratar_ref_90"][2] == 0


def test_stalnost():
    s = sezone(3, oseba=["r1:7"] * 3, leto=[2024, 2025, 2026], minute=[900, 200, 900], ekipa_minute=[1000] * 3)
    assert izracunaj(s, MODEL, {}, 0.0)["stalnost"].tolist() == pytest.approx([1.0, 0.5, 2 / 3])
