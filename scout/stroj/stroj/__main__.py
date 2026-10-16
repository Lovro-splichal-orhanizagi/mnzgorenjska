"""Stroj SLFF Scout.

  python -m stroj                 izračun in izpis (backtest, prvih 10 vsake lige), brez pisanja
  python -m stroj --pisi          zapiše novo različico modela
  python -m stroj --moc-lig       moč lig in backtest zdaj (sicer enkrat na 7 dni)
  python -m stroj --zanka         delavec slff-scout: vsak dan ob 11:00 (po nočnih uvozih), piše
"""
import argparse
import os
import time
import traceback
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np
import psycopg

from stroj import Tabela, izberi
from stroj.backtest import backtest
from stroj.elo import elo
from stroj.indeks import UTEZI, indeks, z_vrednosti
from stroj.kazalniki import izracunaj
from stroj.moc_lig import prilagodi
from stroj.nalaganje import nalozi
from stroj.pisanje import STOLPCI, zapisi
from stroj.podobnost import najblizji
from stroj.vrzeli import vrzeli

PAS = ZoneInfo("Europe/Ljubljana")
TEDEN = timedelta(days=7)
SQL_PREJSNJI = """
select m.id, m.parametri, m.backtest, max(l.izracunano_at), m.objavljen
from scout.modeli m join scout.lige_moc l on l.model_id = m.id
group by m.id order by m.id desc limit 1
"""


def do_naslednjega(zdaj: datetime, ura: int = 11, minuta: int = 0) -> float:
    """Sekunde do naslednjega ura:minuta po stenski uri pasu `zdaj` (tudi ob premiku ure)."""
    cilj = zdaj.replace(hour=ura, minute=minuta, second=0, microsecond=0)
    if cilj <= zdaj:
        cilj += timedelta(days=1)
    return (cilj.astimezone(timezone.utc) - zdaj.astimezone(timezone.utc)).total_seconds()


def _pregled(conn: psycopg.Connection, t: Tabela, idx: np.ndarray) -> None:
    """Prvih 10 vsake lige za človeški pregled smiselnosti (spec 5)."""
    imena = dict(conn.execute(
        "select id, coalesce(full_name, last_name || ' ' || first_name) from public.players where id = any(%s)",
        (t["player_id"].tolist(),)).fetchall())
    for liga in sorted(set(t["competition_id"].tolist())):
        m = np.flatnonzero(t["competition_id"] == liga)
        prvi = m[np.argsort(-idx[m])][:10]
        print(f"liga {liga}: " + ", ".join(
            f"{imena.get(int(t['player_id'][i]), '?')} ({t['skupina'][i]} {idx[i]:.2f})" for i in prvi))


