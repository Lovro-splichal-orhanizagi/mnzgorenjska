import numpy as np

from stroj import pisanje


def test_vrstice_po_kosih(monkeypatch):
    monkeypatch.setattr(pisanje, "KOS", 2)
    t = {"a": np.arange(5), "b": np.array(["x", None, "y", "z", "w"], dtype=object)}
    assert list(pisanje.vrstice(t, ["b", "a"])) == [("x", 0), (None, 1), ("y", 2), ("z", 3), ("w", 4)]
    assert list(pisanje.vrstice(t, ["a"], np.array([4, 1, 3]))) == [(4,), (1,), (3,)]
    assert all(type(r[0]) is int for r in pisanje.vrstice(t, ["a"]))  # COPY dobi Pythonove int
