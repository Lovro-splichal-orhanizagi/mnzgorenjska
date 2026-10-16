import numpy as np
import pytest

from stroj.indeks import VEKTOR, indeks, projekcija, z_vrednosti


def test_indeks_in_percentil():
    t = {"skupina": np.array(["FWD"] * 3 + ["GK"] * 2, dtype=object), "country_id": np.array([1] * 5)}
    t |= {c: np.zeros(5) for c in VEKTOR}
    t["goli_ref_90"] = np.array([0.2, 0.5, 0.9, 0.0, 0.0])
    t["prejeti_ref_90"] = np.array([0.0, 0.0, 0.0, 1.0, 2.0])
    idx, pct = indeks(t, z_vrednosti(t))
    assert idx[0] < idx[1] < idx[2]
    assert pct[:3].tolist() == pytest.approx([100 / 3, 200 / 3, 100])
    assert idx[3] > idx[4]  # vratar z manj prejetimi je višje


def test_z_znotraj_drzave():
    # ista razporeditev na drugi lestvici v drugi državi: enake z-vrednosti
    t = {"skupina": np.array(["FWD"] * 4, dtype=object), "country_id": np.array([1, 1, 2, 2])}
    t |= {c: np.zeros(4) for c in VEKTOR}
    t["goli_ref_90"] = np.array([0.1, 0.3, 1.0, 3.0])
    Z = z_vrednosti(t)[:, VEKTOR.index("goli_ref_90")]
    assert Z.tolist() == pytest.approx([-1, 1, -1, 1])


def test_projekcija():
    assert projekcija(1.0, np.log(2)) == pytest.approx(0.5)
