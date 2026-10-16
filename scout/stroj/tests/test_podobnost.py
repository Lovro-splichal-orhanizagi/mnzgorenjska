import warnings

import numpy as np
import pytest

from stroj.podobnost import najblizji

X = np.array([[1.0, 0.0], [0.9, 0.1], [0.0, 1.0]])


def test_najblizji():
    sosedi, podobnost = najblizji(X, n=1)
    assert sosedi[:, 0].tolist() == [1, 0, 1]
    assert podobnost[0, 0] == pytest.approx(0.9 / np.hypot(0.9, 0.1))


R = np.random.default_rng(1).normal(size=(60, 5))


def test_kosi_ne_spremenijo_izida():
    for kos in (1, 7):
        s_kosi, p_kosi = najblizji(R, n=10, kos=kos)
        s_cel, p_cel = najblizji(R, n=10)
        assert (s_kosi == s_cel).all()
        assert np.allclose(p_kosi, p_cel)


def test_nicelni_vektor_brez_nan_in_opozorila():
    Y = np.vstack([X, np.zeros(2)])
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        sosedi, podobnost = najblizji(Y, n=3)
    assert np.isfinite(podobnost).all()
    assert (podobnost[3] == 0).all()


def test_premalo_vrstic_in_nikoli_sebe():
    sosedi, podobnost = najblizji(X, n=20)
    assert sosedi.shape == podobnost.shape == (3, 2)
    assert all(i not in sosedi[i] for i in range(3))
    assert (np.diff(podobnost, axis=1) <= 0).all()


def test_nikoli_sebe_v_kosih():
    for n in (5, 59):
        sosedi, podobnost = najblizji(R, n=n, kos=2)
        assert all(i not in sosedi[i] for i in range(len(R)))
        assert (np.diff(podobnost, axis=1) <= 0).all()


def test_ena_vrstica_zavrne():
    with pytest.raises(ValueError):
        najblizji(X[:1])
