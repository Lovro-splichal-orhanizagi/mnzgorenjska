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


def _skupina(rng, prava, n_oseb, sposobnost, predpona):
    """Osebe, ki igrajo v dveh ligah iz `prava` (liga → moč); y = sposobnost − moč + šum."""
    oseba, liga, y = [], [], []
    for i in range(n_oseb):
        s = rng.normal(sposobnost, 0.3)
        for l in rng.choice(list(prava), 2, replace=False).tolist():
            oseba.append(f"{predpona}{i}")
            liga.append(l)
            y.append(s - prava[l] + rng.normal(0, 0.1))
    return oseba, liga, y


def _oceni(skupine, drzava):
    rng = np.random.default_rng(2)
    oseba, liga, y = [], [], []
    for args in skupine:
        o, l, yy = _skupina(rng, *args)
        oseba += o
        liga += l
        y += yy
    return oceni_moc(np.array(oseba, dtype=object), np.array(liga), np.zeros(len(y)), np.array(y), drzava)


def test_locena_skupina_v_drzavi_gre_na_dopolnitev():
    # lige 4 in 5 nimata skupnih igralcev z 1–3; njuni igralci so boljši za 1.0,
    # kar bi brez izločitve pristalo v moči lig
    moc, _, stevci = _oceni([({1: 0.0, 2: 0.5, 3: 1.0}, 300, 0.0, "a"), ({4: 0.0, 5: 0.5}, 100, 1.0, "b")],
                            {l: 1 for l in range(1, 6)})
    assert set(moc) == {1, 2, 3}
    assert abs(moc[2]) < 1e-9 and abs(moc[3] - moc[1] - 1.0) < 0.05
    assert stevci[4] == 100
    lige = {"id": np.arange(1, 6), "slug": np.array(["clani"] * 5, dtype=object),
            "name": np.array([None] * 5, dtype=object), "zveza": np.array([None] * 5, dtype=object),
            "country_id": np.ones(5, dtype=int)}
    assert dopolni_moc(moc, stevci, lige)[4][1] == "drzava"


def test_vsaka_drzava_ima_svojo_nicelno_mediano():
    # državi nista povezani; igralci druge so boljši za 2.0, kar ne sme premakniti lestvice
    moc, _, _ = _oceni([({1: 0.0, 2: 0.5, 3: 1.0}, 300, 0.0, "a"), ({4: 0.0, 5: 0.3, 6: 0.6}, 300, 2.0, "b")],
                       {1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2})
    assert set(moc) == {1, 2, 3, 4, 5, 6}
    assert abs(np.median([moc[1], moc[2], moc[3]])) < 1e-9 and abs(np.median([moc[4], moc[5], moc[6]])) < 1e-9
    assert abs(moc[3] - moc[1] - 1.0) < 0.05 and abs(moc[6] - moc[4] - 0.6) < 0.05


def test_piramida_brez_modelnih_lig_je_brez():
    lige = {"id": np.array([1, 2]), "slug": np.array(["sk-nike-liga", "sk-sfz-2liga"], dtype=object),
            "name": np.array([None] * 2, dtype=object), "zveza": np.array([None] * 2, dtype=object),
            "country_id": np.array([2, 2])}
    assert dopolni_moc({}, {}, lige) == {1: (0.0, "brez", 0), 2: (0.0, "brez", 0)}
