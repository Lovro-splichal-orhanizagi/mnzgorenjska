import numpy as np

from stroj.moc_lig import dopolni_moc, oceni_moc


def test_najde_znano_moc():
    rng = np.random.default_rng(1)
    prava = {1: 0.0, 2: 0.5, 3: 1.0}
    oseba, liga, rel, y = [], [], [], []
    for i in range(600):
        sposobnost = rng.normal(0, 0.3)
        for l in rng.choice([1, 2, 3], 2, replace=False).tolist():
            r = rng.normal(0, 0.5)
            oseba.append(f"o{i}")
            liga.append(l)
            rel.append(r)
            y.append(sposobnost - prava[l] + 0.2 * r + rng.normal(0, 0.1))
    moc, koef, stevci = oceni_moc(np.array(oseba, dtype=object), np.array(liga), np.array(rel), np.array(y))
    assert abs((moc[2] - moc[1]) - 0.5) < 0.05
    assert abs((moc[3] - moc[1]) - 1.0) < 0.05
    assert abs(koef - 0.2) < 0.05
    assert stevci[1] > 300


def test_brez_prestopov_ni_modela():
    moc, koef, _ = oceni_moc(np.array(["a", "b"], dtype=object), np.array([1, 2]), np.zeros(2), np.zeros(2))
    assert moc == {} and koef == 0.0


def test_dopolni_piramida_drzava_brez():
    lige = {
        "id": np.array([1, 2, 3, 4, 5, 6, 7]),
        "slug": np.array(["sk-nike-liga", "sk-sfz-2liga", "sk-sfz-3liga", "sk-sfz-4liga", "clani", "lj-1-liga", "x-liga"], dtype=object),
        "name": np.array([None] * 7, dtype=object),
        "zveza": np.array([None] * 7, dtype=object),
        "country_id": np.array([2, 2, 2, 2, 1, 1, 3]),
    }
    izid = dopolni_moc({1: 1.0, 2: 0.75, 3: 0.5, 6: 0.3}, {1: 40, 2: 30, 3: 25, 6: 50}, lige)
    assert izid[1] == (1.0, "model", 40)
    assert izid[4][1] == "piramida" and abs(izid[4][0] - 0.25) < 1e-9
    assert izid[5] == (0.3, "drzava", 0)
    assert izid[7] == (0.0, "brez", 0)


def test_slovenija_brez_ravni():
    # ravenLige za SI vrne None: brez piramide gre veriga na mediano države, nato 0
    lige = {
        "id": np.array([1, 2, 3, 4]),
        "slug": np.array(["clani", "lj-1-liga", "nzs-3-snl-zahod", "sk-nike-liga"], dtype=object),
        "name": np.array([None] * 4, dtype=object),
        "zveza": np.array(["mnzg", "mnzlj", None, None], dtype=object),
        "country_id": np.array([1, 1, 1, 2]),
    }
    izid = dopolni_moc({2: 0.2, 3: 0.6}, {2: 30, 3: 25}, lige)
    assert izid[1] == (0.4, "drzava", 0)
    izid = dopolni_moc({4: 0.5}, {4: 30}, lige)
    assert izid[1] == (0.0, "brez", 0) and izid[2] == (0.0, "brez", 0)
