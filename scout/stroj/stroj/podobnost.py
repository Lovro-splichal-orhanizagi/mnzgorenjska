"""Podobni igralci: kosinusna podobnost vektorjev kazalnikov (spec 3.5).
Vektorji so že prilagojeni ravni (kazalniki *_ref) in standardizirani."""
import numpy as np

# elementov matrike podobnosti na kos: float32 (80 MB) + indeksi argpartition int64 (160 MB)
ELEMENTOV_NA_KOS = 20_000_000


def najblizji(vektorji: np.ndarray, n: int = 20, kos: int = 2000) -> tuple[np.ndarray, np.ndarray]:
    if len(vektorji) < 2:
        raise ValueError("najblizji potrebuje vsaj 2 vrstici")
    # ničelni vektor: deljenje z 1e-9 da ničle, podobnost 0 do vseh, brez NaN
    norma = (vektorji / np.maximum(np.linalg.norm(vektorji, axis=1, keepdims=True), 1e-9)).astype(np.float32)
    vrstic = len(norma)
    n = min(n, vrstic - 1)
    # kos je zgornja meja; dejanski kos drži vrh pod ~250 MB (delavec ima mem_limit 1g)
    kos = max(1, min(kos, ELEMENTOV_NA_KOS // vrstic))
    sosedi = np.empty((vrstic, n), dtype=np.int64)
    podobnost = np.empty((vrstic, n))
    # ponytail: kvadratni čas v številu igralcev države; ANN indeks, ko bo država > 200k igralcev
    for z in range(0, vrstic, kos):
        s = norma[z:z + kos] @ norma.T
        s[np.arange(len(s)), np.arange(z, z + len(s))] = -np.inf
        np.negative(s, out=s)  # razdalja: manjše = bolj podobno, brez kopije
        # kopija sprosti celotno matriko indeksov (rez bi jo držal živo do naslednjega kosa)
        top = np.argpartition(s, n - 1, axis=1)[:, :n].copy()
        vr = np.take_along_axis(s, top, 1)
        del s  # naslednji kos ne sme nastati, dokler ta še živi
        red = np.argsort(vr, axis=1, kind="stable")
        sosedi[z:z + kos] = np.take_along_axis(top, red, 1)
        podobnost[z:z + kos] = -np.take_along_axis(vr, red, 1)
    return sosedi, podobnost
