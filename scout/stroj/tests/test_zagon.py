from datetime import datetime

from stroj.__main__ import PAS, do_naslednjega


def test_do_naslednjega():
    assert do_naslednjega(datetime(2026, 10, 16, 4, 0, tzinfo=PAS)) == 25200
    assert do_naslednjega(datetime(2026, 10, 16, 12, 0, tzinfo=PAS)) == 82800
    # 25. 10. 2026 se ura premakne nazaj: do 11:00 je uro več
    assert do_naslednjega(datetime(2026, 10, 24, 12, 0, tzinfo=PAS)) == 86400


def test_javi_napako(monkeypatch, capsys):
    import json
    from stroj import __main__ as m
    poslano = []

    class Odgovor:
        def close(self):
            pass

    def urlopen(zahteva, timeout):
        poslano.append(json.loads(zahteva.data))
        return Odgovor()

    monkeypatch.setattr(m.urllib.request, "urlopen", urlopen)
    m.javi_napako(TypeError("'>' not supported"), None)
    assert poslano == [] and "DISCORD_WEBHOOK ni nastavljen" in capsys.readouterr().out
    m.javi_napako(TypeError("'>' not supported"), "https://discord.invalid/x")
    assert "TypeError: '>' not supported" in poslano[0]["content"]

    def pade(zahteva, timeout):
        raise OSError("ni omrežja")

    monkeypatch.setattr(m.urllib.request, "urlopen", pade)
    m.javi_napako(TypeError("x"), "https://discord.invalid/x")  # ne sme ustaviti zanke
    assert "Discord ni dosegljiv" in capsys.readouterr().out