def zagon(conn: psycopg.Connection, pisi: bool, sili_moc: bool) -> int | None:
    conn.execute("set statement_timeout = 0")
    sezone, tekme, lige = nalozi(conn)
    elo_lig = elo(tekme)
    zdaj = datetime.now(PAS)
    prejsnji = conn.execute(SQL_PREJSNJI).fetchone()
    if sili_moc or prejsnji is None or zdaj - prejsnji[3] > TEDEN - timedelta(hours=1):  # zdaj je vzet po ~1 min nalaganja, brez ure bi teden zdrsnil na 8 dni
        moc, elo_koef = prilagodi(sezone, lige, elo_lig)
        bt = backtest(sezone, lige, elo_lig, int(sezone["leto"].max()) - 1)
        izracunano, objavljen = zdaj, bool(bt.get("prestal"))
    else:
        # dan brez backtesta podeduje njegov izid: objavljen=False bi vsak dan
        # dodal neobjavljen model in vmesnik bi do naslednjega backtesta bral starega
        moc = {l: (m, v, n) for l, m, v, n in conn.execute(
            "select competition_id, moc, vir, prestopov from scout.lige_moc where model_id = %s", (prejsnji[0],))}
        elo_koef, bt, izracunano, objavljen = prejsnji[1]["elo_koef"], prejsnji[2], prejsnji[3], prejsnji[4]
    k = izracunaj(sezone, moc, elo_lig, elo_koef)

    drzava_lige = dict(zip(lige["id"].tolist(), lige["country_id"].tolist()))
    odprte = {d for d, st in zip(lige["country_id"].tolist(), lige["stanje"].tolist()) if st != "zaprto"}
    aktivne = {l for l, a in zip(lige["id"].tolist(), lige["active"].tolist()) if a and drzava_lige[l] in odprte}
    tekoca: dict[int, int] = {}
    for l, y in zip(k["competition_id"].tolist(), k["leto"].tolist()):
        tekoca[l] = max(tekoca.get(l, y), y)
    v_odprti = np.array([d in odprte for d in k["country_id"].tolist()], dtype=bool)
    izbrani = v_odprti & np.array([
        l in aktivne and y == tekoca[l] and g in UTEZI
        for l, y, g in zip(k["competition_id"].tolist(), k["leto"].tolist(), k["skupina"].tolist())], dtype=bool)
    t = izberi(k, izbrani)
    Z = z_vrednosti(t)
    idx, pct = indeks(t, Z)
    vektorji = []
    ima_vektor = np.any(Z != 0, axis=1)  # ničelni vektor (skupina < 2) ima poljubne sosede
    for d in set(t["country_id"].tolist()):
        for g in UTEZI:
            m = np.flatnonzero((t["country_id"] == d) & (t["skupina"] == g) & ima_vektor)
            if len(m) < 2:
                continue
            sosedi, podobnost = najblizji(Z[m])
            for i, s_i, p_i in zip(m.tolist(), sosedi, podobnost):
                vektorji.append((int(t["player_id"][i]), g, Z[i].tolist(), t["player_id"][m[s_i]].tolist(), p_i.tolist()))
    kk = izberi(k, v_odprti)
    vrstice = {
        "lige_moc": [(l, m, v, n, izracunano) for l, (m, v, n) in moc.items()],
        "ekipe_elo": [(e, l, y, r) for (l, y, e), r in elo_lig.items() if l in aktivne and y == tekoca.get(l)],
        "kazalniki": list(zip(*(kk[c].tolist() for c in STOLPCI["kazalniki"]))),
        "indeks": list(zip(t["player_id"].tolist(), t["skupina"].tolist(), idx.tolist(), pct.tolist(), t["zaupanje"].tolist())),
        "vektorji": vektorji,
        "vrzeli": vrzeli(t),
    }
    print(f"Stroj: {len(sezone['player_id'])} vrstic, {len(t['player_id'])} izbranih, backtest {bt}", flush=True)
    if not pisi:
        _pregled(conn, t, idx)
        return None
    model_id = zapisi(conn, {"leto": int(sezone["leto"].max()), "backtest": bt,
                             "parametri": {"elo_koef": elo_koef}, "objavljen": objavljen}, vrstice)
    print(f"Stroj: zapisan model {model_id} (objavljen: {objavljen})", flush=True)
    return model_id


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m stroj", description="SLFF Scout: moč lig, kazalniki, indeks, podobni, vrzeli.")
    p.add_argument("--pisi", action="store_true", help="zapiši novo različico modela (brez: le izpis)")
    p.add_argument("--moc-lig", action="store_true", help="moč lig in backtest zdaj (sicer enkrat na 7 dni)")
    p.add_argument("--zanka", action="store_true", help="vsak dan ob 11:00 (delavec slff-scout), piše")
    a = p.parse_args(argv)
    url = os.environ["SCOUT_DB_URL"]
    if a.zanka:
        print("Stroj: zanka teče (vsak dan ob 11:00).", flush=True)
    while True:
        if a.zanka:
            time.sleep(do_naslednjega(datetime.now(PAS)))
        try:
            with psycopg.connect(url, autocommit=True) as conn:
                zagon(conn, a.pisi or a.zanka, a.moc_lig)
        except Exception:
            if not a.zanka:
                raise
            traceback.print_exc()
        if not a.zanka:
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
