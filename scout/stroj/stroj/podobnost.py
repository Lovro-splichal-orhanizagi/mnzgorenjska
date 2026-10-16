"""Podobni igralci: kosinusna podobnost vektorjev kazalnikov (spec 3.5).
Vektorji so že prilagojeni ravni (kazalniki *_ref) in standardizirani."""
import numpy as np


def najblizji(vektorji: np.ndarray, n: int = 20, kos: int = 2000) -> tuple[np.ndarray, np.ndarray]:
    if len(vektorji) < 2:
        raise ValueError("najblizji potrebuje vsaj 2 vrstici")
    # ničelni vektor: deljenje z 1e-9 da ničle, podobnost 0 do vseh, brez NaN
    norma = vektorji / np.maximum(np.linalg.norm(vektorji, axis=1, keepdims=True), 1e-9)
    n = min(n, len(norma) - 1)
    sosedi = np.empty((len(norma), n), dtype=np.int64)
    podobnost = np.empty((len(norma), n))
    # ponytail: kosi po 2000 vrstic držijo matriko pod ~150 MB; ANN indeks, ko bo država > 200k igralcev
    for z in range(0, len(norma), kos):
        s = norma[z:z + kos] @ norma.T
        s[np.arange(len(s)), np.arange(z, z + len(s))] = -np.inf
        top = np.argpartition(-s, n - 1, axis=1)[:, :n]
        vr = np.take_along_axis(s, top, 1)
        red = np.argsort(-vr, axis=1, kind="stable")
        sosedi[z:z + kos] = np.take_along_axis(top, red, 1)
        podobnost[z:z + kos] = np.take_along_axis(vr, red, 1)
    return sosedi, podobnost
