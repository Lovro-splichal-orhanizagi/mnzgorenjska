#!/usr/bin/env python3
"""New mail in info@slff.eu -> Discord (sender, subject, start of the text).

Runs ON THE MAIL SERVER (ssh HelpStackUtils, /etc/cron.d/slff-info-discord) every
2 minutes and reads the mailbox with doveadm, so it needs no mailbox password.
Until 2026-10-08 it ran on the SLFF VM over IMAP: when the info@ password changed,
the stale password failed every 2 minutes and fail2ban nearly banned the VM, which
would have stopped all app mail. Each posted message gets the keyword SlffDiscord,
so reading it in a mail client doesn't matter and nothing is posted twice.
Secret: DISCORD_WEBHOOK in /opt/slff-info/secrets.env (root only).
"""
import email
import subprocess
import json
import urllib.request
from email.header import decode_header, make_header
from email.policy import default

ZNACKA = 'SlffDiscord'

env = {}
for vrstica in open('/opt/slff-info/secrets.env'):
    if '=' in vrstica and not vrstica.startswith('#'):
        k, v = vrstica.rstrip('\n').split('=', 1)
        env[k] = v.strip('"\'')


def besedilo(sporocilo):
    del_ = sporocilo.get_body(preferencelist=('plain', 'html'))
    if not del_:
        return ''
    t = del_.get_content()
    if del_.get_content_type() == 'text/html':
        import re
        t = re.sub(r'<[^>]+>', ' ', t)
    return ' '.join(t.split())[:700]


def v_discord(od, zadeva, odlomek):
    vsebina = f'📬 **info@slff.eu** — od {od}\n**{zadeva}**\n>>> {odlomek or "(brez besedila)"}'
    zahteva = urllib.request.Request(
        env['DISCORD_WEBHOOK'],
        data=json.dumps({'content': vsebina[:1990], 'allowed_mentions': {'parse': []}}).encode(),
        # Discord (Cloudflare) zavrne privzeti Python-urllib.
        headers={'Content-Type': 'application/json', 'User-Agent': 'SLFF info-v-discord (https://slff.eu)'},
    )
    urllib.request.urlopen(zahteva, timeout=15)


DOVECOT = 'mailcowdockerized-dovecot-mailcow-1'
UPORABNIK = 'info@slff.eu'


def doveadm(*argumenti):
    return subprocess.run(['docker', 'exec', DOVECOT, 'doveadm', *argumenti],
                          check=True, capture_output=True).stdout


najdeni = doveadm('search', '-u', UPORABNIK, 'mailbox', 'INBOX', 'NOT', 'KEYWORD', ZNACKA)
for vrstica in najdeni.decode().splitlines():
    uid = vrstica.split()[1]
    surovo = doveadm('fetch', '-u', UPORABNIK, 'text', 'mailbox', 'INBOX', 'uid', uid)
    surovo = surovo.split(b'\n', 1)[1] if surovo.startswith(b'text:') else surovo
    sporocilo = email.message_from_bytes(surovo, policy=default)
    od = str(make_header(decode_header(sporocilo.get('From', '?'))))
    zadeva = str(make_header(decode_header(sporocilo.get('Subject', '(brez zadeve)'))))
    v_discord(od, zadeva, besedilo(sporocilo))
    doveadm('flags', 'add', '-u', UPORABNIK, ZNACKA, 'mailbox', 'INBOX', 'uid', uid)
