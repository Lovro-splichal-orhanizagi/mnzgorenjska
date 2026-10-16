"""Uradna raven članske lige: prepis `ravenLige` iz scripts/visja-liga.mjs.

Vrne (raven, obmocje) kot JS (1 = vrh države; obmocje 'drzava' ali šifra
zveze) ali None. Mladinskih vej ni, ker Scout mladinskih lig ne bere.
Enakost z JS preveri tests/test_ravni.py; ob spremembi JS popravi oba.
"""
import re

HR_REGIJSKE = [
    (re.compile(r"\b4\. NL\b|Elitna|Premier|Premijer", re.I), 1),
    (re.compile(r"(^|\s)(III\.?|3\.|Treća)\s"), 4),
    (re.compile(r"(^|\s)(II\.?|2\.|Druga)\s"), 3),
    (re.compile(r"(^|\s)(I\.|1\.|Prva|Jedinstvena prva)\s"), 2),
]
HR_FIKSNE = {"hr-hnl": 1, "hr-1nl": 2, "hr-2nl": 3}
ES_CT = {"elit": 1, "primera": 2, "segona": 3, "tercera": 4, "quarta": 5}
ES_AS = {"tercera": 1, "primera": 2}
GR_EPS = {"a1": 1, "a": 2, "a2": 2, "b": 3, "g": 4}
EE_FIKSNE = {"ee-premium-liiga": 1, "ee-esiliiga": 2, "ee-esiliiga-b": 3}
EE_NIZJE = {"ii": 4, "iii": 5, "iv": 6}
IS_FIKSNE = {"is-besta-deild": 1, "is-lengjudeild": 2}
# (predpona, vrh, vzorec nižjih z (\d)): raven vrha in 1 + številka ostalih.
ABS_PIRAMIDE = [
    ("md-", "md-super-liga", r"^md-liga-(\d)"),
    ("lt-", "lt-a-lyga", r"^lt-(\d)-lyga"),
    ("fo-", "fo-betri-deildin", r"^fo-(\d)-deild"),
    ("kz-", "kz-premier-liga", r"^kz-(\d)-liga"),
]


def raven_lige(slug: str, ime: str | None = None, zveza: str | None = None) -> tuple[int | None, str] | None:
    ime = ime or ""
    regija = zveza or slug
    _, drugi, tretji = (slug.split("-") + ["", "", ""])[:3]
    if slug.startswith("hr-"):
        if slug in HR_FIKSNE:
            return HR_FIKSNE[slug], "drzava"
        if re.match(r"^hr-(3nl-|hns-treca-nl-)", slug):
            return 4, "drzava"
        return next((r for vzorec, r in HR_REGIJSKE if vzorec.search(ime)), None), regija
    if slug.startswith("sk-"):
        if slug == "sk-nike-liga":
            return 1, "drzava"
        m = re.match(r"^sk-sfz-(\d)liga", slug) or re.search(r"-(\d)liga", slug)
        return (int(m[1]), "drzava") if m else (None, regija)
    if slug.startswith("hu-"):
        if m := re.match(r"^hu-nb(\d)", slug):
            return int(m[1]), "drzava"
        if m := re.match(r"^hu-[a-z]+-(\d)(-|$)", slug):
            return 3 + int(m[1]), "drzava"
        return None, regija
    if slug.startswith("at-"):
        if slug == "at-bundesliga":
            return 1, "drzava"
        if slug == "at-2-liga":
            return 2, "drzava"
        if re.search(r"(^at-|-)regionalliga-", slug):
            return 3, "drzava"
        return None, regija
    if slug.startswith("es-ct-"):
        return (ES_CT[tretji], "drzava") if tretji in ES_CT else None
    # Turčija (vir tff): 1. Lig 2, 2. Lig 3, 3. Lig 4, PGL 5; Süper Lig ni vpisana.
    if slug.startswith("tr-"):
        if slug == "tr-1-lig":
            return 2, "drzava"
        for predpona, r in (("tr-2-lig-", 3), ("tr-3-lig-", 4), ("tr-pgl-", 5)):
            if slug.startswith(predpona):
                return r, "drzava"
        return None, regija
    if slug.startswith("es-as-"):
        return (ES_AS[tretji], "es-as") if tretji in ES_AS else None
    # Grčija (vir eps): `gr-<zveza>-<kategorija>[-<skupina>]`, raven le znotraj zveze.
    if slug.startswith("gr-"):
        return (GR_EPS[tretji], f"gr-{drugi}") if tretji in GR_EPS else None
    # Anglija (vir isthmian): Premier Division je step 3, ostale divizije step 4.
    if slug.startswith("gb-"):
        return (1 if re.match(r"^gb-[a-z]+-premier(-|$)", slug) else 2), "drzava"
    if slug.startswith("ee-"):
        if slug in EE_FIKSNE:
            return EE_FIKSNE[slug], "drzava"
        m = re.match(r"^ee-(ii|iii|iv)-liiga", slug)
        return (EE_NIZJE[m[1]], "drzava") if m else None
    # Ukrajina (upl 1, pfl-ua: Perša 2, Druga A/B 3).
    if slug.startswith("ua-"):
        if slug == "ua-upl":
            return 1, "drzava"
        m = re.match(r"^ua-(\d)-liga", slug)
        return (int(m[1]) + 1, "drzava") if m else None
    # Islandija (vir ksi): Utandeild je zunaj piramide.
    if slug.startswith("is-"):
        if slug in IS_FIKSNE:
            return IS_FIKSNE[slug], "drzava"
        m = re.match(r"^is-(\d)-deild", slug)
        return (1 + int(m[1]), "drzava") if m else None
    # Norveška (vir nff): OBOS-ligaen 2, "<n>div" 1 + n; Eliteserien ni vpisana.
    if slug.startswith("no-"):
        if slug == "no-obos":
            return 2, "drzava"
        m = re.search(r"-(\d)div(-|$)", slug)
        return (1 + int(m[1]), "drzava") if m else None
    for predpona, vrh, vzorec in ABS_PIRAMIDE:
        if slug.startswith(predpona):
            if slug == vrh:
                return 1, "drzava"
            m = re.match(vzorec, slug)
            return (1 + int(m[1]), "drzava") if m else None
    if slug.startswith("lv-"):
        if slug == "lv-virsliga":
            return 1, "drzava"
        m = re.match(r"^lv-(\d)-liga", slug)
        return (1 + int(m[1]), "drzava") if m else None
    return None
